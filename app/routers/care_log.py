import os
from datetime import datetime, date
from typing import List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.care_log import CareLog
from app.models.notification import Notification

# Import client AI tập trung
try:
    from app.core.ai_client import call_gemini
except ImportError:
    call_gemini = None

router = APIRouter(tags=["Care Logs & AI Assistant"])

AI_DISCLAIMER = "Lưu ý: Kết quả do AI sinh ra chỉ mang tính chất tham khảo. Cần có chuyên gia nông nghiệp kiểm chứng trước khi áp dụng."

# ==================== PYDANTIC SCHEMAS ====================

class CareLogSupplyUsage(BaseModel):
    supply_id: int
    quantity_used: float = Field(..., gt=0)
    notes: Optional[str] = None

class CareLogCreate(BaseModel):
    batch_id: Union[int, str]
    log_date: Optional[date] = None
    action_type: Optional[str] = None
    activity_type: Optional[str] = None  # Compatibility
    notes: Optional[str] = None
    description: Optional[str] = None    # Compatibility
    quantity: Optional[float] = None
    image_url: Optional[str] = None
    supply_usages: List[CareLogSupplyUsage] = Field(default_factory=list)

class CareLogResponse(BaseModel):
    id: int
    batch_id: int
    log_date: date
    action_type: str
    notes: Optional[str] = None
    quantity: Optional[float] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AISummaryResponse(BaseModel):
    batch_id: int
    summary: str
    recommendation: str
    disclaimer: str = AI_DISCLAIMER


# ==================== HELPER FUNCTIONS ====================

def parse_date_obj(val: Any) -> date:
    """Ép kiểu dữ liệu ngày tháng an toàn về Python date object."""
    if not val:
        return date.today()
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        clean_str = val.split("T")[0].split(" ")[0]
        try:
            return datetime.strptime(clean_str, "%Y-%m-%d").date()
        except ValueError:
            return date.today()
    return date.today()


def normalize_care_log(log: Any) -> CareLogResponse:
    """Chuẩn hóa dữ liệu trả về Pydantic response tránh lỗi thiếu/khác tên cột trong CSDL."""
    log_id = getattr(log, "id", 0)
    batch_id = getattr(log, "batch_id", None) or getattr(log, "crop_batch_id", None) or 0
    
    raw_date = getattr(log, "log_date", None) or getattr(log, "created_at", None)
    log_date_obj = parse_date_obj(raw_date)

    action_type = (
        getattr(log, "action_type", None) or 
        getattr(log, "activity_type", None) or 
        "Chăm sóc"
    )
    notes = getattr(log, "notes", None) or getattr(log, "description", None) or ""
    quantity = getattr(log, "quantity", None)
    image_url = getattr(log, "image_url", None)

    return CareLogResponse(
        id=log_id,
        batch_id=batch_id,
        log_date=log_date_obj,
        action_type=action_type,
        notes=notes,
        quantity=quantity,
        image_url=image_url
    )


# ==================== ENDPOINTS ====================

@router.get("", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("care_logs:read"))])
@router.get("/", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, include_in_schema=False, dependencies=[Depends(require_permission("care_logs:read"))])
def get_care_logs(
    batch_id: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    """Lấy danh sách nhật ký chăm sóc (có thể lọc theo batch_id)"""
    query = db.query(CareLog)
    if batch_id:
        if hasattr(CareLog, "batch_id") and hasattr(CareLog, "crop_batch_id"):
            from sqlalchemy import or_
            query = query.filter(or_(CareLog.batch_id == batch_id, CareLog.crop_batch_id == batch_id))
        elif hasattr(CareLog, "batch_id"):
            query = query.filter(CareLog.batch_id == batch_id)
        elif hasattr(CareLog, "crop_batch_id"):
            query = query.filter(CareLog.crop_batch_id == batch_id)

    logs = query.order_by(CareLog.log_date.desc(), CareLog.id.desc()).all()
    return [normalize_care_log(l) for l in logs]


@router.get("/{batch_id}", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("care_logs:read"))])
def get_care_logs_by_batch_path(
    batch_id: int, 
    db: Session = Depends(get_db)
):
    """Lấy danh sách nhật ký theo đường dẫn /{batch_id}"""
    return get_care_logs(batch_id=batch_id, db=db)


@router.post(
    "", 
    response_model=CareLogResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("care_logs:create"))]
)
@router.post(
    "/", 
    response_model=CareLogResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("care_logs:create"))],
    include_in_schema=False
)
def create_care_log(
    log_in: CareLogCreate, 
    db: Session = Depends(get_db)
):
    """Tạo nhật ký chăm sóc mới, tự động đổi trạng thái Lô trồng sang 'Đang trồng' và bắn thông báo."""
    final_action_type = log_in.action_type or log_in.activity_type
    final_notes = log_in.notes or log_in.description or ""
    final_date_obj = parse_date_obj(log_in.log_date)

    if not final_action_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Trường action_type hoặc activity_type không được để trống."
        )

    from app.models.crop_batch import CropBatch
    from sqlalchemy import or_

    search_val = str(log_in.batch_id).strip()
    batch_filters = []
    if search_val.isdigit():
        batch_filters.append(CropBatch.id == int(search_val))
    if hasattr(CropBatch, "code"):
        batch_filters.append(CropBatch.code == search_val)
    if hasattr(CropBatch, "batch_code"):
        batch_filters.append(CropBatch.batch_code == search_val)
    if hasattr(CropBatch, "batch_id"):
        batch_filters.append(CropBatch.batch_id == search_val)

    batch = db.query(CropBatch).filter(or_(*batch_filters)).first() if batch_filters else None
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lô trồng")

    resolved_batch_id = batch.id

    # Lọc danh sách cột thực tế của bảng CareLog trong CSDL
    valid_cols = {c.name: c.type for c in CareLog.__table__.columns} if hasattr(CareLog, "__table__") else {}
    log_data = {}

    if "batch_id" in valid_cols:
        log_data["batch_id"] = resolved_batch_id
    if "crop_batch_id" in valid_cols:
        log_data["crop_batch_id"] = resolved_batch_id
    if "action_type" in valid_cols:
        log_data["action_type"] = final_action_type
    if "activity_type" in valid_cols:
        log_data["activity_type"] = final_action_type
    if "notes" in valid_cols:
        log_data["notes"] = final_notes
    if "description" in valid_cols:
        log_data["description"] = final_notes
    if "log_date" in valid_cols:
        col_type = str(valid_cols["log_date"]).upper()
        log_data["log_date"] = final_date_obj if "DATE" in col_type else str(final_date_obj)
    if "quantity" in valid_cols and log_in.quantity is not None:
        log_data["quantity"] = log_in.quantity
    if "image_url" in valid_cols and log_in.image_url is not None:
        log_data["image_url"] = log_in.image_url

    try:
        # 1. Lưu bản ghi Nhật ký chăm sóc mới
        db_log = CareLog(**log_data)
        db.add(db_log)
        db.flush()

        # Trừ kho cùng transaction với nhật ký
        if log_in.supply_usages:
            from app.services.supply import deduct_supply_stock
            for usage in log_in.supply_usages:
                deduct_supply_stock(
                    db,
                    usage.supply_id,
                    usage.quantity_used,
                    db_log.id,
                    usage.notes,
                )

        # 2. ĐỒNG BỘ TRẠNG THÁI LÔ TRỒNG
        if hasattr(batch, "status"):
            curr_status = str(batch.status or "").strip().lower()
            is_harvest = final_action_type.strip().lower() in ["thu hoạch", "thu hoach", "harvest"]
            if is_harvest:
                batch.status = "Đã thu hoạch"
                db.add(batch)
            elif curr_status in ["kế hoạch", "lên kế hoạch", "planned", "planning", "ke hoach", "draft"]:
                batch.status = "Đang trồng"
                db.add(batch)

        # 3. Kích hoạt Trigger Thông báo / Cảnh báo
        notes_lower = final_notes.lower()
        pest_keywords = ["sâu", "bệnh", "rệp", "nấm", "héo", "vàng lá", "sâu ăn lá", "bọ trĩ"]

        if final_action_type in ["Bệnh hại", "Phun thuốc", "Kiểm tra sâu bệnh"] or any(kw in notes_lower for kw in pest_keywords):
            new_alert = Notification(
                type="ai_warning",
                title="Cảnh báo khẩn: Phát hiện sâu bệnh",
                message=f"Hệ thống ghi nhận nguy cơ tại Lô {log_in.batch_id}: '{final_notes}'. Vui lòng kiểm tra và xử lý ngay.",
                is_read=False
            )
            db.add(new_alert)
        elif final_action_type == "Tưới nước":
            new_info = Notification(
                type="info",
                title="Đã cập nhật lịch tưới",
                message=f"Đã ghi nhận hoạt động tưới nước tại Lô {log_in.batch_id}. Hệ thống sẽ tiếp tục theo dõi độ ẩm.",
                is_read=False
            )
            db.add(new_info)

        db.commit()
        db.refresh(db_log)
        return normalize_care_log(db_log)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi CSDL khi tạo nhật ký chăm sóc: {str(e)}"
        )


# ==================== TÍCH HỢP AI CHỨC NĂNG 3.2 ====================

@router.post(
    "/{batch_id}/ai-summary",
    response_model=AISummaryResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("care_logs:read"))]
)
def generate_ai_care_summary(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Tóm tắt nhật ký trồng trọt và đề xuất việc cần kiểm tra bằng AI."""
    logs = db.query(CareLog).filter(
        (CareLog.batch_id == batch_id) if hasattr(CareLog, "batch_id") else (CareLog.crop_batch_id == batch_id)
    ).order_by(CareLog.log_date.asc()).all()

    if not logs:
        return AISummaryResponse(
            batch_id=batch_id,
            summary="Lô trồng hiện chưa có ghi nhận nhật ký chăm sóc nào.",
            recommendation="Cần bắt đầu cập nhật hoạt động tưới nước và theo dõi tình trạng đất hàng ngày.",
            disclaimer=AI_DISCLAIMER
        )

    logs_text_list = [
        f"- Ngày {getattr(l, 'log_date', '')}: [{getattr(l, 'action_type', '') or getattr(l, 'activity_type', '')}] {getattr(l, 'notes', '') or getattr(l, 'description', '')}"
        for l in logs
    ]
    logs_summary_str = "\n".join(logs_text_list)

    system_prompt = "Bạn là trợ lý quản lý trang trại. Chỉ đưa gợi ý tham khảo dựa trên dữ liệu trồng trọt được cung cấp."
    user_prompt = f"Lô trồng: Batch #{batch_id}.\nNhật ký chăm sóc:\n{logs_summary_str}\nHãy tóm tắt tình trạng và đề xuất việc cần kiểm tra tuần tới."

    if call_gemini:
        try:
            ai_text = call_gemini(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )
            if ai_text:
                return AISummaryResponse(
                    batch_id=batch_id,
                    summary=ai_text,
                    recommendation="Đã tóm tắt từ AI Gemini dựa trên toàn bộ lịch sử chăm sóc.",
                    disclaimer=AI_DISCLAIMER
                )
        except Exception:
            pass

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(f"{system_prompt}\n\n{user_prompt}")
            ai_text = response.text.strip()
            
            return AISummaryResponse(
                batch_id=batch_id,
                summary=ai_text,
                recommendation="Đã tóm tắt từ AI Gemini dựa trên toàn bộ lịch sử chăm sóc.",
                disclaimer=AI_DISCLAIMER
            )
        except Exception:
            pass

    has_pest = any(
        kw in (getattr(l, "notes", "") or getattr(l, "description", "") or "").lower() 
        for l in logs 
        for kw in ["sâu", "bệnh", "vàng lá", "rệp", "nấm"]
    )
    water_count = sum(
        1 for l in logs 
        if (getattr(l, "action_type", "") or getattr(l, "activity_type", "")) == "Tưới nước"
    )

    summary_msg = f"Lô #{batch_id} đã ghi nhận tổng cộng {len(logs)} lượt chăm sóc. Trong đó có {water_count} lần tưới nước."
    if has_pest:
        summary_msg += " CẢNH BÁO: Đã phát hiện dấu hiệu sâu bệnh/vàng lá trong nhật ký gần đây."
        rec_msg = "Cần cho kỹ thuật viên kiểm tra trực tiếp mặt dưới lá, cách ly cây bệnh và chuẩn bị chế phẩm sinh học phù hợp."
    else:
        summary_msg += " Tình trạng sinh trưởng bình thường, chưa có phát sinh bất thường."
        rec_msg = "Duy trì lịch tưới nước hiện tại, kiểm tra độ ẩm đất vào giữa tuần và chuẩn bị đợt bón phân hữu cơ tiếp theo."

    return AISummaryResponse(
        batch_id=batch_id,
        summary=summary_msg,
        recommendation=rec_msg,
        disclaimer=AI_DISCLAIMER
    )


@router.delete(
    "/range",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("care_logs:delete"))]
)
def delete_care_logs_by_date_range(
    batch_id: int,
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
):
    """Xóa các nhật ký của một lô trong khoảng ngày, tính cả hai ngày biên."""
    if from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày bắt đầu không được lớn hơn ngày kết thúc.",
        )

    from sqlalchemy import or_

    logs = (
        db.query(CareLog)
        .filter(or_(CareLog.batch_id == batch_id, CareLog.crop_batch_id == batch_id))
        .all()
    )

    selected_logs = []
    for log in logs:
        log_day = parse_date_obj(getattr(log, "log_date", None) or getattr(log, "created_at", None))
        if from_date <= log_day <= to_date:
            selected_logs.append(log)

    for log in selected_logs:
        db.delete(log)
    db.commit()

    return {
        "message": "Đã xóa lịch sử chăm sóc trong khoảng ngày đã chọn.",
        "deleted_count": len(selected_logs),
        "from_date": from_date,
        "to_date": to_date,
    }


@router.delete(
    "/{log_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("care_logs:delete"))]
)
def delete_care_log(log_id: int, db: Session = Depends(get_db)):
    """Xóa một bản ghi nhật ký chăm sóc"""
    log_item = db.query(CareLog).filter(CareLog.id == log_id).first()
    if not log_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi nhật ký")
    
    db.delete(log_item)
    db.commit()
    return {"message": "Xóa nhật ký chăm sóc thành công"}
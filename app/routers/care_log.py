import logging
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.care_log import CareLog
from app.models.notification import Notification
from app.schemas.care_log import CareLogCreate, CareLogResponse

from app.core.ai_client import DISCLAIMER_TEXT, call_gemini_structured

router = APIRouter(tags=["Care Logs & AI Assistant"])
logger = logging.getLogger(__name__)

AI_DISCLAIMER = DISCLAIMER_TEXT
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads" / "care-logs"
MAX_IMAGE_SIZE = 5 * 1024 * 1024
IMAGE_SIGNATURES = {
    "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
    "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
    "image/webp": (b"RIFF", ".webp"),
}

# ==================== PYDANTIC SCHEMAS ====================

class AISummaryResponse(BaseModel):
    batch_id: int
    summary: str
    recommendation: str
    disclaimer: str = AI_DISCLAIMER

    model_config = ConfigDict(strict=True, extra="forbid")


class AISummaryContent(BaseModel):
    summary: str
    recommendation: str
    batch_codes: List[str] = Field(default_factory=list)
    care_log_ids: List[int] = Field(default_factory=list)

    model_config = ConfigDict(strict=True, extra="forbid")


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
    batch_id = getattr(log, "crop_batch_id", None) or getattr(log, "batch_id", None) or 0
    
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
        quality_percent=getattr(log, "quality_percent", None),
        image_url=image_url
    )


# ==================== ENDPOINTS ====================

@router.get("", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("care_logs:read"))])
@router.get("/", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, include_in_schema=False, dependencies=[Depends(require_permission("care_logs:read"))])
def get_care_logs(
    batch_id: Optional[int] = None, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lấy danh sách nhật ký chăm sóc (có thể lọc theo batch_id)"""
    from app.models.crop_batch import CropBatch

    query = db.query(CareLog).join(CropBatch, CareLog.crop_batch_id == CropBatch.id)
    if batch_id:
        query = query.filter(CareLog.crop_batch_id == batch_id)
    if str(current_user.get("role", "")).strip().lower() in {"staff", "worker"}:
        query = query.filter(CropBatch.plot_id == current_user.get("plot_id"))

    logs = query.order_by(CareLog.log_date.desc(), CareLog.id.desc()).all()
    return [normalize_care_log(l) for l in logs]


@router.get("/{batch_id}", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("care_logs:read"))])
def get_care_logs_by_batch_path(
    batch_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lấy danh sách nhật ký theo đường dẫn /{batch_id}"""
    return get_care_logs(batch_id=batch_id, db=db, current_user=current_user)


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("care_logs:create"))],
)
async def upload_care_log_image(
    request: Request,
    file: UploadFile = File(...),
):
    """Store a bounded raster image and return its public URL."""
    declared_type = (file.content_type or "").lower()
    signature = IMAGE_SIGNATURES.get(declared_type)
    if signature is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.",
        )

    content = await file.read(MAX_IMAGE_SIZE + 1)
    await file.close()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Ảnh tải lên không được vượt quá 5 MB.",
        )

    magic, extension = signature
    if not content.startswith(magic) or (
        declared_type == "image/webp"
        and (len(content) < 12 or content[8:12] != b"WEBP")
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Định dạng ảnh tải lên không hợp lệ.",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(content)
    return {
        "image_url": f"{str(request.base_url).rstrip('/')}/uploads/care-logs/{filename}"
    }


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
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Tạo nhật ký chăm sóc mới, tự động đổi trạng thái Lô trồng sang 'Đang trồng' và bắn thông báo."""
    final_action_type = log_in.action_type
    final_notes = log_in.notes or ""
    final_date_obj = parse_date_obj(log_in.log_date)

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
    if (
        str(current_user.get("role", "")).strip().lower() in {"staff", "worker"}
        and batch.plot_id != current_user.get("plot_id")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ có thể ghi nhật ký cho lô trồng được phân công.",
        )

    from app.core.status import is_harvested_status

    if is_harvested_status(getattr(batch, "status", None)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lô trồng đã thu hoạch, không thể ghi thêm nhật ký chăm sóc.",
        )

    sow_date = getattr(batch, "sow_date", None)
    if sow_date is not None and final_date_obj < sow_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Ngày ghi nhật ký ({final_date_obj.isoformat()}) không được trước "
                f"ngày gieo ({sow_date.isoformat()})."
            ),
        )

    resolved_batch_id = batch.id

    # Lọc danh sách cột thực tế của bảng CareLog trong CSDL
    valid_cols = {c.name: c.type for c in CareLog.__table__.columns} if hasattr(CareLog, "__table__") else {}
    log_data = {}

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
    if "quality_percent" in valid_cols and log_in.quality_percent is not None:
        log_data["quality_percent"] = log_in.quality_percent
    if "image_url" in valid_cols and log_in.image_url is not None:
        log_data["image_url"] = log_in.image_url

    try:
        # 1. Lưu bản ghi Nhật ký chăm sóc mới
        db_log = CareLog(**log_data)
        db.add(db_log)
        db.flush()

        # Trừ kho cùng transaction với nhật ký
        if log_in.supply_usages:
            from app.models.supply import Supply
            from app.services.supply import deduct_supply_stock

            for usage in log_in.supply_usages:
                supply = (
                    db.query(Supply)
                    .filter(Supply.id == usage.supply_id)
                    .with_for_update()
                    .first()
                )
                if supply is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Không tìm thấy vật tư có mã {usage.supply_id}.",
                    )

                current_stock = float(supply.stock_quantity or 0)
                if current_stock < usage.quantity_used:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Tồn kho vật tư {usage.supply_id} không đủ "
                            f"(tồn: {current_stock}, cần: {usage.quantity_used})."
                        ),
                    )

                deduct_supply_stock(
                    db,
                    usage.supply_id,
                    usage.quantity_used,
                    db_log.id,
                    usage.notes,
                )
                # Không gọi db.refresh(supply) ở đây: refresh phát SELECT và ghi đè
                # phần tồn kho vừa trừ trong bộ nhớ trước khi commit, khiến cảnh báo
                # ngưỡng và số liệu trả về bị sai. Object supply trong session đã
                # phản ánh giá trị mới sau deduct_supply_stock.

                minimum_stock = getattr(supply, "min_threshold", None)
                remaining_stock = float(supply.stock_quantity or 0)
                if minimum_stock is not None and remaining_stock < float(minimum_stock):
                    db.add(
                        Notification(
                            type="ai_warning",
                            title="Cảnh báo tồn kho vật tư thấp",
                            message=(
                                f"Vật tư {usage.supply_id} còn {remaining_stock}, "
                                f"dưới ngưỡng tối thiểu {minimum_stock}."
                            ),
                            is_read=False,
                        )
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

    except HTTPException:
        db.rollback()
        raise
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
    from app.models.crop_batch import CropBatch

    batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lô trồng",
        )
    if (
        str(current_user.get("role", "")).strip().lower() in {"staff", "worker"}
        and batch.plot_id != current_user.get("plot_id")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ có thể xem nhật ký của lô trồng được phân công.",
        )

    logs = (
        db.query(CareLog)
        .filter(CareLog.crop_batch_id == batch_id)
        .order_by(CareLog.log_date.asc())
        .all()
    )

    if not logs:
        return AISummaryResponse(
            batch_id=batch_id,
            summary="Chưa đủ dữ liệu ghi nhận",
            recommendation="Lô trồng hiện chưa có nhật ký chăm sóc để phân tích.",
            disclaimer=AI_DISCLAIMER
        )

    logs_text_list = [
        f"- care_log_id={l.id}; Ngày {getattr(l, 'log_date', '')}: "
        f"[{getattr(l, 'action_type', '') or getattr(l, 'activity_type', '')}] "
        f"{getattr(l, 'notes', '') or getattr(l, 'description', '')}"
        for l in logs
    ]
    logs_summary_str = "\n".join(logs_text_list)

    batch_code = getattr(batch, "batch_code", None) or getattr(batch, "code", None)
    system_prompt = (
        "Bạn là trợ lý quản lý trang trại. Hãy tóm tắt và khuyến nghị chỉ từ dữ liệu "
        "được cung cấp. Mọi mã lô hoặc ID nhật ký được nhắc trong nội dung phải được "
        "liệt kê chính xác trong các trường batch_codes và care_log_ids."
    )
    user_prompt = (
        f"Mã lô thực tế: {batch_code or 'Chưa đủ dữ liệu ghi nhận'}.\n"
        f"ID lô: {batch.id}.\nNhật ký chăm sóc thực tế:\n{logs_summary_str}\n"
        "Trả về summary và recommendation ngắn gọn. Nếu không đủ dữ liệu, ghi chính xác "
        "'Chưa đủ dữ liệu ghi nhận'. Không tự tạo mã lô hoặc ID nhật ký. "
        f"ID nhật ký được phép trích dẫn: {[log.id for log in logs]}."
    )

    try:
        ai_result = call_gemini_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=AISummaryContent,
        )
        actual_log_ids = {log.id for log in logs}
        if (
            any(code != batch_code for code in ai_result.batch_codes)
            or any(log_id not in actual_log_ids for log_id in ai_result.care_log_ids)
        ):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI đã tham chiếu mã lô hoặc nhật ký không khớp dữ liệu thực tế.",
            )
        if ai_result.summary and ai_result.recommendation:
            return AISummaryResponse(
                batch_id=batch_id,
                summary=ai_result.summary,
                recommendation=ai_result.recommendation,
                disclaimer=AI_DISCLAIMER
            )
    except Exception:
        logger.exception("Gemini failed to summarize care logs for batch %s", batch_id)

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
        summary=summary_msg if logs else "Chưa đủ dữ liệu ghi nhận",
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

    logs = db.query(CareLog).filter(CareLog.crop_batch_id == batch_id).all()

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
from datetime import date, datetime, timezone
from typing import List, Optional, Union
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.core import ai_guard
from app.models.user import UserRole
from app.models.crop_batch import CropBatch
from app.models.care_log import CareLog
from app.models.plot import Plot
from app.models.plant_variety import PlantVariety
from app.repositories import ai_suggestion as ai_repo
from app.schemas.ai_summary import AiSummaryOut, BatchSummaryRequest
from app.services import ai_summary as summary_service

logger = logging.getLogger(__name__)

MAX_LOGGED_PROMPT = 2000

FALLBACK_REPLY = (
    "Kết quả dự phòng: hệ thống AI tạm thời không khả dụng nên chưa thể tạo câu "
    "trả lời. Vui lòng kiểm tra trực tiếp nhật ký chăm sóc của lô và liên hệ kỹ "
    "thuật viên nếu cần đánh giá chuyên môn."
)
WRONG_YEAR_FALLBACK = (
    "Chưa đủ dữ liệu: nội dung AI không khớp năm trong dữ liệu gốc nên đã bị loại "
    "bỏ. Vui lòng kiểm tra trực tiếp nhật ký chăm sóc của lô."
)

router = APIRouter(
    prefix="/api/v1/ai-advisor",
    tags=["AI Advisor"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]))]
)

class ChatRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    batch_id: Optional[Union[int, str]] = None  # Chấp nhận cả int, string hoặc null

    model_config = ConfigDict(extra="forbid")

    @field_validator("batch_id", mode="before")
    @classmethod
    def sanitize_batch_id(cls, v):
        """Tự động chuyển chuỗi rỗng "" hoặc "1" về int/None để tránh lỗi 422"""
        if v == "" or v is None:
            return None
        try:
            return int(v)
        except (ValueError, TypeError) as exc:
            raise ValueError("batch_id phải là số nguyên hợp lệ.") from exc


class AdvisorCitations(BaseModel):
    batch_codes: List[str] = Field(default_factory=list)
    care_log_ids: List[int] = Field(default_factory=list)

    model_config = ConfigDict(strict=True, extra="forbid")


class AdvisorResponse(BaseModel):
    reply: str
    citations: AdvisorCitations
    # Trường tương thích ngược: model cũ không trả về vẫn parse được.
    missing_data: List[str] = Field(default_factory=list)
    contradictions: List[str] = Field(default_factory=list)

    model_config = ConfigDict(strict=True, extra="forbid")


def normalize_prompt(text: str) -> str:
    """Chuẩn hóa câu hỏi trước khi lưu lịch sử: gộp khoảng trắng, giới hạn độ dài."""
    return " ".join((text or "").split())[:MAX_LOGGED_PROMPT]


def record_advisor_exchange(
    db: Session,
    *,
    prompt: str,
    reply: str,
    batch_id: Optional[int],
    guard_triggered: bool,
    ai_available: bool,
    missing_data: Optional[List[str]] = None,
    contradictions: Optional[List[str]] = None,
) -> None:
    """Ghi một lượt hỏi đáp vào ai_suggestions.

    Bảng hiện có chưa có cột riêng cho guard_triggered/ai_available nên hai cờ
    này được lưu trong input_data (JSON). Không đổi schema.
    """
    try:
        ai_repo.create(
            db,
            "advisor",
            batch_id,
            json.dumps(
                {
                    "prompt": normalize_prompt(prompt),
                    "guard_triggered": bool(guard_triggered),
                    "ai_available": bool(ai_available),
                },
                ensure_ascii=False,
            ),
            json.dumps(
                {
                    "reply": reply,
                    "missing_data": missing_data or [],
                    "contradictions": contradictions or [],
                },
                ensure_ascii=False,
            ),
            DISCLAIMER_TEXT,
            datetime.now(timezone.utc),
            description=(reply or "").strip() or "Trợ lý AI đã phản hồi cho người dùng.",
        )
    except Exception as exc:  # noqa: BLE001 - lỗi ghi log không được làm hỏng câu trả lời
        logger.warning("Không ghi được lịch sử ai_advisor: %s", exc)
        db.rollback()

def build_system_context(
    db: Session,
    batch_id: Optional[int] = None,
    assigned_plot_id: Optional[int] = None,
) -> str:
    """Truy vấn CSDL để lấy bối cảnh dữ liệu thực tế của trang trại."""
    context_lines = ["Dưới đây là thông tin thực tế từ hệ thống quản lý trang trại:"]

    plot_query = db.query(Plot)
    batch_query = db.query(CropBatch)
    variety_query = db.query(PlantVariety)
    if assigned_plot_id is not None:
        plot_query = plot_query.filter(Plot.id == assigned_plot_id)
        batch_query = batch_query.filter(CropBatch.plot_id == assigned_plot_id)
        variety_query = (
            variety_query.join(CropBatch, CropBatch.variety_id == PlantVariety.id)
            .filter(CropBatch.plot_id == assigned_plot_id)
            .distinct()
        )

    total_plots = plot_query.count()
    total_batches = batch_query.count()
    total_varieties = variety_query.count()
    growing_batches = batch_query.filter(CropBatch.status == "growing").count()

    context_lines.append(
        f"- Tổng quan dữ liệu hệ thống: {total_plots} lô đất, {total_batches} lô trồng, "
        f"{total_varieties} giống cây, {growing_batches} lô đang hoạt động."
    )

    if batch_id:
        batch_query = db.query(CropBatch).filter(CropBatch.id == batch_id)
        if assigned_plot_id is not None:
            batch_query = batch_query.filter(CropBatch.plot_id == assigned_plot_id)
        batch = batch_query.first()
        if batch:
            batch_name = getattr(batch, "name", f"Lô {batch.id}")
            planting_date = getattr(batch, "sow_date", None) or "Chưa rõ"
            context_lines.append(
                f"- Lô đang chọn: ID {batch.id}, Mã lô: "
                f"{getattr(batch, 'batch_code', None) or getattr(batch, 'code', 'N/A')}, "
                f"Tên: {batch_name}, Ngày gieo: {planting_date}"
            )

            order_col = getattr(CareLog, "log_date", CareLog.id)
            logs = (
                db.query(CareLog)
                .filter(CareLog.crop_batch_id == batch_id)
                .order_by(order_col.desc())
                .limit(10)
                .all()
            )
            if logs:
                context_lines.append("  + Hoạt động chăm sóc gần đây:")
                for log in logs:
                    log_date = getattr(log, "log_date", "N/A")
                    action = getattr(log, "action_type", "Chăm sóc")
                    notes = getattr(log, "notes", "")
                    context_lines.append(
                        f"    * Nhật ký ID {log.id}, Ngày {log_date}: {action} - {notes}"
                    )
            else:
                context_lines.append("- Chưa đủ dữ liệu ghi nhận nhật ký chăm sóc.")
        else:
            context_lines.append("- Chưa đủ dữ liệu ghi nhận cho lô được yêu cầu.")
    else:
        batch_query = db.query(CropBatch)
        if assigned_plot_id is not None:
            batch_query = batch_query.filter(CropBatch.plot_id == assigned_plot_id)
        batches = batch_query.order_by(CropBatch.id.asc()).limit(10).all()
        if batches:
            context_lines.append("- Danh sách các lô hiện có trong hệ thống:")
            for b in batches[:10]:
                b_name = getattr(b, "name", f"Lô {b.id}")
                b_status = getattr(b, "status", "Đang hoạt động")
                b_code = getattr(b, "batch_code", None) or getattr(b, "code", "N/A")
                context_lines.append(
                    f"  + {b_name} (ID: {b.id}, batch_code: {b_code}): "
                    f"Trạng thái {b_status}"
                )
        else:
            context_lines.append("- Hiện chưa có dữ liệu lô trồng trong hệ thống.")

    return "\n".join(context_lines)

@router.post("/summary", response_model=AiSummaryOut, summary="Tóm tắt nhật ký chăm sóc bằng AI")
def summarize_with_advisor(
    request: BatchSummaryRequest,
    db: Session = Depends(get_db),
):
    """Alias tương thích Frontend: POST /api/v1/ai-advisor/summary."""
    identifier = request.lot_id
    if identifier is None or str(identifier).strip() == "":
        identifier = request.crop_batch_id
    if identifier is None or str(identifier).strip() == "":
        identifier = request.batch_id
    return summary_service.summarize_batch(db, identifier if identifier is not None else "")


@router.post("/chat")
def chat_with_advisor(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_prompt = payload.message or payload.prompt or ""

    if not user_prompt.strip():
        return {
            "reply": "Vui lòng nhập câu hỏi.",
            "response": "Vui lòng nhập câu hỏi.",
            "disclaimer": DISCLAIMER_TEXT
        }

    # 1. Trích xuất dữ liệu từ Database làm ngữ cảnh
    user_role = str(current_user.get("role", "")).strip().lower()
    assigned_plot_id = None
    if user_role in {"staff", "worker"}:
        assigned_plot_id = current_user.get("plot_id")
        if assigned_plot_id is None:
            raise HTTPException(status_code=403, detail="Tài khoản chưa được phân công lô đất.")
        if payload.batch_id is not None:
            assigned_batch = db.query(CropBatch).filter(CropBatch.id == payload.batch_id).first()
            if assigned_batch is None or assigned_batch.plot_id != assigned_plot_id:
                raise HTTPException(
                    status_code=403,
                    detail="Bạn chỉ có thể hỏi AI về lô trồng được phân công.",
                )

    db_context = build_system_context(
        db,
        batch_id=payload.batch_id,
        assigned_plot_id=assigned_plot_id,
    )

    # 2. Ghép dữ liệu CSDL vào System Prompt
    system_prompt = (
        "Bạn là chuyên gia cố vấn nông nghiệp thông minh của trang trại GreenFarm.\n"
        "Chỉ sử dụng dữ liệu thực tế SQLite dưới đây. Không suy đoán hoặc tự tạo mã lô/ID. "
        "Nếu dữ liệu không đủ, hãy trả lời chính xác 'Chưa đủ dữ liệu ghi nhận'. "
        "Khi người dùng hỏi về tổng quan thống kê như số lượng lô trồng, lô đất, giống cây, "
        "hãy ưu tiên đọc ngay phần 'Tổng quan dữ liệu hệ thống' và trả lời từ số liệu thực tế đó. "
        "Không ghi mã lô hoặc ID nhật ký trong nội dung reply; chỉ đưa mã lô và ID đã thấy "
        "vào mảng citations. "
        "Trả về JSON có reply, citations, missing_data và contradictions; citations gồm "
        "batch_codes và care_log_ids.\n"
        f"{ai_guard.SAFETY_RULES}\n"
        f"{db_context}"
    )

    try:
        response = call_gemini_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=AdvisorResponse,
        )
    except Exception as exc:  # noqa: BLE001 - AI lỗi thì trả kết quả dự phòng
        logger.warning("AI advisor không khả dụng, dùng câu trả lời dự phòng: %s", exc)
        record_advisor_exchange(
            db,
            prompt=user_prompt,
            reply=FALLBACK_REPLY,
            batch_id=payload.batch_id,
            guard_triggered=False,
            ai_available=False,
        )
        return {
            "reply": FALLBACK_REPLY,
            "response": FALLBACK_REPLY,
            "disclaimer": DISCLAIMER_TEXT,
            "ai_available": False,
        }

    batch_codes = response.citations.batch_codes
    care_log_ids = response.citations.care_log_ids
    if batch_codes:
        batch_query = db.query(CropBatch.batch_code).filter(CropBatch.batch_code.in_(batch_codes))
        if assigned_plot_id is not None:
            batch_query = batch_query.filter(CropBatch.plot_id == assigned_plot_id)
        existing_batch_codes = {
            code
            for (code,) in batch_query.all()
        }
        if set(batch_codes) != existing_batch_codes:
            raise HTTPException(
                status_code=502,
                detail="AI đã tham chiếu mã lô không tồn tại trong cơ sở dữ liệu.",
            )
    if care_log_ids:
        log_query = db.query(CareLog.id).join(CropBatch, CareLog.crop_batch_id == CropBatch.id)
        log_query = log_query.filter(CareLog.id.in_(care_log_ids))
        if assigned_plot_id is not None:
            log_query = log_query.filter(CropBatch.plot_id == assigned_plot_id)
        existing_log_ids = {
            log_id
            for (log_id,) in log_query.all()
        }
        if set(care_log_ids) != existing_log_ids:
            raise HTTPException(
                status_code=502,
                detail="AI đã tham chiếu nhật ký chăm sóc không tồn tại trong cơ sở dữ liệu.",
            )

    # Hậu kiểm nội dung: liều lượng, tên thuốc, cam kết năng suất, năm sai.
    allowed_years = ai_guard.find_years(db_context) | {date.today().year}
    safe_reply, reasons = ai_guard.sanitize_text(response.reply, allowed_years)
    if "nam_khong_khop" in reasons:
        logger.warning(
            "AI advisor trả lời chứa năm không khớp dữ liệu: %s",
            ai_guard.find_years(response.reply),
        )
        record_advisor_exchange(
            db,
            prompt=user_prompt,
            reply=WRONG_YEAR_FALLBACK,
            batch_id=payload.batch_id,
            guard_triggered=True,
            ai_available=False,
        )
        return {
            "reply": WRONG_YEAR_FALLBACK,
            "response": WRONG_YEAR_FALLBACK,
            "disclaimer": DISCLAIMER_TEXT,
            "missing_data": [],
            "contradictions": [],
            "guard_triggered": True,
            "ai_available": False,
        }

    missing_data = [
        str(item).strip() for item in (response.missing_data or []) if str(item).strip()
    ]
    contradictions = [
        str(item).strip() for item in (response.contradictions or []) if str(item).strip()
    ]

    if payload.batch_id:
        selected_batch = (
            db.query(CropBatch).filter(CropBatch.id == payload.batch_id).first()
        )
        batch_logs = (
            db.query(CareLog)
            .filter(CareLog.crop_batch_id == payload.batch_id)
            .all()
        )
        for note in ai_guard.detect_log_contradictions(batch_logs):
            if note not in contradictions:
                contradictions.append(note)
        if (
            selected_batch is not None
            and getattr(selected_batch, "sow_date", None) is None
            and not ai_guard.has_missing_data_mention(" ".join([safe_reply, *missing_data]))
        ):
            missing_data.insert(0, ai_guard.MISSING_SOW_DATE_NOTE)
            safe_reply = f"{ai_guard.MISSING_SOW_DATE_NOTE} {safe_reply}".strip()

    record_advisor_exchange(
        db,
        prompt=user_prompt,
        reply=safe_reply,
        batch_id=payload.batch_id,
        guard_triggered=bool(reasons),
        ai_available=True,
        missing_data=missing_data,
        contradictions=contradictions,
    )

    return {
        "reply": safe_reply,
        "response": safe_reply,
        "disclaimer": DISCLAIMER_TEXT,
        "missing_data": missing_data,
        "contradictions": contradictions,
        "guard_triggered": bool(reasons),
        "ai_available": True,
    }
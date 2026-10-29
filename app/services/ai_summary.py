from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime
import json
import logging

from app.models.crop_batch import CropBatch
from app.repositories import crop_batch as batch_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import care_log as care_log_repo
from app.repositories import plot as plot_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.schemas.ai_summary import SummaryAIRaw, AiSummaryOut

logger = logging.getLogger(__name__)

LOG_TYPE_LABEL = {
    "tuoi": "Tưới nước",
    "bon_phan": "Bón phân",
    "sau_benh": "Kiểm tra sâu bệnh",
    "khac": "Khác",
}

MAX_LOGS_FOR_SUMMARY = 100
MAX_NOTE_LENGTH = 2000

# Trạng thái được coi là "đang canh tác" (ưu tiên khi chọn lô trên một thửa đất).
ACTIVE_STATUS_KEYWORDS = (
    "đang",
    "growing",
    "planting",
    "active",
    "sinh trưởng",
    "canh tác",
    "chăm sóc",
)

SYSTEM_PROMPT = (
    "Ban la tro ly quan ly trang trai. QUY TAC BAT BUOC:\n"
    "1) CHI duoc su dung thong tin co trong du lieu nhat ky duoc cung cap o "
    "phan USER. TUYET DOI khong duoc suy dien, gia dinh, hay bo sung bat ky "
    "chi tiet nao khong co trong du lieu (vi du: khong tu bia ngay thang, "
    "khong tu bia loai sau benh neu nhat ky khong ghi ro).\n"
    "2) Voi MOI nhat ky ban su dung de dua ra tom tat hoac phat hien van de, "
    "BAT BUOC phai dua ID cua nhat ky do vao truong referenced_log_ids. "
    "Neu ban khong the tim thay ID cho 1 nhan dinh nao do, KHONG duoc dua "
    "nhan dinh do vao ket qua.\n"
    "3) Day la tom tat tham khao, khong thay the danh gia cua chuyen gia "
    "nong nghiep."
)


def _format_logs_for_prompt(logs) -> str:
    lines = []
    for log in logs:
        action_type = log.action_type or "Chăm sóc"
        label = LOG_TYPE_LABEL.get(action_type, action_type)
        log_date = str(log.log_date or log.created_at or "Không rõ ngày")
        notes = (log.notes or log.description or "")[:MAX_NOTE_LENGTH]
        line = f"- [ID {log.id}] [{log_date}] {label}: {notes or '(không ghi chú)'}"
        lines.append(line)
    return "\n".join(lines)


def _is_active_batch(batch: CropBatch) -> bool:
    status = str(batch.status or "").strip().lower()
    return any(keyword in status for keyword in ACTIVE_STATUS_KEYWORDS)


def _latest_batch_on_plot(db: Session, plot_id: int):
    """Lấy lô đang canh tác gần nhất trên thửa đất, nếu không có thì lấy lô mới nhất."""
    batches = (
        db.query(CropBatch)
        .filter(CropBatch.plot_id == plot_id)
        .order_by(CropBatch.id.desc())
        .all()
    )
    if not batches:
        return None
    for batch in batches:
        if _is_active_batch(batch):
            return batch
    return batches[0]


def resolve_batch(db: Session, identifier) -> "CropBatch | None":
    """
    Tìm lô trồng từ mã người dùng gửi lên. Hỗ trợ lần lượt:
      1. ID số          -> CropBatch.id            (ví dụ: 1, 2)
      2. Mã lô trồng    -> CropBatch.batch_code    (ví dụ: "CB-1789654127")
      3. Tên lô trồng   -> CropBatch.name          (ví dụ: "a1")
      4. Mã thửa đất    -> Plot.code               (ví dụ: "LO-309")
         -> lấy lô đang canh tác gần nhất trên thửa đất đó.
    """
    if identifier is None:
        return None
    ident = str(identifier).strip()
    if not ident:
        return None

    # 1. ID số
    if ident.isdecimal():
        batch = batch_repo.get_by_id(db, int(ident))
        if batch is not None:
            return batch

    ident_lower = ident.lower()

    # 2. Mã lô trồng (không phân biệt hoa/thường)
    batch = (
        db.query(CropBatch)
        .filter(func.lower(CropBatch.batch_code) == ident_lower)
        .first()
    )
    if batch is not None:
        return batch

    # 3. Tên lô trồng (ví dụ người dùng chọn "a1" trong danh sách lô)
    batch = (
        db.query(CropBatch)
        .filter(func.lower(CropBatch.name) == ident_lower)
        .order_by(CropBatch.id.desc())
        .first()
    )
    if batch is not None:
        return batch

    # 4. Mã thửa đất -> lô đang canh tác gần nhất trên thửa đất
    plot = plot_repo.get_by_code(db, ident)
    if plot is not None:
        batch = _latest_batch_on_plot(db, plot.id)
        if batch is not None:
            return batch

    return None


def _build_result(
    *,
    batch_id: int = 0,
    batch_code: str = "",
    summary: str,
    issues=(),
    recommendations=(),
    log_count: int = 0,
    referenced_log_ids=(),
    created_at: datetime | None = None,
) -> AiSummaryOut:
    """Tạo response ĐẦY ĐỦ mọi trường để không bao giờ lỗi ResponseValidationError."""
    issues_list = list(issues or [])
    return AiSummaryOut(
        batch_id=batch_id or 0,
        batch_code=str(batch_code or ""),
        summary=summary,
        issues_detected=issues_list,
        key_issues=issues_list,
        recommendations=list(recommendations or []),
        log_count=log_count,
        referenced_log_ids=list(referenced_log_ids or []),
        disclaimer=DISCLAIMER_TEXT,
        created_at=created_at or datetime.now(),
    )


def _fallback_summary(
    batch_code: str,
    *,
    batch_id: int = 0,
    log_count: int = 0,
    unavailable_batch: bool = False,
) -> AiSummaryOut:
    if unavailable_batch:
        summary = "Không tìm thấy lô trồng tương ứng để phân tích."
        issues = ["Không tìm thấy thông tin lô trồng"]
        recommendations = ["Vui lòng chọn lại lô trồng trong danh sách."]
    else:
        summary = "Đã ghi nhận các hoạt động chăm sóc gần đây trên lô đất."
        issues = ["Dịch vụ AI tạm thời gián đoạn"]
        recommendations = ["Vui lòng kiểm tra lại nhật ký chăm sóc thủ công trong danh sách."]

    return _build_result(
        batch_id=batch_id,
        batch_code=batch_code,
        summary=summary,
        issues=issues,
        recommendations=recommendations,
        log_count=log_count,
    )


def summarize_batch(db: Session, batch_id: str | int) -> AiSummaryOut:
    identifier = "" if batch_id is None else str(batch_id).strip()

    try:
        batch = resolve_batch(db, identifier)
    except Exception:
        logger.exception("Failed to resolve crop batch for AI summary: %s", identifier)
        return _fallback_summary(identifier, unavailable_batch=True)

    if batch is None:
        logger.warning("AI summary requested for unknown crop batch: %s", identifier)
        return _fallback_summary(identifier, unavailable_batch=True)

    try:
        return _summarize_resolved_batch(db, batch)
    except Exception:
        # Chốt an toàn cuối cùng: mọi lỗi bất ngờ (CSDL, parse...) đều trả 200 + fallback
        logger.exception("AI summary failed unexpectedly for crop batch %s", batch.id)
        return _fallback_summary(batch.batch_code, batch_id=batch.id)


def _summarize_resolved_batch(db: Session, batch: CropBatch) -> AiSummaryOut:
    variety = variety_repo.get_by_id(db, batch.variety_id)
    logs = care_log_repo.get_by_batch(db, batch.id)
    now = datetime.now()

    if len(logs) == 0:
        return _build_result(
            batch_id=batch.id,
            batch_code=batch.batch_code,
            summary="Lô đất hiện chưa ghi nhận nhật ký chăm sóc nào.",
            issues=["Chưa có dữ liệu nhật ký chăm sóc"],
            recommendations=[
                "Hãy thêm nhật ký tưới nước, bón phân hoặc kiểm tra sâu bệnh cho lô này "
                "để AI có thể phân tích tổng hợp."
            ],
            log_count=0,
            created_at=now,
        )

    logs = logs[-MAX_LOGS_FOR_SUMMARY:]
    valid_log_ids = {log.id for log in logs}  # "nguồn sự thật" để đối chiếu

    variety_name = variety.name if variety else "(không rõ giống)"
    user_prompt = (
        f"Lô trồng: {batch.batch_code} - giống {variety_name}, gieo ngày {batch.sow_date or 'chưa rõ'}.\n"
        f"Nhat ky cham soc ({len(logs)} ban ghi, sap xep theo thoi gian, moi dong co ID rieng "
        f"o dau - hay dung dung ID nay khi trich dan):\n"
        f"{_format_logs_for_prompt(logs)}\n\n"
        "Hay tom tat tinh trang hien tai cua lo trong 3-4 cau, neu ro neu co dau hieu "
        "bat thuong (sau benh, thieu cham soc keo dai). Hay de xuat cac buoc tiep theo "
        "chi dua tren du lieu da ghi. Dien ro recommendations va referenced_log_ids."
    )

    try:
        ai_result: SummaryAIRaw = call_gemini_structured(
            SYSTEM_PROMPT, user_prompt, SummaryAIRaw
        )

        cited_ids = set(ai_result.referenced_log_ids or [])
        invalid_ids = cited_ids - valid_log_ids
        if invalid_ids:
            raise ValueError(f"Gemini referenced unknown care logs: {sorted(invalid_ids)}")
        if not cited_ids:
            raise ValueError("Gemini did not cite any care logs")
    except Exception:
        logger.exception("Gemini summary generation failed for crop batch %s", batch.id)
        return _fallback_summary(batch.batch_code, batch_id=batch.id, log_count=len(logs))

    result = _build_result(
        batch_id=batch.id,
        batch_code=batch.batch_code,
        summary=ai_result.summary,
        issues=ai_result.issues_detected,
        recommendations=ai_result.recommendations,
        log_count=len(logs),
        referenced_log_ids=sorted(cited_ids),
        created_at=now,
    )

    try:
        ai_repo.create(
            db,
            "summary",
            batch.id,
            json.dumps({"user_prompt": user_prompt}),
            json.dumps(result.model_dump(mode="json")),
            DISCLAIMER_TEXT,
            now,
        )
    except Exception:
        # Lưu lịch sử gợi ý là phụ, không được làm hỏng kết quả trả về.
        logger.exception("Failed to persist AI summary for crop batch %s", batch.id)

    return result

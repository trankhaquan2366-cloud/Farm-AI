from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException
import json
import logging

from app.models.crop_batch import CropBatch
from app.repositories import crop_batch as batch_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import care_log as care_log_repo
from app.repositories import plot as plot_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.core import ai_guard
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
    "Bạn là trợ lý quản lý trang trại. QUY TẮC BẮT BUỘC:\n"
    "1) CHỈ được sử dụng thông tin có trong dữ liệu nhật ký được cung cấp ở "
    "phần USER. TUYỆT ĐỐI không được suy diễn, giả định, hay bổ sung bất kỳ "
    "chi tiết nào không có trong dữ liệu (ví dụ: không tự bịa ngày tháng, "
    "không tự bịa loại sâu bệnh nếu nhật ký không ghi rõ).\n"
    "2) Với MỌI nhật ký bạn sử dụng để đưa ra tóm tắt hoặc phát hiện vấn đề, "
    "BẮT BUỘC phải đưa ID của nhật ký đó vào trường referenced_log_ids. "
    "Nếu bạn không thể tìm thấy ID cho một nhận định nào đó, KHÔNG được đưa "
    "nhận định đó vào kết quả.\n"
    "3) Đây là tóm tắt tham khảo, không thay thế đánh giá của chuyên gia "
    "nông nghiệp.\n"
    f"{ai_guard.SAFETY_RULES}"
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
    ai_available: bool = True,
    missing_data=(),
    contradictions=(),
    guard_triggered: bool = False,
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
        missing_data=list(missing_data or []),
        contradictions=list(contradictions or []),
        guard_triggered=guard_triggered,
        ai_available=ai_available,
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
        ai_available=False,
    )


def _is_plot_scoped_user(current_user) -> bool:
    role = (current_user or {}).get("role") if isinstance(current_user, dict) else None
    return str(role or "").strip().lower() in {"staff", "worker"}


def summarize_batch(
    db: Session, batch_id: str | int, current_user=None
) -> AiSummaryOut:
    identifier = "" if batch_id is None else str(batch_id).strip()

    try:
        batch = resolve_batch(db, identifier)
    except Exception:
        logger.exception("Failed to resolve crop batch for AI summary: %s", identifier)
        return _fallback_summary(identifier, unavailable_batch=True)

    if batch is None:
        logger.warning("AI summary requested for unknown crop batch: %s", identifier)
        return _fallback_summary(identifier, unavailable_batch=True)

    # STAFF chỉ được tóm tắt lô thuộc thửa đất mình phụ trách.
    if _is_plot_scoped_user(current_user) and getattr(batch, "plot_id", None) != current_user.get(
        "plot_id"
    ):
        raise HTTPException(
            status_code=403,
            detail="Tài khoản không được phân công lô trồng này",
        )

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
        missing_data = []
        summary_text = "Lô đất hiện chưa ghi nhận nhật ký chăm sóc nào."
        if batch.sow_date is None:
            missing_data.append(ai_guard.MISSING_SOW_DATE_NOTE)
            summary_text = f"{ai_guard.MISSING_SOW_DATE_NOTE} {summary_text}"
        return _build_result(
            batch_id=batch.id,
            batch_code=batch.batch_code,
            summary=summary_text,
            issues=["Chưa có dữ liệu nhật ký chăm sóc"],
            recommendations=[
                "Hãy thêm nhật ký tưới nước, bón phân hoặc kiểm tra sâu bệnh cho lô này "
                "để AI có thể phân tích tổng hợp."
            ],
            log_count=0,
            created_at=now,
            missing_data=missing_data,
        )

    logs = logs[-MAX_LOGS_FOR_SUMMARY:]
    valid_log_ids = {log.id for log in logs}  # "nguồn sự thật" để đối chiếu

    variety_name = variety.name if variety else "(không rõ giống)"
    user_prompt = (
        f"Lô trồng: {batch.batch_code} - giống {variety_name}, gieo ngày {batch.sow_date or 'chưa rõ'}.\n"
        f"Nhat ky cham soc ({len(logs)} ban ghi, sap xep theo thoi gian, moi dong co ID rieng "
        f"o dau - hay dung dung ID nay khi trich dan):\n"
        f"{_format_logs_for_prompt(logs)}\n\n"
        "Hãy tóm tắt tình trạng hiện tại của lô trong 3-4 câu, nêu rõ nếu có dấu hiệu "
        "bất thường (sâu bệnh, thiếu chăm sóc kéo dài). Hãy đề xuất các bước tiếp theo "
        "chỉ dựa trên dữ liệu đã ghi. Điền rõ recommendations, referenced_log_ids, "
        "missing_data và contradictions (để trống nếu không có)."
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

    # ===== HẬU KIỂM NỘI DUNG (app/core/ai_guard.py) =====
    allowed_years = ai_guard.allowed_years_for_batch(batch, logs)
    summary_text, summary_reasons = ai_guard.sanitize_text(ai_result.summary, allowed_years)
    issues, issue_reasons = ai_guard.sanitize_list(ai_result.issues_detected, allowed_years)
    recommendations, recommendation_reasons = ai_guard.sanitize_list(
        ai_result.recommendations, allowed_years
    )
    reasons = sorted({*summary_reasons, *issue_reasons, *recommendation_reasons})

    missing_data = [
        str(item).strip() for item in (ai_result.missing_data or []) if str(item).strip()
    ]
    contradictions = [
        str(item).strip() for item in (ai_result.contradictions or []) if str(item).strip()
    ]
    for note in ai_guard.detect_log_contradictions(logs):
        if note not in contradictions:
            contradictions.append(note)
    for note in contradictions:
        if note not in issues:
            issues.append(note)

    # AI bỏ sót ngày gieo: backend tự bổ sung để người dùng không hiểu sai.
    if batch.sow_date is None and not ai_guard.has_missing_data_mention(
        " ".join([summary_text, *missing_data])
    ):
        missing_data.insert(0, ai_guard.MISSING_SOW_DATE_NOTE)
        summary_text = f"{ai_guard.MISSING_SOW_DATE_NOTE} {summary_text}".strip()

    # Sai năm là lỗi nghiêm trọng (có thể khiến người dùng hiểu sai thời vụ):
    # loại bỏ toàn bộ nội dung AI, trả kết quả dự phòng thay vì cố sửa câu chữ.
    if "nam_khong_khop" in reasons:
        logger.warning(
            "AI summary chứa năm không khớp dữ liệu (lô %s): %s",
            batch.id,
            ai_guard.find_years(summary_text),
        )
        result = _build_result(
            batch_id=batch.id,
            batch_code=batch.batch_code,
            summary=(
                "Chưa đủ dữ liệu: nội dung AI không khớp năm trong dữ liệu gốc nên "
                "đã bị loại bỏ để tránh sai lệch thời vụ."
            ),
            issues=[ai_guard.GUARD_ISSUE, *issues],
            recommendations=recommendations,
            log_count=len(logs),
            referenced_log_ids=sorted(cited_ids),
            created_at=now,
            missing_data=missing_data,
            contradictions=contradictions,
            guard_triggered=True,
            ai_available=False,
        )
    else:
        guard_triggered = bool(reasons)
        if guard_triggered:
            issues = [ai_guard.GUARD_ISSUE, *issues]

        result = _build_result(
            batch_id=batch.id,
            batch_code=batch.batch_code,
            summary=summary_text,
            issues=issues,
            recommendations=recommendations,
            log_count=len(logs),
            referenced_log_ids=sorted(cited_ids),
            created_at=now,
            missing_data=missing_data,
            contradictions=contradictions,
            guard_triggered=guard_triggered,
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
            description=getattr(result, "summary", None)
            or getattr(result, "recommendations", None)
            or "Tóm tắt AI cho lô trồng.",
        )
    except Exception:
        # Lưu lịch sử gợi ý là phụ, không được làm hỏng kết quả trả về.
        logger.exception("Failed to persist AI summary for crop batch %s", batch.id)

    return result

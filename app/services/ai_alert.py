from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status
import json
import logging

from app.repositories import crop_batch as batch_repo
from app.repositories import care_log as care_log_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.core import ai_guard
from app.schemas.ai_alert import AlertAIRaw, AiAlertOut, BatchAlertItemRaw

logger = logging.getLogger(__name__)

PEST_LOOKBACK_DAYS = 14  # ngưỡng "gần đây" để tính cảnh báo sâu bệnh
PEST_KEYWORDS = ("sâu", "bệnh", "rệp", "nấm", "héo", "vàng lá", "bọ trĩ")

SYSTEM_PROMPT = (
    "Ban la tro ly phan tich uu tien cong viec trang trai. QUY TAC BAT BUOC:\n"
    "1) CHI duoc chon batch_code TRONG danh sach duoc cung cap o phan USER. "
    "TUYET DOI khong duoc bia them batch_code khong co trong danh sach.\n"
    "2) Chi dua tren 2 chi so da duoc tinh san cho moi lo (so ngay chua co "
    "nhat ky, co canh bao sau benh gan day hay khong) - khong tu suy dien "
    "them thong tin khac.\n"
    "3) Xep hang toi da 5 lo uu tien nhat, priority_score tu 1 (khan cap "
    "nhat) den 5 (it khan cap nhat trong danh sach duoc chon).\n"
    "4) Day chi la goi y tham khao dua tren du lieu he thong, khong phai "
    "chan doan chuyen mon ve sau benh hay cay trong.\n"
    f"{ai_guard.SAFETY_RULES}"
)


def _compute_batch_facts(db: Session, batch) -> dict:
    logs = care_log_repo.get_by_batch(db, batch.id)
    now = datetime.now()

    dated_logs = []
    for log in logs:
        raw_date = log.log_date or log.created_at
        if isinstance(raw_date, datetime):
            log_date = raw_date
        else:
            try:
                log_date = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
                if log_date.tzinfo:
                    log_date = log_date.replace(tzinfo=None)
            except (TypeError, ValueError):
                continue
        dated_logs.append((log, log_date))

    if not dated_logs:
        days_since_last_log = None  # chưa từng có nhật ký nào - trường hợp đặc biệt
    else:
        last_log_date = max(log_date for _, log_date in dated_logs)
        days_since_last_log = (now - last_log_date).days

    has_recent_pest = any(
        (any(keyword in (log.notes or log.description or "").lower() for keyword in PEST_KEYWORDS)
         or "bệnh" in (log.action_type or "").lower())
        and (now - log_date).days <= PEST_LOOKBACK_DAYS
        for log, log_date in dated_logs
    )

    return {
        "batch_code": batch.batch_code,
        "days_since_last_log": days_since_last_log,
        "has_recent_pest": has_recent_pest,
    }


def _fallback_alert(facts: list[dict], now: datetime) -> AiAlertOut:
    """Xếp hạng dự phòng không dùng AI: ưu tiên sâu bệnh rồi số ngày chưa ghi nhật ký."""

    def sort_key(fact: dict) -> tuple[int, int]:
        days = fact["days_since_last_log"]
        days_for_sort = 10**6 if days is None else days
        return (0 if fact["has_recent_pest"] else 1, -days_for_sort)

    priority_batches = []
    for index, fact in enumerate(sorted(facts, key=sort_key)[:5], start=1):
        days = fact["days_since_last_log"]
        if days is None:
            reason = "Chưa có nhật ký chăm sóc nào"
        elif days <= 0:
            reason = "Đã có nhật ký chăm sóc hôm nay"
        else:
            reason = f"{days} ngày chưa ghi nhật ký chăm sóc"
        if fact["has_recent_pest"]:
            reason += "; có dấu hiệu sâu bệnh trong 14 ngày gần đây"
        priority_batches.append(
            BatchAlertItemRaw(
                batch_code=fact["batch_code"],
                priority_score=index,
                reason=reason,
            )
        )

    return AiAlertOut(
        total_growing_batches=len(facts),
        priority_batches=priority_batches,
        disclaimer=DISCLAIMER_TEXT,
        created_at=now,
        ai_available=False,
    )


def _persist_alert(db: Session, facts: list[dict], result: AiAlertOut, now: datetime) -> None:
    try:
        ai_repo.create(
            db,
            "alert",
            None,
            json.dumps({"facts": facts}),
            json.dumps(result.model_dump(mode="json")),
            DISCLAIMER_TEXT,
            now,
            description=(
                "Cảnh báo AI cho các lô cần kiểm tra ưu tiên."
                if result.priority_batches
                else "Không có lô nào cần cảnh báo theo AI."
            ),
        )
    except Exception:
        logger.exception("Không lưu được lịch sử cảnh báo AI")


def suggest_batches_to_check(db: Session) -> AiAlertOut:
    growing_batches = batch_repo.get_growing_batches(db)
    now = datetime.now()

    # Rủi ro "dữ liệu thiếu": không có lô nào đang trồng -> không gọi AI
    if len(growing_batches) == 0:
        result = AiAlertOut(
            total_growing_batches=0, priority_batches=[],
            disclaimer=DISCLAIMER_TEXT, created_at=now,
        )
        _persist_alert(db, [], result, now)
        return result

    facts = [_compute_batch_facts(db, b) for b in growing_batches]
    valid_batch_codes = {f["batch_code"] for f in facts}  # "nguồn sự thật" để đối chiếu

    facts_lines = []
    for f in facts:
        log_status = (
            "chua co nhat ky nao" if f["days_since_last_log"] is None
            else f"{f['days_since_last_log']} ngay chua co nhat ky moi"
        )
        pest_status = "CO canh bao sau benh gan day" if f["has_recent_pest"] else "khong co canh bao sau benh"
        facts_lines.append(f"- batch_code={f['batch_code']}: {log_status}, {pest_status}")

    user_prompt = (
        f"Danh sach {len(facts)} lo dang trong (status=growing):\n"
        + "\n".join(facts_lines)
        + "\n\nHay xep hang toi da 5 lo can kiem tra uu tien nhat, kem ly do ngan gon "
        "dua tren 2 chi so da cho."
    )

    try:
        ai_result: AlertAIRaw = call_gemini_structured(SYSTEM_PROMPT, user_prompt, AlertAIRaw)
    except Exception as exc:  # noqa: BLE001 - AI lỗi thì trả kết quả dự phòng, không 5xx
        logger.warning("AI alert không khả dụng, dùng xếp hạng dự phòng: %s", exc)
        result = _fallback_alert(facts, now)
        _persist_alert(db, facts, result, now)
        return result

    # ===== KIỂM CHỨNG chống hallucination =====
    # Lỗi AI bịa mã lô vẫn phải trả 502 để không che giấu hành vi sai.
    cited_codes = {item.batch_code for item in ai_result.priority_batches}
    invalid_codes = cited_codes - valid_batch_codes
    if invalid_codes:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI đề xuất batch_code không tồn tại trong danh sách lô đang trồng ({sorted(invalid_codes)}) - kết quả bị từ chối.",
        )
    if len(ai_result.priority_batches) > 5:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI trả về nhiều hơn 5 lô ưu tiên - vi phạm ràng buộc, kết quả bị từ chối.",
        )
    # ===== KẾT THÚC KIỂM CHỨNG =====

    # Hậu kiểm nội dung lý do: chặn liều lượng, tên thuốc, cam kết năng suất.
    allowed_years = {now.year}
    reasons: list[str] = []
    cleaned_items = []
    for item in ai_result.priority_batches:
        safe_reason, item_reasons = ai_guard.sanitize_text(item.reason, allowed_years)
        reasons.extend(item_reasons)
        cleaned_items.append(
            BatchAlertItemRaw(
                batch_code=item.batch_code,
                priority_score=item.priority_score,
                reason=safe_reason,
            )
        )
    if "nam_khong_khop" in reasons:
        logger.warning("AI alert chứa năm không khớp dữ liệu, dùng xếp hạng dự phòng")
        result = _fallback_alert(facts, now).model_copy(
            update={"guard_triggered": True}
        )
        _persist_alert(db, facts, result, now)
        return result

    missing_data = [
        str(item).strip() for item in (ai_result.missing_data or []) if str(item).strip()
    ]
    contradictions = [
        str(item).strip()
        for item in (ai_result.contradictions or [])
        if str(item).strip()
    ]

    result = AiAlertOut(
        total_growing_batches=len(growing_batches),
        priority_batches=cleaned_items,
        disclaimer=DISCLAIMER_TEXT,
        created_at=now,
        missing_data=missing_data,
        contradictions=contradictions,
        guard_triggered=bool(reasons),
        ai_available=True,
    )

    _persist_alert(db, facts, result, now)
    return result

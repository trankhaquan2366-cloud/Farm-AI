from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status
import json

from app.repositories import crop_batch as batch_repo
from app.repositories import care_log as care_log_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.schemas.ai_alert import AlertAIRaw, AiAlertOut

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
    "chan doan chuyen mon ve sau benh hay cay trong."
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


def suggest_batches_to_check(db: Session) -> AiAlertOut:
    growing_batches = batch_repo.get_growing_batches(db)
    now = datetime.now()

    # Rủi ro "dữ liệu thiếu": không có lô nào đang trồng -> không gọi AI
    if len(growing_batches) == 0:
        result = AiAlertOut(
            total_growing_batches=0, priority_batches=[],
            disclaimer=DISCLAIMER_TEXT, created_at=now,
        )
        ai_repo.create(db, "alert", None, json.dumps({"total": 0}),
                        json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)
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

    ai_result: AlertAIRaw = call_gemini_structured(SYSTEM_PROMPT, user_prompt, AlertAIRaw)

    # ===== KIỂM CHỨNG chống hallucination =====
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

    result = AiAlertOut(
        total_growing_batches=len(growing_batches),
        priority_batches=ai_result.priority_batches,
        disclaimer=DISCLAIMER_TEXT,
        created_at=now,
    )

    ai_repo.create(db, "alert", None, json.dumps({"facts": facts}),
                    json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)

    return result

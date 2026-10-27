from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status
import json

from app.repositories import crop_batch as batch_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import care_log as care_log_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.schemas.ai_summary import SummaryAIRaw, AiSummaryOut

LOG_TYPE_LABEL = {
    "tuoi": "Tưới nước",
    "bon_phan": "Bón phân",
    "sau_benh": "Kiểm tra sâu bệnh",
    "khac": "Khác",
}

MAX_LOGS_FOR_SUMMARY = 100
MAX_NOTE_LENGTH = 2000

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


def summarize_batch(db: Session, batch_id: int) -> AiSummaryOut:
    batch = batch_repo.get_by_id(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lô trồng")

    variety = variety_repo.get_by_id(db, batch.variety_id)
    logs = care_log_repo.get_by_batch(db, batch_id)
    now = datetime.now()

    if len(logs) == 0:
        result = AiSummaryOut(
            batch_code=batch.batch_code, log_count=0,
            summary="Lô trồng này chưa có nhật ký chăm sóc nào được ghi nhận, chưa đủ dữ liệu để tóm tắt.",
            issues_detected=[], referenced_log_ids=[], disclaimer=DISCLAIMER_TEXT, created_at=now,
        )
        ai_repo.create(db, "summary", batch_id, json.dumps({"log_count": 0}),
                        json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)
        return result

    logs = logs[-MAX_LOGS_FOR_SUMMARY:]
    valid_log_ids = {log.id for log in logs}  # "nguồn sự thật" để đối chiếu

    variety_name = variety.name if variety else "(không rõ giống)"
    user_prompt = (
        f"Lô trồng: {batch.batch_code} - giống {variety_name}, gieo ngày {batch.sow_date or 'chưa rõ'}.\n"
        f"Nhat ky cham soc ({len(logs)} ban ghi, sap xep theo thoi gian, moi dong co ID rieng "
        f"o dau - hay dung dung ID nay khi trich dan):\n"
        f"{_format_logs_for_prompt(logs)}\n\n"
        "Hay tom tat tinh trang hien tai cua lo trong 3-4 cau, neu ro neu co dau hieu "
        "bat thuong (sau benh, thieu cham soc keo dai). Nho dien day du referenced_log_ids."
    )

    ai_result: SummaryAIRaw = call_gemini_structured(SYSTEM_PROMPT, user_prompt, SummaryAIRaw)

    # ===== BƯỚC KIỂM CHỨNG (chống hallucination) =====
    # Đối chiếu MỌI id mà AI trích dẫn với danh sách id THẬT trong CSDL.
    # Nếu có dù chỉ 1 id không tồn tại/không thuộc lô này -> đây là bằng
    # chứng rõ ràng AI đã bịa - từ chối kết quả, không trả về cho người dùng.
    cited_ids = set(ai_result.referenced_log_ids)
    invalid_ids = cited_ids - valid_log_ids
    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"AI trích dẫn nhật ký không tồn tại trong dữ liệu thật (ID: {sorted(invalid_ids)}) "
                "- kết quả không đáng tin cậy, đã bị từ chối. Vui lòng thử lại."
            ),
        )
    # Thêm 1 lớp kiểm tra nữa: nếu AI đưa ra tóm tắt mà KHÔNG trích dẫn
    # nhật ký nào cả (referenced_log_ids rỗng) dù đã có dữ liệu -> nghi ngờ
    # AI không thực sự dựa vào dữ liệu, cũng từ chối.
    if len(cited_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI không trích dẫn nhật ký cụ thể nào để chứng minh tóm tắt - kết quả bị từ chối.",
        )
    # ===== KẾT THÚC KIỂM CHỨNG =====

    result = AiSummaryOut(
        batch_code=batch.batch_code, log_count=len(logs),
        summary=ai_result.summary, issues_detected=ai_result.issues_detected,
        referenced_log_ids=sorted(cited_ids), disclaimer=DISCLAIMER_TEXT, created_at=now,
    )

    ai_repo.create(db, "summary", batch_id, json.dumps({"user_prompt": user_prompt}),
                    json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)

    return result

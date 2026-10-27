from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.repositories import crop_batch as batch_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import farming_log as log_repo
from app.models.crop_batch import CropBatch
from app.models.farming_log import FarmingLog
from app.schemas.farming_log import AdviceAIRaw, AiAdvisorChatResponse, FarmingLogOut

SYSTEM_PROMPT = (
    "Bạn là chuyên gia nông nghiệp tư vấn cho người trồng rau sạch. "
    "Hãy dựa vào toàn bộ dữ liệu của tất cả các lô trồng và toàn bộ nhật ký chăm sóc trong trang trại được cung cấp; "
    "có thể tổng hợp và trả lời mọi câu hỏi liên quan đến bất kỳ ruộng/lô nào. "
    "Không suy diễn thông tin không có trong dữ liệu. "
    "Câu trả lời phải ngắn gọn, rõ ràng, có tính thực tế, phù hợp với quy trình canh tác. "
    "Nếu có dấu hiệu bất thường, hãy nêu rõ triệu chứng và cách xử lý ưu tiên."
)


def _format_all_batches_and_logs(db: Session) -> str:
    batches = db.query(CropBatch).all()
    if not batches:
        return "- Chưa có lô trồng nào trong hệ thống."

    result_lines = []
    for batch in batches:
        variety = variety_repo.get_by_id(db, batch.variety_id)
        variety_name = variety.name if variety else "không rõ"
        
        result_lines.append(f"--- LÔ TRỒNG: {batch.batch_name or batch.batch_code} (Mã: {batch.batch_code}) ---")
        result_lines.append(f"Giống cây: {variety_name}")
        result_lines.append(f"Ngày gieo: {batch.seeding_date}")
        result_lines.append(f"Dự kiến thu hoạch: {batch.expected_harvest_date or 'chưa xác định'}")
        result_lines.append(f"Trạng thái: {batch.status}")
        
        logs = db.query(FarmingLog).filter(FarmingLog.batch_id == batch.id).all()
        if logs:
            result_lines.append("Nhật ký chăm sóc:")
            for log in logs:
                result_lines.append(
                    f"  * {log.log_date} | {log.activity_type}: {log.description}"
                    + (f" | Ảnh: {log.image_url}" if log.image_url else "")
                )
        else:
            result_lines.append("Nhật ký chăm sóc: Chưa có ghi nhận.")
        result_lines.append("")

    return "\n".join(result_lines)


def generate_advice(db: Session, batch_id: int, user_question: str, log_history: Optional[List[FarmingLogOut]] = None):
    # Lấy toàn bộ thông tin tất cả các lô và nhật ký trong trang trại để cung cấp ngữ cảnh đầy đủ cho AI
    all_data_context = _format_all_batches_and_logs(db)

    context = (
        f"DỮ LIỆU TOÀN BỘ TRANG TRẠI (Tất cả các lô và nhật ký):\n"
        f"{all_data_context}\n"
        f"Câu hỏi của nông dân: {user_question}"
    )

    ai_result: AdviceAIRaw = call_gemini_structured(
        SYSTEM_PROMPT,
        context,
        AdviceAIRaw,
    )

    return AiAdvisorChatResponse(
        answer=ai_result.answer.strip(),
        disclaimer=DISCLAIMER_TEXT,
        generated_at=datetime.now(),
    )
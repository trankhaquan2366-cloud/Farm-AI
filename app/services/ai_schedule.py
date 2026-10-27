from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import HTTPException, status
import json

from app.repositories import crop_batch as batch_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.schemas.ai_schedule import ScheduleAIRaw, AiScheduleOut, ScheduleItemOut

SYSTEM_PROMPT = (
    "Bạn là trợ lý nông nghiệp của trang trại rau sạch, chuyên lập lịch chăm sóc "
    "tham khảo theo dữ liệu thật của lô trồng.\n"
    "QUY TẮC BẮT BUỘC:\n"
    "1) Chỉ trả về JSON đúng theo schema đã cung cấp.\n"
    "2) Tất cả nội dung trong trường description phải viết bằng tiếng Việt có dấu, "
    "đúng chính tả, đúng ngữ pháp, ngắn gọn và dễ hiểu. Không dùng tiếng Việt "
    "không dấu, không viết tắt và không dùng thuật ngữ mơ hồ.\n"
    "3) Mỗi description phải bắt đầu bằng động từ rõ ràng như 'Tưới', 'Bón', "
    "'Kiểm tra' hoặc 'Theo dõi', đồng thời nêu việc cần làm cụ thể.\n"
    "4) day_offset là số ngày kể từ ngày gieo, phải nằm trong khoảng từ 0 đến "
    "số ngày sinh trưởng tối đa được cung cấp. Không tự tính hoặc trả về trường date.\n"
    "5) Lịch phải có ít nhất một lần tưới nước, hai lần bón phân và hai lần kiểm "
    "tra sâu bệnh. Chỉ dựa trên dữ liệu được cung cấp, không tự bịa thông tin.\n"
    "6) Đây là lịch tham khảo, không thay thế đánh giá của chuyên gia nông nghiệp."
)

VIETNAMESE_DIACRITICS = (
    "ăâđêôơưĂÂĐÊÔƠƯ"
    "áàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệ"
    "íìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ"
    "ÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆ"
    "ÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ"
)


def _has_vietnamese_diacritics(text: str) -> bool:
    return any(character in VIETNAMESE_DIACRITICS for character in text)


def generate_schedule(db: Session, batch_id: int) -> AiScheduleOut:
    batch = batch_repo.get_by_id(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lô trồng")

    variety = variety_repo.get_by_id(db, batch.variety_id)
    if variety is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không tìm thấy giống cây của lô này")

    now = datetime.now()
    max_offset = getattr(variety, "growth_days", None)
    if not max_offset or max_offset <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giống cây chưa có thời gian sinh trưởng hợp lệ.",
        )
    seeding_date = batch.sow_date
    if seeding_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lô trồng chưa có ngày gieo hợp lệ.",
        )

    user_prompt = (
        f"Giống cây: {variety.name} (nhóm: {variety.category or 'chưa rõ'})\n"
        f"Thời gian sinh trưởng tối đa: {max_offset} ngày "
        f"(day_offset phải từ 0 đến {max_offset})\n"
        f"Ngày gieo: {seeding_date}\n\n"
        "Hãy đề xuất lịch chăm sóc tham khảo gồm tưới nước định kỳ, ít nhất hai "
        "lần bón phân và ít nhất hai lần kiểm tra sâu bệnh. Mỗi mô tả phải viết "
        "bằng tiếng Việt có dấu, đúng chính tả, đúng ngữ pháp và hướng dẫn rõ "
        "người làm vườn cần thực hiện việc gì."
    )

    ai_result: ScheduleAIRaw = call_gemini_structured(SYSTEM_PROMPT, user_prompt, ScheduleAIRaw)

    # ===== KIỂM CHỨNG chống hallucination =====
    # 1) Không có item nào được vượt quá số ngày sinh trưởng thật của giống cây
    out_of_range = [item for item in ai_result.schedule if item.day_offset > max_offset]
    if out_of_range:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"AI đề xuất mốc chăm sóc vượt quá thời gian sinh trưởng thật "
                f"({max_offset} ngày) - kết quả bị từ chối."
            ),
        )
    # 2) Đủ số lượng tối thiểu theo yêu cầu nghiệp vụ đã thiết kế ở KT1
    count_tuoi = sum(1 for i in ai_result.schedule if i.task_type == "tuoi")
    count_bon_phan = sum(1 for i in ai_result.schedule if i.task_type == "bon_phan")
    count_sau_benh = sum(1 for i in ai_result.schedule if i.task_type == "kiem_tra_sau_benh")
    if not ai_result.schedule or count_tuoi < 1 or count_bon_phan < 2 or count_sau_benh < 2:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"AI trả về lịch không đủ tối thiểu (cần >=1 tưới, >=2 bón phân, "
                f">=2 kiểm tra sâu bệnh; nhận được {count_tuoi} tưới, "
                f"{count_bon_phan} bón phân, {count_sau_benh} kiểm tra) "
                "- kết quả bị từ chối."
            ),
        )
        invalid_descriptions = [
            item for item in ai_result.schedule
            if not _has_vietnamese_diacritics(item.description)
        ]
        if invalid_descriptions:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI trả về mô tả lịch chăm sóc chưa có dấu tiếng Việt hoặc không đúng yêu cầu.",
            )
    # ===== KẾT THÚC KIỂM CHỨNG =====

    # 3) TỰ TÍNH ngày thật từ day_offset - không dùng bất kỳ phép tính ngày
    # tháng nào do AI đưa ra, loại bỏ hẳn rủi ro AI tính sai lịch.
    schedule_out = sorted(
        [
            ScheduleItemOut(
                day_offset=item.day_offset,
                date=seeding_date + timedelta(days=item.day_offset),
                task_type=item.task_type,
                description=item.description,
            )
            for item in ai_result.schedule
        ],
        key=lambda x: x.day_offset,
    )

    result = AiScheduleOut(
        batch_code=batch.batch_code,
        seeding_date=seeding_date,
        expected_harvest_date=batch.expected_harvest_date,  # lấy từ CSDL thật, không phải AI
        schedule=schedule_out,
        disclaimer=DISCLAIMER_TEXT,
        created_at=now,
    )

    ai_repo.create(db, "schedule", batch_id, json.dumps({"user_prompt": user_prompt}),
                    json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)

    return result

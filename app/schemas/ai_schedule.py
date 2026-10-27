from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import date, datetime

TaskType = Literal["tuoi", "bon_phan", "kiem_tra_sau_benh"]


class ScheduleItemRaw(BaseModel):
    day_offset: int = Field(..., ge=0)  # số ngày kể từ lúc gieo - Service sẽ tự tính lại ngày thật
    task_type: TaskType
    description: str = Field(
        ...,
        min_length=10,
        max_length=300,
        description="Mô tả tiếng Việt có dấu, đúng ngữ pháp, dễ hiểu và có hướng dẫn cụ thể.",
    )


class ScheduleAIRaw(BaseModel):
    """Hình dạng JSON bắt Gemini trả về - CHÚ Ý: không có trường 'date',
    chỉ có day_offset - Service sẽ tự suy ra ngày thật, không tin AI tính."""
    schedule: List[ScheduleItemRaw]
    disclaimer: str


class ScheduleItemOut(BaseModel):
    day_offset: int
    date: date  # do Service tự tính, không phải AI
    task_type: TaskType
    description: str


class AiScheduleOut(BaseModel):
    batch_code: str
    seeding_date: date
    expected_harvest_date: Optional[date] = None  # lấy từ CSDL thật, không phải AI tính lại
    schedule: List[ScheduleItemOut]
    disclaimer: str
    created_at: datetime

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class BatchAlertItemRaw(BaseModel):
    batch_code: str
    priority_score: int = Field(..., ge=1, le=5)  # 1 = khẩn cấp nhất
    reason: str


class AlertAIRaw(BaseModel):
    """Hình dạng JSON bắt Gemini phải trả về."""
    priority_batches: List[BatchAlertItemRaw]
    disclaimer: str


class AiAlertOut(BaseModel):
    total_growing_batches: int
    priority_batches: List[BatchAlertItemRaw]
    disclaimer: str
    created_at: datetime

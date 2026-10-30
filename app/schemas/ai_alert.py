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
    # Trường tương thích ngược: model cũ không trả về vẫn parse được.
    missing_data: List[str] = Field(default_factory=list)
    contradictions: List[str] = Field(default_factory=list)


class AiAlertOut(BaseModel):
    total_growing_batches: int
    priority_batches: List[BatchAlertItemRaw]
    disclaimer: str
    created_at: datetime
    missing_data: List[str] = Field(default_factory=list)
    contradictions: List[str] = Field(default_factory=list)
    guard_triggered: bool = False
    ai_available: bool = True

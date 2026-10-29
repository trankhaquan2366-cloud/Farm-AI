from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class BatchSummaryRequest(BaseModel):
    batch_id: str | int | None = None
    crop_batch_id: str | int | None = None
    lot_id: str | int | None = None


class SummaryAIRaw(BaseModel):
    """
    Hình dạng JSON bắt Gemini phải trả về.
    referenced_log_ids: BẮT BUỘC AI phải trích dẫn ID các nhật ký thật sự
    đã dùng để đưa ra tóm tắt/issue - đây là cơ chế "grounding" giúp
    backend kiểm chứng được, không phải chỉ tin lời AI nói suông.
    """
    summary: str
    issues_detected: List[str]
    referenced_log_ids: List[int]
    disclaimer: str  # AI tự trả, nhưng Service sẽ GHI ĐÈ bằng câu cố định
    recommendations: List[str] = Field(default_factory=list)


class AiSummaryOut(BaseModel):
    """Response thật sự trả về cho client - đã qua xử lý và KIỂM CHỨNG ở Service."""

    # Mọi trường đều có giá trị mặc định để KHÔNG BAO GIỜ phát sinh
    # ResponseValidationError (HTTP 500) dù lô không tồn tại hoặc AI lỗi.
    batch_id: int = 0
    batch_code: str = ""
    log_count: int = 0
    summary: str = ""
    issues_detected: List[str] = Field(default_factory=list)
    referenced_log_ids: List[int] = Field(default_factory=list)  # để client/giám khảo tự đối chiếu lại nếu muốn
    disclaimer: str = ""
    created_at: datetime = Field(default_factory=datetime.now)
    key_issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

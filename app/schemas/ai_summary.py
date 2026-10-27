from pydantic import BaseModel
from typing import List
from datetime import datetime


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


class AiSummaryOut(BaseModel):
    """Response thật sự trả về cho client - đã qua xử lý và KIỂM CHỨNG ở Service."""
    batch_code: str
    log_count: int
    summary: str
    issues_detected: List[str]
    referenced_log_ids: List[int]  # để client/giám khảo tự đối chiếu lại nếu muốn
    disclaimer: str
    created_at: datetime

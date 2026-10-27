from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str

class NotificationCreate(NotificationBase):
    user_id: Optional[int] = None

class NotificationResponse(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime
    time: Optional[str] = None # Trường phụ trợ để Frontend hiển thị chữ "Vừa xong", "2 giờ trước"...

    class Config:
        from_attributes = True # Cho phép Pydantic đọc trực tiếp từ SQLAlchemy Model
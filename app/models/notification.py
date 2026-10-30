from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    # Liên kết với user nhận thông báo (để trống nếu là thông báo chung cho toàn trang trại)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True) 
    
    type = Column(String(50))      # Ví dụ: "ai_warning", "warning", "info"
    title = Column(String(255))    # Tiêu đề thông báo
    message = Column(Text)         # Nội dung chi tiết (có thể dài)
    is_read = Column(Boolean, default=False) # Trạng thái chưa đọc (False)
    
    # Tự động lấy thời gian hiện tại khi tạo thông báo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
from sqlalchemy import Column, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
from sqlalchemy.orm import relationship

class CareLog(Base):
    __tablename__ = "care_logs"

    id = Column(Integer, primary_key=True, index=True)
    crop_batch_id = Column(
        Integer,
        ForeignKey("crop_batches.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    action_type = Column(String(100), nullable=False, index=True)  # Ví dụ: Tưới nước, Bón phân...
    log_date = Column(String(50), nullable=True, index=True)  
    description = Column(Text, nullable=True)    
    notes = Column(Text, nullable=True)                
    image_url = Column(String(255), nullable=True)
    quantity = Column(Float, nullable=True, default=0.0)
    quality_percent = Column(Float, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    crop_batch = relationship(
        "CropBatch", 
        back_populates="care_logs",
        foreign_keys=[crop_batch_id],
    )
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class HarvestLog(Base):
    __tablename__ = "harvest_logs"
    qr_trace_code = Column(String(100), unique=True, index=True, nullable=True)
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(
        Integer,
        ForeignKey("crop_batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    harvest_time = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Chuẩn hóa: Tách riêng số và đơn vị tính
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="kg", nullable=False)
    grade = Column(String, default="loai_1")
    notes = Column(String, nullable=True)

    # Quan hệ với bảng CropBatch (Chỉ giữ lại 1 relationship duy nhất)
    crop_batch = relationship("CropBatch", back_populates="harvest_logs")
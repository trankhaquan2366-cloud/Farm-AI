from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CropBatch(Base):
    __tablename__ = "crop_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=False)
    variety_id = Column(Integer, ForeignKey("plant_varieties.id"), nullable=False)
    sow_date = Column(Date, nullable=True)
    expected_harvest_date = Column(Date, nullable=True)
    quantity = Column(Float, default=0.0)
    status = Column(String(50), default="Đang trồng")

    harvest_logs = relationship("HarvestLog", back_populates="crop_batch")
    care_logs = relationship(
        "CareLog", 
        back_populates="crop_batch",
        foreign_keys="[CareLog.crop_batch_id]" 
    )
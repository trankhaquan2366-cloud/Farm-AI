from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class CropBatch(Base):
    __tablename__ = "crop_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=False, index=True)
    variety_id = Column(Integer, ForeignKey("plant_varieties.id"), nullable=False, index=True)
    sow_date = Column(Date, nullable=True)
    expected_harvest_date = Column(Date, nullable=True)
    quantity = Column(Float, default=0.0)
    status = Column(String(50), default="Đang trồng", index=True)
    planting_method = Column(String(50), nullable=True)
    certification_standard = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    harvest_logs = relationship("HarvestLog", back_populates="crop_batch", lazy="select")
    # Quan hệ chỉ-đọc phục vụ eager loading (joinedload/selectinload) để tránh N+1.
    variety = relationship("PlantVariety", lazy="select")
    plot = relationship("Plot", lazy="select")
    care_logs = relationship(
        "CareLog",
        back_populates="crop_batch",
        foreign_keys="[CareLog.crop_batch_id]",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
from sqlalchemy import Column, DateTime, Integer, Float, ForeignKey, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SupplyUsage(Base):
    __tablename__ = "supply_usage"

    id = Column(Integer, primary_key=True, index=True)
    care_log_id = Column(Integer, ForeignKey("care_logs.id"), nullable=False)
    supply_id = Column(Integer, ForeignKey("supplies.id"), nullable=False)
    quantity_used = Column(Float, nullable=False)
    used_at = Column(DateTime, nullable=False, server_default=func.now())
    notes = Column(String(255), nullable=True)
    supply = relationship("Supply", back_populates="usages")

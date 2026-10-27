from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Supply(Base):
    __tablename__ = "supplies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    category = Column(String(50), nullable=True)
    type = Column(String, nullable=True)   # phan_bon | thuoc_bvtv | giong | khac
    unit = Column(String, nullable=False)  # kg, lit, goi...
    stock_quantity = Column(Float, nullable=False, default=0)
    min_threshold = Column(Float, nullable=False, default=0)
    location = Column(String(150), nullable=True)
    status = Column(String(30), nullable=False, default="active")

    imports = relationship("SupplyImport", back_populates="supply", cascade="all, delete-orphan")
    usages = relationship("SupplyUsage", back_populates="supply")

    @property
    def quantity(self) -> float:
        return self.stock_quantity


class SupplyImport(Base):
    __tablename__ = "supply_imports"

    id = Column(Integer, primary_key=True, index=True)
    supply_id = Column(Integer, ForeignKey("supplies.id", ondelete="CASCADE"), nullable=False)
    quantity_imported = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False, default=0)
    supplier_name = Column(String(150), nullable=True)
    batch_number = Column(String(100), nullable=True)
    manufacture_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    imported_at = Column(DateTime, nullable=False, server_default=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    supply = relationship("Supply", back_populates="imports")

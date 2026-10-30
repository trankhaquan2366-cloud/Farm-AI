from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    # Sửa "harvests.id" thành "harvest_logs.id" cho khớp với tên bảng trong file harvest.py
    harvest_id = Column(Integer, ForeignKey("harvest_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    customer_name = Column(String, nullable=True)
    quantity_kg = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    sale_date = Column(Date, nullable=False)

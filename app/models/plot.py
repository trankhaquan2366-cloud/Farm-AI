from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base

class Plot(Base):
    __tablename__ = "plots"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    area = Column(Float, nullable=False)
    soil_type = Column(String, default="Đất thịt")  # Quản lý loại đất
    location = Column(String, nullable=True)
    status = Column(String, default="Đang nghỉ")    # Đang nghỉ / Đang canh tác / Trống
    description = Column(String, nullable=True)
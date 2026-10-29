from sqlalchemy import Column, Float, Integer, JSON, String, Text
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
    cultivation_model = Column(String(50), nullable=True)
    irrigation_systems = Column(JSON, default=list, nullable=False)
    ph_current = Column(Float, nullable=True)
    ec_ms_cm = Column(Float, nullable=True)
    previous_crop = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
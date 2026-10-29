from sqlalchemy import Column, Float, Integer, JSON, String, Text
from app.core.database import Base


class PlantVariety(Base):
    __tablename__ = "plant_varieties"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(150), nullable=False)
    category = Column(String(100), nullable=True)
    supplier = Column(String(150), nullable=True)
    growth_days = Column(Integer, nullable=True)
    germination_day = Column(Integer, nullable=True)
    development_day = Column(Integer, nullable=True)
    harvest_day = Column(Integer, nullable=True)
    stock_quantity = Column(Float, default=0.0, nullable=False)
    unit = Column(String(50), default="kg", nullable=True)
    expected_yield_value = Column(Float, nullable=True)
    expected_yield_unit = Column(String(20), nullable=True)
    suitable_seasons = Column(JSON, default=list, nullable=False)
    ph_min = Column(Float, nullable=True)
    ph_max = Column(Float, nullable=True)
    temperature_min = Column(Float, nullable=True)
    temperature_max = Column(Float, nullable=True)
    air_humidity_min = Column(Float, nullable=True)
    air_humidity_max = Column(Float, nullable=True)
    soil_humidity_min = Column(Float, nullable=True)
    soil_humidity_max = Column(Float, nullable=True)
    status = Column(String(30), default="active", nullable=False)
    description = Column(Text, nullable=True)

    def __repr__(self):
        return f"<PlantVariety id={self.id} name='{self.name}'>"
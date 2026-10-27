from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base

class PlantVariety(Base):
    __tablename__ = "plant_varieties"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(150), nullable=False)
    category = Column(String(100), nullable=True)
    growth_days = Column(Integer, nullable=True)
    stock_quantity = Column(Float, default=0.0, nullable=True)
    unit = Column(String(50), default="kg", nullable=True)

    def __repr__(self):
        return f"<PlantVariety id={self.id} name='{self.name}'>"
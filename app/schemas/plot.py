from pydantic import BaseModel, Field
from typing import Optional

class PlotBase(BaseModel):
    code: Optional[str] = None
    name: str = Field(..., min_length=1)
    area: Optional[float] = Field(None, gt=0)
    soil_type: Optional[str] = "Đất thịt"  # Loại đất (Đất thịt, Đất cát, Đất đỏ bazan...)
    location: Optional[str] = None
    status: Optional[str] = "Đang nghỉ"     # Trạng thái (Đang nghỉ, Đang canh tác...)
    description: Optional[str] = None

class PlotCreate(PlotBase):
    name: str = Field(..., min_length=1)

class PlotUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    area: Optional[float] = Field(None, gt=0)
    soil_type: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

class PlotOut(PlotBase):
    id: int

    class Config:
        from_attributes = True
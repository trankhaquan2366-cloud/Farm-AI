from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PlotBase(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    area: Optional[float] = Field(None, gt=0)
    soil_type: Optional[str] = Field("Đất thịt", max_length=100)
    location: Optional[str] = Field(None, max_length=150)
    status: Optional[str] = Field("Đang nghỉ", max_length=50)
    cultivation_model: Optional[str] = Field(None, max_length=50)
    irrigation_systems: list[str] = Field(default_factory=list)
    ph_current: Optional[float] = Field(None, ge=1, le=14)
    ec_ms_cm: Optional[float] = Field(None, ge=0, le=100)
    previous_crop: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_measurements(self):
        if self.area is not None and self.area <= 0:
            raise ValueError("Diện tích phải lớn hơn 0.")
        return self

class PlotCreate(PlotBase):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1)
    area: float = Field(..., gt=0)

class PlotUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    area: Optional[float] = Field(None, gt=0)
    soil_type: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    cultivation_model: Optional[str] = Field(None, max_length=50)
    irrigation_systems: Optional[list[str]] = None
    ph_current: Optional[float] = Field(None, ge=1, le=14)
    ec_ms_cm: Optional[float] = Field(None, ge=0, le=100)
    previous_crop: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None

    @model_validator(mode="after")
    def validate_measurements(self):
        if self.area is not None and self.area <= 0:
            raise ValueError("Diện tích phải lớn hơn 0.")
        return self

class PlotOut(PlotBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
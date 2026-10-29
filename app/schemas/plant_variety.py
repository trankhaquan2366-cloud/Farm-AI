from typing import Literal, Optional

from pydantic import AliasChoices, BaseModel, Field, model_validator


Season = Literal["Xuân", "Hè", "Thu", "Đông", "Quanh năm"]
YieldUnit = Literal["kg/m²", "kg/gốc", "tấn/ha"]
VarietyStatus = Literal["active", "inactive", "testing"]


class PlantVarietyTechnicalFields(BaseModel):
    growth_days: Optional[int] = Field(
        None,
        gt=0,
        le=2000,
        description="Thời gian sinh trưởng (ngày), phải từ 1 đến 2000",
        validation_alias=AliasChoices("growth_days", "growth_duration_days"),
    )
    germination_day: Optional[int] = Field(None, ge=1, le=2000)
    development_day: Optional[int] = Field(None, ge=1, le=2000)
    harvest_day: Optional[int] = Field(None, ge=1, le=2000)
    expected_yield_value: Optional[float] = Field(None, ge=0)
    expected_yield_unit: Optional[YieldUnit] = "kg/m²"
    suitable_seasons: list[Season] = Field(default_factory=list)
    ph_min: Optional[float] = Field(None, ge=0, le=14)
    ph_max: Optional[float] = Field(None, ge=0, le=14)
    temperature_min: Optional[float] = Field(None, ge=-20, le=60)
    temperature_max: Optional[float] = Field(None, ge=-20, le=60)
    air_humidity_min: Optional[float] = Field(None, ge=0, le=100)
    air_humidity_max: Optional[float] = Field(None, ge=0, le=100)
    soil_humidity_min: Optional[float] = Field(None, ge=0, le=100)
    soil_humidity_max: Optional[float] = Field(None, ge=0, le=100)
    description: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_ranges_and_milestones(self):
        for minimum, maximum, label in (
            (self.ph_min, self.ph_max, "pH"),
            (self.temperature_min, self.temperature_max, "Nhiệt độ"),
            (self.air_humidity_min, self.air_humidity_max, "Độ ẩm không khí"),
            (self.soil_humidity_min, self.soil_humidity_max, "Độ ẩm đất"),
        ):
            if minimum is not None and maximum is not None and minimum > maximum:
                raise ValueError(f"{label}: giá trị tối thiểu không thể lớn hơn giá trị tối đa.")

        milestones = [
            day
            for day in (
                self.germination_day,
                self.development_day,
                self.harvest_day,
            )
            if day is not None
        ]
        if any(current < previous for previous, current in zip(milestones, milestones[1:])):
            raise ValueError("Các mốc sinh trưởng phải theo thứ tự.")
        if self.growth_days is not None and any(day > self.growth_days for day in milestones):
            raise ValueError("Mốc sinh trưởng không được vượt quá tổng chu kỳ.")
        return self


class PlantVarietyBase(PlantVarietyTechnicalFields):
    """Các trường dùng chung khi tạo mới và cập nhật."""
    code: Optional[str] = Field(None, max_length=50, pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$")
    name: str = Field(..., min_length=1, max_length=150)
    category: Optional[str] = Field(None, max_length=100)
    supplier: Optional[str] = Field(None, max_length=150)
    stock_quantity: Optional[float] = Field(default=0.0, ge=0)
    unit: Optional[str] = Field("kg", min_length=1, max_length=50)
    status: VarietyStatus = "active"


class PlantVarietyCreate(PlantVarietyBase):
    """Dữ liệu client gửi lên khi tạo mới (POST) - chưa có id."""
    pass


class PlantVarietyUpdate(PlantVarietyTechnicalFields):
    """Cập nhật (PUT/PATCH) - mọi trường đều optional, cho phép sửa từng phần."""
    code: Optional[str] = Field(None, max_length=50, pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{1,49}$")
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    category: Optional[str] = Field(None, max_length=100)
    supplier: Optional[str] = Field(None, max_length=150)
    stock_quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    status: Optional[VarietyStatus] = None


class PlantVarietyOut(PlantVarietyBase):
    """Dữ liệu trả về cho client - có thêm id mà lúc tạo không có."""
    id: int

    class Config:
        # Cho phép Pydantic đọc trực tiếp từ object SQLAlchemy (model)
        from_attributes = True
        populate_by_name = True
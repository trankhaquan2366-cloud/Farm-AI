from pydantic import BaseModel, Field, AliasChoices
from typing import Optional


class PlantVarietyBase(BaseModel):
    """Các trường dùng chung khi tạo mới và cập nhật."""
    code: Optional[str] = Field(None, description="Mã giống cây")
    name: str = Field(..., min_length=1, description="Tên giống cây")
    category: Optional[str] = Field(None, description="Nhóm cây: rau ăn lá, củ, quả...")
    stock_quantity: Optional[float] = Field(default=0.0, ge=0)
    # Chấp nhận cả tên 'growth_days' và 'growth_duration_days' từ Frontend gửi lên
    growth_days: Optional[int] = Field(
        None, 
        gt=0, 
        description="Thời gian sinh trưởng (ngày), phải > 0",
        validation_alias=AliasChoices('growth_days', 'growth_duration_days')
    )
    stock_quantity: Optional[float] = Field(0.0, ge=0)
    unit: Optional[str] = Field('kg', min_length=1)


class PlantVarietyCreate(PlantVarietyBase):
    """Dữ liệu client gửi lên khi tạo mới (POST) - chưa có id."""
    pass


class PlantVarietyUpdate(BaseModel):
    """Cập nhật (PUT/PATCH) - mọi trường đều optional, cho phép sửa từng phần."""
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    growth_days: Optional[int] = Field(
        None, 
        gt=0,
        validation_alias=AliasChoices('growth_days', 'growth_duration_days')
    )
    stock_quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1)


class PlantVarietyOut(PlantVarietyBase):
    """Dữ liệu trả về cho client - có thêm id mà lúc tạo không có."""
    id: int

    class Config:
        # Cho phép Pydantic đọc trực tiếp từ object SQLAlchemy (model)
        from_attributes = True
        populate_by_name = True
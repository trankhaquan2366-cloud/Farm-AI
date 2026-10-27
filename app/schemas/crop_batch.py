from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CropBatchBase(BaseModel):
    batch_name: Optional[str] = Field(None, description="Tên lô trồng")
    plot_id: int = Field(..., description="ID lô đất")
    variety_id: int = Field(..., description="ID giống cây")
    sow_date: date = Field(..., description="Ngày gieo trồng")
    seeding_date: Optional[date] = Field(None, description="Ngày ươm hạt (nếu có)")
    expected_harvest_date: Optional[date] = Field(None, description="Ngày dự kiến thu hoạch")
    quantity_used: Optional[float] = Field(0.0, description="Số lượng giống sử dụng")
    status: Optional[str] = Field("Đang trồng", description="Trạng thái lô trồng")
    created_by: Optional[int] = Field(None, description="ID người tạo")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CropBatchCreate(CropBatchBase):
    batch_code: Optional[str] = Field(None, description="Mã lô trồng (tự động sinh nếu để trống)")


class CropBatchUpdate(BaseModel):
    batch_name: Optional[str] = None
    plot_id: Optional[int] = None
    variety_id: Optional[int] = None
    sow_date: Optional[date] = None
    seeding_date: Optional[date] = None
    expected_harvest_date: Optional[date] = None
    quantity_used: Optional[float] = None
    status: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CropBatchOut(CropBatchBase):
    id: int
    batch_code: str

    model_config = ConfigDict(from_attributes=True)
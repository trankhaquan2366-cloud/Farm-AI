from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CropBatchBase(BaseModel):
    batch_name: Optional[str] = Field(default=None, max_length=100, description="Tên lô trồng")
    plot_id: int = Field(gt=0, description="ID lô đất")
    variety_id: int = Field(gt=0, description="ID giống cây")
    sow_date: date = Field(strict=False, description="Ngày gieo trồng")
    seeding_date: Optional[date] = Field(
        default=None,
        strict=False,
        description="Ngày ươm hạt (nếu có)",
    )
    expected_harvest_date: Optional[date] = Field(
        default=None,
        strict=False,
        description="Ngày dự kiến thu hoạch",
    )
    quantity_used: float = Field(
        gt=0,
        allow_inf_nan=False,
        description="Số lượng giống sử dụng",
    )
    status: Optional[str] = Field(default="Đang trồng", max_length=50)
    created_by: Optional[int] = Field(default=None, gt=0)
    planting_method: Optional[str] = Field(default=None, max_length=50)
    certification_standard: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_harvest_date(self):
        if (
            self.expected_harvest_date is not None
            and self.expected_harvest_date <= self.sow_date
        ):
            raise ValueError("Ngày thu hoạch phải sau ngày gieo trồng.")
        return self

    model_config = ConfigDict(
        strict=True,
        extra="forbid",
        populate_by_name=True,
        from_attributes=True,
    )


class CropBatchCreate(CropBatchBase):
    batch_code: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=50,
        description="Mã lô trồng (tự động sinh nếu để trống)",
    )


class CropBatchUpdate(BaseModel):
    batch_name: Optional[str] = Field(default=None, max_length=100)
    plot_id: Optional[int] = Field(default=None, gt=0)
    variety_id: Optional[int] = Field(default=None, gt=0)
    sow_date: Optional[date] = Field(default=None, strict=False)
    seeding_date: Optional[date] = Field(default=None, strict=False)
    expected_harvest_date: Optional[date] = Field(default=None, strict=False)
    quantity_used: Optional[float] = Field(
        default=None,
        gt=0,
        allow_inf_nan=False,
    )
    status: Optional[str] = Field(default=None, max_length=50)
    planting_method: Optional[str] = Field(default=None, max_length=50)
    certification_standard: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_harvest_date(self):
        if (
            self.sow_date is not None
            and self.expected_harvest_date is not None
            and self.expected_harvest_date <= self.sow_date
        ):
            raise ValueError("Ngày thu hoạch phải sau ngày gieo trồng.")
        return self

    model_config = ConfigDict(
        strict=True,
        extra="forbid",
        populate_by_name=True,
        from_attributes=True,
    )


class CropBatchOut(CropBatchBase):
    id: int
    batch_code: str

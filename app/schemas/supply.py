from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

SupplyCategory = Literal["phan_bon", "thuoc_bvtv", "giong", "dung_cu", "khac"]


class SupplyCreate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    category: SupplyCategory = "phan_bon"
    unit: str = Field(..., min_length=1, max_length=30)
    initial_stock: float = Field(0, ge=0)
    min_threshold: float = Field(0, ge=0)
    initial_expiry_date: Optional[date] = None
    location: Optional[str] = Field(None, max_length=150)
    usage_notes: Optional[str] = Field(None, max_length=2000)
    storage_notes: Optional[str] = Field(None, max_length=2000)
    status: Literal["active", "inactive"] = "active"

    @model_validator(mode="after")
    def validate_initial_expiry(self):
        if self.initial_expiry_date and self.initial_stock <= 0:
            raise ValueError("Tồn kho ban đầu phải lớn hơn 0 khi khai báo hạn sử dụng.")
        return self


class SupplyUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    category: Optional[SupplyCategory] = None
    unit: Optional[str] = Field(None, min_length=1, max_length=30)
    min_threshold: Optional[float] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=150)
    usage_notes: Optional[str] = Field(None, max_length=2000)
    storage_notes: Optional[str] = Field(None, max_length=2000)
    status: Optional[Literal["active", "inactive"]] = None


class SupplyOut(BaseModel):
    id: int
    code: Optional[str]
    name: str
    category: Optional[str]
    unit: str
    quantity: float
    min_threshold: float
    location: Optional[str]
    usage_notes: Optional[str] = None
    storage_notes: Optional[str] = None
    status: str
    model_config = ConfigDict(from_attributes=True)


class SupplyImportCreate(BaseModel):
    quantity_imported: float = Field(..., gt=0)
    unit_price: float = Field(0, ge=0)
    supplier_name: Optional[str] = Field(None, max_length=150)
    batch_number: Optional[str] = Field(None, max_length=100)
    manufacture_date: Optional[date] = None
    expiry_date: Optional[date] = None


class SupplyImportOut(SupplyImportCreate):
    id: int
    supply_id: int
    imported_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SupplyAlert(BaseModel):
    supply_id: int
    code: Optional[str]
    name: str
    alert_type: Literal["low_stock", "expiry"]
    message: str
    quantity: float
    min_threshold: float
    expiry_date: Optional[date] = None

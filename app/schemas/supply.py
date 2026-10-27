from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SupplyCategory = Literal["phan_bon", "thuoc_bvtv", "giong", "dung_cu"]


class SupplyCreate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    category: SupplyCategory = "phan_bon"
    unit: str = Field(..., min_length=1, max_length=30)
    min_threshold: float = Field(0, ge=0)
    location: Optional[str] = Field(None, max_length=150)
    status: Literal["active", "inactive"] = "active"


class SupplyUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    category: Optional[SupplyCategory] = None
    unit: Optional[str] = Field(None, min_length=1, max_length=30)
    min_threshold: Optional[float] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=150)
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

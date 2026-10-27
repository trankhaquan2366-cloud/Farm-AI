from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class SaleCreate(BaseModel):
    harvest_id: int
    customer_name: Optional[str] = None
    quantity_kg: float = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    sale_date: date


class SaleOut(SaleCreate):
    id: int
    total_amount: float  # tính toán (không lưu cột riêng, tránh dữ liệu trùng lặp có thể lệch)

    class Config:
        from_attributes = True

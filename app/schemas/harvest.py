from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class HarvestBase(BaseModel):
    batch_id: int
    # Sản lượng phải dương; 0 hoặc số âm bị từ chối ở tầng validate (HTTP 422).
    quantity: float = Field(gt=0, description="Sản lượng thu hoạch, phải lớn hơn 0")
    grade: Optional[str] = None
    notes: Optional[str] = None

class HarvestCreate(HarvestBase):
    harvest_time: Optional[datetime] = None

class HarvestOut(HarvestBase):
    id: int
    harvest_time: datetime
    unit: Optional[str] = "kg"
    qr_trace_code: Optional[str] = None

    class Config:
        from_attributes = True
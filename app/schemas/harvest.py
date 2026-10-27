from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HarvestBase(BaseModel):
    batch_id: int
    quantity: float
    grade: Optional[str] = None
    notes: Optional[str] = None

class HarvestCreate(HarvestBase):
    harvest_time: Optional[datetime] = None

class HarvestOut(HarvestBase):
    id: int
    harvest_time: datetime

    class Config:
        from_attributes = True
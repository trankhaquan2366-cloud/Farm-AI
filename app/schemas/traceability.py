from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class TraceSupplyUsed(BaseModel):
    supply_name: str
    quantity_used: float
    unit: str


class TraceCareLog(BaseModel):
    log_type: str
    description: Optional[str]
    conditions: Optional[str]
    performed_at: datetime
    supplies_used: List[TraceSupplyUsed]


class TraceSale(BaseModel):
    customer_name: Optional[str]
    quantity_kg: float
    unit_price: float
    sale_date: date


class TraceHarvest(BaseModel):
    harvest_date: date
    quantity_kg: float
    quality_grade: Optional[str]
    sales: List[TraceSale]


class TraceabilityOut(BaseModel):
    """
    Response tổng hợp cho 1 lô trồng - đúng tinh thần 'truy xuất nguồn gốc':
    từ 1 batch_code, biết được TOÀN BỘ lịch sử: trồng ở đâu, giống gì,
    chăm sóc ra sao, dùng vật tư gì, thu hoạch bao nhiêu, bán cho ai.
    """
    batch_code: str
    status: str
    seeding_date: date
    expected_harvest_date: Optional[date]
    plot_name: str
    variety_name: str
    care_logs: List[TraceCareLog]
    harvests: List[TraceHarvest]

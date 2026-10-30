import re
from datetime import date, datetime
from typing import Dict, List, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.crop_batch import CropBatch
from app.models.care_log import CareLog
from app.models.harvest import HarvestLog
from app.models.plant_variety import PlantVariety

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

ViewMode = Literal["day", "month", "year"]


class HarvestChartPoint(BaseModel):
    label: str
    total: float = Field(ge=0)
    model_config = {"extra": "allow"}


class HarvestChartResponse(BaseModel):
    view: ViewMode
    varieties: List[str]
    data: List[HarvestChartPoint]


def _empty_points(view: ViewMode, reference_date: date) -> List[Dict[str, object]]:
    if view == "day":
        days_in_month = date(
            reference_date.year + (reference_date.month == 12),
            1 if reference_date.month == 12 else reference_date.month + 1,
            1,
        )
        days_in_month = (days_in_month - date.resolution).day
        return [
            {"label": f"{day:02d}/{reference_date.month:02d}", "total": 0.0}
            for day in range(1, days_in_month + 1)
        ]
    if view == "month":
        return [{"label": f"T{month}", "total": 0.0} for month in range(1, 13)]
    return [{"label": str(year), "total": 0.0} for year in range(reference_date.year - 4, reference_date.year + 1)]


def _point_key(view: ViewMode, harvested_at: date) -> str:
    if view == "day":
        return f"{harvested_at.day:02d}/{harvested_at.month:02d}"
    if view == "month":
        return f"T{harvested_at.month}"
    return str(harvested_at.year)


def _parse_log_date(value: object) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _care_log_quantity(log: CareLog) -> float:
    if log.quantity and log.quantity > 0:
        return float(log.quantity)
    text = log.notes or log.description or ""
    match = re.search(r"(\d+(?:[.,]\d+)?)", text)
    return float(match.group(1).replace(",", ".")) if match else 0.0


def _view_datetime_range(view: ViewMode, reference_date: date) -> tuple[datetime, datetime]:
    """Trả về khoảng thời gian tương ứng với view để lọc ngay trong SQL."""
    if view == "day":
        start = datetime(reference_date.year, reference_date.month, 1)
        if reference_date.month == 12:
            end = datetime(reference_date.year + 1, 1, 1)
        else:
            end = datetime(reference_date.year, reference_date.month + 1, 1)
        return start, end
    if view == "month":
        return datetime(reference_date.year, 1, 1), datetime(reference_date.year + 1, 1, 1)
    return datetime(reference_date.year - 4, 1, 1), datetime(reference_date.year + 1, 1, 1)


@router.get("/harvest-chart", response_model=HarvestChartResponse)
def get_harvest_chart(
    view: ViewMode = Query("month"),
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    reference_date = date.today()
    points = _empty_points(view, reference_date)
    points_by_label = {str(point["label"]): point for point in points}
    variety_names = set()
    range_start, range_end = _view_datetime_range(view, reference_date)

    # Lọc theo khoảng thời gian của view ngay trong SQL -> chỉ đọc đúng số bản ghi cần dùng.
    rows = (
        db.query(HarvestLog, CropBatch, PlantVariety)
        .join(CropBatch, HarvestLog.batch_id == CropBatch.id)
        .join(PlantVariety, CropBatch.variety_id == PlantVariety.id)
        .filter(HarvestLog.harvest_time >= range_start, HarvestLog.harvest_time < range_end)
        .all()
    )

    # Một lô có thể vừa có harvest_logs vừa có nhật ký "Thu hoạch" cho cùng ngày.
    # harvest_logs là nguồn chuẩn; nhật ký trùng ngày bị bỏ qua để không cộng hai lần.
    harvest_seen: set[tuple[int, date]] = set()

    for harvest, _batch, variety in rows:
        harvested_at = harvest.harvest_time.date() if harvest.harvest_time else None
        if harvested_at is None:
            continue
        if view == "day" and (harvested_at.year != reference_date.year or harvested_at.month != reference_date.month):
            continue
        if view == "month" and harvested_at.year != reference_date.year:
            continue
        if view == "year" and not reference_date.year - 4 <= harvested_at.year <= reference_date.year:
            continue

        harvest_seen.add((harvest.batch_id, harvested_at))
        variety_name = variety.name.strip() if variety.name else "Chưa phân loại"
        variety_names.add(variety_name)
        label = _point_key(view, harvested_at)
        point = points_by_label[label]
        quantity = max(float(harvest.quantity or 0), 0.0)
        point[variety_name] = float(point.get(variety_name, 0.0)) + quantity
        point["total"] = float(point["total"]) + quantity

    care_rows = (
        db.query(CareLog, CropBatch, PlantVariety)
        .join(CropBatch, CareLog.crop_batch_id == CropBatch.id)
        .join(PlantVariety, CropBatch.variety_id == PlantVariety.id)
        .filter(CareLog.action_type.in_(["Thu hoạch", "Thu hoach", "Harvest"]))
        .all()
    )

    for log, _batch, variety in care_rows:
        harvested_at = _parse_log_date(log.log_date or log.created_at)
        if harvested_at is None:
            continue
        if view == "day" and (harvested_at.year != reference_date.year or harvested_at.month != reference_date.month):
            continue
        if view == "month" and harvested_at.year != reference_date.year:
            continue
        if view == "year" and not reference_date.year - 4 <= harvested_at.year <= reference_date.year:
            continue

        batch_id = getattr(log, "crop_batch_id", None)
        if (
            settings.DASHBOARD_DEDUPE_HARVEST
            and batch_id is not None
            and (batch_id, harvested_at) in harvest_seen
        ):
            continue

        quantity = _care_log_quantity(log)
        if quantity <= 0:
            continue
        variety_name = variety.name.strip() if variety.name else "Chưa phân loại"
        variety_names.add(variety_name)
        point = points_by_label[_point_key(view, harvested_at)]
        point[variety_name] = float(point.get(variety_name, 0.0)) + quantity
        point["total"] = float(point["total"]) + quantity

    return HarvestChartResponse(
        view=view,
        varieties=sorted(variety_names),
        data=[HarvestChartPoint(**point) for point in points],
    )

from typing import Any, Dict, Optional, Set
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.crop_batch import CropBatch
from app.models.plant_variety import PlantVariety
from app.models.plot import Plot
from app.schemas.crop_batch import CropBatchCreate, CropBatchUpdate


_CANCELLED_STATUSES = {"cancelled", "canceled", "đã hủy", "da huy"}
_STATUS_MAP = {
    "cancelled": "Đã hủy",
    "canceled": "Đã hủy",
    "đã hủy": "Đã hủy",
    "da huy": "Đã hủy",
    "growing": "Đang trồng",
    "planting": "Đang trồng",
    "harvested": "Đã thu hoạch",
    "planned": "Kế hoạch",
}


def _column_names(model: Any) -> Set[str]:
    return {column.name for column in model.__table__.columns}


def _batch_quantity(batch: Any) -> float:
    for attribute in ("quantity_used", "quantity", "seed_quantity"):
        value = getattr(batch, attribute, None)
        if value is not None:
            return float(value)
    return 0.0


def _batch_variety_id(batch: Any) -> Optional[int]:
    return getattr(batch, "variety_id", None) or getattr(batch, "plant_variety_id", None)


def _is_cancelled(value: Any) -> bool:
    return str(value or "").strip().lower() in _CANCELLED_STATUSES


def _normalize_status(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return _STATUS_MAP.get(value.strip().lower(), value)


def _set_batch_quantity(data: Dict[str, Any], columns: Set[str], quantity: float) -> None:
    for attribute in ("quantity_used", "quantity", "seed_quantity"):
        if attribute in columns:
            data[attribute] = quantity
            return


def _require_variety(db: Session, variety_id: int) -> Any:
    variety = (
        db.query(PlantVariety)
        .filter(PlantVariety.id == variety_id)
        .with_for_update()
        .first()
    )
    if variety is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giống cây được chọn không tồn tại.",
        )
    if not hasattr(variety, "stock_quantity"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mô hình giống cây chưa khai báo tồn kho stock_quantity.",
        )
    return variety


def _deduct_stock(variety: Any, quantity: float) -> None:
    stock = float(variety.stock_quantity or 0)
    if stock < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số lượng giống trong kho không đủ! (Tồn kho: {stock}, Cần: {quantity})",
        )
    variety.stock_quantity = stock - quantity


def _restore_stock(variety: Any, quantity: float) -> None:
    if quantity > 0:
        variety.stock_quantity = float(variety.stock_quantity or 0) + quantity


def create_crop_batch(
    db: Session,
    payload: CropBatchCreate,
    current_user: Optional[dict] = None,
) -> CropBatch:
    """Tạo lô và cập nhật tồn kho giống trong cùng transaction."""
    try:
        columns = _column_names(CropBatch)
        if db.query(Plot).filter(Plot.id == payload.plot_id).first() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lô đất được chọn không tồn tại.",
            )

        variety = _require_variety(db, payload.variety_id)
        initial_status = _normalize_status(payload.status) or "Đang trồng"
        if not _is_cancelled(initial_status):
            _deduct_stock(variety, payload.quantity_used)

        batch_code = payload.batch_code or f"CB-{uuid4().hex[:12].upper()}"
        values: Dict[str, Any] = {}
        if "batch_code" in columns:
            values["batch_code"] = batch_code
        elif "code" in columns:
            values["code"] = batch_code
        if "name" in columns:
            values["name"] = payload.batch_name
        elif "batch_name" in columns:
            values["batch_name"] = payload.batch_name

        for field in (
            "plot_id",
            "variety_id",
            "sow_date",
            "expected_harvest_date",
            "planting_method",
            "certification_standard",
            "notes",
        ):
            if field in columns:
                values[field] = getattr(payload, field)
        _set_batch_quantity(values, columns, payload.quantity_used)
        if "status" in columns:
            values["status"] = initial_status
        elif "batch_status" in columns:
            values["batch_status"] = initial_status
        if "created_by" in columns:
            values["created_by"] = (
                current_user.get("id") if current_user is not None else payload.created_by
            )
        if "seeding_date" in columns:
            values["seeding_date"] = payload.seeding_date

        batch = CropBatch(**values)
        db.add(batch)
        db.commit()
        db.refresh(batch)
        return batch
    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo lô trồng do lỗi dữ liệu hoặc cơ sở dữ liệu.",
        ) from error


def update_crop_batch(db: Session, batch_id: int, payload: CropBatchUpdate) -> CropBatch:
    """Cập nhật lô và cân đối tồn kho khi đổi giống, số lượng hoặc trạng thái."""
    try:
        batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
        if batch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lô trồng",
            )

        updates = payload.model_dump(exclude_unset=True)
        old_variety_id = _batch_variety_id(batch)
        old_quantity = _batch_quantity(batch)
        old_active = not _is_cancelled(getattr(batch, "status", None))
        old_status = getattr(batch, "status", None)

        new_variety_id = updates.get("variety_id") or old_variety_id
        new_quantity = updates.get("quantity_used")
        if new_quantity is None:
            new_quantity = old_quantity
        status_value = updates.get("status") or old_status
        new_active = not _is_cancelled(status_value)
        inventory_changed = (
            old_active != new_active
            or new_variety_id != old_variety_id
            or new_quantity != old_quantity
        )

        if inventory_changed:
            old_variety = (
                _require_variety(db, old_variety_id)
                if old_active and old_variety_id is not None
                else None
            )
            new_variety = (
                _require_variety(db, new_variety_id)
                if new_active and new_variety_id is not None
                else None
            )
            if old_variety is not None:
                _restore_stock(old_variety, old_quantity)
            if new_variety is not None:
                _deduct_stock(new_variety, new_quantity)

        columns = _column_names(CropBatch)
        for field in (
            "plot_id",
            "variety_id",
            "sow_date",
            "expected_harvest_date",
            "seeding_date",
            "planting_method",
            "certification_standard",
            "notes",
        ):
            if field in updates and updates[field] is not None and field in columns:
                setattr(batch, field, updates[field])

        if "batch_name" in updates:
            name_column = "name" if "name" in columns else "batch_name"
            if name_column in columns:
                setattr(batch, name_column, updates["batch_name"])
        if "quantity_used" in updates:
            quantity_column = next(
                (
                    column
                    for column in ("quantity_used", "quantity", "seed_quantity")
                    if column in columns
                ),
                None,
            )
            if quantity_column is not None:
                setattr(batch, quantity_column, new_quantity)
        if "status" in updates and updates["status"] is not None:
            status_column = "status" if "status" in columns else "batch_status"
            if status_column in columns:
                setattr(batch, status_column, _normalize_status(updates["status"]))

        db.commit()
        db.refresh(batch)
        return batch
    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể cập nhật lô trồng do lỗi dữ liệu hoặc cơ sở dữ liệu.",
        ) from error


def delete_crop_batch(db: Session, batch_id: int) -> None:
    """Xóa lô và hoàn kho giống nếu lô chưa bị hủy trước đó."""
    try:
        batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
        if batch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lô trồng",
            )

        if not _is_cancelled(getattr(batch, "status", None)):
            variety_id = _batch_variety_id(batch)
            if variety_id is not None:
                _restore_stock(_require_variety(db, variety_id), _batch_quantity(batch))

        db.delete(batch)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa lô trồng do lỗi dữ liệu hoặc cơ sở dữ liệu.",
        ) from error

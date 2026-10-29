from sqlalchemy.orm import Session
from datetime import date, timedelta
from fastapi import HTTPException, status
from sqlalchemy import or_
from app.models.supply import Supply
from app.repositories import supply as repo
from app.schemas.supply import SupplyCreate, SupplyImportCreate, SupplyOut, SupplyUpdate


def to_output(supply: Supply) -> SupplyOut:
    return SupplyOut(
        id=supply.id,
        code=supply.code,
        name=supply.name,
        category=supply.category or supply.type,
        unit=supply.unit,
        quantity=float(supply.stock_quantity or 0),
        min_threshold=float(supply.min_threshold or 0),
        location=supply.location,
        usage_notes=supply.usage_notes,
        storage_notes=supply.storage_notes,
        status=supply.status,
    )


def list_supplies(db: Session, category=None, search=None, low_stock=False):
    return [to_output(item) for item in repo.get_all(db, category, search, low_stock)]


def get_supply_or_404(db: Session, supply_id: int):
    supply = repo.get_by_id(db, supply_id)
    if supply is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy vật tư")
    return supply


def create_supply(db: Session, data: SupplyCreate):
    return to_output(repo.create(db, data))


def update_supply(db: Session, supply_id: int, data: SupplyUpdate):
    supply = get_supply_or_404(db, supply_id)
    return to_output(repo.update(db, supply, data))


def delete_supply(db: Session, supply_id: int):
    supply = get_supply_or_404(db, supply_id)
    repo.delete(db, supply)


def import_supply(db: Session, supply_id: int, data: SupplyImportCreate, user_id=None):
    supply = get_supply_or_404(db, supply_id)
    try:
        record = repo.create_import(db, supply, data, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return record


def get_alerts(db: Session):
    alerts = []
    for supply in db.query(Supply).all():
        if (supply.stock_quantity or 0) <= (supply.min_threshold or 0):
            alerts.append({
                "supply_id": supply.id,
                "code": supply.code,
                "name": supply.name,
                "alert_type": "low_stock",
                "message": f"Tồn kho thấp: còn {supply.stock_quantity or 0} {supply.unit}.",
                "quantity": supply.stock_quantity or 0,
                "min_threshold": supply.min_threshold or 0,
                "expiry_date": None,
            })
        for imported in supply.imports:
            if imported.expiry_date and date.today() <= imported.expiry_date <= date.today() + timedelta(days=30):
                alerts.append({
                    "supply_id": supply.id,
                    "code": supply.code,
                    "name": supply.name,
                    "alert_type": "expiry",
                    "message": f"Lô {imported.batch_number or 'chưa có số lô'} sắp hết hạn.",
                    "quantity": supply.stock_quantity or 0,
                    "min_threshold": supply.min_threshold or 0,
                    "expiry_date": imported.expiry_date,
                })
    return alerts


def deduct_supply_stock(db: Session, supply_id: int, quantity: float, care_log_id: int, notes=None):
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Số lượng vật tư sử dụng phải lớn hơn 0.")
    supply = db.query(Supply).filter(Supply.id == supply_id).with_for_update().first()
    if supply is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy vật tư.")
    if supply.stock_quantity < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Tồn kho {supply.name} không đủ (còn {supply.stock_quantity} {supply.unit}).",
        )
    supply.stock_quantity -= quantity
    from app.models.supply_usage import SupplyUsage
    usage = SupplyUsage(supply_id=supply_id, care_log_id=care_log_id, quantity_used=quantity, notes=notes)
    db.add(usage)
    return usage

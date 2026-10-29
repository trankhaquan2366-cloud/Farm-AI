from sqlalchemy.orm import Session
from app.models.supply import Supply, SupplyImport
from app.schemas.supply import SupplyCreate, SupplyImportCreate, SupplyUpdate


def get_all(db: Session, category: str | None = None, search: str | None = None, low_stock: bool = False):
    query = db.query(Supply)
    if category:
        query = query.filter((Supply.category == category) | (Supply.type == category))
    if search:
        query = query.filter(Supply.name.ilike(f"%{search}%"))
    if low_stock:
        query = query.filter(Supply.stock_quantity <= Supply.min_threshold)
    return query.order_by(Supply.name.asc()).all()


def get_by_id(db: Session, supply_id: int):
    return db.query(Supply).filter(Supply.id == supply_id).first()


def create(db: Session, data: SupplyCreate) -> Supply:
    values = data.model_dump(exclude={"initial_stock", "initial_expiry_date"})
    initial_stock = data.initial_stock
    initial_expiry_date = data.initial_expiry_date
    values["type"] = values.pop("category")
    values["stock_quantity"] = initial_stock
    db_obj = Supply(**values)
    db.add(db_obj)
    try:
        db.flush()
        if initial_stock > 0:
            db.add(SupplyImport(
                supply_id=db_obj.id,
                quantity_imported=initial_stock,
                unit_price=0,
                batch_number="Tồn kho ban đầu",
                expiry_date=initial_expiry_date,
            ))
        db.commit()
        db.refresh(db_obj)
    except Exception:
        db.rollback()
        raise
    return db_obj


def update(db: Session, db_obj: Supply, data: SupplyUpdate) -> Supply:
    values = data.model_dump(exclude_unset=True)
    if "category" in values:
        values["type"] = values.pop("category")
    for field, value in values.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def adjust_stock(db: Session, db_obj: Supply, delta: float) -> Supply:
    # delta âm = trừ kho (khi dùng vật tư), delta dương = nhập thêm kho
    db_obj.stock_quantity = db_obj.stock_quantity + delta
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, db_obj: Supply) -> None:
    db.delete(db_obj)
    db.commit()


def create_import(db: Session, supply: Supply, data: SupplyImportCreate, user_id: int | None = None):
    if data.expiry_date and data.manufacture_date and data.expiry_date < data.manufacture_date:
        raise ValueError("Hạn sử dụng không được trước ngày sản xuất.")
    supply.stock_quantity += data.quantity_imported
    record = SupplyImport(
        supply_id=supply.id,
        created_by_user_id=user_id,
        **data.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

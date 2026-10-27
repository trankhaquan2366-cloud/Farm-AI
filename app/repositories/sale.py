from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.sale import Sale


def get_by_harvest(db: Session, harvest_id: int):
    return db.query(Sale).filter(Sale.harvest_id == harvest_id).order_by(Sale.sale_date).all()


def sum_sold_quantity(db: Session, harvest_id: int) -> float:
    total = db.query(func.sum(Sale.quantity_kg)).filter(Sale.harvest_id == harvest_id).scalar()
    return total or 0.0


def create(db: Session, harvest_id, customer_name, quantity_kg, unit_price, sale_date) -> Sale:
    db_obj = Sale(
        harvest_id=harvest_id, customer_name=customer_name, quantity_kg=quantity_kg,
        unit_price=unit_price, sale_date=sale_date,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

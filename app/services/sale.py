from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories import sale as repo
from app.repositories import harvest as harvest_repo
from app.schemas.sale import SaleCreate, SaleOut


def list_by_harvest(db: Session, harvest_id: int):
    sales = repo.get_by_harvest(db, harvest_id)
    return [_to_out(s) for s in sales]


def _to_out(sale) -> SaleOut:
    return SaleOut(
        id=sale.id, harvest_id=sale.harvest_id, customer_name=sale.customer_name,
        quantity_kg=sale.quantity_kg, unit_price=sale.unit_price, sale_date=sale.sale_date,
        total_amount=sale.quantity_kg * sale.unit_price,
    )


def create_sale(db: Session, data: SaleCreate) -> SaleOut:
    harvest = harvest_repo.get_by_id(db, data.harvest_id)
    if harvest is None:
        raise HTTPException(status_code=400, detail=f"harvest_id={data.harvest_id} không tồn tại")

    # Logic nghiệp vụ: không cho bán vượt quá sản lượng đã thu hoạch -
    # đảm bảo tính toàn vẹn của chuỗi truy xuất nguồn gốc (không thể bán
    # "rau ảo" nhiều hơn thực tế đã thu).
    already_sold = repo.sum_sold_quantity(db, data.harvest_id)
    if already_sold + data.quantity_kg > harvest.quantity_kg:
        remaining = harvest.quantity_kg - already_sold
        raise HTTPException(
            status_code=400,
            detail=f"Vượt quá sản lượng còn lại để bán (còn {remaining} kg)",
        )

    sale = repo.create(db, data.harvest_id, data.customer_name, data.quantity_kg, data.unit_price, data.sale_date)
    return _to_out(sale)

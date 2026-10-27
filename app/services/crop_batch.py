from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.crop_batch import CropBatchCreate, CropBatchUpdate
from app.repositories import crop_batch as repo
from app.repositories import plot as plot_repo
from app.repositories import plant_variety as variety_repo
from app.models.crop_batch import CropBatch

def _generate_batch_code(db: Session, variety_id: int, seeding_date) -> str:
    if hasattr(repo, "count_batches"):
        count = repo.count_batches(db)
    else:
        count = db.query(CropBatch).count()
    date_str = seeding_date.strftime("%Y%m%d")
    return f"CB-{variety_id}-{date_str}-{count + 1:03d}"

def get_batch_or_404(db: Session, batch_id: int) -> CropBatch:
    batch = repo.get_by_id(db, batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy lô trồng với ID={batch_id}"
        )
    return batch

def get_batch_by_code_or_404(db: Session, batch_code: str) -> CropBatch:
    batch = repo.get_by_code(db, batch_code)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy lô trồng với mã: {batch_code}"
        )
    return batch

def create_batch(db: Session, data: CropBatchCreate) -> CropBatch:
    # Kiểm tra Lô đất
    plot = plot_repo.get_by_id(db, data.plot_id) if hasattr(plot_repo, "get_by_id") else None
    
    # Kiểm tra Giống cây
    variety = variety_repo.get_by_id(db, data.variety_id) if hasattr(variety_repo, "get_by_id") else None
    if not variety and hasattr(variety_repo, "PlantVariety"):
        variety = db.query(variety_repo.PlantVariety).filter(variety_repo.PlantVariety.id == data.variety_id).first()

    if not variety:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Giống cây ID={data.variety_id} không tồn tại"
        )

    # Trừ tồn kho giống cây
    if data.status == "growing" and data.quantity_used and data.quantity_used > 0:
        stock = getattr(variety, "stock_quantity", 0.0) or 0.0
        unit = getattr(variety, "unit", "kg") or "kg"
        if stock < data.quantity_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng giống trong kho không đủ! (Còn lại: {stock} {unit})"
            )
        variety.stock_quantity = stock - data.quantity_used

    # Tính ngày thu hoạch dự kiến
    expected_harvest_date = data.expected_harvest_date
    if expected_harvest_date is None:
        growth_days = getattr(variety, "growth_duration_days", 45) or 45
        expected_harvest_date = data.seeding_date + timedelta(days=growth_days)

    batch_code = _generate_batch_code(db, data.variety_id, data.seeding_date)
    batch_name = data.batch_name.strip() if data.batch_name else None

    batch_dict = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    batch_dict.update({
        "batch_code": batch_code,
        "batch_name": batch_name,
        "expected_harvest_date": expected_harvest_date
    })

    return repo.create(db=db, data=batch_dict)

def update_batch(db: Session, batch_id: int, payload: CropBatchUpdate) -> CropBatch:
    batch = get_batch_or_404(db, batch_id)
    if hasattr(payload, "model_dump"):
        update_data = payload.model_dump(exclude_unset=True)
    else:
        update_data = payload.dict(exclude_unset=True)
    return repo.update(db, batch, update_data)

def delete_batch(db: Session, batch_id: int) -> None:
    batch = get_batch_or_404(db, batch_id)
    repo.delete(db, batch)
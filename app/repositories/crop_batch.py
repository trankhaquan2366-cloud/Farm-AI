from typing import Optional, Union
from sqlalchemy.orm import Session
from app.core.status import is_growing_status
from app.models.crop_batch import CropBatch
from app.schemas.crop_batch import CropBatchCreate


def count_batches(db: Session) -> int:
    """Đếm tổng số lô trồng trong CSDL"""
    return db.query(CropBatch).count()


def get_by_id(db: Session, batch_id: int) -> Optional[CropBatch]:
    return db.query(CropBatch).filter(CropBatch.id == batch_id).first()


def get_by_code(db: Session, batch_code: str) -> Optional[CropBatch]:
    return db.query(CropBatch).filter(CropBatch.batch_code == batch_code).first()


def get_growing_batches(db: Session):
    """Lọc lô đang canh tác ở Python để xử lý đúng chữ "Đ" của tiếng Việt."""
    batches = db.query(CropBatch).order_by(CropBatch.id.asc()).all()
    return [batch for batch in batches if is_growing_status(batch.status)]


def create(db: Session, data: Union[CropBatchCreate, dict]):
    if isinstance(data, dict):
        batch_data = data.copy()
    else:
        batch_data = data.model_dump()

    # 1. Chuyển đổi 'batch_name' sang 'name' nếu Model dùng tên 'name'
    if "batch_name" in batch_data and not hasattr(CropBatch, "batch_name"):
        batch_data["name"] = batch_data.pop("batch_name")

    # 2. BỘ LỌC AN TOÀN: Chỉ giữ lại các trường thực sự có trong bảng CropBatch
    valid_columns = {col.name for col in CropBatch.__table__.columns}
    filtered_data = {k: v for k, v in batch_data.items() if k in valid_columns}

    db_batch = CropBatch(**filtered_data)
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


def update(db: Session, db_batch: CropBatch, update_data: dict) -> CropBatch:
    # Chuyển đổi batch_name nếu cột trong DB tên là name
    if "batch_name" in update_data and not hasattr(CropBatch, "batch_name"):
        update_data["name"] = update_data.pop("batch_name")

    valid_columns = {col.name for col in CropBatch.__table__.columns}

    for key, value in update_data.items():
        if key in valid_columns and value is not None:
            setattr(db_batch, key, value)

    db.commit()
    db.refresh(db_batch)
    return db_batch


def delete(db: Session, db_batch: CropBatch) -> None:
    db.delete(db_batch)
    db.commit()
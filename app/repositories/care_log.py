from typing import Optional, Union
from sqlalchemy.orm import Session
from app.models.care_log import CareLog
from app.schemas.care_log import CareLogCreate

def get_all(db: Session, batch_id: Optional[int] = None):
    query = db.query(CareLog)
    if batch_id:
        # Cột legacy "batch_id" tồn tại trong SQLite nhưng KHÔNG được map ở ORM,
        # nên chỉ lọc theo crop_batch_id để tránh AttributeError -> HTTP 500.
        query = query.filter(CareLog.crop_batch_id == batch_id)
    return query.order_by(CareLog.id.desc()).all()


def get_by_batch(db: Session, batch_id: int):
    return (
        db.query(CareLog)
        .filter(CareLog.crop_batch_id == batch_id)
        .order_by(CareLog.id.asc())
        .all()
    )

def create(db: Session, data: Union[CareLogCreate, dict]):
    if isinstance(data, dict):
        log_data = data.copy()
    else:
        log_data = data.model_dump()

    # Bộ lọc an toàn: Chỉ lấy đúng cột có trong bảng DB
    valid_columns = {col.name for col in CareLog.__table__.columns}
    filtered_data = {k: v for k, v in log_data.items() if k in valid_columns}

    db_log = CareLog(**filtered_data)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
from sqlalchemy.orm import Session
from app.models.harvest import HarvestLog
from app.schemas.harvest import HarvestCreate

def get_all(db: Session):
    return db.query(HarvestLog).all()

def get_by_id(db: Session, harvest_id: int):
    return db.query(HarvestLog).filter(HarvestLog.id == harvest_id).first()

def get_by_batch(db: Session, batch_id: int):
    return db.query(HarvestLog).filter(HarvestLog.batch_id == batch_id).all()

def create(db: Session, harvest: HarvestCreate):
    db_obj = HarvestLog(
        batch_id=harvest.batch_id,
        quantity=harvest.quantity,
        grade=harvest.grade,
        notes=harvest.notes,
        harvest_time=harvest.harvest_time
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
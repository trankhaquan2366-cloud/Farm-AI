from typing import Optional
from sqlalchemy.orm import Session
from app.schemas.care_log import CareLogCreate
from app.repositories import care_log as repo

def get_logs(db: Session, batch_id: Optional[int] = None):
    return repo.get_all(db, batch_id)

def create_log(db: Session, payload: CareLogCreate):
    return repo.create(db, payload)
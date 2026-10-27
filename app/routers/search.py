from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.harvest import HarvestLog

router = APIRouter()

@router.get("/search")
def global_search(q: str, db: Session = Depends(get_db)):
    # ... logic tìm kiếm các entity khác ...

    # Sửa db.query(Harvest) -> db.query(HarvestLog)
    harvest_results = db.query(HarvestLog).filter(
        HarvestLog.notes.ilike(f"%{q}%")
    ).all()

    return {
        "harvests": harvest_results,
        # ... kết quả khác ...
    }
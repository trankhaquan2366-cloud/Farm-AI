from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.sale import SaleCreate, SaleOut
from app.services import sale as service

router = APIRouter(prefix="/api/sales", tags=["Sales"])


@router.get("/harvest/{harvest_id}", response_model=List[SaleOut])
def list_by_harvest(harvest_id: int, db: Session = Depends(get_db)):
    return service.list_by_harvest(db, harvest_id)


@router.post("", response_model=SaleOut, status_code=201)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    return service.create_sale(db, payload)

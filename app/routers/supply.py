from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.deps import require_staff
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import UserRole
from app.schemas.supply import SupplyAlert, SupplyCreate, SupplyImportCreate, SupplyImportOut, SupplyOut, SupplyUpdate
from app.services import supply as service

router = APIRouter(prefix="/api/supplies", tags=["Supplies"])

@router.post("", dependencies=[Depends(require_staff)])
@router.put("/{supply_id}", dependencies=[Depends(require_staff)])
@router.get("", response_model=list[SupplyOut])
def list_supplies(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    low_stock: bool = Query(False),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return service.list_supplies(db, category, search, low_stock)


@router.get("/alerts", response_model=list[SupplyAlert])
def supply_alerts(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return service.get_alerts(db)


@router.get("/{supply_id}", response_model=SupplyOut)
def get_supply(supply_id: int, db: Session = Depends(get_db)):
    return service.get_supply_or_404(db, supply_id)


@router.post("", response_model=SupplyOut, status_code=201, dependencies=[Depends(require_roles([UserRole.MANAGER, UserRole.ADMIN]))])
def create_supply(payload: SupplyCreate, db: Session = Depends(get_db)):
    return service.create_supply(db, payload)


@router.post("/{supply_id}/import", response_model=SupplyImportOut, status_code=201, dependencies=[Depends(require_roles([UserRole.MANAGER, UserRole.ADMIN]))])
def import_supply(supply_id: int, payload: SupplyImportCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return service.import_supply(db, supply_id, payload, current_user.get("id") if isinstance(current_user, dict) else None)


@router.put("/{supply_id}", response_model=SupplyOut, dependencies=[Depends(require_roles([UserRole.MANAGER, UserRole.ADMIN]))])
def update_supply(supply_id: int, payload: SupplyUpdate, db: Session = Depends(get_db)):
    return service.update_supply(db, supply_id, payload)


@router.delete("/{supply_id}", status_code=204, dependencies=[Depends(require_roles([UserRole.MANAGER, UserRole.ADMIN]))])
def delete_supply(supply_id: int, db: Session = Depends(get_db)):
    service.delete_supply(db, supply_id)

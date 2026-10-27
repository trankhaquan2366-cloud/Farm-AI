from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_permission
from app.models.plant_variety import PlantVariety
from app.models.crop_batch import CropBatch
from app.schemas.plant_variety import (
    PlantVarietyCreate,
    PlantVarietyUpdate,
    PlantVarietyOut
)

router = APIRouter(tags=["Plant Varieties"])


@router.get(
    "", 
    response_model=List[PlantVarietyOut], 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plant_varieties:read"))]
)
@router.get(
    "/", 
    response_model=List[PlantVarietyOut], 
    dependencies=[Depends(require_permission("plant_varieties:read"))],
    include_in_schema=False
)
def get_varieties(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các giống cây trồng."""
    return db.query(PlantVariety).all()


@router.get(
    "/{variety_id}", 
    response_model=PlantVarietyOut, 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plant_varieties:read"))]
)
def get_variety_detail(variety_id: int, db: Session = Depends(get_db)):
    variety = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if not variety:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy giống cây")
    return variety


@router.post(
    "", 
    response_model=PlantVarietyOut, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("plant_varieties:create"))]
)
@router.post(
    "/", 
    response_model=PlantVarietyOut, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("plant_varieties:create"))],
    include_in_schema=False
)
def create_variety(payload: PlantVarietyCreate, db: Session = Depends(get_db)):
    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    
    if data.get("code"):
        existing = db.query(PlantVariety).filter(PlantVariety.code == data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giống cây '{data['code']}' đã tồn tại."
            )

    db_item = PlantVariety(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put(
    "/{variety_id}", 
    response_model=PlantVarietyOut, 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plant_varieties:update"))]
)
def update_variety(variety_id: int, payload: PlantVarietyUpdate, db: Session = Depends(get_db)):
    item = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy giống cây")

    update_data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)

    if update_data.get("code") and update_data["code"] != item.code:
        existing = db.query(PlantVariety).filter(PlantVariety.code == update_data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giống cây '{update_data['code']}' đã tồn tại."
            )

    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/{variety_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plant_varieties:delete"))]
)
def delete_variety(variety_id: int, db: Session = Depends(get_db)):
    variety = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if not variety:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy giống cây")

    linked_batch = db.query(CropBatch).filter(CropBatch.variety_id == variety_id).first()
    if linked_batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa giống cây đang được liên kết với lô trồng."
        )

    db.delete(variety)
    db.commit()
    return {"message": "Xóa giống cây thành công"}
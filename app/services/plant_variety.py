from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.crop_batch import CropBatch
from app.schemas.plant_variety import PlantVarietyCreate, PlantVarietyUpdate
from app.repositories import plant_variety as repo


def _normalize_name(name: str) -> str:
    """Hàm phụ trợ: Chuyển tên về chữ thường và xóa toàn bộ khoảng trắng."""
    return name.lower().replace(" ", "") if name else ""


def get_varieties(db: Session):
    return repo.get_all(db)


def create_variety(db: Session, payload: PlantVarietyCreate):
    # 1. Chuẩn hóa tên nhập vào
    normalized_new_name = _normalize_name(payload.name)

    # 2. Lấy danh sách hiện có và kiểm tra trùng lặp
    all_varieties = repo.get_all(db)
    if any(_normalize_name(v.name) == normalized_new_name for v in all_varieties):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên giống cây này đã tồn tại trong hệ thống."
        )

    return repo.create(db, payload)


def update_variety(db: Session, variety_id: int, payload: PlantVarietyUpdate):
    variety = repo.get_by_id(db, variety_id)
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Giống cây không tồn tại."
        )

    # Nếu người dùng có cập nhật tên mới, kiểm tra xem tên mới có bị trùng với giống khác không
    if payload.name:
        normalized_new_name = _normalize_name(payload.name)
        all_varieties = repo.get_all(db)
        
        # Bỏ qua chính nó (v.id != variety_id) khi kiểm tra trùng
        if any(v.id != variety_id and _normalize_name(v.name) == normalized_new_name for v in all_varieties):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên giống cây này đã tồn tại trong hệ thống."
            )

    return repo.update(db, variety, payload)


def delete_variety(db: Session, variety_id: int):
    variety = repo.get_by_id(db, variety_id)
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Giống cây không tồn tại."
        )

    batch_exists = db.query(CropBatch).filter(CropBatch.variety_id == variety_id).first()
    if batch_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa giống cây đang được liên kết với lô trồng."
        )

    # Truyền object 'variety' vào hàm delete của repo
    return repo.delete(db, variety)
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.harvest import HarvestLog
from app.repositories import harvest as repo
from app.repositories import crop_batch as batch_repo
from app.schemas.harvest import HarvestCreate


def list_all(db: Session):
    return repo.get_all(db)


def list_by_batch(db: Session, batch_id: int):
    return repo.get_by_batch(db, batch_id)


def create_harvest(db: Session, data: HarvestCreate):
    # 1. Kiểm tra sự tồn tại của Lô trồng
    batch = batch_repo.get_by_id(db, data.batch_id)
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"batch_id={data.batch_id} không tồn tại"
        )
    
    # 2. Tạo bản ghi Thu hoạch mới
    harvest = repo.create(
        db, 
        data.batch_id, 
        data.harvest_date, 
        data.quantity_kg, 
        data.quality_grade, 
        data.harvested_by
    )

    # 3. ĐỒNG BỘ TRẠNG THÁI LÔ TRỒNG -> "Đã thu hoạch"
    try:
        if hasattr(batch, "status"):
            batch.status = "Đã thu hoạch"  # Hoặc "Thu hoạch" tùy theo quy chuẩn UI của bạn
            db.add(batch)
            db.commit()
            db.refresh(batch)
    except Exception as e:
        print(f">>> Cảnh báo: Lỗi tự động cập nhật trạng thái Lô trồng sau thu hoạch: {e}")

    return harvest
def get_by_trace_code(db: Session, trace_code: str):
    return db.query(HarvestLog).filter(HarvestLog.qr_trace_code == trace_code).first()
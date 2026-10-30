import secrets
from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.crop_batch import CropBatch
from app.models.harvest import HarvestLog
from app.repositories import harvest as repo
from app.repositories import crop_batch as batch_repo
from app.schemas.harvest import HarvestCreate


def _is_plot_scoped_user(current_user) -> bool:
    """STAFF/WORKER chỉ được thấy dữ liệu thuộc lô được phân công."""
    role = (current_user or {}).get("role") if isinstance(current_user, dict) else None
    return str(role or "").strip().lower() in {"staff", "worker"}


def _generate_trace_code(db: Session, batch_code: str) -> str:
    """Sinh mã truy xuất duy nhất, thử tối đa 10 lần nếu trùng."""
    for _ in range(10):
        candidate = (
            f"GF-{batch_code}-{datetime.now():%Y%m%d%H%M%S}-"
            f"{secrets.token_hex(2).upper()}"
        )
        if not repo.trace_code_exists(db, candidate):
            return candidate
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Không sinh được mã truy xuất duy nhất, vui lòng thử lại.",
    )


def list_all(db: Session, current_user=None):
    if _is_plot_scoped_user(current_user):
        plot_id = current_user.get("plot_id")
        if plot_id is None:
            return []
        return (
            db.query(HarvestLog)
            .join(CropBatch, HarvestLog.batch_id == CropBatch.id)
            .filter(CropBatch.plot_id == plot_id)
            .all()
        )
    return repo.get_all(db)


def list_by_batch(db: Session, batch_id: int, current_user=None):
    if _is_plot_scoped_user(current_user):
        batch = batch_repo.get_by_id(db, batch_id)
        if batch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"batch_id={batch_id} không tồn tại",
            )
        if getattr(batch, "plot_id", None) != current_user.get("plot_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản không được phân công lô trồng này",
            )
    return repo.get_by_batch(db, batch_id)


def create_harvest(db: Session, data: HarvestCreate):
    # 1. Kiểm tra sự tồn tại của Lô trồng
    batch = batch_repo.get_by_id(db, data.batch_id)
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"batch_id={data.batch_id} không tồn tại",
        )

    # 2. Lô chưa có ngày gieo thì chưa thể thu hoạch (tránh dữ liệu vô nghĩa).
    if getattr(batch, "sow_date", None) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lô trồng chưa có ngày gieo, chưa thể ghi nhận thu hoạch.",
        )

    # 3. Tạo bản ghi thu hoạch và cập nhật trạng thái lô trong cùng một giao dịch.
    trace_code = _generate_trace_code(db, getattr(batch, "batch_code", f"LO-{batch.id}"))
    harvest = repo.create(db, data, trace_code, commit=False)
    if hasattr(batch, "status"):
        batch.status = "Đã thu hoạch"
        db.add(batch)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(harvest)
    db.refresh(batch)
    return harvest


def get_by_trace_code(db: Session, trace_code: str):
    return db.query(HarvestLog).filter(HarvestLog.qr_trace_code == trace_code).first()
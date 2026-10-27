from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.crop_batch import CropBatch
from app.schemas.plot import PlotCreate, PlotUpdate
from app.repositories import plot as repo


def _normalize_name(name: str) -> str:
    """Hàm phụ trợ: Chuyển tên về chữ thường và xóa toàn bộ khoảng trắng."""
    return name.lower().replace(" ", "") if name else ""


def list_plots(db: Session):
    """Lấy danh sách tất cả lô đất"""
    return repo.get_all(db)


def get_plot(db: Session, plot_id: int):
    """Lấy chi tiết 1 lô đất"""
    plot = repo.get_by_id(db, plot_id)
    if not plot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lô đất không tồn tại."
        )
    return plot


def create_plot(db: Session, payload: PlotCreate):
    """Tạo mới lô đất"""
    # 1. Chuẩn hóa tên nhập vào
    normalized_new_name = _normalize_name(payload.name)

    # 2. Lấy danh sách hiện có và kiểm tra trùng lặp
    all_plots = repo.get_all(db)
    if any(_normalize_name(p.name) == normalized_new_name for p in all_plots):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên lô đất này đã tồn tại trong hệ thống."
        )

    return repo.create(db, payload)


def update_plot(db: Session, plot_id: int, payload: PlotUpdate):
    """Cập nhật lô đất"""
    plot = repo.get_by_id(db, plot_id)
    if not plot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lô đất không tồn tại."
        )

    # Nếu người dùng có cập nhật tên mới, kiểm tra xem tên mới có bị trùng với lô đất khác không
    if payload.name:
        normalized_new_name = _normalize_name(payload.name)
        all_plots = repo.get_all(db)

        # Bỏ qua chính nó (p.id != plot_id) khi kiểm tra trùng
        if any(p.id != plot_id and _normalize_name(p.name) == normalized_new_name for p in all_plots):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên lô đất này đã tồn tại trong hệ thống."
            )

    return repo.update(db, plot, payload)


def delete_plot(db: Session, plot_id: int):
    """Xóa lô đất"""
    # Kiểm tra lô đất có tồn tại không
    plot = repo.get_by_id(db, plot_id)
    if not plot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Lô đất không tồn tại."
        )

    # Chặn xóa nếu lô đất đang có lô trồng đang canh tác
    active_batch = db.query(CropBatch).filter(
        CropBatch.plot_id == plot_id,
        CropBatch.status == "growing"
    ).first()

    if active_batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa lô đất đang có lô trồng đang hoạt động (growing)."
        )

    # Xử lý lỗi khóa ngoại khi vẫn còn lô trồng trạng thái khác (harvested, v.v.)
    try:
        return repo.delete(db, plot_id)
    except IntegrityError:
        db.rollback()  # Hoàn tác transaction đang bị lỗi
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa lô đất này vì vẫn còn lịch sử canh tác (lô trồng cũ). Vui lòng xóa các lô trồng liên quan trước."
        )
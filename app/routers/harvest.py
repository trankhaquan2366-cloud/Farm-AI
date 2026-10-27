from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from app.schemas.harvest import HarvestCreate, HarvestOut
from app.services import harvest as service

# Bỏ prefix="/api/harvests" để main.py tự quản lý linh hoạt các prefix alias
router = APIRouter(tags=["Harvests"])


@router.get(
    "", 
    response_model=List[HarvestOut], 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("harvests:read"))],
    summary="Lấy tất cả danh sách thu hoạch"
)
@router.get(
    "/", 
    response_model=List[HarvestOut], 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("harvests:read"))],
    include_in_schema=False
)
def list_all_harvests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy toàn bộ danh sách các lượt thu hoạch trong hệ thống (Dùng cho biểu đồ Dashboard).
    """
    return service.list_all(db)


@router.get(
    "/batch/{batch_id}", 
    response_model=List[HarvestOut], 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("harvests:read"))],
    summary="Lấy danh sách thu hoạch theo Lô trồng"
)
def list_by_batch(
    batch_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy thông tin các lượt thu hoạch thuộc về một Lô trồng (Batch) cụ thể.
    """
    return service.list_by_batch(db, batch_id)


@router.post(
    "", 
    response_model=HarvestOut, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("harvests:create"))],
    summary="Tạo mới lượt thu hoạch"
)
@router.post(
    "/", 
    response_model=HarvestOut, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("harvests:create"))],
    include_in_schema=False
)
def create_harvest(
    payload: HarvestCreate, 
    db: Session = Depends(get_db)
):
    """
    Tạo mới một bản ghi thu hoạch nông sản.
    Tự động sinh mã truy xuất nguồn gốc (QR Trace Code).
    """
    return service.create_harvest(db, payload)


@router.get(
    "/trace/{trace_code}", 
    status_code=status.HTTP_200_OK,
    summary="Truy xuất nguồn gốc công khai theo mã QR Code"
)
def trace_harvest_by_code(
    trace_code: str, 
    db: Session = Depends(get_db)
):
    """
    API Truy xuất nguồn gốc nông sản công khai (Public - Không cần Token/Đăng nhập).
    Trả về toàn bộ chuỗi thông tin: Lô trồng, Giống cây, Vùng canh tác, Nhật ký chăm sóc & Ngày thu hoạch.
    """
    clean_code = trace_code.strip()
    trace_data = service.get_by_trace_code(db, clean_code)
    
    if not trace_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Không tìm thấy thông tin truy xuất nguồn gốc cho mã: '{clean_code}'"
        )
        
    return {
        "status": "success",
        "data": trace_data
    }
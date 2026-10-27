from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User

# Bỏ prefix="/api/plots" tại đây để main.py tự quản lý prefix alias
router = APIRouter(tags=["Plots"])


# =========================================================================
# DYNAMIC MODEL HELPERS
# =========================================================================
def get_plot_model():
    try:
        from app.models import Plot
        return Plot
    except ImportError:
        from app.models.plot import Plot
        return Plot


def get_seed_model():
    try:
        from app.models.plant_variety import PlantVariety
        return PlantVariety
    except ImportError:
        pass

    try:
        from app.models import PlantVariety
        return PlantVariety
    except ImportError:
        pass

    try:
        from app.models import Seed
        return Seed
    except ImportError:
        pass

    return None


def get_crop_batch_model():
    try:
        from app.models.crop_batch import CropBatch
        return CropBatch
    except ImportError:
        pass

    try:
        from app.models import CropBatch
        return CropBatch
    except ImportError:
        pass

    return None


class StartPlantingSchema(BaseModel):
    seed_id: Optional[int] = None
    seed_name: Optional[str] = None
    planting_date: str
    growth_days: Optional[int] = 30


# =========================================================================
# 1. LẤY DANH SÁCH LÔ ĐẤT
# =========================================================================
@router.get(
    "", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:read"))]
)
@router.get(
    "/", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:read"))],
    include_in_schema=False
)
def get_plots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    Plot = get_plot_model()
    plots = db.query(Plot).all()

    Seed = get_seed_model()
    result = []
    
    for p in plots:
        p_dict = p.__dict__.copy()
        p_dict.pop('_sa_instance_state', None)

        if Seed and getattr(p, 'seed_id', None) and not p_dict.get('seed_name'):
            seed_item = db.query(Seed).filter(Seed.id == p.seed_id).first()
            if seed_item:
                p_dict['seed_name'] = seed_item.name
                p_dict['growth_days'] = getattr(seed_item, 'growth_days', 30)

        result.append(p_dict)

    return result


# =========================================================================
# 2. TẠO MỚI LÔ ĐẤT
# =========================================================================
@router.post(
    "", 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("plots:create"))]
)
@router.post(
    "/", 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("plots:create"))],
    include_in_schema=False
)
def create_plot(payload: dict, db: Session = Depends(get_db)):
    Plot = get_plot_model()

    valid_keys = (
        {c.name for c in Plot.__table__.columns}
        if hasattr(Plot, "__table__")
        else payload.keys()
    )
    filtered_payload = {k: v for k, v in payload.items() if k in valid_keys}

    if "area" in filtered_payload and filtered_payload["area"] is not None:
        try:
            filtered_payload["area"] = float(filtered_payload["area"])
        except (ValueError, TypeError):
            pass

    try:
        db_item = Plot(**filtered_payload)
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi tạo lô đất: {str(e)}"
        )


# =========================================================================
# 3. LẬP KẾ HOẠCH GIEO TRỒNG
# =========================================================================
@router.post(
    "/{plot_id}/start-planting",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:update"))]
)
def start_planting(
    plot_id: int, 
    payload: StartPlantingSchema, 
    db: Session = Depends(get_db)
):
    Plot = get_plot_model()
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô đất")

    try:
        p_date = datetime.strptime(payload.planting_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng ngày gieo không hợp lệ (yêu cầu dạng YYYY-MM-DD)"
        )

    growth_days = payload.growth_days or 30
    seed_name = payload.seed_name

    Seed = get_seed_model()
    if Seed and payload.seed_id:
        seed_item = db.query(Seed).filter(Seed.id == payload.seed_id).first()
        if seed_item:
            seed_name = seed_item.name
            growth_days = getattr(seed_item, "growth_days", growth_days)

    expected_harvest = p_date + timedelta(days=growth_days)

    plot.status = "Đang canh tác"
    
    if hasattr(plot, "seed_id"):
        plot.seed_id = payload.seed_id
    if hasattr(plot, "seed_name"):
        plot.seed_name = seed_name
    if hasattr(plot, "planting_date"):
        plot.planting_date = p_date
    if hasattr(plot, "expected_harvest_date"):
        plot.expected_harvest_date = expected_harvest

    db.commit()
    db.refresh(plot)

    return {
        "message": "Lập kế hoạch gieo trồng thành công!",
        "plot_id": plot.id,
        "status": plot.status,
        "seed_name": seed_name,
        "planting_date": str(p_date),
        "expected_harvest_date": str(expected_harvest)
    }


# =========================================================================
# 4. CẬP NHẬT LÔ ĐẤT
# =========================================================================
@router.put(
    "/{plot_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:update"))]
)
def update_plot(plot_id: int, payload: dict, db: Session = Depends(get_db)):
    Plot = get_plot_model()
    item = db.query(Plot).filter(Plot.id == plot_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô đất")

    valid_keys = (
        {c.name for c in Plot.__table__.columns}
        if hasattr(Plot, "__table__")
        else payload.keys()
    )

    for k, v in payload.items():
        if k in valid_keys and hasattr(item, k) and v is not None:
            setattr(item, k, v)

    db.commit()
    db.refresh(item)
    return item


# =========================================================================
# 5. XÓA LÔ ĐẤT
# =========================================================================
@router.delete(
    "/{plot_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:delete"))]
)
def delete_plot(plot_id: int, db: Session = Depends(get_db)):
    Plot = get_plot_model()
    CropBatch = get_crop_batch_model()

    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô đất")

    if CropBatch:
        linked_batch = db.query(CropBatch).filter(CropBatch.plot_id == plot_id).first()
        if linked_batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa lô đất đang được liên kết với lô trồng."
            )

    db.delete(plot)
    db.commit()
    return {"message": "Xóa lô đất thành công"}
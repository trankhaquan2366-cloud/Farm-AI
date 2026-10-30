from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.schemas.crop_batch import CropBatchCreate, CropBatchUpdate
from app.services.crop_batch_service import (
    create_crop_batch,
    delete_crop_batch,
    update_crop_batch,
)

router = APIRouter(tags=["Crop Batches"])

# Bảng dịch trạng thái sang Tiếng Việt
STATUS_MAP_VN = {
    "growing": "Đang trồng",
    "PLANTING": "Đang trồng",
    "planting": "Đang trồng",
    "harvested": "Đã thu hoạch",
    "HARVESTED": "Đã thu hoạch",
    "cancelled": "Đã hủy",
    "CANCELLED": "Đã hủy",
    "planned": "Kế hoạch",
    "PLANNED": "Kế hoạch",
    "Đang trồng": "Đang trồng",
    "Đã thu hoạch": "Đã thu hoạch",
    "Đã hủy": "Đã hủy",
    "Kế hoạch": "Kế hoạch",
}


def get_models():
    """Lấy động các Model SQLAlchemy liên quan đến Lô trồng."""
    try:
        from app.models import CropBatch, PlantVariety, Plot
        return CropBatch, PlantVariety, Plot
    except ImportError:
        from app.models.crop_batch import CropBatch
        from app.models.plant_variety import PlantVariety
        from app.models.plot import Plot
        return CropBatch, PlantVariety, Plot


def parse_date_obj(val: Any) -> Optional[date]:
    """Hàm bổ trợ ép kiểu chuỗi/datetime sang Python date object tránh lỗi SQLite Date type."""
    if not val:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        clean_str = val.split("T")[0].split(" ")[0]
        try:
            return datetime.strptime(clean_str, "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def normalize_batch(batch: Any, db: Session) -> Dict[str, Any]:
    """Chuẩn hóa dữ liệu lô trồng thành dict với các trường chuẩn cho Frontend/Schema."""
    _, PlantVariety, Plot = get_models()

    if hasattr(batch, "__table__"):
        d = {c.name: getattr(batch, c.name) for c in batch.__table__.columns}
    else:
        d = dict(batch.__dict__)

    d.pop("_sa_instance_state", None)

    # 1. Thông tin Giống cây & Lô đất
    # Ưu tiên dùng quan hệ đã được eager-load (xem selectinload ở get_batches) để
    # tránh N+1. Dùng __dict__ thay vì getattr để không kích hoạt lazy-load ngoài ý muốn.
    variety_id = getattr(batch, "variety_id", None) or getattr(batch, "plant_variety_id", None)
    variety_name = ""
    growth_days = 30

    variety = batch.__dict__.get("variety") if hasattr(batch, "__dict__") else None
    if variety is None and variety_id:
        variety = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if variety is not None:
        variety_name = getattr(variety, "name", None) or getattr(variety, "variety_name", None) or ""
        growth_days = (
            getattr(variety, "growth_period", None) or 
            getattr(variety, "days_to_harvest", None) or 
            getattr(variety, "growth_days", None) or 
            getattr(variety, "duration", None) or 
            getattr(variety, "cycle_days", None) or 30
        )

    plot_id = getattr(batch, "plot_id", None)
    plot_name = ""
    plot = batch.__dict__.get("plot") if hasattr(batch, "__dict__") else None
    if plot is None and plot_id:
        plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if plot is not None:
        plot_name = getattr(plot, "name", None) or getattr(plot, "plot_name", None) or ""

    d["plot_name"] = plot_name or "Mặc định"
    d["plotName"] = plot_name or "Mặc định"
    d["plot"] = plot_name or "Mặc định"

    d["variety_name"] = variety_name or "Chưa chọn"
    d["varietyName"] = variety_name or "Chưa chọn"
    d["variety"] = variety_name or "Chưa chọn"

    # 2. Tên lô
    raw_name = (
        getattr(batch, "name", None) or 
        getattr(batch, "batch_name", None) or 
        getattr(batch, "title", None)
    )
    if not raw_name or raw_name == "Lô trồng":
        batch_id = getattr(batch, "id", 1)
        raw_name = f"Lô {variety_name} #{batch_id}" if variety_name else f"Lô trồng #{batch_id}"

    d["name"] = raw_name
    d["batch_name"] = raw_name
    d["batchName"] = raw_name
    d["title"] = raw_name

    # 3. Xử lý Ngày gieo
    sow_val = None
    for date_key in ["sow_date", "sowing_date", "plant_date", "planting_date", "start_date", "created_at", "date"]:
        val = getattr(batch, date_key, None)
        if val:
            sow_val = val
            break

    sow_str = str(sow_val).split("T")[0].split(" ")[0] if sow_val else datetime.now().strftime("%Y-%m-%d")

    sow_keys = [
        "sow_date", "sowDate", "sowing_date", "sowingDate", 
        "plant_date", "plantDate", "planting_date", "plantingDate",
        "planted_at", "plantedAt", "sowed_at", "sowedAt",
        "start_date", "startDate", "created_at", "createdAt", "date"
    ]
    for key in sow_keys:
        d[key] = sow_str

    # 4. Xử lý Ngày dự kiến thu hoạch
    harvest_val = None
    for h_key in ["expected_harvest_date", "estimated_harvest_date", "harvest_date", "expected_harvest"]:
        val = getattr(batch, h_key, None)
        if val:
            harvest_val = val
            break

    if harvest_val:
        harvest_str = str(harvest_val).split("T")[0].split(" ")[0]
    else:
        try:
            sow_dt = datetime.strptime(sow_str, "%Y-%m-%d")
            harvest_dt = sow_dt + timedelta(days=int(growth_days))
            harvest_str = harvest_dt.strftime("%Y-%m-%d")
        except Exception:
            harvest_str = sow_str

    harvest_keys = [
        "expected_harvest_date", "expectedHarvestDate", 
        "estimated_harvest_date", "estimatedHarvestDate",
        "harvest_date", "harvestDate", 
        "expected_harvest", "expectedHarvest"
    ]
    for h_k in harvest_keys:
        d[h_k] = harvest_str

    # 5. Ép Trạng thái về Tiếng Việt
    raw_status = getattr(batch, "status", None) or getattr(batch, "batch_status", None) or "Đang trồng"
    vn_status = STATUS_MAP_VN.get(raw_status, raw_status)

    d["status"] = vn_status
    d["batch_status"] = vn_status
    d["batchStatus"] = vn_status

    return d


# 1. Lấy danh sách Lô trồng
@router.get("", status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("crop_batches:read"))])
@router.get("/", status_code=status.HTTP_200_OK, include_in_schema=False, dependencies=[Depends(require_permission("crop_batches:read"))])
def get_batches(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    CropBatch, _, _ = get_models()
    from sqlalchemy.orm import selectinload

    query = db.query(CropBatch).options(
        selectinload(CropBatch.variety),
        selectinload(CropBatch.plot),
    )
    if str(current_user.get("role", "")).strip().lower() in {"staff", "worker"}:
        query = query.filter(CropBatch.plot_id == current_user.get("plot_id"))
    batches = query.all()
    return [normalize_batch(b, db) for b in batches]


# 2. Tạo mới Lô trồng
@router.post(
    "", 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("crop_batches:create"))]
)
@router.post(
    "/", 
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
    dependencies=[Depends(require_permission("crop_batches:create"))]
)
def create_batch(
    payload: CropBatchCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_batch = create_crop_batch(db, payload, current_user)
    return normalize_batch(db_batch, db)


# 3. Cập nhật Lô trồng
@router.put(
    "/{batch_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("crop_batches:update"))]
)
def update_batch(
    batch_id: int, 
    payload: CropBatchUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    batch = update_crop_batch(db, batch_id, payload)
    return normalize_batch(batch, db)


# 4. Xóa Lô trồng
@router.delete(
    "/{batch_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("crop_batches:delete"))]
)
def delete_batch(
    batch_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    delete_crop_batch(db, batch_id)
    return {"message": "Xóa lô trồng thành công"}


# 5. API truy xuất nguồn gốc công khai
@router.get("/trace/{batch_code}", status_code=status.HTTP_200_OK)
def get_batch_trace(batch_code: str, db: Session = Depends(get_db)):
    CropBatch, PlantVariety, Plot = get_models()
    if hasattr(CropBatch, "batch_code"):
        batch_code_column = CropBatch.batch_code
    elif hasattr(CropBatch, "code"):
        batch_code_column = CropBatch.code
    else:
        batch_code_column = None
    if batch_code_column is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy lô trồng với mã: {batch_code}",
        )

    from sqlalchemy.orm import joinedload

    batch = (
        db.query(CropBatch)
        .options(joinedload(CropBatch.variety), joinedload(CropBatch.plot))
        .filter(batch_code_column == batch_code)
        .first()
    )
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy lô trồng với mã: {batch_code}",
        )

    plot = batch.plot
    variety_id = getattr(batch, "variety_id", None) or getattr(batch, "plant_variety_id", None)
    variety = batch.variety if variety_id is not None else None

    from app.models.care_log import CareLog

    care_logs = (
        db.query(CareLog)
        .filter(CareLog.crop_batch_id == batch.id)
        .order_by(CareLog.id.asc())
        .all()
    )

    harvest_model = None
    try:
        from app.models import HarvestLog as harvest_model
    except ImportError:
        try:
            from app.models import Harvest as harvest_model
        except ImportError:
            try:
                from app.models.harvest import HarvestLog as harvest_model
            except ImportError:
                harvest_model = None

    harvest_history = []
    if harvest_model is not None:
        from sqlalchemy import or_

        harvest_batch_columns = [
            getattr(harvest_model, column_name) == batch.id
            for column_name in ("crop_batch_id", "batch_id", "lot_id", "crop_lot_id")
            if hasattr(harvest_model, column_name)
        ]
        if harvest_batch_columns:
            harvests = (
                db.query(harvest_model)
                .filter(or_(*harvest_batch_columns))
                .all()
            )
            harvest_history = [
                {
                    "id": harvest.id,
                    "quantity": getattr(harvest, "quantity", None)
                    or getattr(harvest, "yield_kg", None),
                    "unit": getattr(harvest, "unit", None) or "kg",
                    "harvest_date": getattr(harvest, "harvest_date", None)
                    or getattr(harvest, "harvested_at", None)
                    or getattr(harvest, "created_at", None),
                    "qr_trace_code": getattr(harvest, "qr_trace_code", None)
                    or getattr(harvest, "trace_code", None),
                }
                for harvest in harvests
            ]

    batch_name = getattr(batch, "name", None) or getattr(batch, "batch_name", None)
    quantity_used = next(
        (
            getattr(batch, attribute)
            for attribute in ("quantity_used", "quantity", "seed_quantity")
            if getattr(batch, attribute, None) is not None
        ),
        None,
    )
    growth_duration_days = None
    if variety is not None:
        growth_duration_days = (
            getattr(variety, "growth_duration_days", None)
            or getattr(variety, "growth_period", None)
            or getattr(variety, "growth_days", None)
            or getattr(variety, "days_to_harvest", None)
        )

    return {
        "batch_info": {
            "id": batch.id,
            "batch_code": getattr(batch, "batch_code", None)
            or getattr(batch, "code", None),
            "batch_name": batch_name,
            "status": STATUS_MAP_VN.get(
                getattr(batch, "status", None), getattr(batch, "status", None)
            ),
            "sow_date": getattr(batch, "sow_date", None)
            or getattr(batch, "sowing_date", None),
            "expected_harvest_date": getattr(batch, "expected_harvest_date", None),
            "quantity_used": quantity_used,
        },
        "plot_info": {
            "id": getattr(plot, "id", None),
            "name": getattr(plot, "name", None)
            or getattr(plot, "plot_name", None),
            "area": getattr(plot, "area", None)
            or getattr(plot, "area_size", None),
            "location": getattr(plot, "location", None),
        },
        "variety_info": {
            "id": getattr(variety, "id", None),
            "name": getattr(variety, "name", None)
            or getattr(variety, "variety_name", None),
            "growth_duration_days": growth_duration_days,
        },
        # Chưa có bảng chứng nhận thật -> trả rỗng thay vì gắn nhãn không căn cứ.
        # Giao diện công khai sẽ hiển thị "Chưa có dữ liệu chứng nhận".
        "safety_certifications": [],
        # Chỉ công bố loại hoạt động + ngày + mô tả ngắn an toàn. Không trả ghi chú
        # tự do (notes) hay ảnh nội bộ của nhật ký.
        "care_history": [
            {
                "id": care_log.id,
                "action_type": care_log.action_type,
                "summary": f"Hoạt động: {care_log.action_type}",
                "logged_at": getattr(care_log, "logged_at", None)
                or care_log.log_date
                or care_log.created_at,
            }
            for care_log in care_logs
        ],
        "harvest_history": harvest_history,
    }


# 5. API Truy xuất nguồn gốc Lô trồng (Public / QR Code)
@router.get("/code/{code}/trace", status_code=status.HTTP_200_OK)
def get_batch_trace_by_code(code: str, db: Session = Depends(get_db)):
    CropBatch, PlantVariety, Plot = get_models()
    from sqlalchemy.orm import joinedload

    trace_query = db.query(CropBatch).options(
        joinedload(CropBatch.variety),
        joinedload(CropBatch.plot),
    )

    batch = None
    if hasattr(CropBatch, "batch_code"):
        batch = trace_query.filter(CropBatch.batch_code == code).first()
    if not batch and hasattr(CropBatch, "code"):
        batch = db.query(CropBatch).options(
            joinedload(CropBatch.variety), joinedload(CropBatch.plot)
        ).filter(CropBatch.code == code).first()
    if not batch and code.isdigit():
        batch = db.query(CropBatch).options(
            joinedload(CropBatch.variety), joinedload(CropBatch.plot)
        ).filter(CropBatch.id == int(code)).first()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thông tin nông sản cho mã truy xuất: {code}"
        )

    variety_name = "Nông sản"
    variety_id = getattr(batch, "variety_id", None) or getattr(batch, "plant_variety_id", None)
    if variety_id:
        v = batch.variety
        if v:
            variety_name = getattr(v, "name", None) or getattr(v, "variety_name", None) or variety_name

    plot_name = "Khu vực canh tác"
    plot_id = getattr(batch, "plot_id", None)
    if plot_id:
        p = batch.plot
        if p:
            plot_name = getattr(p, "name", None) or getattr(p, "plot_name", None) or plot_name

    care_logs_data = []
    try:
        from app.models import CareLog
    except ImportError:
        try:
            from app.models.care_log import CareLog
        except ImportError:
            CareLog = None

    if CareLog:
        try:
            from sqlalchemy import or_
            filter_conditions = []
            for col in ["batch_id", "crop_batch_id", "lot_id", "crop_lot_id"]:
                if hasattr(CareLog, col):
                    filter_conditions.append(getattr(CareLog, col) == batch.id)
            
            query = db.query(CareLog)
            if filter_conditions:
                query = query.filter(or_(*filter_conditions))
            
            if hasattr(CareLog, "log_date"):
                query = query.order_by(CareLog.log_date.asc())
            elif hasattr(CareLog, "logged_at"):
                query = query.order_by(CareLog.logged_at.asc())

            logs = query.all()
            for log in logs:
                log_date = getattr(log, "log_date", None) or getattr(log, "logged_at", "")
                action = getattr(log, "action_type", "") or getattr(log, "activity_type", "") or getattr(log, "action", "")
                notes = getattr(log, "notes", "") or getattr(log, "description", "") or getattr(log, "details", "")
                care_logs_data.append({
                    "id": log.id,
                    "date": str(log_date),
                    "action": action,
                    "notes": notes
                })
        except Exception:
            pass

    harvest_logs_data = []
    HarvestLog = None
    try:
        from app.models import HarvestLog
    except ImportError:
        try:
            from app.models import Harvest as HarvestLog
        except ImportError:
            try:
                from app.models.harvest import HarvestLog
            except ImportError:
                HarvestLog = None

    if HarvestLog:
        try:
            from sqlalchemy import or_
            h_filters = []
            for col in ["batch_id", "crop_batch_id", "lot_id", "crop_lot_id"]:
                if hasattr(HarvestLog, col):
                    h_filters.append(getattr(HarvestLog, col) == batch.id)
            
            h_query = db.query(HarvestLog)
            if h_filters:
                h_query = h_query.filter(or_(*h_filters))
                
            harvests = h_query.all()
            for h in harvests:
                qty = getattr(h, "quantity", 0) or getattr(h, "yield_kg", 0)
                unit = getattr(h, "unit", "kg")
                h_date = getattr(h, "harvest_date", "") or getattr(h, "created_at", "")
                qr_code = getattr(h, "qr_trace_code", None) or getattr(h, "trace_code", None)
                harvest_logs_data.append({
                    "id": h.id,
                    "quantity": qty,
                    "unit": unit,
                    "harvest_date": str(h_date),
                    "qr_trace_code": qr_code
                })
        except Exception:
            pass

    norm_batch = normalize_batch(batch, db)

    return {
        "status": "success",
        "data": {
            "code": code,
            "batch_id": batch.id,
            "batch_name": norm_batch.get("name"),
            "plant_name": variety_name,
            "plot_name": plot_name,
            "planted_date": norm_batch.get("sow_date"),
            "expected_harvest_date": norm_batch.get("expected_harvest_date"),
            "status": norm_batch.get("status"),
            "care_logs": care_logs_data,
            "harvest_logs": harvest_logs_data
        }
    }
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.schemas.crop_batch import CropBatchCreate, CropBatchUpdate, CropBatchOut

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
    CropBatch, PlantVariety, Plot = get_models()

    if hasattr(batch, "__table__"):
        d = {c.name: getattr(batch, c.name) for c in batch.__table__.columns}
    else:
        d = dict(batch.__dict__)

    d.pop("_sa_instance_state", None)

    # 1. Thông tin Giống cây & Lô đất
    variety_id = getattr(batch, "variety_id", None) or getattr(batch, "plant_variety_id", None)
    variety_name = ""
    growth_days = 30

    if variety_id:
        v = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
        if v:
            variety_name = getattr(v, "name", None) or getattr(v, "variety_name", None) or ""
            growth_days = (
                getattr(v, "growth_period", None) or 
                getattr(v, "days_to_harvest", None) or 
                getattr(v, "growth_days", None) or 
                getattr(v, "duration", None) or 
                getattr(v, "cycle_days", None) or 30
            )

    plot_id = getattr(batch, "plot_id", None)
    plot_name = ""
    if plot_id:
        p = db.query(Plot).filter(Plot.id == plot_id).first()
        if p:
            plot_name = getattr(p, "name", None) or getattr(p, "plot_name", None) or ""

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
    batches = db.query(CropBatch).all()
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
    payload: Union[CropBatchCreate, dict], 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    CropBatch, PlantVariety, Plot = get_models()
    valid_cols = {c.name: c.type for c in CropBatch.__table__.columns} if hasattr(CropBatch, "__table__") else {}
    
    # Chuyển payload thành dict nếu là Pydantic object
    data_in = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload
    data = {}

    # A. Tên lô
    name_val = (
        data_in.get("name") or 
        data_in.get("batch_name") or 
        data_in.get("batchName") or 
        data_in.get("title") or 
        "Lô trồng"
    )
    if "name" in valid_cols:
        data["name"] = name_val
    if "batch_name" in valid_cols:
        data["batch_name"] = name_val

    # B. Lô đất
    plot_id = data_in.get("plot_id") or data_in.get("plotId") or data_in.get("plot")
    if not plot_id:
        raise HTTPException(status_code=400, detail="Vui lòng chọn lô đất.")
    try:
        plot_id = int(plot_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Lô đất không hợp lệ.")
    if plot_id <= 0:
        raise HTTPException(status_code=400, detail="Vui lòng chọn lô đất hợp lệ.")
    if "plot_id" in valid_cols:
        if not db.query(Plot).filter(Plot.id == plot_id).first():
            raise HTTPException(status_code=400, detail="Lô đất được chọn không tồn tại.")
        data["plot_id"] = plot_id

    # C. Giống cây & Số lượng sử dụng (Trừ kho)
    variety_id = data_in.get("variety_id") or data_in.get("varietyId") or data_in.get("plant_variety_id") or data_in.get("variety")
    if not variety_id:
        raise HTTPException(status_code=400, detail="Vui lòng chọn giống cây.")
    try:
        variety_id = int(variety_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Giống cây không hợp lệ.")
    if variety_id <= 0:
        raise HTTPException(status_code=400, detail="Vui lòng chọn giống cây hợp lệ.")
        
    qty = data_in.get("quantity") or data_in.get("quantity_used") or data_in.get("seed_quantity") or 0.0
    try:
        qty = float(qty)
    except (ValueError, TypeError):
        qty = 0.0

    if "variety_id" in valid_cols:
        data["variety_id"] = variety_id

    variety = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if not variety:
        raise HTTPException(status_code=400, detail="Giống cây được chọn không tồn tại.")

    stock_attr = None
    for attr in ["stock_quantity", "quantity", "stock", "quantity_in_stock"]:
        if hasattr(variety, attr):
            stock_attr = attr
            break

    if stock_attr and qty > 0:
        current_stock = getattr(variety, stock_attr) or 0.0
        if current_stock < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng giống trong kho không đủ! (Tồn kho: {current_stock}, Cần: {qty})"
            )
        setattr(variety, stock_attr, current_stock - qty)

    # D. Số lượng trong Lô
    if "quantity" in valid_cols:
        data["quantity"] = qty
    if "seed_quantity" in valid_cols:
        data["seed_quantity"] = qty
    if "quantity_used" in valid_cols:
        data["quantity_used"] = qty

    # E. Ngày gieo
    sow_date_raw = (
        data_in.get("sowing_date") or data_in.get("sowingDate") or 
        data_in.get("sow_date") or data_in.get("sowDate") or 
        data_in.get("plant_date") or datetime.now().strftime("%Y-%m-%d")
    )
    sow_date_obj = parse_date_obj(sow_date_raw) or datetime.now().date()

    for date_col in ["sow_date", "sowing_date", "plant_date", "start_date"]:
        if date_col in valid_cols:
            col_type = str(valid_cols[date_col]).upper()
            data[date_col] = sow_date_obj if "DATE" in col_type else str(sow_date_obj)

    # F. Ngày thu hoạch dự kiến
    harvest_date_raw = data_in.get("expected_harvest_date") or data_in.get("expectedHarvestDate") or data_in.get("harvest_date")
    if not harvest_date_raw and variety_id:
        try:
            growth_days = 30
            if variety:
                growth_days = (
                    getattr(variety, "growth_period", None) or 
                    getattr(variety, "days_to_harvest", None) or 
                    getattr(variety, "growth_days", None) or
                    getattr(variety, "cycle_days", None) or 30
                )
            harvest_date_obj = sow_date_obj + timedelta(days=int(growth_days))
        except Exception:
            harvest_date_obj = sow_date_obj + timedelta(days=30)
    else:
        harvest_date_obj = parse_date_obj(harvest_date_raw)

    if harvest_date_obj:
        for h_col in ["expected_harvest_date", "estimated_harvest_date", "harvest_date", "expected_harvest"]:
            if h_col in valid_cols:
                col_type = str(valid_cols[h_col]).upper()
                data[h_col] = harvest_date_obj if "DATE" in col_type else str(harvest_date_obj)

    # G. Mã lô
    generated_code = data_in.get("batch_code") or data_in.get("batchCode") or data_in.get("code") or f"CB-{int(datetime.now().timestamp())}"
    if "batch_code" in valid_cols:
        data["batch_code"] = generated_code
    if "code" in valid_cols:
        data["code"] = generated_code

    # H. Trạng thái
    status_raw = data_in.get("status") or data_in.get("batch_status") or "Đang trồng"
    status_val = STATUS_MAP_VN.get(status_raw, status_raw)
    if "status" in valid_cols:
        data["status"] = status_val
    if "batch_status" in valid_cols:
        data["batch_status"] = status_val

    # I. Người tạo
    if "created_by" in valid_cols and isinstance(current_user, dict) and "id" in current_user:
        data["created_by"] = current_user["id"]

    # J. Gán các trường mở rộng khác
    for k, v in data_in.items():
        if k in valid_cols and k not in data:
            data[k] = v

    try:
        db_batch = CropBatch(**data)
        db.add(db_batch)
        db.commit()
        db.refresh(db_batch)
        return normalize_batch(db_batch, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể tạo lô trồng: {str(e)}"
        )


# 3. Cập nhật Lô trồng
@router.put(
    "/{batch_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("crop_batches:update"))]
)
def update_batch(
    batch_id: int, 
    payload: Union[CropBatchUpdate, dict], 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    CropBatch, _, _ = get_models()
    batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô trồng")

    valid_cols = {c.name: c.type for c in CropBatch.__table__.columns} if hasattr(CropBatch, "__table__") else {}
    data_in = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload

    # Cập nhật Trạng thái
    status_in = data_in.get("status") or data_in.get("batch_status") or data_in.get("batchStatus")
    if status_in is not None:
        status_vn = STATUS_MAP_VN.get(str(status_in), str(status_in))
        for s_col in ["status", "batch_status", "state"]:
            if s_col in valid_cols and hasattr(batch, s_col):
                setattr(batch, s_col, status_vn)

    # Cập nhật Tên lô
    name_in = data_in.get("name") or data_in.get("batch_name") or data_in.get("batchName")
    if name_in is not None:
        for n_col in ["name", "batch_name", "title"]:
            if n_col in valid_cols and hasattr(batch, n_col):
                setattr(batch, n_col, str(name_in))

    # Cập nhật Ngày gieo
    sow_in = data_in.get("sowing_date") or data_in.get("sowingDate") or data_in.get("sow_date") or data_in.get("plant_date")
    if sow_in is not None:
        sow_obj = parse_date_obj(sow_in)
        for d_col in ["sow_date", "sowing_date", "plant_date", "start_date"]:
            if d_col in valid_cols and hasattr(batch, d_col):
                col_type = str(valid_cols[d_col]).upper()
                val_to_set = sow_obj if "DATE" in col_type else str(sow_in)
                setattr(batch, d_col, val_to_set)

    # Cập nhật Ngày thu hoạch dự kiến
    harvest_in = data_in.get("expected_harvest_date") or data_in.get("expectedHarvestDate") or data_in.get("harvest_date")
    if harvest_in is not None:
        harvest_obj = parse_date_obj(harvest_in)
        for h_col in ["expected_harvest_date", "estimated_harvest_date", "harvest_date", "expected_harvest"]:
            if h_col in valid_cols and hasattr(batch, h_col):
                col_type = str(valid_cols[h_col]).upper()
                val_to_set = harvest_obj if "DATE" in col_type else str(harvest_in)
                setattr(batch, h_col, val_to_set)

    # Cập nhật các trường trực tiếp khác
    for k, v in data_in.items():
        if k in valid_cols and hasattr(batch, k) and v is not None:
            col_type = str(valid_cols[k]).upper()
            if "DATE" in col_type and isinstance(v, (str, datetime)):
                setattr(batch, k, parse_date_obj(v))
            else:
                setattr(batch, k, v)

    try:
        db.commit()
        db.refresh(batch)
        return normalize_batch(batch, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail=f"Lỗi cập nhật lô trồng: {str(e)}"
        )


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
    CropBatch, _, _ = get_models()
    try:
        from app.models import CareLog
    except ImportError:
        try:
            from app.models.care_log import CareLog
        except ImportError:
            CareLog = None

    batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô trồng")

    if CareLog:
        try:
            from sqlalchemy import or_
            filter_conditions = []
            for col in ["batch_id", "crop_batch_id", "lot_id", "crop_lot_id"]:
                if hasattr(CareLog, col):
                    filter_conditions.append(getattr(CareLog, col) == batch_id)
            if filter_conditions:
                db.query(CareLog).filter(or_(*filter_conditions)).delete(synchronize_session=False)
        except Exception:
            pass

    db.delete(batch)
    db.commit()
    return {"message": "Xóa lô trồng thành công"}


# 5. API Truy xuất nguồn gốc Lô trồng (Public / QR Code)
@router.get("/code/{code}/trace", status_code=status.HTTP_200_OK)
def get_batch_trace_by_code(code: str, db: Session = Depends(get_db)):
    CropBatch, PlantVariety, Plot = get_models()

    batch = None
    if hasattr(CropBatch, "batch_code"):
        batch = db.query(CropBatch).filter(CropBatch.batch_code == code).first()
    if not batch and hasattr(CropBatch, "code"):
        batch = db.query(CropBatch).filter(CropBatch.code == code).first()
    if not batch and code.isdigit():
        batch = db.query(CropBatch).filter(CropBatch.id == int(code)).first()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thông tin nông sản cho mã truy xuất: {code}"
        )

    variety_name = "Nông sản"
    variety_id = getattr(batch, "variety_id", None) or getattr(batch, "plant_variety_id", None)
    if variety_id:
        v = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
        if v:
            variety_name = getattr(v, "name", None) or getattr(v, "variety_name", None) or variety_name

    plot_name = "Khu vực canh tác"
    plot_id = getattr(batch, "plot_id", None)
    if plot_id:
        p = db.query(Plot).filter(Plot.id == plot_id).first()
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
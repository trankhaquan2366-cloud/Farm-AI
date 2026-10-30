from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from datetime import datetime

from app.core.database import get_db
from app.models.crop_batch import CropBatch
from app.models.care_log import CareLog
from app.models.plant_variety import PlantVariety
from app.models.plot import Plot

try:
    from app.models.harvest import HarvestLog
except ImportError:
    HarvestLog = None

router = APIRouter(prefix="/api/traceability", tags=["Traceability"])

@router.get("/{batch_code}", status_code=status.HTTP_200_OK)
def get_traceability_by_code(batch_code: str, db: Session = Depends(get_db)):
    # Eager-load toàn bộ quan hệ trong 1 lượt: tránh N+1 (variety, plot, care_logs, harvest_logs)
    query = db.query(CropBatch).options(
        joinedload(CropBatch.variety),
        joinedload(CropBatch.plot),
        selectinload(CropBatch.care_logs),
        selectinload(CropBatch.harvest_logs),
    )
    if batch_code.isdigit():
        batch = query.filter((CropBatch.batch_code == batch_code) | (CropBatch.id == int(batch_code))).first()
    else:
        batch = query.filter(CropBatch.batch_code == batch_code).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin lô trồng")

    # 1. Lấy Tên Giống Cây
    variety_name = None
    variety = batch.variety
    if variety:
        for attr in ["name", "variety_name", "title", "crop_name"]:
            val = getattr(variety, attr, None)
            if val:
                variety_name = val
                break

    if not variety_name:
        variety_name = batch.name or "Chưa cập nhật giống"

    # 2. Lấy Tên Lô Đất
    plot_name = "Chưa xác định"
    if batch.plot is not None:
        plot_name = getattr(batch.plot, "name", "Chưa xác định")

    # 3. Lấy Ngày Gieo Trồng (Nếu sow_date NULL sẽ tự động lấy ngày tạo lô)
    seeding_date = None
    if batch.sow_date:
        seeding_date = str(batch.sow_date)
    elif hasattr(batch, "created_at") and getattr(batch, "created_at"):
        c_val = getattr(batch, "created_at")
        seeding_date = str(c_val.date()) if hasattr(c_val, "date") else str(c_val)

    # 4. Nhật ký chăm sóc: chỉ công bố trường an toàn (whitelist).
    # Không trả notes/description/conditions/supplies_used vì đây là API công khai.
    care_logs = []
    logs = batch.care_logs or []
    for log in logs:
        action_type = (
            getattr(log, "action_type", None)
            or getattr(log, "log_type", None)
            or "Chăm sóc"
        )
        logged_at = (
            getattr(log, "log_date", None)
            or getattr(log, "created_at", None)
            or datetime.now()
        )
        care_logs.append({
            "id": log.id,
            "action_type": action_type,
            "summary": f"Hoạt động: {action_type}",
            "logged_at": logged_at,
        })

    # 5. Lấy Đợt Thu Hoạch & Tìm Ngày Thu Hoạch Thực Tế từ Nhật Ký (đã eager-load)
    harvests = []
    harvest_list = batch.harvest_logs or []

    actual_harvest_date = None
    for h in harvest_list:
        h_date = getattr(h, "harvest_date", getattr(h, "created_at", None))
        if h_date and not actual_harvest_date:
            actual_harvest_date = str(h_date)
        harvests.append({
            "harvest_date": str(h_date) if h_date else "",
            "quantity_kg": float(getattr(h, "quantity_kg", getattr(h, "quantity", 0))),
            "quality_grade": getattr(h, "quality_grade", getattr(h, "grade", "A")),
            "sales": []
        })

    # Nếu chưa có trong HarvestLog, kiểm tra ngày ở nhật ký ghi nhận "HARVEST"
    if not actual_harvest_date:
        for log in care_logs:
            l_type = str(log.get("action_type", "")).upper()
            if "HARVEST" in l_type or "THU HOẠCH" in l_type:
                actual_harvest_date = str(log.get("logged_at"))
                break

    return {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status or "Đang trồng",
        "variety_name": variety_name,
        "plot_name": plot_name,
        "seeding_date": seeding_date,
        "harvest_date": actual_harvest_date or (str(batch.expected_harvest_date) if batch.expected_harvest_date else None),
        "care_logs": care_logs,
        "harvests": harvests
    }
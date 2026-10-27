from sqlalchemy.orm import Session

from app.repositories import crop_batch as batch_repo
from app.repositories import plot as plot_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import care_log as care_log_repo
from app.repositories import supply as supply_repo
from app.repositories import harvest as harvest_repo
from app.repositories import sale as sale_repo

from app.services.crop_batch import get_batch_by_code_or_404
from app.schemas.traceability import (
    TraceabilityOut, TraceCareLog, TraceSupplyUsed, TraceHarvest, TraceSale,
)


def build_traceability(db: Session, batch_code: str) -> TraceabilityOut:
    # Bước 1: lấy lô trồng gốc theo mã - đây là "điểm vào" của toàn bộ truy xuất
    batch = get_batch_by_code_or_404(db, batch_code)

    # Bước 2: lấy thông tin lô đất + giống cây (dữ liệu tĩnh, không đổi theo thời gian)
    plot = plot_repo.get_by_id(db, batch.plot_id)
    variety = variety_repo.get_by_id(db, batch.variety_id)

    # Bước 3: lấy toàn bộ nhật ký chăm sóc, với MỖI nhật ký lại lấy tiếp
    # danh sách vật tư đã dùng kèm tên vật tư (không chỉ id, để dễ đọc)
    care_logs_out = []
    for log in care_log_repo.get_by_batch(db, batch.id):
        usages = care_log_repo.get_supply_usages(db, log.id)
        supplies_used = []
        for u in usages:
            supply = supply_repo.get_by_id(db, u.supply_id)
            supplies_used.append(TraceSupplyUsed(
                supply_name=supply.name if supply else f"(vật tư #{u.supply_id} đã bị xoá)",
                quantity_used=u.quantity_used,
                unit=supply.unit if supply else "",
            ))
        care_logs_out.append(TraceCareLog(
            log_type=log.log_type, description=log.description, conditions=log.conditions,
            performed_at=log.performed_at, supplies_used=supplies_used,
        ))

    # Bước 4: lấy toàn bộ đợt thu hoạch, với MỖI đợt lại lấy tiếp danh sách bán hàng
    harvests_out = []
    for h in harvest_repo.get_by_batch(db, batch.id):
        sales = sale_repo.get_by_harvest(db, h.id)
        sales_out = [
            TraceSale(customer_name=s.customer_name, quantity_kg=s.quantity_kg,
                      unit_price=s.unit_price, sale_date=s.sale_date)
            for s in sales
        ]
        harvests_out.append(TraceHarvest(
            harvest_date=h.harvest_date, quantity_kg=h.quantity_kg,
            quality_grade=h.quality_grade, sales=sales_out,
        ))

    # Bước 5: gộp tất cả thành 1 response duy nhất
    return TraceabilityOut(
        batch_code=batch.batch_code,
        status=batch.status,
        seeding_date=batch.seeding_date,
        expected_harvest_date=batch.expected_harvest_date,
        plot_name=plot.name if plot else "(lô đất đã bị xoá)",
        variety_name=variety.name if variety else "(giống cây đã bị xoá)",
        care_logs=care_logs_out,
        harvests=harvests_out,
    )

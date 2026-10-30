"""Create a small, realistic GreenFarm dataset for product demonstrations.

Run from the repository root:
    python scripts/demo_data.py
    python scripts/demo_data.py --reset
"""

from __future__ import annotations

import argparse
import calendar
import os
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

from sqlalchemy import Engine, create_engine, delete, event, inspect, select
from sqlalchemy.orm import Session, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.core.database import SQLALCHEMY_DATABASE_URL, Base
from app.core.security import hash_password
from app.models import (
    AiSuggestion,
    CareLog,
    CropBatch,
    HarvestLog,
    Notification,
    PlantVariety,
    Plot,
    Sale,
    Supply,
    SupplyImport,
    SupplyUsage,
    User,
    UserRole,
)

DEMO_USERS = (
    ("demo_admin", "demo_admin@greenfarm.local", "Nguyễn Minh Anh", UserRole.ADMIN, None),
    ("demo_manager", "demo_manager@greenfarm.local", "Trần Quốc Bảo", UserRole.MANAGER, None),
    ("demo_technician", "demo_technician@greenfarm.local", "Lê Thu Hà", UserRole.TECHNICIAN, "DEMO-PLOT-01"),
    ("demo_staff", "demo_staff@greenfarm.local", "Phạm Văn Nam", UserRole.STAFF, "DEMO-PLOT-01"),
)


def _debug_enabled() -> bool:
    return os.getenv("DEBUG", "false").strip().lower() in {"1", "true", "yes", "on"}


def build_engine(database_url: str) -> Engine:
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)
    if engine.dialect.name == "sqlite":
        @event.listens_for(engine, "connect")
        def enable_sqlite_foreign_keys(connection, _) -> None:
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def clear_demo_data(session: Session) -> None:
    batch_ids = select(CropBatch.id).where(CropBatch.batch_code.like("DEMO-BATCH-%"))
    care_log_ids = select(CareLog.id).where(CareLog.crop_batch_id.in_(batch_ids))
    harvest_ids = select(HarvestLog.id).where(HarvestLog.batch_id.in_(batch_ids))
    supply_ids = select(Supply.id).where(Supply.code.like("DEMO-SUPPLY-%"))
    user_ids = select(User.id).where(User.email.in_([item[1] for item in DEMO_USERS]))

    session.execute(delete(SupplyUsage).where(SupplyUsage.care_log_id.in_(care_log_ids)))
    session.execute(delete(Sale).where(Sale.harvest_id.in_(harvest_ids)))
    session.execute(delete(AiSuggestion).where(AiSuggestion.batch_id.in_(batch_ids)))
    session.execute(delete(Notification).where(Notification.user_id.in_(user_ids)))
    session.execute(delete(SupplyImport).where(SupplyImport.supply_id.in_(supply_ids)))
    session.execute(delete(CareLog).where(CareLog.id.in_(care_log_ids)))
    session.execute(delete(HarvestLog).where(HarvestLog.id.in_(harvest_ids)))
    session.execute(delete(CropBatch).where(CropBatch.id.in_(batch_ids)))
    session.execute(delete(Supply).where(Supply.id.in_(supply_ids)))
    session.execute(
        delete(PlantVariety).where(PlantVariety.code.like("DEMO-VARIETY-%"))
    )
    session.execute(delete(Plot).where(Plot.code.like("DEMO-PLOT-%")))
    session.execute(delete(User).where(User.id.in_(user_ids)))


def month_date(reference_date: date, months_ago: int, day: int) -> date:
    month_index = reference_date.year * 12 + reference_date.month - 1 - months_ago
    year, zero_based_month = divmod(month_index, 12)
    month = zero_based_month + 1
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


def seed_demo_data(session_factory: sessionmaker) -> None:
    today = date.today()
    operating_months = list(range(11, -1, -1))
    allow_password_reset = _debug_enabled()

    with session_factory() as session:
        try:
            demo_emails = [item[1] for item in DEMO_USERS]
            existing_hashes = dict(
                session.query(User.email, User.hashed_password)
                .filter(User.email.in_(demo_emails))
                .all()
            )
            fresh_hash = None

            def password_for(email: str) -> str:
                """Giữ mật khẩu cũ khi DEBUG=False; chỉ hash mới khi cần."""
                nonlocal fresh_hash
                if not allow_password_reset and email in existing_hashes:
                    return existing_hashes[email]
                if fresh_hash is None:
                    password = os.getenv("DEMO_PASSWORD", "").strip()
                    if not password:
                        raise SystemExit(
                            "Thiếu DEMO_PASSWORD. Đặt biến môi trường DEMO_PASSWORD "
                            "trước khi tạo tài khoản demo (xem .env.example)."
                        )
                    fresh_hash = hash_password(password)
                return fresh_hash

            clear_demo_data(session)

            plots = [
                Plot(
                    code="DEMO-PLOT-01",
                    name="Nhà màng số 1",
                    area=1200,
                    soil_type="Đất thịt",
                    location="Khu A",
                    status="Đang canh tác",
                    cultivation_model="Nhà kính",
                    irrigation_systems=["Tưới nhỏ giọt"],
                    ph_current=6.2,
                    ec_ms_cm=1.4,
                    previous_crop="Xà lách",
                    description="Khu trồng rau ăn quả có hệ thống tưới nhỏ giọt.",
                ),
                Plot(
                    code="DEMO-PLOT-02",
                    name="Khu canh tác ngoài trời",
                    area=2400,
                    soil_type="Đất phù sa",
                    location="Khu B",
                    status="Đang canh tác",
                    cultivation_model="Đất ngoài trời",
                    irrigation_systems=["Phun mưa", "Tưới thủ công"],
                    ph_current=6.5,
                    ec_ms_cm=1.1,
                    previous_crop="Rau muống",
                ),
                Plot(
                    code="DEMO-PLOT-03",
                    name="Lô đất dự phòng",
                    area=900,
                    soil_type="Đất thịt",
                    location="Khu C",
                    status="Trống",
                    cultivation_model="Đất ngoài trời",
                    irrigation_systems=["Tưới thủ công"],
                    ph_current=6.0,
                    ec_ms_cm=0.9,
                ),
            ]
            session.add_all(plots)
            session.flush()
            plots_by_code = {plot.code: plot for plot in plots}

            users = [
                User(
                    username=username,
                    email=email,
                    full_name=full_name,
                    role=role,
                    plot_id=plots_by_code[plot_code].id if plot_code else None,
                    employee_code=f"DEMO-{role.value.upper()}",
                    hashed_password=password_for(email),
                    is_active=True,
                )
                for username, email, full_name, role, plot_code in DEMO_USERS
            ]
            session.add_all(users)
            users_by_role = {user.role: user for user in users}

            varieties = [
                PlantVariety(
                    code="DEMO-VARIETY-01",
                    name="Cà chua Cherry",
                    category="Rau ăn quả",
                    supplier="Hạt giống GreenFarm",
                    growth_days=75,
                    germination_day=7,
                    development_day=45,
                    harvest_day=75,
                    stock_quantity=30,
                    unit="gói",
                    expected_yield_value=8,
                    expected_yield_unit="kg/m²",
                    suitable_seasons=["Xuân", "Thu"],
                    ph_min=5.8,
                    ph_max=6.8,
                    temperature_min=20,
                    temperature_max=30,
                    status="active",
                    description="Giống cà chua trồng nhà màng, thu hoạch nhiều đợt.",
                ),
                PlantVariety(
                    code="DEMO-VARIETY-02",
                    name="Xà lách Romaine",
                    category="Rau ăn lá",
                    supplier="Hạt giống Đà Lạt",
                    growth_days=60,
                    germination_day=5,
                    development_day=35,
                    harvest_day=60,
                    stock_quantity=45,
                    unit="gói",
                    expected_yield_value=4,
                    expected_yield_unit="kg/m²",
                    suitable_seasons=["Thu", "Đông"],
                    ph_min=5.5,
                    ph_max=6.5,
                    temperature_min=16,
                    temperature_max=26,
                    status="active",
                    description="Xà lách giòn, phù hợp thu hoạch nguyên cây.",
                ),
                PlantVariety(
                    code="DEMO-VARIETY-03",
                    name="Dưa leo baby",
                    category="Rau ăn quả",
                    supplier="Nông nghiệp Xanh",
                    growth_days=65,
                    germination_day=6,
                    development_day=38,
                    harvest_day=65,
                    stock_quantity=22,
                    unit="gói",
                    expected_yield_value=6,
                    expected_yield_unit="kg/m²",
                    suitable_seasons=["Xuân", "Hè"],
                    ph_min=5.8,
                    ph_max=7.0,
                    temperature_min=22,
                    temperature_max=32,
                    status="active",
                    description="Dưa leo baby dùng cho lô trồng và truy xuất mẫu.",
                ),
            ]
            session.add_all(varieties)

            supplies = [
                Supply(
                    code="DEMO-SUPPLY-01",
                    name="Phân NPK hữu cơ",
                    category="phan_bon",
                    type="phan_bon",
                    unit="kg",
                    stock_quantity=10,
                    min_threshold=10,
                    location="Kho A",
                    usage_notes="Bón theo hướng dẫn kỹ thuật.",
                    storage_notes="Bảo quản nơi khô ráo.",
                    status="active",
                ),
                Supply(
                    code="DEMO-SUPPLY-02",
                    name="Phân trùn quế",
                    category="phan_bon",
                    type="phan_bon",
                    unit="kg",
                    stock_quantity=20,
                    min_threshold=20,
                    location="Kho A",
                    status="active",
                ),
                Supply(
                    code="DEMO-SUPPLY-03",
                    name="Dầu neem sinh học",
                    category="thuoc_bvtv",
                    type="thuoc_bvtv",
                    unit="lít",
                    stock_quantity=1,
                    min_threshold=3.5,
                    location="Kho B",
                    usage_notes="Sử dụng theo hướng dẫn và ghi nhận nhật ký.",
                    storage_notes="Để nơi thoáng mát, tránh ánh nắng.",
                    status="active",
                ),
                Supply(
                    code="DEMO-SUPPLY-04",
                    name="Khay ươm cây giống",
                    category="dung_cu",
                    type="dung_cu",
                    unit="cái",
                    stock_quantity=24,
                    min_threshold=5,
                    location="Kho C",
                    status="active",
                ),
            ]
            session.add_all(supplies)
            session.flush()

            variety_by_code = {variety.code: variety for variety in varieties}
            variety_list = list(variety_by_code.values())
            batch_records: list[tuple[CropBatch, date, int]] = []
            for months_ago in operating_months:
                harvest_date = month_date(
                    today,
                    months_ago,
                    min(20, today.day) if months_ago == 0 else 20,
                )
                variety = variety_list[months_ago % len(variety_list)]
                batch = CropBatch(
                    batch_code=f"DEMO-BATCH-{harvest_date:%Y-%m}",
                    name=f"{variety.name} - vụ {harvest_date:%m/%Y}",
                    plot_id=plots_by_code[
                        "DEMO-PLOT-01" if months_ago % 2 == 0 else "DEMO-PLOT-02"
                    ].id,
                    variety_id=variety.id,
                    sow_date=harvest_date - timedelta(days=variety.growth_days or 60),
                    expected_harvest_date=harvest_date,
                    quantity=150 + (months_ago % 4) * 15,
                    status="Đã thu hoạch",
                    planting_method="Cấy cây con" if months_ago % 2 == 0 else "Gieo hạt trực tiếp",
                    certification_standard="VietGAP" if months_ago % 3 else "Organic",
                    notes="Vụ canh tác mẫu trong chu kỳ demo 12 tháng.",
                )
                batch_records.append((batch, harvest_date, months_ago))

            active_batch = CropBatch(
                batch_code="DEMO-BATCH-CHERRY-ACTIVE",
                name="Cà chua Cherry - đang sinh trưởng",
                plot_id=plots_by_code["DEMO-PLOT-01"].id,
                variety_id=variety_by_code["DEMO-VARIETY-01"].id,
                sow_date=today - timedelta(days=32),
                expected_harvest_date=today + timedelta(days=43),
                quantity=180,
                status="Đang sinh trưởng",
                planting_method="Cấy cây con",
                certification_standard="VietGAP",
                notes="Vụ hiện tại đang theo dõi ra hoa và bổ sung dinh dưỡng.",
            )
            session.add_all([record[0] for record in batch_records] + [active_batch])
            session.flush()

            monthly_logs: list[tuple[CareLog, Supply | None, float, str]] = []
            for batch, harvest_date, months_ago in batch_records:
                fertilizer = supplies[0] if months_ago % 2 == 0 else supplies[1]
                fertilizer_quantity = 1.5 if months_ago % 2 == 0 else 2
                log_days = (
                    [max(1, harvest_date.day - 16), max(1, harvest_date.day - 12)]
                    if months_ago == 0
                    else [
                        max(1, harvest_date.day - 16),
                        max(1, harvest_date.day - 12),
                        max(1, harvest_date.day - 8),
                        max(1, harvest_date.day - 4),
                    ]
                )
                monthly_specs = [
                    ("Tưới nước", 60, "Tưới buổi sáng, kiểm tra độ ẩm đất.", None, 0),
                    (
                        "Bón phân",
                        fertilizer_quantity,
                        f"Bón {fertilizer.name} theo lịch chăm sóc.",
                        fertilizer,
                        fertilizer_quantity,
                    ),
                    ("Tưới nước", 75, "Điều chỉnh lượng nước theo điều kiện thời tiết.", None, 0),
                    (
                        "Phun thuốc",
                        0.4,
                        "Phun dầu neem sinh học và ghi nhận thời gian cách ly.",
                        supplies[2],
                        0.4,
                    ),
                ]
                for day, (action, quantity, notes, supply, used_quantity) in zip(
                    log_days, monthly_specs
                ):
                    log_date = month_date(today, months_ago, day)
                    log = CareLog(
                        crop_batch_id=batch.id,
                        action_type=action,
                        log_date=log_date.isoformat(),
                        description=notes,
                        notes=notes,
                        quantity=quantity,
                        created_by=users_by_role[UserRole.TECHNICIAN].username,
                        created_at=datetime.combine(log_date, time(8, 30)),
                    )
                    monthly_logs.append((log, supply, used_quantity, notes))

            active_logs = [
                CareLog(
                    crop_batch_id=active_batch.id,
                    action_type="Tưới nước",
                    log_date=(today - timedelta(days=5)).isoformat(),
                    description="Tưới buổi sáng, kiểm tra độ ẩm đất.",
                    notes="Tưới buổi sáng, kiểm tra độ ẩm đất.",
                    quantity=55,
                    created_by=users_by_role[UserRole.STAFF].username,
                    created_at=datetime.combine(today - timedelta(days=5), time(7, 30)),
                ),
                CareLog(
                    crop_batch_id=active_batch.id,
                    action_type="Bón phân",
                    log_date=(today - timedelta(days=2)).isoformat(),
                    description="Bón NPK hữu cơ trong giai đoạn ra hoa.",
                    notes="Bón NPK hữu cơ trong giai đoạn ra hoa.",
                    quantity=1,
                    created_by=users_by_role[UserRole.TECHNICIAN].username,
                    created_at=datetime.combine(today - timedelta(days=2), time(8)),
                ),
            ]
            monthly_logs.extend((log, None, 0, "") for log in active_logs[:1])
            monthly_logs.append((active_logs[1], supplies[0], 1, active_logs[1].notes or ""))
            session.add_all([item[0] for item in monthly_logs])
            session.flush()
            session.add_all(
                [
                    SupplyUsage(
                        care_log_id=log.id,
                        supply_id=supply.id,
                        quantity_used=quantity,
                        used_at=log.created_at,
                        notes=notes[:255],
                    )
                    for log, supply, quantity, notes in monthly_logs
                    if supply is not None and quantity > 0
                ]
            )

            monthly_harvests: list[tuple[HarvestLog, date, int]] = []
            for batch, harvest_date, months_ago in batch_records:
                trace_code = (
                    "DEMO-QR-001"
                    if months_ago == 0
                    else "DEMO-QR-002"
                    if months_ago == 1
                    else f"DEMO-QR-{harvest_date:%Y%m}"
                )
                harvest = HarvestLog(
                    batch_id=batch.id,
                    qr_trace_code=trace_code,
                    quantity=45 + (months_ago % 3) * 5,
                    unit="kg",
                    grade="loai_1" if months_ago % 4 else "loai_2",
                    notes="Thu hoạch theo kế hoạch, đã kiểm tra và phân loại sản lượng.",
                    harvest_time=datetime.combine(harvest_date, time(7, 30)),
                )
                monthly_harvests.append((harvest, harvest_date, months_ago))
            session.add_all([item[0] for item in monthly_harvests])
            session.flush()
            session.add_all(
                [
                    Sale(
                        harvest_id=harvest.id,
                        customer_name=(
                            "Cửa hàng Nông sản Xanh"
                            if months_ago % 2 == 0
                            else "Siêu thị Nông sản An Tâm"
                        ),
                        quantity_kg=harvest.quantity * 0.65,
                        unit_price=28000 + (months_ago % 4) * 2000,
                        sale_date=harvest_date,
                    )
                    for harvest, harvest_date, months_ago in monthly_harvests
                ]
            )

            import_specs = []
            for months_ago in (9, 6, 3, 0):
                import_day = month_date(today, months_ago, 8)
                import_specs.extend(
                    [
                        (supplies[0], 15, 28000, f"DEMO-NPK-{import_day:%Y%m}", import_day),
                        (supplies[1], 20, 12000, f"DEMO-ORGANIC-{import_day:%Y%m}", import_day),
                        (supplies[2], 1, 95000, f"DEMO-NEEM-{import_day:%Y%m}", import_day),
                    ]
                )
            for months_ago in (10, 4):
                import_day = month_date(today, months_ago, 8)
                import_specs.append(
                    (supplies[3], 12, 18000, f"DEMO-TOOLS-{import_day:%Y%m}", import_day)
                )
            session.add_all(
                [
                    SupplyImport(
                        supply_id=supply.id,
                        quantity_imported=quantity,
                        unit_price=unit_price,
                        supplier_name="Nhà cung cấp GreenFarm",
                        batch_number=batch_number,
                        manufacture_date=import_day - timedelta(days=30),
                        expiry_date=import_day + timedelta(days=365),
                        imported_at=datetime.combine(import_day, time(9)),
                        created_by_user_id=users_by_role[UserRole.MANAGER].id,
                    )
                    for supply, quantity, unit_price, batch_number, import_day in import_specs
                ]
            )

            initial_stock = (10, 20, 1, 24)
            imported_quantities = [0.0] * len(supplies)
            used_quantities = [0.0] * len(supplies)
            for supply, quantity, _price, _batch_number, _date in import_specs:
                imported_quantities[supplies.index(supply)] += quantity
            for _log, supply, quantity, _notes in monthly_logs:
                if supply is not None:
                    used_quantities[supplies.index(supply)] += quantity
            for index, supply in enumerate(supplies):
                supply.stock_quantity = (
                    initial_stock[index]
                    + imported_quantities[index]
                    - used_quantities[index]
                )

            manager_id = users_by_role[UserRole.MANAGER].id
            suggestions = []
            for batch, harvest_date, months_ago in batch_records:
                suggestion_date = harvest_date - timedelta(days=5)
                suggestions.append(
                    AiSuggestion(
                        suggestion_type="summary" if months_ago % 2 else "schedule",
                        batch_id=batch.id,
                        input_data=f"Nhật ký canh tác tháng {harvest_date:%m/%Y}.",
                        output_text=(
                            "Cây phát triển ổn định; duy trì lịch tưới và kiểm tra sâu bệnh."
                            if months_ago % 2
                            else "Theo dõi độ ẩm đất, bổ sung dinh dưỡng theo giai đoạn sinh trưởng."
                        ),
                        disclaimer="Gợi ý tham khảo; cần được kỹ thuật viên xác nhận.",
                        created_at=datetime.combine(suggestion_date, time(10)),
                    )
                )
            session.add_all(suggestions)

            manager_id = users_by_role[UserRole.MANAGER].id
            session.add_all(
                [
                    Notification(
                        user_id=manager_id,
                        type="warning",
                        title="Vật tư sắp hết",
                        message="Dầu neem sinh học tại Kho B đang dưới mức tồn tối thiểu.",
                        is_read=False,
                        created_at=datetime.combine(today, time(8)),
                    ),
                    Notification(
                        user_id=manager_id,
                        type="info",
                        title="Lô sắp thu hoạch",
                        message="Cà chua Cherry dự kiến thu hoạch trong 43 ngày.",
                        is_read=False,
                        created_at=datetime.combine(today - timedelta(days=1), time(15)),
                    ),
                ]
            )
            session.commit()
        except Exception:
            session.rollback()
            raise

    print("Đã tạo dữ liệu demo GreenFarm:")
    print(
        "  4 tài khoản, 3 lô đất, 3 giống cây, 4 vật tư, "
        f"{len(batch_records) + 1} lô trồng"
    )
    print(
        f"  {len(monthly_logs)} nhật ký, "
        f"{sum(1 for _log, supply, quantity, _notes in monthly_logs if supply and quantity > 0)} "
        f"lượt sử dụng vật tư, {len(monthly_harvests)} thu hoạch, "
        f"{len(monthly_harvests)} giao dịch bán"
    )
    print(
        f"  Hoạt động trải đều 12 tháng gần nhất: "
        f"{month_date(today, 11, 1):%m/%Y} – {today:%m/%Y}"
    )
    print("  Mật khẩu: lấy từ biến môi trường DEMO_PASSWORD (không in ra log).")
    print("  Mã truy xuất QR: DEMO-QR-001, DEMO-QR-002")


def reset_database(engine: Engine) -> None:
    existing_tables = set(inspect(engine).get_table_names())
    tables = [
        table
        for table in reversed(Base.metadata.sorted_tables)
        if table.name in existing_tables
    ]
    with engine.begin() as connection:
        deleted_counts = []
        for table in tables:
            result = connection.execute(delete(table))
            if result.rowcount:
                deleted_counts.append((table.name, result.rowcount))

    if deleted_counts:
        print("Đã xóa dữ liệu ứng dụng:")
        for table_name, count in deleted_counts:
            print(f"  {table_name}: {count}")
    else:
        print("Database đã trống hoặc chưa có bảng dữ liệu ứng dụng.")
    print("Schema và bảng alembic_version được giữ nguyên.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Tạo hoặc reset dữ liệu demo GreenFarm.")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", SQLALCHEMY_DATABASE_URL),
        help="SQLAlchemy URL; mặc định dùng DATABASE_URL hoặc database ứng dụng.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Xóa toàn bộ dữ liệu ứng dụng, giữ nguyên schema.",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Xác nhận reset mà không hỏi lại (chỉ dùng cùng --reset).",
    )
    args = parser.parse_args()
    if args.yes and not args.reset:
        parser.error("--yes chỉ dùng cùng với --reset.")
    return args


def main() -> None:
    args = parse_args()
    if args.reset and not args.yes:
        if not sys.stdin.isatty():
            raise SystemExit("Reset cần xác nhận; chạy lại với --reset --yes.")
        confirmation = input(
            "Lệnh này xóa toàn bộ dữ liệu ứng dụng trong database đã chọn. "
            "Nhập RESET để tiếp tục: "
        )
        if confirmation != "RESET":
            print("Đã hủy reset; dữ liệu không thay đổi.")
            return

    engine = build_engine(args.database_url)
    try:
        if args.reset:
            reset_database(engine)
        else:
            Base.metadata.create_all(bind=engine)
            session_factory = sessionmaker(
                bind=engine,
                autoflush=False,
                expire_on_commit=False,
            )
            seed_demo_data(session_factory)
            print(f"Database: {args.database_url}")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()

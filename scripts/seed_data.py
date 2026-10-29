"""Seed GreenFarm with a 90-day agricultural activity dataset.

Run from the repository root:
    python scripts/seed_data.py

Set DATABASE_URL or pass --database-url to target a PostgreSQL database.
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Sequence

from faker import Faker
from sqlalchemy import Engine, create_engine, delete, event, select
from sqlalchemy.orm import Session, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import SQLALCHEMY_DATABASE_URL, Base
from app.core.security import hash_password
from app.models import (
    CareLog,
    CropBatch,
    HarvestLog,
    PlantVariety,
    Plot,
    Supply,
    SupplyUsage,
    User,
    UserRole,
)

USER_PREFIX = "seed_"
PLOT_PREFIX = "SEED-LO-"
VARIETY_PREFIX = "SEED-GIONG-"
SUPPLY_PREFIX = "SEED-VT-"
BATCH_PREFIX = "SEED-ME-"
DEFAULT_PASSWORD = "password123"
DEFAULT_CARE_LOG_COUNT = 8_000
COMMIT_BATCH_SIZE = 500

VARIETY_NAMES = (
    "Cà chua Cherry", "Dưa lưới Ichiba", "Xà lách lolo", "Cải bắp tím",
    "Dưa leo baby", "Ớt chuông đỏ", "Cải bó xôi", "Rau muống", "Cải thìa",
    "Cải ngọt", "Cà tím Nhật", "Bí ngòi xanh", "Dưa hấu không hạt",
    "Đậu cô ve", "Đậu bắp", "Súp lơ xanh", "Súp lơ trắng", "Cà rốt Đà Lạt",
    "Củ cải trắng", "Hành lá", "Ngò rí", "Húng quế", "Xà lách Romaine",
    "Dâu tây chịu nhiệt", "Ớt hiểm", "Bắp ngọt", "Mướp hương", "Khổ qua",
    "Cải kale", "Cà chua beef",
)

FERTILIZER_NAMES = (
    "Phân NPK 16-16-8", "Phân hữu cơ vi sinh", "Phân trùn quế", "Canxi Bo",
    "Kali Sulphate", "Đạm cá thủy phân", "Humic dạng bột", "Phân dê hoai",
    "Lân nung chảy", "Magie Sulphate", "Amino acid thực vật",
    "Phân bón lá rong biển", "NPK 20-20-15", "Vôi dolomite",
    "Dịch chuối lên men", "Phân gà viên", "Kali đỏ", "Đạm cá cô đặc",
    "Trichoderma dạng bột", "Phân hữu cơ khoáng", "Canxi nitrate",
    "MKP 0-52-34", "NPK 13-13-13", "Phân bánh dầu", "Silic hữu hiệu",
    "Bo kẽm tổng hợp", "Vi lượng chelate", "Axit humic lỏng",
    "Phân lân hữu cơ", "Dinh dưỡng thủy canh A",
)

PESTICIDE_NAMES = (
    "Dầu neem sinh học", "Chế phẩm trừ bọ trĩ", "Nấm xanh Metarhizium",
    "Nấm trắng Beauveria", "Chế phẩm Bacillus", "Dung dịch đồng sinh học",
    "Chế phẩm trừ sâu tơ", "Dầu khoáng nông nghiệp", "Chế phẩm trừ rệp",
    "Bẫy sinh học sâu vẽ bùa", "Thuốc trừ nhện đỏ sinh học",
    "Chế phẩm phòng phấn trắng", "Dung dịch tỏi ớt gừng",
    "Chế phẩm trừ nấm sương mai", "Thuốc trừ sâu sinh học BT",
    "Chế phẩm phòng thối rễ", "Dung dịch xà phòng kali",
    "Chế phẩm trừ tuyến trùng", "Chế phẩm trừ sâu khoang",
    "Dung dịch lưu huỳnh sinh học",
)

TOOL_NAMES = (
    "Kéo cắt tỉa", "Cuốc làm vườn", "Bay trồng cây", "Bình phun 8 lít",
    "Găng tay phủ cao su", "Khay ươm ươm hạt", "Dây tưới nhỏ giọt",
    "Đầu tưới phun mưa", "Lưới chắn côn trùng", "Màng phủ nông nghiệp",
    "Thùng thu hoạch", "Cân điện tử 30 kg", "Máy đo pH đất",
    "Máy đo độ ẩm đất", "Nhiệt kế nhà kính", "Dao ghép cây",
    "Kẹp cố định thân cây", "Cọc tre chống cây", "Ống dẫn nước PE",
    "Van khóa tưới", "Bộ lọc tưới", "Béc phun sương",
    "Khay thủy canh NFT", "Rọ nhựa thủy canh", "Máy bơm chìm",
    "Đèn LED trồng cây", "Tấm phủ nhà màng", "Xe đẩy nông trại",
    "Xẻng cán dài", "Bình tưới cầm tay",
)

SOIL_TYPES = ("Đất thịt", "Đất phù sa", "Giá thể thủy canh")
IRRIGATION_TYPES = ("Tưới nhỏ giọt", "Phun mưa", "Phun sương", "Tưới thủ công")
ACTION_WEIGHTS = (
    ("Tưới nước", 80),
    ("Bón phân", 10),
    ("Phun thuốc", 5),
    ("Ghi chú sâu bệnh", 5),
)
DISEASE_NOTES = (
    "Phát hiện bọ trĩ ở mặt dưới lá, đã ghi nhận để theo dõi.",
    "Một số lá tầng dưới có dấu hiệu héo úa vàng.",
    "Quan sát thấy đốm trắng nhỏ, cần kiểm tra nguy cơ phấn trắng.",
    "Phát hiện vài lá có vết cắn, nghi sâu ăn lá.",
    "Độ ẩm cao sau mưa, cần theo dõi nguy cơ nấm bệnh.",
    "Cây có dấu hiệu vàng lá nhẹ, đã chụp ảnh và báo kỹ thuật viên.",
    "Phát hiện rệp nhỏ ở chồi non, cần kiểm tra lại trong ngày mai.",
    "Một số cây sinh trưởng chậm hơn khu vực xung quanh.",
)


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


def existing_seed_data(session: Session) -> bool:
    return session.scalar(
        select(User.id).where(User.email == "seed_admin_01@greenfarm.local").limit(1)
    ) is not None


def cleanup_seed_data(session: Session) -> None:
    """Remove only records carrying this script's reserved seed prefixes."""
    plot_ids = select(Plot.id).where(Plot.code.like(f"{PLOT_PREFIX}%"))
    variety_ids = select(PlantVariety.id).where(PlantVariety.code.like(f"{VARIETY_PREFIX}%"))
    supply_ids = select(Supply.id).where(Supply.code.like(f"{SUPPLY_PREFIX}%"))
    batch_ids = select(CropBatch.id).where(CropBatch.batch_code.like(f"{BATCH_PREFIX}%"))
    care_log_ids = select(CareLog.id).where(CareLog.crop_batch_id.in_(batch_ids))

    session.execute(delete(SupplyUsage).where(SupplyUsage.care_log_id.in_(care_log_ids)))
    session.execute(delete(CareLog).where(CareLog.id.in_(care_log_ids)))
    session.execute(delete(HarvestLog).where(HarvestLog.batch_id.in_(batch_ids)))
    session.execute(delete(CropBatch).where(CropBatch.id.in_(batch_ids)))
    session.execute(delete(User).where(User.email.like(f"{USER_PREFIX}%@greenfarm.local")))
    session.execute(delete(Supply).where(Supply.id.in_(supply_ids)))
    session.execute(delete(PlantVariety).where(PlantVariety.id.in_(variety_ids)))
    session.execute(delete(Plot).where(Plot.id.in_(plot_ids)))
    session.commit()


def make_users(fake: Faker) -> tuple[list[User], list[User], list[User], list[User]]:
    admins: list[User] = []
    managers: list[User] = []
    technicians: list[User] = []
    workers: list[User] = []
    password_hash = hash_password(DEFAULT_PASSWORD)
    role_groups: Sequence[tuple[str, UserRole, int, list[User]]] = (
        ("admin", UserRole.ADMIN, 2, admins),
        ("manager", UserRole.MANAGER, 5, managers),
        ("technician", UserRole.TECHNICIAN, 13, technicians),
        ("worker", UserRole.STAFF, 30, workers),
    )

    for role_name, role, count, group in role_groups:
        for index in range(1, count + 1):
            username = f"{USER_PREFIX}{role_name}_{index:02d}"
            group.append(
                User(
                    employee_code=f"SEED-{role_name[:2].upper()}-{index:03d}",
                    username=username,
                    email=f"{username}@greenfarm.local",
                    hashed_password=password_hash,
                    full_name=fake.name() if role != UserRole.ADMIN else f"Admin Hệ Thống {index}",
                    role=role,
                    is_active=True,
                )
            )
    return admins, managers, technicians, workers


def make_varieties(fake: Faker, rng: random.Random) -> list[PlantVariety]:
    categories = ("Rau ăn lá", "Rau ăn quả", "Cây gia vị", "Cây ăn củ")
    varieties = []
    for index, name in enumerate(VARIETY_NAMES, start=1):
        growth_days = rng.randint(30, 90)
        varieties.append(
            PlantVariety(
                code=f"{VARIETY_PREFIX}{index:03d}",
                name=name,
                category=rng.choice(categories),
                supplier=fake.company(),
                growth_days=growth_days,
                germination_day=max(1, int(growth_days * 0.15)),
                development_day=max(2, int(growth_days * 0.55)),
                harvest_day=growth_days,
                stock_quantity=round(rng.uniform(20, 250), 2),
                unit=rng.choice(("gói", "gram", "kg")),
                expected_yield_value=round(rng.uniform(1.5, 12), 2),
                expected_yield_unit="kg/m²",
                suitable_seasons=["Xuân", "Hè", "Thu", "Đông"],
                ph_min=round(rng.uniform(5.5, 6.2), 1),
                ph_max=round(rng.uniform(6.5, 7.2), 1),
                status="active",
                description=f"Giống {name} dùng cho mô hình canh tác GreenFarm.",
            )
        )
    return varieties


def make_supplies(rng: random.Random) -> list[Supply]:
    supplies: list[Supply] = []
    groups = (
        (FERTILIZER_NAMES, "phan_bon", ("kg", "lít")),
        (PESTICIDE_NAMES, "thuoc_bvtv", ("chai",)),
        (TOOL_NAMES, "dung_cu", ("cái",)),
    )
    next_code = 1
    for names, category, units in groups:
        for name in names:
            stock = round(rng.uniform(10, 500), 2)
            supplies.append(
                Supply(
                    code=f"{SUPPLY_PREFIX}{next_code:03d}",
                    name=name,
                    category=category,
                    type=category,
                    unit=rng.choice(units),
                    stock_quantity=stock,
                    min_threshold=round(stock * rng.uniform(0.08, 0.25), 2),
                    location=f"Kho {rng.choice(('A', 'B', 'C'))}",
                    usage_notes="Dùng theo hướng dẫn kỹ thuật và nhật ký chăm sóc.",
                    storage_notes="Bảo quản nơi khô ráo, tránh ánh nắng trực tiếp.",
                    status="active",
                )
            )
            next_code += 1
    return supplies


def make_plots(fake: Faker, rng: random.Random) -> list[Plot]:
    plots = []
    for index in range(1, 41):
        plots.append(
            Plot(
                code=f"{PLOT_PREFIX}{index:03d}",
                name=f"Lô {index:02d} - {fake.street_name()}",
                area=round(rng.uniform(500, 5000), 1),
                soil_type=rng.choice(SOIL_TYPES),
                location=f"Khu {rng.choice(('A', 'B', 'C', 'D'))}",
                status="Đang canh tác" if index <= 32 else "Trống",
                cultivation_model=rng.choice(("Đất ngoài trời", "Nhà kính", "Thủy canh")),
                irrigation_systems=[rng.choice(IRRIGATION_TYPES)],
                ph_current=round(rng.uniform(5.5, 7.2), 1),
                ec_ms_cm=round(rng.uniform(0.4, 2.5), 2),
                previous_crop=fake.random_element(
                    elements=("Cà chua", "Xà lách", "Dưa leo", "Cải xanh", "Đậu cô ve")
                ),
                description="Lô đất dữ liệu giả lập phục vụ kiểm thử GreenFarm AI.",
            )
        )
    return plots


def make_batches(
    plots: list[Plot],
    varieties: list[PlantVariety],
    today: date,
    rng: random.Random,
) -> list[CropBatch]:
    batches: list[CropBatch] = []
    for index in range(1, 121):
        harvested = index > 60
        if harvested:
            age_days = rng.randint(30, 90)
            viable_varieties = [item for item in varieties if (item.growth_days or 30) <= age_days]
            if not viable_varieties:
                age_days = 90
                viable_varieties = varieties
        else:
            viable_varieties = [
                item for item in varieties if (item.growth_days or 30) > 0
            ]
            selected = rng.choice(viable_varieties)
            max_age = min(89, (selected.growth_days or 30) - 1)
            age_days = rng.randint(0, max(0, max_age))
            viable_varieties = [selected]

        variety = rng.choice(viable_varieties)
        sow_date = today - timedelta(days=age_days)
        growth_days = variety.growth_days or 60
        batches.append(
            CropBatch(
                batch_code=f"{BATCH_PREFIX}{index:04d}",
                name=f"{variety.name} - Mẻ {index:03d}",
                plot_id=rng.choice(plots).id,
                variety_id=variety.id,
                sow_date=sow_date,
                expected_harvest_date=sow_date + timedelta(days=growth_days),
                quantity=round(rng.uniform(100, 1200), 2),
                status="Đã thu hoạch" if harvested else "Đang sinh trưởng",
                planting_method=rng.choice(("Gieo hạt trực tiếp", "Cấy cây con")),
                certification_standard=rng.choice(("VietGAP", "Organic", "Thông thường")),
                notes="Dữ liệu giả lập phục vụ kiểm thử báo cáo.",
            )
        )
    return batches


def choose_supply(
    supplies: list[Supply],
    category: str,
    requested_quantity: float,
    rng: random.Random,
) -> Supply:
    available = [
        item
        for item in supplies
        if item.category == category and item.stock_quantity >= requested_quantity
    ]
    if not available:
        raise RuntimeError(f"Không đủ tồn kho vật tư thuộc nhóm {category} để tạo nhật ký.")
    return rng.choice(available)


def seed_care_logs(
    session: Session,
    *,
    users: list[User],
    batches: list[CropBatch],
    supplies: list[Supply],
    rng: random.Random,
    log_count: int,
    today: date,
) -> int:
    worker_and_technician_users = [
        user for user in users if user.role in (UserRole.STAFF, UserRole.TECHNICIAN)
    ]
    batches_by_plot: dict[int, list[CropBatch]] = {}
    for batch in batches:
        batches_by_plot.setdefault(batch.plot_id, []).append(batch)

    water_notes = (
        "Tưới buổi sáng, kiểm tra độ ẩm đất sau tưới.",
        "Tưới đều quanh gốc, tránh làm đọng nước trên lá.",
        "Điều chỉnh lượng nước theo thời tiết trong ngày.",
    )
    fertilizer_supplies = [item for item in supplies if item.category == "phan_bon"]
    pesticide_supplies = [item for item in supplies if item.category == "thuoc_bvtv"]
    logs_written = 0
    days = [today - timedelta(days=offset) for offset in range(89, -1, -1)]
    base_per_day, extra_days = divmod(log_count, len(days))
    pending_logs: list[CareLog] = []
    pending_usages: list[tuple[CareLog, Supply, float, str]] = []

    for day_index, log_day in enumerate(days):
        daily_count = base_per_day + (1 if day_index < extra_days else 0)
        max_active_users = min(44, len(worker_and_technician_users), daily_count // 2)
        active_count = rng.randint(min(40, max_active_users), max_active_users)
        active_users = rng.sample(worker_and_technician_users, active_count)
        activities_for_day = [user for user in active_users for _ in range(2)]
        extra_count = daily_count - len(activities_for_day)
        logs_per_user = {user: 2 for user in active_users}
        for _ in range(extra_count):
            eligible_users = [user for user in active_users if logs_per_user[user] < 4]
            user = rng.choice(eligible_users)
            activities_for_day.append(user)
            logs_per_user[user] += 1
        rng.shuffle(activities_for_day)

        daily_logs: list[CareLog] = []
        daily_usages: list[tuple[CareLog, Supply, float, str]] = []
        for user in activities_for_day:
            if user.plot_id and batches_by_plot.get(user.plot_id):
                batch = rng.choice(batches_by_plot[user.plot_id])
            else:
                batch = rng.choice(batches)

            action = rng.choices(
                [item[0] for item in ACTION_WEIGHTS],
                weights=[item[1] for item in ACTION_WEIGHTS],
                k=1,
            )[0]
            quantity: float
            notes: str
            selected_supply: Supply | None = None

            if action == "Tưới nước":
                quantity = round(rng.uniform(50, 200), 1)
                notes = rng.choice(water_notes)
            elif action == "Bón phân":
                quantity = round(rng.uniform(0.2, 1.5), 2)
                selected_supply = choose_supply(fertilizer_supplies, "phan_bon", quantity, rng)
                notes = f"Bón {selected_supply.name}: {quantity} {selected_supply.unit}."
            elif action == "Phun thuốc":
                quantity = round(rng.uniform(0.1, 0.6), 2)
                selected_supply = choose_supply(pesticide_supplies, "thuoc_bvtv", quantity, rng)
                notes = f"Phun {selected_supply.name}: {quantity} {selected_supply.unit}."
            else:
                quantity = 0
                notes = rng.choice(DISEASE_NOTES)

            log = CareLog(
                crop_batch_id=batch.id,
                action_type=action,
                log_date=log_day.isoformat(),
                description=notes,
                notes=notes,
                quantity=quantity,
                created_by=user.username,
                created_at=datetime.combine(
                    log_day,
                    time(hour=rng.randint(6, 17), minute=rng.randint(0, 59)),
                ),
            )
            daily_logs.append(log)
            if selected_supply:
                daily_usages.append((log, selected_supply, quantity, notes))

        pending_logs.extend(daily_logs)
        pending_usages.extend(daily_usages)

        while len(pending_logs) >= COMMIT_BATCH_SIZE:
            log_chunk = pending_logs[:COMMIT_BATCH_SIZE]
            chunk_log_ids = {id(log) for log in log_chunk}
            usage_chunk = [item for item in pending_usages if id(item[0]) in chunk_log_ids]
            pending_usages = [item for item in pending_usages if id(item[0]) not in chunk_log_ids]
            pending_logs = pending_logs[COMMIT_BATCH_SIZE:]
            session.add_all(log_chunk)
            session.flush()
            for log, supply, quantity, notes in usage_chunk:
                supply.stock_quantity -= quantity
                session.add(
                    SupplyUsage(
                        care_log_id=log.id,
                        supply_id=supply.id,
                        quantity_used=quantity,
                        used_at=log.created_at,
                        notes=notes[:255],
                    )
                )
            session.commit()
            logs_written += len(log_chunk)
            print(f"  Nhật ký đã ghi: {logs_written:,}/{log_count:,}")

    if pending_logs:
        session.add_all(pending_logs)
        session.flush()
        pending_log_ids = {id(log) for log in pending_logs}
        for log, supply, quantity, notes in pending_usages:
            if id(log) not in pending_log_ids:
                continue
            supply.stock_quantity -= quantity
            session.add(
                SupplyUsage(
                    care_log_id=log.id,
                    supply_id=supply.id,
                    quantity_used=quantity,
                    used_at=log.created_at,
                    notes=notes[:255],
                )
            )
        session.commit()
        logs_written += len(pending_logs)
        print(f"  Nhật ký đã ghi: {logs_written:,}/{log_count:,}")

    return logs_written


def seed(database_url: str, *, log_count: int, seed_value: int) -> None:
    engine = build_engine(database_url)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    fake = Faker("vi_VN")
    fake.seed_instance(seed_value)
    rng = random.Random(seed_value)

    try:
        Base.metadata.create_all(bind=engine)
        with session_factory() as session:
            if existing_seed_data(session):
                print("Bộ dữ liệu GreenFarm đã tồn tại; không tạo trùng.")
                return

            try:
                admins, managers, technicians, workers = make_users(fake)
                users = admins + managers + technicians + workers
                session.add_all(users)
                session.flush()

                varieties = make_varieties(fake, rng)
                supplies = make_supplies(rng)
                plots = make_plots(fake, rng)
                session.add_all(varieties + supplies + plots)
                session.flush()

                assignees = technicians + workers
                rng.shuffle(assignees)
                for plot, assignee in zip(plots, assignees):
                    assignee.plot_id = plot.id

                today = date.today()
                batches = make_batches(plots, varieties, today, rng)
                session.add_all(batches)
                session.commit()
                print(
                    "Đã tạo danh mục: "
                    f"{len(users)} users, {len(varieties)} giống, {len(supplies)} vật tư, "
                    f"{len(plots)} lô đất, {len(batches)} mẻ gieo."
                )

                seed_care_logs(
                    session,
                    users=users,
                    batches=batches,
                    supplies=supplies,
                    rng=rng,
                    log_count=log_count,
                    today=today,
                )
            except Exception:
                session.rollback()
                cleanup_seed_data(session)
                raise

        print(f"Seed hoàn tất. Mật khẩu mặc định cho 50 tài khoản: {DEFAULT_PASSWORD}")
        print(f"Database: {database_url}")
    finally:
        engine.dispose()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sinh dữ liệu nông nghiệp giả lập GreenFarm.")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", SQLALCHEMY_DATABASE_URL),
        help="SQLAlchemy URL; mặc định dùng DATABASE_URL hoặc database ứng dụng.",
    )
    parser.add_argument(
        "--log-count",
        type=int,
        default=DEFAULT_CARE_LOG_COUNT,
        help="Số nhật ký cần tạo (mặc định 8.000; giới hạn 5.000–10.000).",
    )
    parser.add_argument("--seed", type=int, default=20261029, help="Seed để sinh dữ liệu lặp lại.")
    args = parser.parse_args()
    if not 5_000 <= args.log_count <= 10_000:
        parser.error("--log-count phải nằm trong khoảng 5.000–10.000.")
    return args


if __name__ == "__main__":
    arguments = parse_args()
    seed(arguments.database_url, log_count=arguments.log_count, seed_value=arguments.seed)

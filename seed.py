"""Tạo dữ liệu mẫu GreenFarm AI một cách idempotent."""

from datetime import date, datetime, timedelta

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import (
    CareLog,
    CropBatch,
    HarvestLog,
    PlantVariety,
    Plot,
    Supply,
    User,
    UserRole,
)


PASSWORD = "GreenFarm2026!"


def _upsert_user(
    db,
    username: str,
    email: str,
    full_name: str,
    role: UserRole,
    employee_code: str,
) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(email=email)
        db.add(user)

    user.username = username
    user.full_name = full_name
    user.role = role
    user.employee_code = employee_code
    user.hashed_password = hash_password(PASSWORD)
    return user


def seed_data() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _upsert_user(db, "admin", "admin@greenfarm.local", "GreenFarm Admin", UserRole.ADMIN, "QT-0001")
        _upsert_user(
            db,
            "manager",
            "manager@greenfarm.local",
            "GreenFarm Manager",
            UserRole.MANAGER,
            "QL-0001",
        )
        _upsert_user(
            db,
            "technician",
            "technician@greenfarm.local",
            "GreenFarm Technician",
            UserRole.TECHNICIAN,
            "KT-0001",
        )

        romaine = db.query(PlantVariety).filter(PlantVariety.code == "ROMAINE-001").first()
        if romaine is None:
            romaine = PlantVariety(code="ROMAINE-001", name="Xà lách Romaine")
            db.add(romaine)
        romaine.name = "Xà lách Romaine"
        romaine.category = "Rau ăn lá"
        romaine.growth_days = 60
        romaine.stock_quantity = 50.0
        romaine.unit = "kg"

        cherry = db.query(PlantVariety).filter(PlantVariety.code == "CHERRY-001").first()
        if cherry is None:
            cherry = PlantVariety(code="CHERRY-001", name="Cà chua Cherry")
            db.add(cherry)
        cherry.name = "Cà chua Cherry"
        cherry.category = "Rau ăn quả"
        cherry.growth_days = 75
        cherry.stock_quantity = 20.0
        cherry.unit = "kg"

        plot_a = db.query(Plot).filter(Plot.code == "A1").first()
        if plot_a is None:
            plot_a = Plot(code="A1", name="Lô A1 - Nhà màng 01", area=1000.0)
            db.add(plot_a)
        plot_a.name = "Lô A1 - Nhà màng 01"
        plot_a.area = 1000.0
        plot_a.location = "Nhà màng 01"

        plot_b = db.query(Plot).filter(Plot.code == "B2").first()
        if plot_b is None:
            plot_b = Plot(code="B2", name="Lô B2 - Cánh đồng mở", area=1500.0)
            db.add(plot_b)
        plot_b.name = "Lô B2 - Cánh đồng mở"
        plot_b.area = 1500.0
        plot_b.location = "Cánh đồng mở"

        npk = db.query(Supply).filter(Supply.code == "NPK-001").first()
        if npk is None:
            npk = Supply(code="NPK-001", name="Phân bón NPK", unit="kg")
            db.add(npk)
        npk.name = "Phân bón NPK"
        npk.category = "phân_bón"
        npk.type = "phan_bon"
        npk.stock_quantity = 100.0
        npk.min_threshold = 20.0

        biological = db.query(Supply).filter(Supply.code == "BIO-001").first()
        if biological is None:
            biological = Supply(code="BIO-001", name="Thuốc sinh học", unit="l")
            db.add(biological)
        biological.name = "Thuốc sinh học"
        biological.category = "thuốc_bảo_vệ_thực_vật"
        biological.type = "thuoc_bvtv"
        biological.stock_quantity = 10.0
        biological.min_threshold = 2.0

        db.flush()
        batch = db.query(CropBatch).filter(CropBatch.batch_code == "BATCH-2026-001").first()
        if batch is None:
            batch = CropBatch(
                batch_code="BATCH-2026-001",
                plot_id=plot_a.id,
                variety_id=romaine.id,
            )
            db.add(batch)
        batch.name = "Lô trồng Xà lách mẫu"
        batch.plot_id = plot_a.id
        batch.variety_id = romaine.id
        batch.sow_date = date.today() - timedelta(days=14)
        batch.expected_harvest_date = date.today() + timedelta(days=46)
        batch.quantity = 5.0
        batch.status = "Đang trồng"

        db.flush()
        care_log = (
            db.query(CareLog)
            .filter(
                CareLog.crop_batch_id == batch.id,
                CareLog.action_type == "Tưới nước",
            )
            .first()
        )
        if care_log is None:
            care_log = CareLog(
                crop_batch_id=batch.id,
                action_type="Tưới nước",
                log_date=date.today().isoformat(),
                notes="Tưới nước buổi sáng, kiểm tra độ ẩm đất.",
                quantity=5.0,
            )
            db.add(care_log)

        harvest = (
            db.query(HarvestLog)
            .filter(HarvestLog.qr_trace_code == "HARVEST-BATCH-2026-001")
            .first()
        )
        if harvest is None:
            harvest = HarvestLog(
                batch_id=batch.id,
                qr_trace_code="HARVEST-BATCH-2026-001",
                quantity=2.5,
                unit="kg",
                grade="loai_1",
                notes="Thu hoạch mẫu để kiểm tra chất lượng.",
                harvest_time=datetime.utcnow(),
            )
            db.add(harvest)

        db.commit()
        print("GreenFarm sample data seeded successfully.")
        print(f"Login password for all sample users: {PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()

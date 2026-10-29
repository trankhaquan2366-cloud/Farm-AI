from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
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


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record) -> None:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False,
    )
    session = testing_session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def sample_data(db_session: Session) -> dict[str, object]:
    admin = User(
        employee_code="QT-TEST-1",
        username="test-admin",
        email="admin@test.local",
        full_name="Test Admin",
        hashed_password=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
    )
    manager = User(
        employee_code="QL-TEST-1",
        username="test-manager",
        email="manager@test.local",
        full_name="Test Manager",
        hashed_password=hash_password("ManagerPass123!"),
        role=UserRole.MANAGER,
    )
    technician = User(
        employee_code="KT-TEST-1",
        username="test-technician",
        email="technician@test.local",
        full_name="Test Technician",
        hashed_password=hash_password("TechnicianPass123!"),
        role=UserRole.TECHNICIAN,
    )
    romaine = PlantVariety(
        code="ROMAINE-TEST",
        name="Xà lách Romaine",
        category="Rau ăn lá",
        growth_days=60,
        stock_quantity=50.0,
        unit="kg",
    )
    cherry = PlantVariety(
        code="CHERRY-TEST",
        name="Cà chua Cherry",
        category="Rau ăn quả",
        growth_days=75,
        stock_quantity=20.0,
        unit="kg",
    )
    plot = Plot(
        code="A1-TEST",
        name="Lô A1 - Nhà màng 01",
        area=1000.0,
        location="Nhà màng 01",
        status="Đang canh tác",
    )
    supply = Supply(
        code="NPK-TEST",
        name="Phân bón NPK",
        category="phân_bón",
        type="phan_bon",
        unit="kg",
        stock_quantity=100.0,
        min_threshold=10.0,
    )
    db_session.add_all([admin, manager, technician, romaine, cherry, plot, supply])
    db_session.flush()

    batch = CropBatch(
        batch_code="BATCH-2026-001",
        name="Lô trồng Xà lách mẫu",
        plot_id=plot.id,
        variety_id=romaine.id,
        sow_date=date(2026, 10, 1),
        expected_harvest_date=date(2026, 11, 30),
        quantity=5.0,
        status="Đang trồng",
    )
    db_session.add(batch)
    db_session.flush()
    care_log = CareLog(
        crop_batch_id=batch.id,
        action_type="Tưới nước",
        log_date="2026-10-27",
        notes="Tưới buổi sáng.",
        quantity=5.0,
    )
    harvest_log = HarvestLog(
        batch_id=batch.id,
        qr_trace_code="HARVEST-TEST-001",
        quantity=1.5,
        unit="kg",
        grade="loai_1",
    )
    db_session.add_all([care_log, harvest_log])
    db_session.commit()
    return {
        "admin": admin,
        "manager": manager,
        "technician": technician,
        "romaine": romaine,
        "cherry": cherry,
        "plot": plot,
        "supply": supply,
        "batch": batch,
        "care_log": care_log,
        "harvest_log": harvest_log,
    }


@pytest.fixture()
def admin_token(client: TestClient) -> str:
    response = client.post(
        "/api/auth/login",
        data={"username": "admin@test.local", "password": "AdminPass123!"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]

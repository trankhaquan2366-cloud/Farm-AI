"""Tìm kiếm toàn cục: chỉ trả trường tối thiểu và giới hạn theo lô cho STAFF."""
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import CropBatch, HarvestLog, Plot, User, UserRole


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        "/api/auth/login", data={"username": email, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _prepare_two_plots(db_session: Session, sample_data) -> tuple[Plot, CropBatch]:
    other_plot = Plot(code="SEARCH-B2", name="Lô tìm kiếm B2", area=300.0)
    db_session.add(other_plot)
    db_session.flush()
    other_batch = CropBatch(
        batch_code="SEARCH-BATCH-002",
        name="Lô ngoài phân công",
        plot_id=other_plot.id,
        variety_id=sample_data["cherry"].id,
        sow_date=date(2026, 10, 2),
    )
    db_session.add(other_batch)
    db_session.commit()
    return other_plot, other_batch


def test_search_returns_only_id_type_title_and_batch_code(
    client: TestClient, db_session: Session, sample_data, admin_token: str
) -> None:
    sample_data["harvest_log"].notes = "Tưới nước buổi sáng, ghi chú nội bộ"
    db_session.commit()

    response = client.get(
        "/search", params={"q": "tưới"}, headers=headers(admin_token)
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    assert isinstance(payload["results"], list)
    assert payload["results"], "Phải tìm thấy ít nhất một bản ghi thu hoạch"
    for item in payload["results"]:
        assert set(item.keys()) == {"id", "type", "title", "batch_code"}
        assert item["type"] == "harvest"
        assert item["batch_code"] == sample_data["batch"].batch_code
        assert "notes" not in item
    raw = response.text.lower()
    assert "ghi chú nội bộ" not in raw
    assert "qr_trace_code" not in raw


def test_search_staff_only_sees_assigned_plot(
    client: TestClient, db_session: Session, sample_data
) -> None:
    assigned_plot = sample_data["plot"]
    other_plot, other_batch = _prepare_two_plots(db_session, sample_data)

    assigned_harvest = sample_data["harvest_log"]
    assigned_harvest.notes = "Tưới nước lô được phân công"
    other_harvest = HarvestLog(
        batch_id=other_batch.id,
        quantity=2.0,
        unit="kg",
        grade="loai_1",
        notes="Tưới nước lô ngoài phân công",
    )
    staff = User(
        employee_code="NV-SEARCH-1",
        username="search-staff",
        email="search-staff@test.local",
        full_name="Search Staff",
        hashed_password=hash_password("SearchStaff123!"),
        role=UserRole.STAFF,
        plot_id=assigned_plot.id,
    )
    db_session.add_all([other_harvest, staff])
    db_session.commit()

    token = _login(client, staff.email, "SearchStaff123!")
    response = client.get("/search", params={"q": "tưới"}, headers=headers(token))
    assert response.status_code == 200, response.text
    results = response.json()["results"]
    assert [item["id"] for item in results] == [assigned_harvest.id]
    assert all(item["batch_code"] == sample_data["batch"].batch_code for item in results)
    assert other_plot.id != assigned_plot.id

"""Ca biên cho thu hoạch và truy xuất nguồn gốc."""
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CropBatch, HarvestLog


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_harvest_persists_and_generates_trace_code(
    client: TestClient, db_session: Session, sample_data, admin_token: str
) -> None:
    batch = sample_data["batch"]
    response = client.post(
        "/api/harvests",
        headers=headers(admin_token),
        json={"batch_id": batch.id, "quantity": 10.0, "grade": "loai_1"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["qr_trace_code"]


def test_create_harvest_rejects_zero_quantity(
    client: TestClient, sample_data, admin_token: str
) -> None:
    batch = sample_data["batch"]
    response = client.post(
        "/api/harvests",
        headers=headers(admin_token),
        json={"batch_id": batch.id, "quantity": 0},
    )
    assert response.status_code == 422, response.text


def test_create_harvest_rejects_negative_quantity(
    client: TestClient, sample_data, admin_token: str
) -> None:
    batch = sample_data["batch"]
    response = client.post(
        "/api/harvests",
        headers=headers(admin_token),
        json={"batch_id": batch.id, "quantity": -5},
    )
    assert response.status_code == 422, response.text


def test_create_harvest_rejects_batch_without_sow_date(
    client: TestClient, db_session: Session, sample_data, admin_token: str
) -> None:
    unplanted = CropBatch(
        batch_code="BATCH-UNPLANTED",
        name="Lô chưa gieo",
        plot_id=sample_data["plot"].id,
        variety_id=sample_data["romaine"].id,
        sow_date=None,
        status="Kế hoạch",
    )
    db_session.add(unplanted)
    db_session.commit()

    response = client.post(
        "/api/harvests",
        headers=headers(admin_token),
        json={"batch_id": unplanted.id, "quantity": 3.0},
    )
    assert response.status_code == 400, response.text


def test_create_harvest_rejects_unknown_batch(
    client: TestClient, sample_data, admin_token: str
) -> None:
    response = client.post(
        "/api/harvests",
        headers=headers(admin_token),
        json={"batch_id": 999_999, "quantity": 3.0},
    )
    assert response.status_code == 400
    assert "không tồn tại" in response.json()["message"].lower()


def test_traceability_returns_full_chain_for_existing_batch(
    client: TestClient, sample_data
) -> None:
    batch = sample_data["batch"]
    response = client.get(f"/api/traceability/{batch.batch_code}")
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["batch_code"] == batch.batch_code
    assert payload["care_logs"]
    assert payload["harvests"]
    # API công khai chỉ trả whitelist của nhật ký, không lộ ghi chú/điều kiện.
    for log in payload["care_logs"]:
        assert set(log.keys()) == {"id", "action_type", "summary", "logged_at"}
        assert log["action_type"] == sample_data["care_log"].action_type
        assert log["summary"] == f"Hoạt động: {sample_data['care_log'].action_type}"
    assert "notes" not in response.text.lower()
    assert "conditions" not in response.text.lower()


def test_traceability_returns_404_for_unknown_batch(client: TestClient) -> None:
    response = client.get("/api/traceability/KHONG-TON-TAI")
    assert response.status_code == 404


def test_harvest_trace_by_qr_is_public(client: TestClient, sample_data) -> None:
    harvest: HarvestLog = sample_data["harvest_log"]
    response = client.get(f"/api/harvests/trace/{harvest.qr_trace_code}")
    assert response.status_code == 200, response.text
    payload = response.json()["data"]
    assert payload["batch_id"] == harvest.batch_id
    assert payload["qr_trace_code"] == harvest.qr_trace_code
    # Không công bố ghi chú tự do của bản ghi thu hoạch.
    assert "notes" not in payload

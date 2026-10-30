"""Ca biên cho lô đất, lô trồng, nhật ký và vật tư.

Mỗi tình huống ghi rõ mong đợi; trường hợp hệ thống chưa chặn được đánh dấu
xfail(strict=True) để bộ test vẫn xanh nhưng lỗi vẫn hiện trong báo cáo.
"""
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CareLog, CropBatch, Supply, User


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------- Lô đất: diện tích 0 / âm / biên nhỏ nhất ----------

def test_create_plot_rejects_zero_area(
    client: TestClient, sample_data, admin_token: str
) -> None:
    response = client.post(
        "/api/plots",
        headers=headers(admin_token),
        json={"code": "ZERO-AREA", "name": "Lô diện tích 0", "area": 0},
    )
    assert response.status_code == 422


def test_create_plot_rejects_negative_area(
    client: TestClient, sample_data, admin_token: str
) -> None:
    response = client.post(
        "/api/plots",
        headers=headers(admin_token),
        json={"code": "NEG-AREA", "name": "Lô diện tích âm", "area": -10},
    )
    assert response.status_code == 422


def test_create_plot_accepts_smallest_positive_area(
    client: TestClient, sample_data, admin_token: str
) -> None:
    response = client.post(
        "/api/plots",
        headers=headers(admin_token),
        json={"code": "MIN-AREA", "name": "Lô biên", "area": 0.01},
    )
    assert response.status_code == 201, response.text
    assert response.json()["area"] == 0.01


# ---------- Lô trồng: mã trùng, ngày gieo tương lai, giống không tồn tại ----------

def _batch_payload(sample_data, **overrides):
    payload = {
        "plot_id": sample_data["plot"].id,
        "variety_id": sample_data["romaine"].id,
        "sow_date": date(2026, 10, 28).isoformat(),
        "quantity_used": 1.0,
    }
    payload.update(overrides)
    return payload


def test_create_crop_batch_rejects_duplicate_code(
    client: TestClient, db_session: Session, sample_data, admin_token: str
) -> None:
    payload = _batch_payload(sample_data, batch_code="DUP-CODE-001")
    first = client.post("/api/crop-batches", headers=headers(admin_token), json=payload)
    assert first.status_code == 201, first.text

    second = client.post("/api/crop-batches", headers=headers(admin_token), json=payload)
    assert second.status_code == 400, second.text


def test_create_crop_batch_rejects_future_sow_date(
    client: TestClient, sample_data, admin_token: str
) -> None:
    payload = _batch_payload(sample_data, sow_date="2027-06-01")
    response = client.post("/api/crop-batches", headers=headers(admin_token), json=payload)
    assert response.status_code in (400, 422), response.text


def test_create_crop_batch_rejects_unknown_variety(
    client: TestClient, sample_data, admin_token: str
) -> None:
    payload = _batch_payload(sample_data, variety_id=999_999)
    response = client.post("/api/crop-batches", headers=headers(admin_token), json=payload)
    assert response.status_code == 400
    assert "không tồn tại" in response.json()["message"].lower()


def test_create_crop_batch_rejects_zero_quantity(
    client: TestClient, sample_data, admin_token: str
) -> None:
    payload = _batch_payload(sample_data, quantity_used=0)
    response = client.post("/api/crop-batches", headers=headers(admin_token), json=payload)
    assert response.status_code == 422


# ---------- Nhật ký: trước ngày gieo, đúng ngày gieo, loại sai, lô đã thu hoạch ----------

def _log_payload(batch_id: int, **overrides):
    payload = {
        "batch_id": batch_id,
        "log_date": "2026-10-05",
        "action_type": "Tưới nước",
        "notes": "Kiểm tra biên",
    }
    payload.update(overrides)
    return payload


def test_care_log_rejects_date_before_sow_date(
    client: TestClient, sample_data, admin_token: str
) -> None:
    batch = sample_data["batch"]
    response = client.post(
        "/api/care-logs",
        headers=headers(admin_token),
        json=_log_payload(batch.id, log_date="2026-09-30"),
    )
    assert response.status_code == 400, response.text


def test_care_log_accepts_sow_date_itself(
    client: TestClient, sample_data, admin_token: str
) -> None:
    batch = sample_data["batch"]
    response = client.post(
        "/api/care-logs",
        headers=headers(admin_token),
        json=_log_payload(batch.id, log_date="2026-10-01"),
    )
    assert response.status_code == 201, response.text


def test_care_log_rejects_invalid_action_type(
    client: TestClient, sample_data, admin_token: str
) -> None:
    batch = sample_data["batch"]
    response = client.post(
        "/api/care-logs",
        headers=headers(admin_token),
        json=_log_payload(batch.id, action_type="bay_luon"),
    )
    assert response.status_code == 422, response.text


def test_care_log_rejects_harvested_batch(
    client: TestClient, db_session: Session, sample_data, admin_token: str
) -> None:
    batch = sample_data["batch"]
    batch.status = "Đã thu hoạch"
    db_session.add(batch)
    db_session.commit()

    response = client.post(
        "/api/care-logs",
        headers=headers(admin_token),
        json=_log_payload(batch.id),
    )
    assert response.status_code == 400, response.text


def test_care_log_rejects_quality_over_100(
    client: TestClient, sample_data, admin_token: str
) -> None:
    batch = sample_data["batch"]
    response = client.post(
        "/api/care-logs",
        headers=headers(admin_token),
        json=_log_payload(batch.id, quality_percent=101),
    )
    assert response.status_code == 422


# ---------- Vật tư: xuất đúng bằng tồn và vượt tồn ----------

def test_supply_usage_equal_to_stock_succeeds_and_hits_threshold(
    client: TestClient, db_session: Session, sample_data, admin_token: str
) -> None:
    supply: Supply = sample_data["supply"]
    batch = sample_data["batch"]
    response = client.post(
        "/api/care-logs",
        headers=headers(admin_token),
        json=_log_payload(
            batch.id,
            action_type="Bón phân",
            supply_usages=[
                {"supply_id": supply.id, "quantity_used": supply.stock_quantity}
            ],
        ),
    )
    assert response.status_code == 201, response.text
    db_session.refresh(supply)
    assert supply.stock_quantity == 0

    alerts = client.get("/api/supplies/alerts", headers=headers(admin_token))
    assert alerts.status_code == 200
    assert any(item["supply_id"] == supply.id for item in alerts.json())


def test_supply_usage_over_stock_rejected_and_log_rolled_back(
    client: TestClient, db_session: Session, sample_data, admin_token: str
) -> None:
    supply: Supply = sample_data["supply"]
    batch = sample_data["batch"]
    before = db_session.query(CareLog).count()

    response = client.post(
        "/api/care-logs",
        headers=headers(admin_token),
        json=_log_payload(
            batch.id,
            supply_usages=[
                {"supply_id": supply.id, "quantity_used": supply.stock_quantity + 0.5}
            ],
        ),
    )
    assert response.status_code == 400
    assert db_session.query(CareLog).count() == before
    db_session.refresh(supply)
    assert supply.stock_quantity == 100.0

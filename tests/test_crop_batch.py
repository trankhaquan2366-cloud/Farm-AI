from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CropBatch, PlantVariety


def test_create_crop_batch_deducts_seed_inventory(
    client: TestClient,
    db_session: Session,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    variety = sample_data["romaine"]
    plot = sample_data["plot"]
    initial_stock = variety.stock_quantity

    response = client.post(
        "/api/crop-batches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "batch_name": "Lô Romaine mới",
            "plot_id": plot.id,
            "variety_id": variety.id,
            "sow_date": date(2026, 10, 28).isoformat(),
            "quantity_used": 3.5,
        },
    )

    assert response.status_code == 201, response.text
    created_batch = db_session.query(CropBatch).filter(
        CropBatch.batch_code == response.json()["batch_code"]
    ).one()
    db_session.refresh(variety)
    assert created_batch.name == "Lô Romaine mới"
    assert variety.stock_quantity == initial_stock - 3.5


def test_create_crop_batch_persists_planting_details(
    client: TestClient,
    db_session: Session,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    variety = sample_data["romaine"]
    plot = sample_data["plot"]
    response = client.post(
        "/api/crop-batches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "batch_name": "Lô Romaine VietGAP",
            "plot_id": plot.id,
            "variety_id": variety.id,
            "sow_date": date(2026, 10, 29).isoformat(),
            "seeding_date": date(2026, 10, 29).isoformat(),
            "expected_harvest_date": date(2026, 12, 28).isoformat(),
            "quantity_used": 2.0,
            "planting_method": "Cấy cây con",
            "certification_standard": "VietGAP",
            "notes": "Bón lót phân hữu cơ",
        },
    )

    assert response.status_code == 201, response.text
    created_batch = db_session.query(CropBatch).filter(
        CropBatch.batch_code == response.json()["batch_code"]
    ).one()
    assert created_batch.expected_harvest_date == date(2026, 12, 28)
    assert created_batch.planting_method == "Cấy cây con"
    assert created_batch.certification_standard == "VietGAP"
    assert created_batch.notes == "Bón lót phân hữu cơ"


def test_delete_crop_batch_restores_seed_inventory(
    client: TestClient,
    db_session: Session,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    variety = sample_data["romaine"]
    plot = sample_data["plot"]
    db_session.refresh(variety)
    starting_stock = variety.stock_quantity

    create_response = client.post(
        "/api/crop-batches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "batch_name": "Lô Romaine cần xóa",
            "plot_id": plot.id,
            "variety_id": variety.id,
            "sow_date": date(2026, 10, 28).isoformat(),
            "quantity_used": 4.0,
        },
    )
    assert create_response.status_code == 201, create_response.text
    batch_id = create_response.json()["id"]

    delete_response = client.delete(
        f"/api/crop-batches/{batch_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert delete_response.status_code == 200, delete_response.text
    db_session.refresh(variety)
    assert variety.stock_quantity == starting_stock
    assert db_session.query(CropBatch).filter(CropBatch.id == batch_id).first() is None


def test_create_crop_batch_rejects_insufficient_inventory(
    client: TestClient,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    variety = sample_data["romaine"]
    plot = sample_data["plot"]
    response = client.post(
        "/api/crop-batches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "plot_id": plot.id,
            "variety_id": variety.id,
            "sow_date": date(2026, 10, 28).isoformat(),
            "quantity_used": 500.0,
        },
    )

    assert response.status_code == 400
    assert "không đủ" in response.json()["message"].lower()

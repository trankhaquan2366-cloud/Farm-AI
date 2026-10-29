from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CareLog
from app.routers import care_log as care_log_router


def test_create_harvest_log_persists_quantity_and_quality(
    client: TestClient,
    db_session: Session,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    batch = sample_data["batch"]
    response = client.post(
        "/api/care-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "batch_id": batch.id,
            "log_date": "2026-10-29",
            "action_type": "Thu hoạch",
            "notes": "Thu hoạch đợt đầu",
            "quantity": 18.5,
            "quality_percent": 92,
        },
    )

    assert response.status_code == 201, response.text
    log = db_session.query(CareLog).filter(CareLog.id == response.json()["id"]).one()
    assert log.quantity == 18.5
    assert log.quality_percent == 92


def test_upload_care_log_image_saves_supported_raster(
    client: TestClient,
    sample_data: dict[str, object],
    admin_token: str,
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(care_log_router, "UPLOAD_DIR", tmp_path)
    response = client.post(
        "/api/care-logs/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("plot.png", b"\x89PNG\r\n\x1a\nsample-image-data", "image/png")},
    )

    assert response.status_code == 201, response.text
    image_url = response.json()["image_url"]
    uploaded_file = tmp_path / image_url.rsplit("/", 1)[-1]
    assert uploaded_file.is_file()
    assert uploaded_file.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")


def test_upload_care_log_image_rejects_non_image(
    client: TestClient,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    response = client.post(
        "/api/care-logs/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("not-image.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 415

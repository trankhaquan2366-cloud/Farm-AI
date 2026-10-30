"""Kiểm tra biểu đồ sản lượng không cộng trùng hai nguồn thu hoạch."""
from fastapi.testclient import TestClient

from app.models import HarvestLog


def test_harvest_chart_counts_one_source_per_batch_and_day(
    client: TestClient, sample_data: dict[str, object], admin_token: str
) -> None:
    batch = sample_data["batch"]
    harvest: HarvestLog = sample_data["harvest_log"]
    harvest_date = harvest.harvest_time.date().isoformat()

    # Cùng lô, cùng ngày, cùng sản lượng nhưng ghi thêm nhật ký "Thu hoạch".
    log_response = client.post(
        "/api/care-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "batch_id": batch.id,
            "log_date": harvest_date,
            "action_type": "Thu hoạch",
            "notes": "Ghi trùng với phiếu thu hoạch.",
            "quantity": float(harvest.quantity),
        },
    )
    assert log_response.status_code == 201, log_response.text

    chart = client.get(
        "/api/dashboard/harvest-chart?view=day",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert chart.status_code == 200, chart.text
    total = sum(point["total"] for point in chart.json()["data"])
    assert total == float(harvest.quantity)

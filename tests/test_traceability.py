from fastapi.testclient import TestClient


def test_public_batch_trace_contains_related_data(
    client: TestClient,
    sample_data: dict[str, object],
) -> None:
    response = client.get("/api/crop-batches/trace/BATCH-2026-001")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["batch_info"]["batch_code"] == "BATCH-2026-001"
    assert payload["batch_info"]["batch_name"] == "Lô trồng Xà lách mẫu"
    assert payload["plot_info"]["name"] == "Lô A1 - Nhà màng 01"
    assert payload["plot_info"]["area"] == 1000.0
    assert payload["variety_info"]["name"] == "Xà lách Romaine"
    assert payload["variety_info"]["growth_duration_days"] == 60
    assert payload["care_history"]
    assert payload["care_history"][0]["action_type"] == "Tưới nước"
    assert payload["harvest_history"]
    assert payload["safety_certifications"]

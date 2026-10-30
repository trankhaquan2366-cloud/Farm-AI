"""Các endpoint từng công khai ngoài ý muốn phải yêu cầu đăng nhập."""
from fastapi.testclient import TestClient


def test_notifications_require_authentication(client: TestClient) -> None:
    response = client.get("/api/notifications")
    assert response.status_code == 401, response.text


def test_search_require_authentication(client: TestClient) -> None:
    response = client.get("/search", params={"q": "tưới"})
    assert response.status_code == 401, response.text


def test_notifications_work_for_authenticated_user(
    client: TestClient, sample_data: dict[str, object], admin_token: str
) -> None:
    response = client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_search_works_for_authenticated_user(
    client: TestClient, sample_data: dict[str, object], admin_token: str
) -> None:
    response = client.get(
        "/search",
        params={"q": "tưới"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text

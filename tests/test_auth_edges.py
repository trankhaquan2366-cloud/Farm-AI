"""Ca biên cho xác thực và phân quyền."""
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from app.core.security import ALGORITHM, SECRET_KEY


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_expired_token_is_rejected(client: TestClient, sample_data) -> None:
    expired = jwt.encode(
        {
            "sub": "admin@test.local",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    response = client.get("/api/auth/me", headers=headers(expired))
    assert response.status_code == 401
    assert "hết hạn" in response.json()["message"].lower()


def test_malformed_token_is_rejected(client: TestClient, sample_data) -> None:
    response = client.get("/api/auth/me", headers=headers("khong-phai-jwt"))
    assert response.status_code == 401


def test_technician_cannot_create_supply(
    client: TestClient, sample_data
) -> None:
    login = client.post(
        "/api/auth/login",
        data={"username": "technician@test.local", "password": "TechnicianPass123!"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    response = client.post(
        "/api/supplies",
        headers=headers(token),
        json={"name": "Vật tư trái quyền", "unit": "kg", "initial_stock": 1},
    )
    assert response.status_code == 403


def test_manager_cannot_promote_to_admin(client: TestClient, sample_data) -> None:
    login = client.post(
        "/api/auth/login",
        data={"username": "manager@test.local", "password": "ManagerPass123!"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    response = client.post(
        "/api/auth/register",
        headers=headers(token),
        json={
            "full_name": "Leo quyen",
            "email": "escalate@example.com",
            "password": "StrongPass123!",
            "role": "admin",
        },
    )
    assert response.status_code == 403

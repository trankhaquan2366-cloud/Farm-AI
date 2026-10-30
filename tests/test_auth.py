from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CropBatch, Plot, User, UserRole
from app.core.security import hash_password


def test_login_with_valid_password(client: TestClient, sample_data: dict[str, object]) -> None:
    response = client.post(
        "/api/auth/login",
        data={"username": "admin@test.local", "password": "AdminPass123!"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["user"]["role"] == "admin"


def test_login_rejects_invalid_password(
    client: TestClient,
    sample_data: dict[str, object],
) -> None:
    response = client.post(
        "/api/auth/login",
        data={"username": "admin@test.local", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_protected_endpoint_requires_bearer_token(client: TestClient) -> None:
    response = client.get("/api/crop-batches")

    assert response.status_code == 401


def test_current_user_can_change_password(
    client: TestClient,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    invalid_current_password = client.post(
        "/api/auth/me/password",
        headers=headers,
        json={"current_password": "wrong-password", "new_password": "NewAdminPass123!"},
    )
    assert invalid_current_password.status_code == 400

    changed = client.post(
        "/api/auth/me/password",
        headers=headers,
        json={"current_password": "AdminPass123!", "new_password": "NewAdminPass123!"},
    )
    assert changed.status_code == 200, changed.text

    login_response = client.post(
        "/api/auth/login",
        data={"username": "admin@test.local", "password": "NewAdminPass123!"},
    )
    assert login_response.status_code == 200


def test_account_management_workflow(
    client: TestClient,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    plot = sample_data["plot"]
    create_response = client.post(
        "/api/auth/register",
        headers=headers,
        json={
            "full_name": "Nhân viên thử nghiệm",
            "email": "worker@example.com",
            "password": "WorkerPass123!",
            "role": "staff",
            "plot_id": plot.id,
        },
    )
    assert create_response.status_code == 201, create_response.text
    user_id = create_response.json()["user_id"]

    account_response = client.get("/api/auth/users", headers=headers)
    account = next(user for user in account_response.json() if user["id"] == user_id)
    assert account["plot_id"] == plot.id
    assert account["plot_name"] == plot.name
    assert account["is_active"] is True

    update_response = client.put(
        f"/api/auth/users/{user_id}",
        headers=headers,
        json={"full_name": "Nhân viên đã cập nhật", "role": "technician", "plot_id": None},
    )
    assert update_response.status_code == 200, update_response.text

    password_response = client.post(
        f"/api/auth/users/{user_id}/reset-password",
        headers=headers,
        json={"password": "ChangedPass123!"},
    )
    assert password_response.status_code == 200, password_response.text
    login_response = client.post(
        "/api/auth/login",
        data={"username": "worker@example.com", "password": "ChangedPass123!"},
    )
    assert login_response.status_code == 200
    worker_token = login_response.json()["access_token"]

    lock_response = client.patch(
        f"/api/auth/users/{user_id}/status",
        headers=headers,
        params={"is_active": "false"},
    )
    assert lock_response.status_code == 200, lock_response.text
    protected_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert protected_response.status_code == 401

    delete_response = client.delete(f"/api/auth/users/{user_id}", headers=headers)
    assert delete_response.status_code == 200, delete_response.text


def test_worker_is_scoped_to_assigned_plot(
    client: TestClient,
    sample_data: dict[str, object],
    db_session: Session,
) -> None:
    assigned_plot = sample_data["plot"]
    assigned_batch = sample_data["batch"]
    other_plot = Plot(
        code="B2-TEST",
        name="Lô B2 - ngoài phân công",
        area=500.0,
        location="Khu B",
    )
    db_session.add(other_plot)
    db_session.flush()
    other_batch = CropBatch(
        batch_code="BATCH-OTHER-001",
        name="Lô không được phân công",
        plot_id=other_plot.id,
        variety_id=sample_data["cherry"].id,
        sow_date=date(2026, 10, 2),
    )
    worker = User(
        employee_code="NV-SCOPE-1",
        username="scope-worker",
        email="scope-worker@test.local",
        full_name="Scope Worker",
        hashed_password=hash_password("WorkerPass123!"),
        role=UserRole.STAFF,
        plot_id=assigned_plot.id,
    )
    db_session.add_all([other_batch, worker])
    db_session.commit()

    login_response = client.post(
        "/api/auth/login",
        data={"username": worker.email, "password": "WorkerPass123!"},
    )
    assert login_response.status_code == 200
    login_payload = login_response.json()
    assert login_payload["user"]["plot_id"] == assigned_plot.id
    headers = {"Authorization": f"Bearer {login_payload['access_token']}"}

    assert client.get("/api/auth/users", headers=headers).status_code == 403

    plots_response = client.get("/api/plots", headers=headers)
    assert plots_response.status_code == 200
    assert [plot["id"] for plot in plots_response.json()] == [assigned_plot.id]

    batches_response = client.get("/api/batches", headers=headers)
    assert batches_response.status_code == 200
    assert [batch["id"] for batch in batches_response.json()] == [assigned_batch.id]

    logs_response = client.get("/api/care-logs", headers=headers)
    assert logs_response.status_code == 200
    assert all(log["batch_id"] == assigned_batch.id for log in logs_response.json())

    # Thu hoạch của lô ngoài phân công không được lộ cho STAFF.
    admin_login = client.post(
        "/api/auth/login",
        data={"username": "admin@test.local", "password": "AdminPass123!"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    other_harvest = client.post(
        "/api/harvests",
        headers=admin_headers,
        json={"batch_id": other_batch.id, "quantity": 2.0},
    )
    assert other_harvest.status_code == 201, other_harvest.text

    harvests_response = client.get("/api/harvests", headers=headers)
    assert harvests_response.status_code == 200
    harvest_batch_ids = {item["batch_id"] for item in harvests_response.json()}
    assert harvest_batch_ids == {assigned_batch.id}

    forbidden_harvests = client.get(
        f"/api/harvests/batch/{other_batch.id}", headers=headers
    )
    assert forbidden_harvests.status_code == 403

    forbidden_summary = client.post(
        "/api/ai-summary/summary",
        headers=headers,
        json={"lot_id": other_batch.id},
    )
    assert forbidden_summary.status_code == 403

    from app.routers.ai_advisor import build_system_context

    ai_context = build_system_context(db_session, assigned_plot_id=assigned_plot.id)
    assert assigned_batch.name in ai_context
    assert other_batch.name not in ai_context

    forbidden_log = client.post(
        "/api/care-logs",
        headers=headers,
        json={"batch_id": other_batch.id, "action_type": "Tưới nước"},
    )
    assert forbidden_log.status_code == 403


def test_manager_cannot_create_or_promote_privileged_accounts(
    client: TestClient,
    sample_data: dict[str, object],
) -> None:
    login_response = client.post(
        "/api/auth/login",
        data={"username": "manager@test.local", "password": "ManagerPass123!"},
    )
    assert login_response.status_code == 200
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
    assert client.get("/api/auth/users", headers=headers).status_code == 200

    create_admin = client.post(
        "/api/auth/register",
        headers=headers,
        json={
            "full_name": "Escalation Attempt",
            "email": "new-admin@example.com",
            "password": "StrongPass123!",
            "role": "admin",
        },
    )
    assert create_admin.status_code == 403, create_admin.text

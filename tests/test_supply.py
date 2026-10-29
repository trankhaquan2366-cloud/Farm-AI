from datetime import date

from app.models.supply import SupplyImport


def test_create_supply_persists_initial_stock_expiry_and_notes(
    client, sample_data, admin_token, db_session
):
    response = client.post(
        "/api/supplies",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "code": "VT-309",
            "name": "Phân hữu cơ",
            "category": "phan_bon",
            "unit": "kg",
            "initial_stock": 18.5,
            "min_threshold": 4,
            "initial_expiry_date": "2027-10-01",
            "location": "Kho A",
            "usage_notes": "Pha theo hướng dẫn trên bao bì.",
            "storage_notes": "Để nơi khô ráo.",
        },
    )

    assert response.status_code == 201, response.text
    result = response.json()
    assert result["quantity"] == 18.5
    assert result["min_threshold"] == 4
    assert result["usage_notes"] == "Pha theo hướng dẫn trên bao bì."
    assert result["storage_notes"] == "Để nơi khô ráo."

    initial_import = (
        db_session.query(SupplyImport)
        .filter_by(supply_id=result["id"])
        .one()
    )
    assert initial_import.quantity_imported == 18.5
    assert initial_import.expiry_date == date(2027, 10, 1)


def test_create_supply_rejects_negative_initial_stock(client, sample_data, admin_token):
    response = client.post(
        "/api/supplies",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Phân hữu cơ",
            "category": "phan_bon",
            "unit": "kg",
            "initial_stock": -1,
        },
    )

    assert response.status_code == 422

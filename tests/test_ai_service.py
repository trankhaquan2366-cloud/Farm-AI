import json

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch

from app.models import AiSuggestion
from app.routers.ai_advisor import AdvisorCitations, AdvisorResponse


DISCLAIMER = (
    "Lưu ý: Thông tin do AI tạo ra chỉ mang tính chất tham khảo. "
    "Vui lòng tham khảo ý kiến chuyên gia nông nghiệp trước khi ứng dụng thực tế."
)


def test_ai_advisor_returns_json_and_legal_disclaimer(
    client: TestClient,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    ai_response = AdvisorResponse(
        reply="Nhật ký ghi nhận hoạt động tưới nước.",
        citations=AdvisorCitations(
            batch_codes=["BATCH-2026-001"],
            care_log_ids=[sample_data["care_log"].id],
        ),
    )

    with patch(
        "app.routers.ai_advisor.call_gemini_structured",
        return_value=ai_response,
    ) as mocked_gemini:
        response = client.post(
            "/api/v1/ai-advisor/chat",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"message": "Tình hình chăm sóc của lô mẫu thế nào?", "batch_id": sample_data["batch"].id},
        )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["reply"] == ai_response.reply
    assert payload["response"] == ai_response.reply
    assert payload["disclaimer"] == DISCLAIMER
    assert isinstance(payload, dict)
    mocked_gemini.assert_called_once()


def test_ai_advisor_records_successful_exchange_in_ai_suggestions(
    client: TestClient,
    db_session: Session,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    ai_response = AdvisorResponse(
        reply="Nhật ký ghi nhận hoạt động tưới nước.",
        citations=AdvisorCitations(
            batch_codes=["BATCH-2026-001"],
            care_log_ids=[sample_data["care_log"].id],
        ),
    )
    prompt = "  Tình hình   chăm sóc của lô mẫu?  "

    with patch(
        "app.routers.ai_advisor.call_gemini_structured",
        return_value=ai_response,
    ):
        response = client.post(
            "/api/v1/ai-advisor/chat",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"message": prompt, "batch_id": sample_data["batch"].id},
        )

    assert response.status_code == 200, response.text
    records = (
        db_session.query(AiSuggestion)
        .filter(AiSuggestion.suggestion_type == "advisor")
        .all()
    )
    assert len(records) == 1
    record = records[0]
    assert record.batch_id == sample_data["batch"].id
    assert record.disclaimer == DISCLAIMER
    input_data = json.loads(record.input_data)
    assert input_data["prompt"] == "Tình hình chăm sóc của lô mẫu?"
    assert input_data["guard_triggered"] is False
    assert input_data["ai_available"] is True
    output = json.loads(record.output_text)
    assert output["reply"] == ai_response.reply
    assert record.description == ai_response.reply


def test_ai_advisor_records_fallback_when_ai_unavailable(
    client: TestClient,
    db_session: Session,
    sample_data: dict[str, object],
    admin_token: str,
) -> None:
    with patch(
        "app.routers.ai_advisor.call_gemini_structured",
        side_effect=RuntimeError("hết hạn mức"),
    ):
        response = client.post(
            "/api/v1/ai-advisor/chat",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"message": "Lô mẫu thế nào?", "batch_id": sample_data["batch"].id},
        )

    assert response.status_code == 200, response.text
    assert response.json()["ai_available"] is False
    record = (
        db_session.query(AiSuggestion)
        .filter(AiSuggestion.suggestion_type == "advisor")
        .one()
    )
    input_data = json.loads(record.input_data)
    assert input_data["ai_available"] is False
    assert input_data["guard_triggered"] is False
    assert record.description == "Chưa đủ dữ liệu: nội dung AI không khớp năm trong dữ liệu gốc nên đã bị loại bỏ. Vui lòng kiểm tra trực tiếp nhật ký chăm sóc của lô."

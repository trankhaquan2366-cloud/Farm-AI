from fastapi.testclient import TestClient
from unittest.mock import patch

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

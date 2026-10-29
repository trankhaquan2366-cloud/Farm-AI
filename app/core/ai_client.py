import json
import logging
from typing import Optional, Any
from google import genai
from google.genai import types
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "Lưu ý: Thông tin do AI tạo ra chỉ mang tính chất tham khảo. "
    "Vui lòng tham khảo ý kiến chuyên gia nông nghiệp trước khi ứng dụng thực tế."
)
GEMINI_MODEL = "gemini-2.5-flash"
ANTI_HALLUCINATION_INSTRUCTIONS = (
    "Chỉ phân tích dữ liệu thực tế được cung cấp từ cơ sở dữ liệu SQLite trong ngữ cảnh. "
    "Không suy đoán, không tạo dữ liệu, mã lô, ID hoặc lịch sử không có trong dữ liệu. "
    "Nếu dữ liệu không đủ để trả lời, hãy ghi chính xác: "
    '"Chưa đủ dữ liệu ghi nhận". '
    f"{DISCLAIMER_TEXT}"
)


def _get_client() -> genai.Client:
    """Hàm bổ trợ lấy SDK Client và kiểm tra API Key."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chưa cấu hình GEMINI_API_KEY - không thể gọi chức năng AI.",
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _bounded_prompt(prompt: str) -> str:
    if len(prompt) <= settings.GEMINI_MAX_PROMPT_CHARS:
        return prompt
    kept_chars = settings.GEMINI_MAX_PROMPT_CHARS
    return (
        prompt[:kept_chars]
        + "\n\n[Hệ thống đã cắt bớt dữ liệu đầu vào vì vượt giới hạn kích thước.]"
    )


def _raise_gemini_error(exc: Exception) -> None:
    error_text = str(exc).lower()
    error_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)

    if error_code == 429 or "429" in error_text or "rate limit" in error_text or "resource exhausted" in error_text:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Dịch vụ AI đang quá tải hoặc đã đạt giới hạn. Vui lòng thử lại sau.",
        ) from exc
    if isinstance(exc, TimeoutError) or "timeout" in error_text or "timed out" in error_text:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Dịch vụ AI phản hồi quá lâu. Vui lòng thử lại.",
        ) from exc

    logger.exception("Gemini request failed", exc_info=exc)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Dịch vụ AI tạm thời không khả dụng.",
    ) from exc


def call_gemini(
    system_prompt: str, 
    user_prompt: str, 
    image_bytes: Optional[bytes] = None, 
    mime_type: Optional[str] = "image/jpeg"
) -> str:
    """
    Hàm gọi Gemini trả về văn bản thuần (plain text).
    - Hỗ trợ cả text-only và kèm hình ảnh (chuẩn đoán sâu bệnh qua ảnh).
    """
    client = _get_client()

    contents = []
    if image_bytes:
        contents.append(
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type
            )
        )
    contents.append(_bounded_prompt(user_prompt))

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=(
                    f"{system_prompt}\n\n{ANTI_HALLUCINATION_INSTRUCTIONS}"
                ),
                temperature=0.3,
            ),
        )
    except Exception as exc:
        _raise_gemini_error(exc)

    text = (getattr(response, "text", None) or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI không trả về nội dung.",
        )
    return text


def call_gemini_structured(system_prompt: str, user_prompt: str, response_schema: Any) -> Any:
    """
    Hàm gọi Gemini API trả về JSON ép theo Pydantic Schema.
    - system_prompt / user_prompt: build sẵn ở Service.
    - response_schema: Class Pydantic mô tả cấu trúc JSON mong muốn.
    """
    client = _get_client()

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=_bounded_prompt(user_prompt),
            config=types.GenerateContentConfig(
                system_instruction=(
                    f"{system_prompt}\n\n{ANTI_HALLUCINATION_INSTRUCTIONS}"
                ),
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.3,
            ),
        )
    except Exception as exc:
        _raise_gemini_error(exc)

    parsed = getattr(response, "parsed", None)
    if parsed is None:
        raw_text = (getattr(response, "text", None) or "").strip()
        if not raw_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI không trả về dữ liệu JSON.",
            )
        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI trả về dữ liệu không đúng định dạng JSON.",
            ) from exc

    try:
        if hasattr(response_schema, "model_validate"):
            return response_schema.model_validate(parsed)
        return parsed
    except Exception as exc:
        logger.warning("Gemini response failed schema validation", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI trả về dữ liệu không khớp định dạng hệ thống yêu cầu.",
        ) from exc
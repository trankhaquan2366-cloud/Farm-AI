import os
import sys

from dotenv import load_dotenv


def _print_safe(message: str) -> None:
    """In cảnh báo tiếng Việt mà không làm sập app khi console dùng cp1252."""
    try:
        print(message)
    except UnicodeEncodeError:
        stream = getattr(sys.stderr, "buffer", None)
        if stream is not None:
            stream.write(message.encode("utf-8") + b"\n")
            stream.flush()
        else:
            sys.stderr.write(message.encode("ascii", "replace").decode("ascii") + "\n")

# load_dotenv() đọc file .env ở thư mục gốc project và nạp vào biến môi
# trường - giúp bạn KHÔNG BAO GIỜ được hardcode API key thẳng vào code
# (nếu hardcode rồi lỡ đẩy lên GitHub public, key sẽ bị người khác lấy dùng).
load_dotenv()


class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    # Dùng alias "-latest" thay vì ghim cứng phiên bản (vd gemini-2.5-flash)
    # để không bị gián đoạn khi Google khai tử model cũ giữa học kỳ.
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
    GEMINI_MAX_PROMPT_CHARS: int = int(os.getenv("GEMINI_MAX_PROMPT_CHARS", "24000"))
    GEMINI_TIMEOUT_SECONDS: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))
    # Chống tính trùng sản lượng trên biểu đồ: nếu một lô đã có harvest_logs
    # trong cùng ngày thì bỏ qua nhật ký "Thu hoạch" tương ứng. Đặt false để tắt.
    DASHBOARD_DEDUPE_HARVEST: bool = os.getenv(
        "DASHBOARD_DEDUPE_HARVEST", "true"
    ).strip().lower() in {"1", "true", "yes", "on"}


settings = Settings()

if not settings.GEMINI_API_KEY:
    # Không raise lỗi ngay khi import (sẽ làm sập cả app kể cả các API
    # không liên quan AI) - chỉ cảnh báo, lỗi thật sẽ raise khi thực sự
    # gọi tới chức năng AI (xem ai_client.py).
    _print_safe(
        "[CẢNH BÁO] Chưa cấu hình GEMINI_API_KEY trong file .env - "
        "các chức năng AI sẽ không hoạt động."
    )

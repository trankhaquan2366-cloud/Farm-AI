import os
from dotenv import load_dotenv

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


settings = Settings()

if not settings.GEMINI_API_KEY:
    # Không raise lỗi ngay khi import (sẽ làm sập cả app kể cả các API
    # không liên quan AI) - chỉ cảnh báo, lỗi thật sẽ raise khi thực sự
    # gọi tới chức năng AI (xem ai_client.py).
    print("[CẢNH BÁO] Chưa cấu hình GEMINI_API_KEY trong file .env - các chức năng AI sẽ không hoạt động.")

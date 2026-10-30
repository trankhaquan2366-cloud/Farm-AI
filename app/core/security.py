import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict

import jwt
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()


def _print_safe(message: str) -> None:
    """In thông báo mà không vỡ trên console Windows dùng bảng mã cp1252."""
    try:
        print(message)
    except UnicodeEncodeError:
        stream = getattr(sys.stderr, "buffer", None)
        if stream is not None:
            stream.write(message.encode("utf-8") + b"\n")
            stream.flush()
        else:  # pragma: no cover - môi trường không có buffer nhị phân
            sys.stderr.write(message.encode("ascii", "replace").decode("ascii") + "\n")


# 1. Cấu hình Secret Key & Thuật toán mã hóa từ Environment
# Không còn giá trị mặc định dùng được ở production: thiếu SECRET_KEY thì
# ứng dụng từ chối khởi động (DEBUG=False). Chỉ khi DEBUG=True mới dùng
# khóa tạm để chạy thử trên máy cá nhân.
DEBUG = os.getenv("DEBUG", "false").strip().lower() in {"1", "true", "yes", "on"}
_DEV_ONLY_SECRET = "dev-only-insecure-secret-key-do-not-deploy"

SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = _DEV_ONLY_SECRET
        _print_safe(
            "[CẢNH BÁO] DEBUG=True và chưa có SECRET_KEY: đang dùng khóa tạm chỉ "
            "cho phát triển cục bộ. Không dùng cấu hình này khi triển khai."
        )
    else:
        raise RuntimeError(
            "Thiếu SECRET_KEY. Hãy đặt SECRET_KEY trong biến môi trường hoặc .env "
            "trước khi khởi động (xem .env.example). Chỉ đặt DEBUG=True khi chạy "
            "thử cục bộ."
        )

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))  # Mặc định 60 phút

# Hỗ trợ xác minh hash bcrypt cũ, nhưng dùng PBKDF2-SHA256 cho hash mới để
# tránh lỗi tương thích bcrypt trên các phiên bản Python/bcrypt mới.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",
)


# ==================== MÃ HÓA HÀM BẢO MẬT MẬT KHẨU ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra mật khẩu nhập vào có khớp với mật khẩu đã mã hóa trong DB không."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Mã hóa mật khẩu bằng PBKDF2-SHA256, không lưu mật khẩu thô."""
    return pwd_context.hash(password, scheme="pbkdf2_sha256")


# ==================== XỬ LÝ JWT ACCESS TOKEN ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo JWT Access Token chứa dữ liệu thông tin user (sub, role, full_name, ...).
    Sử dụng múi giờ UTC chuẩn để tránh lỗi bị hết hạn Token ngay khi vừa khởi tạo.
    """
    to_encode = data.copy()
    
    # Tính thời gian hết hạn (expiration time)
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({
        "exp": expire,
        "iat": now  # Thời điểm khởi tạo token (Issued At)
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Giải mã và kiểm tra tính hợp lệ của JWT Access Token.
    Trả về Dict payload nếu hợp lệ, ngược lại trả về None nếu Token hết hạn/không đúng.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        # Token đã hết hạn
        return None
    except jwt.PyJWTError:
        # Token bị lỗi chữ ký hoặc cấu trúc sai
        return None
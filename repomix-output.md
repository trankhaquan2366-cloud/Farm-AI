This file is a merged representation of a subset of the codebase, containing files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching these patterns are excluded: **/node_modules/**, **/.next/**, **/venv/**, **/.venv/**, **/*.db, **/__pycache__/**, **/.git/**, **/.env*, **/*.pem, **/secrets.json, **/config.local.json
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
````
app/
  core/
    __init__.py
    ai_client.py
    config.py
    database.py
    deps.py
    permissions.py
    security.py
  models/
    __init__.py
    ai_suggestion.py
    care_log.py
    crop_batch.py
    harvest.py
    notification.py
    plant_variety.py
    plot.py
    sale.py
    supply_usage.py
    supply.py
    user.py
  repositories/
    __init__.py
    ai_suggestion.py
    care_log.py
    crop_batch.py
    harvest.py
    plant_variety.py
    plot.py
    sale.py
    supply.py
    user.py
  routers/
    __init__.py
    ai_advisor.py
    ai_alert.py
    ai_schedule.py
    ai_summary.py
    auth.py
    care_log.py
    crop_batch.py
    dashboard.py
    harvest.py
    notification.py
    plant_variety.py
    plot.py
    sale.py
    search.py
    seeds.py
    supply.py
    traceability.py
    user.py
  schemas/
    __init__.py
    ai_alert.py
    ai_schedule.py
    ai_summary.py
    care_log.py
    crop_batch.py
    harvest.py
    notification.py
    plant_variety.py
    plot.py
    sale.py
    supply.py
    traceability.py
    user.py
  services/
    __init__.py
    ai_alert.py
    ai_schedule.py
    ai_summary.py
    care_log.py
    crop_batch.py
    gemini_advisor.py
    harvest.py
    plant_variety.py
    plot.py
    sale.py
    supply.py
    traceability.py
    user.py
  main.py
  mock_data.py
  seed_data.py
frontend/
  app/
    (dashboard)/
      batches/
        page.tsx
      care-logs/
        page.tsx
      crop-lots/
        page.tsx
      supplies/
        page.tsx
      traceability/
        page.tsx
      users/
        page.tsx
      varieties/
        page.tsx
      layout.tsx
      page.tsx
    login/
      page.tsx
    trace/
      [code]/
        page.tsx
    globals.css
    layout.tsx
  components/
    batches/
      create-batch-modal.tsx
      status-badge.tsx
    crop-lots/
      create-crop-lot-modal.tsx
      edit-crop-lot-modal.tsx
    dashboard/
      ai-alert-card.tsx
      harvest-chart.tsx
      harvest-yield-chart.tsx
      stat-card.tsx
      weather-widget.tsx
    decor/
      rice-stalk.tsx
    layout/
      app-shell.tsx
      header.tsx
      notification-dropdown.tsx
      sidebar.tsx
    traceability/
      care-log-type-badge.tsx
      trace-report.tsx
    ui/
      button.tsx
      field.tsx
      modal.tsx
    GlobalSearch.tsx
    weather-widget.tsx
  lib/
    api.ts
    nav.ts
    permissions.ts
    types.ts
    utils.ts
  services/
    api.ts
    authService.ts
    farmService.ts
  .gitignore
  components.json
  next-env.d.ts
  next.config.mjs
  package.json
  postcss.config.mjs
  tsconfig.json
  tsconfig.tsbuildinfo
.gitignore
create_admin.py
package.json
quick_test.sh
README.md
requirements.txt
seed_db.py
test_batch.py
test_batch2.py
test_list_batches.py
````

# Files

## File: app/core/__init__.py
````python

````

## File: app/core/ai_client.py
````python
import json
import logging
from typing import Optional, Any
from google import genai
from google.genai import types
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = "AI chỉ đưa gợi ý tham khảo, cần chuyên gia nông nghiệp kiểm chứng."


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
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
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
            model=settings.GEMINI_MODEL,
            contents=_bounded_prompt(user_prompt),
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
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
````

## File: app/core/config.py
````python
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
````

## File: app/core/database.py
````python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite lưu vào 1 file duy nhất trong thư mục dự án -> dễ nộp bài, dễ demo trên máy khác
SQLALCHEMY_DATABASE_URL = "sqlite:///./farm.db"

# check_same_thread=False: SQLite mặc định chỉ cho 1 thread dùng chung 1 connection.
# FastAPI xử lý mỗi request trên 1 thread khác nhau -> bắt buộc phải tắt giới hạn này.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# SessionLocal là "nhà máy" tạo ra 1 phiên làm việc (session) với DB mỗi khi có request.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base là lớp cha mà MỌI model (bảng) trong app phải kế thừa.
Base = declarative_base()


def ensure_legacy_schema():
    """Bổ sung các cột mới cho SQLite hiện có mà không làm mất dữ liệu."""
    with engine.begin() as connection:
        columns = connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        column_names = {row[1] for row in columns}
        if columns and "employee_code" not in column_names:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN employee_code VARCHAR(50)"
            )
        supply_columns = connection.exec_driver_sql("PRAGMA table_info(supplies)").fetchall()
        supply_column_names = {row[1] for row in supply_columns}
        additions = {
            "code": "VARCHAR(50)",
            "category": "VARCHAR(50)",
            "min_threshold": "FLOAT NOT NULL DEFAULT 0",
            "location": "VARCHAR(150)",
            "status": "VARCHAR(30) NOT NULL DEFAULT 'active'",
        }
        for name, sql_type in additions.items():
            if supply_columns and name not in supply_column_names:
                connection.exec_driver_sql(f"ALTER TABLE supplies ADD COLUMN {name} {sql_type}")

        usage_columns = connection.exec_driver_sql("PRAGMA table_info(supply_usage)").fetchall()
        usage_column_names = {row[1] for row in usage_columns}
        for name, sql_type in {
            "used_at": "DATETIME",
            "notes": "VARCHAR(255)",
        }.items():
            if usage_columns and name not in usage_column_names:
                connection.exec_driver_sql(f"ALTER TABLE supply_usage ADD COLUMN {name} {sql_type}")


def get_db():
    """
    Dependency Injection của FastAPI
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
````

## File: app/core/deps.py
````python
# File: app/core/deps.py

from typing import List, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt

from app.core.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ADMIN_ROLES = {"admin", "administrator", "quan_tri_vien"}

def _to_clean_str(val: Any) -> str:
    """Hàm bóc tách chuỗi an toàn từ String hoặc Enum (UserRole.ADMIN -> 'admin')"""
    if hasattr(val, "value"):
        return str(val.value).strip().lower()
    return str(val).strip().lower()


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token đã hết hạn, vui lòng đăng nhập lại",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise credentials_exception


class RequireRole:
    def __init__(self, allowed_roles: List[Any]):
        # Tự động chuyển đổi cả Enum lẫn String về chữ thường
        self.allowed_roles = [_to_clean_str(r) for r in allowed_roles]

    def __call__(self, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        user_roles = current_user.get("roles", [])

        user_active_roles: set = set()

        if user_role:
            if isinstance(user_role, list):
                for r in user_role:
                    user_active_roles.add(_to_clean_str(r))
            else:
                user_active_roles.add(_to_clean_str(user_role))

        if user_roles and isinstance(user_roles, list):
            for r in user_roles:
                user_active_roles.add(_to_clean_str(r))

        # 1. ADMIN LUÔN CÓ FULL QUYỀN
        if any(admin_role in user_active_roles for admin_role in ADMIN_ROLES):
            return current_user

        # 2. KIỂM TRA ROLE HỢP LỆ (Bao gồm Cả Kỹ thuật viên / Staff / Manager)
        if not any(r in self.allowed_roles for r in user_active_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản không có quyền thực hiện thao tác này"
            )

        return current_user


require_roles = RequireRole

# Khai báo dependency dùng chung
require_admin = RequireRole(["ADMIN"])
require_staff = RequireRole(["ADMIN", "TECHNICIAN", "STAFF", "MANAGER", "KY_THUAT_VIEN", "KỸ THUẬT VIÊN"])
````

## File: app/core/permissions.py
````python
# File: app/core/permissions.py

from typing import List, Dict, Any
from fastapi import Depends, HTTPException, status
from app.core.deps import get_current_user

# 1. Danh sách Role ADMIN (Luôn được Bypass tự động, không bao giờ bị chặn 403)
ADMIN_ROLES = {"admin", "administrator", "quan_tri_vien"}


def _clean_role(val: Any) -> str:
    """Chuẩn hóa Enum hoặc Chuỗi về chữ thường (loại bỏ lỗi hoa/thường)."""
    if hasattr(val, "value"):
        return str(val.value).strip().lower()
    return str(val).strip().lower()


# ==============================================================================
# 2. MA TRẬN PHÂN QUYỀN TẬP TRUNG (PERMISSIONS MATRIX)
# *** KHI CẦN SỬA MẤT QUYỀN HOẶC ĐỔI QUYỀN, BẠN CHỈ SỬA DUY NHẤT BẢNG NÀY ***
# ==============================================================================
PERMISSIONS_MATRIX: Dict[str, List[str]] = {
    # --- 1. LÔ TRỒNG (Crop Batches) ---
    "batches:read":   ["admin", "technician", "staff"],
    "batches:create": ["admin", "technician"],
    "batches:update": ["admin", "technician"],
    "batches:delete": ["admin", "technician"],

    # --- 2. LÔ ĐẤT (Plots) ---
    "plots:read":     ["admin", "technician", "staff"],
    "plots:create":   ["admin", "technician"],
    "plots:update":   ["admin", "technician"],
    "plots:delete":   ["admin", "technician"],

    # --- 3. GIỐNG CÂY (Plant Varieties) ---
    "varieties:read":   ["admin", "technician", "staff"],
    "varieties:create": ["admin", "technician"],
    "varieties:update": ["admin", "technician"],
    "varieties:delete": ["admin", "technician"],

    # --- 4. NHẬT KÝ CHĂM SÓC (Care Logs) ---
    "care_logs:read":   ["admin", "technician", "staff"],
    "care_logs:create": ["admin", "technician", "staff"],
    "care_logs:update": ["admin", "technician", "staff"],
    "care_logs:delete": ["admin", "technician"],

    # --- 5. KHO VẬT TƯ (Supplies) ---
    "supplies:read":   ["admin", "technician", "staff"],
    "supplies:create": ["admin", "technician"],
    "supplies:update": ["admin", "technician"],
    "supplies:delete": ["admin", "technician"],

    # --- 6. THU HOẠCH (Harvests) ---
    "harvests:read":   ["admin", "technician", "staff"],
    "harvests:create": ["admin", "technician"],
    "harvests:update": ["admin", "technician"],
    "harvests:delete": ["admin", "technician"],

    # --- 7. QUẢN LÝ TÀI KHOẢN (Users - Chỉ Admin) ---
    "users:read":   ["admin"],
    "users:create": ["admin"],
    "users:update": ["admin"],
    "users:delete": ["admin"],
}


# ==============================================================================
# 3. HÀM KIỂM TRA QUYỀN TRUNG TÂM
# ==============================================================================
def require_permission(permission_key: str):
    """Dependency kiểm tra quyền theo key trong Ma trận phân quyền."""
    def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        user_roles = current_user.get("roles", [])

        user_active_roles: set = set()

        if user_role:
            if isinstance(user_role, list):
                for r in user_role:
                    user_active_roles.add(_clean_role(r))
            else:
                user_active_roles.add(_clean_role(user_role))

        if user_roles and isinstance(user_roles, list):
            for r in user_roles:
                user_active_roles.add(_clean_role(r))

        # 1. BẢO HIỂM ADMIN: Admin luôn có Full quyền tuyệt đối (Bypass mọi kiểm tra)
        if any(admin_role in user_active_roles for admin_role in ADMIN_ROLES):
            return current_user

        # 2. Tra cứu danh sách Role được phép trong Ma trận
        allowed_roles = PERMISSIONS_MATRIX.get(permission_key, [])
        allowed_roles_clean = [_clean_role(r) for r in allowed_roles]

        # 3. Đánh giá quyền
        if not any(r in allowed_roles_clean for r in user_active_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản không có quyền thực hiện thao tác '{permission_key}'"
            )

        return current_user

    return permission_checker
````

## File: app/core/security.py
````python
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict

import jwt
from passlib.context import CryptContext

# 1. Cấu hình Secret Key & Thuật toán mã hóa từ Environment
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))  # Mặc định 24 giờ

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
````

## File: app/models/__init__.py
````python
from app.models.plot import Plot
from app.core.database import Base
from app.models.user import User, UserRole
from app.models.plant_variety import PlantVariety
from app.models.crop_batch import CropBatch
from app.models.harvest import HarvestLog
from app.models.sale import Sale
from app.models.care_log import CareLog
from app.models.supply import Supply, SupplyImport
from app.models.supply_usage import SupplyUsage
__all__ = [
    "Base", "User", "PlantVariety", "Plot", "CropBatch", 
    "HarvestLog", "Sale", "Supply", "SupplyImport", "SupplyUsage"
]
````

## File: app/models/ai_suggestion.py
````python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.database import Base


class AiSuggestion(Base):
    __tablename__ = "ai_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    suggestion_type = Column(String, nullable=False)  # schedule | summary | alert
    batch_id = Column(Integer, ForeignKey("crop_batches.id"), nullable=True)
    input_data = Column(Text, nullable=True)
    output_text = Column(Text, nullable=True)
    disclaimer = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
````

## File: app/models/care_log.py
````python
from sqlalchemy import Column, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
from sqlalchemy.orm import relationship
class CareLog(Base):
    __tablename__ = "care_logs"

    id = Column(Integer, primary_key=True, index=True)
    crop_batch_id = Column(Integer, ForeignKey("crop_batches.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("crop_batches.id"), nullable=False)
    action_type = Column(String(100), nullable=False)  # Ví dụ: Tưới nước, Bón phân...
    log_date = Column(String(50), nullable=True)  
    description = Column(Text, nullable=True)    
    notes = Column(Text, nullable=True)                
    image_url = Column(String(500), nullable=True)      
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    quantity = Column(Float, nullable=True, default=0.0)
    image_url = Column(String, nullable=True)
    crop_batch = relationship(
        "CropBatch", 
        back_populates="care_logs",
        foreign_keys=[crop_batch_id]
    )
````

## File: app/models/crop_batch.py
````python
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CropBatch(Base):
    __tablename__ = "crop_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=False)
    variety_id = Column(Integer, ForeignKey("plant_varieties.id"), nullable=False)
    sow_date = Column(Date, nullable=True)
    expected_harvest_date = Column(Date, nullable=True)
    quantity = Column(Float, default=0.0)
    status = Column(String(50), default="Đang trồng")

    harvest_logs = relationship("HarvestLog", back_populates="crop_batch")
    care_logs = relationship(
        "CareLog", 
        back_populates="crop_batch",
        foreign_keys="[CareLog.crop_batch_id]" 
    )
````

## File: app/models/harvest.py
````python
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class HarvestLog(Base):
    __tablename__ = "harvest_logs"
    qr_trace_code = Column(String(100), unique=True, index=True, nullable=True)
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(
        Integer,
        ForeignKey("crop_batches.id", ondelete="CASCADE"),
        nullable=False,
    )
    harvest_time = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Chuẩn hóa: Tách riêng số và đơn vị tính
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="kg", nullable=False)
    grade = Column(String, default="loai_1")
    notes = Column(String, nullable=True)

    # Quan hệ với bảng CropBatch (Chỉ giữ lại 1 relationship duy nhất)
    crop_batch = relationship("CropBatch", back_populates="harvest_logs")
````

## File: app/models/notification.py
````python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    # Liên kết với user nhận thông báo (để trống nếu là thông báo chung cho toàn trang trại)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    
    type = Column(String(50))      # Ví dụ: "ai_warning", "warning", "info"
    title = Column(String(255))    # Tiêu đề thông báo
    message = Column(Text)         # Nội dung chi tiết (có thể dài)
    is_read = Column(Boolean, default=False) # Trạng thái chưa đọc (False)
    
    # Tự động lấy thời gian hiện tại khi tạo thông báo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
````

## File: app/models/plant_variety.py
````python
from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base

class PlantVariety(Base):
    __tablename__ = "plant_varieties"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(150), nullable=False)
    category = Column(String(100), nullable=True)
    growth_days = Column(Integer, nullable=True)
    stock_quantity = Column(Float, default=0.0, nullable=True)
    unit = Column(String(50), default="kg", nullable=True)
    stock_quantity = Column(Float, default=0.0)

    def __repr__(self):
        return f"<PlantVariety id={self.id} name='{self.name}'>"
````

## File: app/models/plot.py
````python
from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base

class Plot(Base):
    __tablename__ = "plots"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    area = Column(Float, nullable=False)
    soil_type = Column(String, default="Đất thịt")  # Quản lý loại đất
    location = Column(String, nullable=True)
    status = Column(String, default="Đang nghỉ")    # Đang nghỉ / Đang canh tác / Trống
    description = Column(String, nullable=True)
````

## File: app/models/sale.py
````python
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    # Sửa "harvests.id" thành "harvest_logs.id" cho khớp với tên bảng trong file harvest.py
    harvest_id = Column(Integer, ForeignKey("harvest_logs.id", ondelete="CASCADE"), nullable=False)
    
    customer_name = Column(String, nullable=True)
    quantity_kg = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    sale_date = Column(Date, nullable=False)
````

## File: app/models/supply_usage.py
````python
from sqlalchemy import Column, DateTime, Integer, Float, ForeignKey, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SupplyUsage(Base):
    __tablename__ = "supply_usage"

    id = Column(Integer, primary_key=True, index=True)
    care_log_id = Column(Integer, ForeignKey("care_logs.id"), nullable=False)
    supply_id = Column(Integer, ForeignKey("supplies.id"), nullable=False)
    quantity_used = Column(Float, nullable=False)
    used_at = Column(DateTime, nullable=False, server_default=func.now())
    notes = Column(String(255), nullable=True)
    supply = relationship("Supply", back_populates="usages")
````

## File: app/models/supply.py
````python
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Supply(Base):
    __tablename__ = "supplies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    category = Column(String(50), nullable=True)
    type = Column(String, nullable=True)   # phan_bon | thuoc_bvtv | giong | khac
    unit = Column(String, nullable=False)  # kg, lit, goi...
    stock_quantity = Column(Float, nullable=False, default=0)
    min_threshold = Column(Float, nullable=False, default=0)
    location = Column(String(150), nullable=True)
    status = Column(String(30), nullable=False, default="active")

    imports = relationship("SupplyImport", back_populates="supply", cascade="all, delete-orphan")
    usages = relationship("SupplyUsage", back_populates="supply")

    @property
    def quantity(self) -> float:
        return self.stock_quantity


class SupplyImport(Base):
    __tablename__ = "supply_imports"

    id = Column(Integer, primary_key=True, index=True)
    supply_id = Column(Integer, ForeignKey("supplies.id", ondelete="CASCADE"), nullable=False)
    quantity_imported = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False, default=0)
    supplier_name = Column(String(150), nullable=True)
    batch_number = Column(String(100), nullable=True)
    manufacture_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    imported_at = Column(DateTime, nullable=False, server_default=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    supply = relationship("Supply", back_populates="imports")
````

## File: app/models/user.py
````python
import enum
from sqlalchemy import Column, Integer, String, Enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    TECHNICIAN = "technician"
    STAFF = "staff"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.STAFF, nullable=False) # Thêm cột role
````

## File: app/repositories/__init__.py
````python

````

## File: app/repositories/ai_suggestion.py
````python
from sqlalchemy.orm import Session
from app.models.ai_suggestion import AiSuggestion


def create(db: Session, suggestion_type: str, batch_id, input_data: str,
           output_text: str, disclaimer: str, created_at) -> AiSuggestion:
    db_obj = AiSuggestion(
        suggestion_type=suggestion_type, batch_id=batch_id, input_data=input_data,
        output_text=output_text, disclaimer=disclaimer, created_at=created_at,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_by_batch(db: Session, batch_id: int):
    return db.query(AiSuggestion).filter(AiSuggestion.batch_id == batch_id).order_by(AiSuggestion.created_at.desc()).all()
````

## File: app/repositories/care_log.py
````python
from typing import Optional, Union
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.care_log import CareLog
from app.schemas.care_log import CareLogCreate

def get_all(db: Session, batch_id: Optional[int] = None):
    query = db.query(CareLog)
    if batch_id:
        query = query.filter(
            or_(CareLog.batch_id == batch_id, CareLog.crop_batch_id == batch_id)
        )
    return query.order_by(CareLog.id.desc()).all()


def get_by_batch(db: Session, batch_id: int):
    return (
        db.query(CareLog)
        .filter(or_(CareLog.batch_id == batch_id, CareLog.crop_batch_id == batch_id))
        .order_by(CareLog.id.asc())
        .all()
    )

def create(db: Session, data: Union[CareLogCreate, dict]):
    if isinstance(data, dict):
        log_data = data.copy()
    else:
        log_data = data.model_dump()

    # Bộ lọc an toàn: Chỉ lấy đúng cột có trong bảng DB
    valid_columns = {col.name for col in CareLog.__table__.columns}
    filtered_data = {k: v for k, v in log_data.items() if k in valid_columns}

    db_log = CareLog(**filtered_data)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
````

## File: app/repositories/crop_batch.py
````python
from typing import Optional, Union
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.crop_batch import CropBatch
from app.schemas.crop_batch import CropBatchCreate


def count_batches(db: Session) -> int:
    """Đếm tổng số lô trồng trong CSDL"""
    return db.query(CropBatch).count()


def get_by_id(db: Session, batch_id: int) -> Optional[CropBatch]:
    return db.query(CropBatch).filter(CropBatch.id == batch_id).first()


def get_by_code(db: Session, batch_code: str) -> Optional[CropBatch]:
    return db.query(CropBatch).filter(CropBatch.batch_code == batch_code).first()


def get_growing_batches(db: Session):
    growing_statuses = ["growing", "planting", "đang trồng", "đang canh tác"]
    return (
        db.query(CropBatch)
        .filter(or_(*[CropBatch.status.ilike(status) for status in growing_statuses]))
        .order_by(CropBatch.id.asc())
        .all()
    )


def create(db: Session, data: Union[CropBatchCreate, dict]):
    if isinstance(data, dict):
        batch_data = data.copy()
    else:
        batch_data = data.model_dump()

    # 1. Chuyển đổi 'batch_name' sang 'name' nếu Model dùng tên 'name'
    if "batch_name" in batch_data and not hasattr(CropBatch, "batch_name"):
        batch_data["name"] = batch_data.pop("batch_name")

    # 2. BỘ LỌC AN TOÀN: Chỉ giữ lại các trường thực sự có trong bảng CropBatch
    valid_columns = {col.name for col in CropBatch.__table__.columns}
    filtered_data = {k: v for k, v in batch_data.items() if k in valid_columns}

    db_batch = CropBatch(**filtered_data)
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


def update(db: Session, db_batch: CropBatch, update_data: dict) -> CropBatch:
    # Chuyển đổi batch_name nếu cột trong DB tên là name
    if "batch_name" in update_data and not hasattr(CropBatch, "batch_name"):
        update_data["name"] = update_data.pop("batch_name")

    valid_columns = {col.name for col in CropBatch.__table__.columns}

    for key, value in update_data.items():
        if key in valid_columns and value is not None:
            setattr(db_batch, key, value)

    db.commit()
    db.refresh(db_batch)
    return db_batch


def delete(db: Session, db_batch: CropBatch) -> None:
    db.delete(db_batch)
    db.commit()
````

## File: app/repositories/harvest.py
````python
from sqlalchemy.orm import Session
from app.models.harvest import HarvestLog
from app.schemas.harvest import HarvestCreate

def get_all(db: Session):
    return db.query(HarvestLog).all()

def get_by_id(db: Session, harvest_id: int):
    return db.query(HarvestLog).filter(HarvestLog.id == harvest_id).first()

def get_by_batch(db: Session, batch_id: int):
    return db.query(HarvestLog).filter(HarvestLog.batch_id == batch_id).all()

def create(db: Session, harvest: HarvestCreate):
    db_obj = HarvestLog(
        batch_id=harvest.batch_id,
        quantity=harvest.quantity,
        grade=harvest.grade,
        notes=harvest.notes,
        harvest_time=harvest.harvest_time
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
````

## File: app/repositories/plant_variety.py
````python
from sqlalchemy.orm import Session
from app.models.plant_variety import PlantVariety
from app.schemas.plant_variety import PlantVarietyCreate, PlantVarietyUpdate


def get_all(db: Session):
    return db.query(PlantVariety).all()


def get_by_id(db: Session, variety_id: int):
    return db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()


def create(db: Session, data: PlantVarietyCreate) -> PlantVariety:
    # **data.model_dump() "bung" các trường của schema thành tham số của Model
    db_obj = PlantVariety(**data.model_dump())
    db.add(db_obj)       # đưa object vào "hàng đợi" thay đổi
    db.commit()          # ghi thật xuống file farm.db
    db.refresh(db_obj)   # đọc lại để lấy id vừa được CSDL tự sinh
    return db_obj


def update(db: Session, db_obj: PlantVariety, data: PlantVarietyUpdate) -> PlantVariety:
    # exclude_unset=True: chỉ lấy những trường client thực sự gửi lên,
    # tránh việc ghi đè các trường khác thành None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, db_obj: PlantVariety) -> None:
    db.delete(db_obj)
    db.commit()
````

## File: app/repositories/plot.py
````python
from sqlalchemy.orm import Session
from app.models.plot import Plot
from app.schemas.plot import PlotCreate, PlotUpdate


def get_all(db: Session):
    return db.query(Plot).all()


def get_by_id(db: Session, plot_id: int):
    return db.query(Plot).filter(Plot.id == plot_id).first()


def create(db: Session, data: PlotCreate):
    plot_data = data.model_dump()

    # 1. Chuyển đổi area_m2 sang area nếu có
    if "area_m2" in plot_data:
        plot_data["area"] = plot_data.pop("area_m2")

    # 2. BỘ LỌC AN TOÀN: Chỉ lấy những trường THỰC SỰ CÓ trong bảng Plot
    valid_columns = {col.name for col in Plot.__table__.columns}
    filtered_data = {k: v for k, v in plot_data.items() if k in valid_columns}

    db_obj = Plot(**filtered_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update(db: Session, db_obj: Plot, data: PlotUpdate) -> Plot:
    update_data = data.model_dump(exclude_unset=True)

    if "area_m2" in update_data:
        update_data["area"] = update_data.pop("area_m2")

    valid_columns = {col.name for col in Plot.__table__.columns}
    
    for field, value in update_data.items():
        if field in valid_columns:
            setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, plot_id: int):
    db_obj = db.query(Plot).filter(Plot.id == plot_id).first()
    
    if db_obj:
        db.delete(db_obj)
        db.commit()
        # Đã XÓA db.refresh(db_obj) ở đây để tránh crash
        return db_obj
    return None
````

## File: app/repositories/sale.py
````python
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.sale import Sale


def get_by_harvest(db: Session, harvest_id: int):
    return db.query(Sale).filter(Sale.harvest_id == harvest_id).order_by(Sale.sale_date).all()


def sum_sold_quantity(db: Session, harvest_id: int) -> float:
    total = db.query(func.sum(Sale.quantity_kg)).filter(Sale.harvest_id == harvest_id).scalar()
    return total or 0.0


def create(db: Session, harvest_id, customer_name, quantity_kg, unit_price, sale_date) -> Sale:
    db_obj = Sale(
        harvest_id=harvest_id, customer_name=customer_name, quantity_kg=quantity_kg,
        unit_price=unit_price, sale_date=sale_date,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
````

## File: app/repositories/supply.py
````python
from sqlalchemy.orm import Session
from app.models.supply import Supply, SupplyImport
from app.schemas.supply import SupplyCreate, SupplyImportCreate, SupplyUpdate


def get_all(db: Session, category: str | None = None, search: str | None = None, low_stock: bool = False):
    query = db.query(Supply)
    if category:
        query = query.filter((Supply.category == category) | (Supply.type == category))
    if search:
        query = query.filter(Supply.name.ilike(f"%{search}%"))
    if low_stock:
        query = query.filter(Supply.stock_quantity <= Supply.min_threshold)
    return query.order_by(Supply.name.asc()).all()


def get_by_id(db: Session, supply_id: int):
    return db.query(Supply).filter(Supply.id == supply_id).first()


def create(db: Session, data: SupplyCreate) -> Supply:
    values = data.model_dump()
    values["type"] = values.pop("category")
    db_obj = Supply(**values)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update(db: Session, db_obj: Supply, data: SupplyUpdate) -> Supply:
    values = data.model_dump(exclude_unset=True)
    if "category" in values:
        values["type"] = values.pop("category")
    for field, value in values.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def adjust_stock(db: Session, db_obj: Supply, delta: float) -> Supply:
    # delta âm = trừ kho (khi dùng vật tư), delta dương = nhập thêm kho
    db_obj.stock_quantity = db_obj.stock_quantity + delta
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, db_obj: Supply) -> None:
    db.delete(db_obj)
    db.commit()


def create_import(db: Session, supply: Supply, data: SupplyImportCreate, user_id: int | None = None):
    if data.expiry_date and data.manufacture_date and data.expiry_date < data.manufacture_date:
        raise ValueError("Hạn sử dụng không được trước ngày sản xuất.")
    supply.stock_quantity += data.quantity_imported
    record = SupplyImport(
        supply_id=supply.id,
        created_by_user_id=user_id,
        **data.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
````

## File: app/repositories/user.py
````python
from sqlalchemy.orm import Session
from app.models.user import User


def get_all(db: Session):
    return db.query(User).all()


def get_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def create(db: Session, username: str, password_hash: str, full_name: str, role: str) -> User:
    db_obj = User(username=username, password_hash=password_hash, full_name=full_name, role=role)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, db_obj: User) -> None:
    db.delete(db_obj)
    db.commit()
````

## File: app/routers/__init__.py
````python

````

## File: app/routers/ai_advisor.py
````python
from typing import Optional, Union
from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.ai_client import call_gemini, DISCLAIMER_TEXT
from app.models.user import UserRole
from app.models.crop_batch import CropBatch
from app.models.care_log import CareLog

router = APIRouter(
    prefix="/api/v1/ai-advisor",
    tags=["AI Advisor"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN, UserRole.ADMIN, UserRole.MANAGER]))]
)

class ChatRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    batch_id: Optional[Union[int, str]] = None  # Chấp nhận cả int, string hoặc null

    @field_validator("batch_id", mode="before")
    @classmethod
    def sanitize_batch_id(cls, v):
        """Tự động chuyển chuỗi rỗng "" hoặc "1" về int/None để tránh lỗi 422"""
        if v == "" or v is None:
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

def build_system_context(db: Session, batch_id: Optional[int] = None) -> str:
    """Truy vấn CSDL để lấy bối cảnh dữ liệu thực tế của trang trại."""
    context_lines = ["Dưới đây là thông tin thực tế từ hệ thống quản lý trang trại:"]

    if batch_id:
        batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
        if batch:
            batch_name = getattr(batch, "name", f"Lô {batch.id}")
            planting_date = getattr(batch, "planting_date", "Chưa rõ")
            context_lines.append(
                f"- Lô đang chọn: ID {batch.id}, Tên/Mã lô: {batch_name}, Ngày gieo: {planting_date}"
            )

            # Xác định cột sắp xếp an toàn cho CareLog
            if hasattr(CareLog, "batch_id"):
                order_col = getattr(
                    CareLog, "log_date", 
                    getattr(CareLog, "logged_at", getattr(CareLog, "created_at", CareLog.id))
                )
                logs = (
                    db.query(CareLog)
                    .filter(CareLog.batch_id == batch_id)
                    .order_by(order_col.desc())
                    .limit(3)
                    .all()
                )
                if logs:
                    context_lines.append("  + Hoạt động chăm sóc gần đây:")
                    for log in logs:
                        log_date = getattr(
                            log, "log_date",
                            getattr(log, "logged_at", getattr(log, "created_at", "N/A"))
                        )
                        action = getattr(log, "action_type", "Chăm sóc")
                        notes = getattr(log, "notes", "")
                        context_lines.append(f"    * Ngày {log_date}: {action} - {notes}")
    else:
        batches = db.query(CropBatch).all()
        if batches:
            context_lines.append("- Danh sách các lô hiện có trong hệ thống:")
            for b in batches[:10]:
                b_name = getattr(b, "name", f"Lô {b.id}")
                b_status = getattr(b, "status", "Đang hoạt động")
                context_lines.append(f"  + {b_name} (ID: {b.id}): Trạng thái {b_status}")
        else:
            context_lines.append("- Hiện chưa có dữ liệu lô trồng trong hệ thống.")

    return "\n".join(context_lines)

@router.post("/chat")
def chat_with_advisor(payload: ChatRequest, db: Session = Depends(get_db)):
    user_prompt = payload.message or payload.prompt or ""

    if not user_prompt.strip():
        return {
            "reply": "Vui lòng nhập câu hỏi.",
            "response": "Vui lòng nhập câu hỏi.",
            "disclaimer": DISCLAIMER_TEXT
        }

    # 1. Trích xuất dữ liệu từ Database làm ngữ cảnh
    db_context = build_system_context(db, batch_id=payload.batch_id)

    # 2. Ghép dữ liệu CSDL vào System Prompt
    system_prompt = (
        "Bạn là chuyên gia cố vấn nông nghiệp thông minh của trang trại GreenFarm.\n"
        "Hãy dựa vào dữ liệu hệ thống được cung cấp dưới đây để trả lời chính xác câu hỏi của người dùng.\n"
        "Nếu người dùng hỏi về lô cây cụ thể, hãy kiểm tra danh sách bên dưới trước khi trả lời.\n\n"
        f"{db_context}"
    )

    # 3. Gửi sang Gemini
    ai_reply = call_gemini(
        system_prompt=system_prompt,
        user_prompt=user_prompt
    )

    return {
        "reply": ai_reply,
        "response": ai_reply,
        "disclaimer": DISCLAIMER_TEXT
    }
````

## File: app/routers/ai_alert.py
````python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import UserRole
from app.schemas.ai_alert import AiAlertOut
from app.services import ai_alert as service

router = APIRouter(
    prefix="/api/ai-alert",
    tags=["AI Alert"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN]))] # 👈 THÊM DÒNG NÀY
)

@router.post("/alerts", response_model=AiAlertOut)
def suggest_batches_to_check(db: Session = Depends(get_db)):
    """
    Xếp hạng tối đa 5 lô đang trồng cần kiểm tra ưu tiên nhất, dựa trên
    2 chỉ số khách quan: số ngày chưa chăm sóc + có cảnh báo sâu bệnh gần đây.
    """
    return service.suggest_batches_to_check(db)
````

## File: app/routers/ai_schedule.py
````python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import UserRole
from app.schemas.ai_schedule import AiScheduleOut
from app.services import ai_schedule as service

router = APIRouter(
    prefix="/api/ai-schedule", # Hoặc prefix tương ứng của bạn
    tags=["AI Schedule"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN]))]
)


@router.post("/batches/{batch_id}/schedule", response_model=AiScheduleOut)
def generate_schedule(batch_id: int, db: Session = Depends(get_db)):
    """
    Sinh lịch chăm sóc tham khảo cho 1 lô trồng, dựa trên giống cây + ngày gieo.
    Ngày thực tế của từng mốc do backend tự tính (không tin AI tính ngày).
    """
    return service.generate_schedule(db, batch_id)
````

## File: app/routers/ai_summary.py
````python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.schemas.ai_summary import AiSummaryOut
from app.services import ai_summary as service
from app.models.user import UserRole
router = APIRouter(prefix="/api/ai", tags=["AI - Tóm tắt nhật ký"])

router = APIRouter(
    prefix="/api/ai-summary",
    tags=["AI Summary"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN]))] # 👈 THÊM DÒNG NÀY
)
@router.post("/batches/{batch_id}/summary", response_model=AiSummaryOut)
def summarize_batch(batch_id: int, db: Session = Depends(get_db)):
    """
    Sinh tóm tắt tham khảo cho nhật ký chăm sóc của 1 lô trồng.
    Luôn trả kèm disclaimer bắt buộc theo yêu cầu đề bài.
    """
    return service.summarize_batch(db, batch_id)
````

## File: app/routers/auth.py
````python
import re
import unicodedata
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user, RequireRole
from app.models.user import User, UserRole

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterSchema(BaseModel):
    employee_code: Optional[str] = Field(None, min_length=2, max_length=50)
    username: Optional[str] = Field(None, min_length=3, max_length=150)
    full_name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = UserRole.STAFF  # Mặc định tạo tài khoản Nhân viên


def _username_from_full_name(full_name: str) -> str:
    normalized = unicodedata.normalize("NFKD", full_name).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-zA-Z0-9]+", "", normalized).lower()


def _next_employee_code(db: Session, role: UserRole) -> str:
    prefix = {
        UserRole.STAFF: "NV",
        UserRole.TECHNICIAN: "KT",
        UserRole.ADMIN: "QT",
    }.get(role)
    if prefix is None:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ vai trò Nhân viên, Kỹ thuật viên hoặc Quản trị viên.")

    existing_codes = db.query(User.employee_code).filter(User.employee_code.like(f"{prefix}-%")).all()
    numbers = []
    for (code,) in existing_codes:
        try:
            numbers.append(int(str(code).split("-")[-1]))
        except (TypeError, ValueError):
            continue
    return f"{prefix}-{max(numbers, default=0) + 1:04d}"


# 1. API ĐĂNG NHẬP (Trả về Token + Object user có chứa role)
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    login_value = form_data.username.strip()
    user = db.query(User).filter(
        or_(
            User.email == login_value,
            User.username == login_value,
            User.employee_code == login_value,
        )
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Lấy giá trị chuỗi của Role (MANAGER / STAFF / TECHNICIAN)
    user_role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)

    # Đóng gói Token
    token = create_access_token({"sub": user.email, "role": user_role_str})

    # TRẢ VỀ ĐẦY ĐỦ THÔNG TIN USER CHO FRONTEND STORE
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "employee_code": user.employee_code,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user_role_str  # Frontend dựa vào đây để phân quyền UI
        }
    }


# 2. API TẠO TÀI KHOẢN MỚI (Chỉ Quản lý MANAGER mới có quyền)
@router.post(
    "/register", 
    status_code=status.HTTP_201_CREATED, 
    dependencies=[Depends(RequireRole([UserRole.MANAGER, UserRole.ADMIN]))]
)
def register(payload: RegisterSchema, db: Session = Depends(get_db)):
    if payload.role == UserRole.MANAGER:
        raise HTTPException(status_code=400, detail="Không thể tạo thêm vai trò Quản lý từ màn hình này.")

    employee_code = payload.employee_code or _next_employee_code(db, payload.role)
    username = payload.full_name.strip()
    if db.query(User).filter(
        or_(
            User.email == payload.email,
            User.username == username,
            User.employee_code == employee_code,
        )
    ).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email, tên đăng nhập hoặc mã nhân viên đã được sử dụng."
        )

    new_user = User(
        employee_code=employee_code,
        username=username,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Tạo tài khoản thành công",
        "user_id": new_user.id
    }


# 3. API LẤY THÔNG TIN USER HIỆN TẠI
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    user_role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    
    return {
        "id": current_user.id,
        "employee_code": current_user.employee_code,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": user_role_str
    }


@router.get(
    "/users",
    dependencies=[Depends(RequireRole([UserRole.MANAGER, UserRole.ADMIN]))],
)
def list_users(db: Session = Depends(get_db)):
    """Danh sách tài khoản để quản lý/admin theo dõi và quản lý nhân sự."""
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": user.id,
            "employee_code": user.employee_code,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        }
        for user in users
    ]
````

## File: app/routers/care_log.py
````python
import os
from datetime import datetime, date
from typing import List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.care_log import CareLog
from app.models.notification import Notification

# Import client AI tập trung
try:
    from app.core.ai_client import call_gemini
except ImportError:
    call_gemini = None

router = APIRouter(tags=["Care Logs & AI Assistant"])

AI_DISCLAIMER = "Lưu ý: Kết quả do AI sinh ra chỉ mang tính chất tham khảo. Cần có chuyên gia nông nghiệp kiểm chứng trước khi áp dụng."

# ==================== PYDANTIC SCHEMAS ====================

class CareLogSupplyUsage(BaseModel):
    supply_id: int
    quantity_used: float = Field(..., gt=0)
    notes: Optional[str] = None

class CareLogCreate(BaseModel):
    batch_id: Union[int, str]
    log_date: Optional[date] = None
    action_type: Optional[str] = None
    activity_type: Optional[str] = None  # Compatibility
    notes: Optional[str] = None
    description: Optional[str] = None    # Compatibility
    quantity: Optional[float] = None
    image_url: Optional[str] = None
    supply_usages: List[CareLogSupplyUsage] = Field(default_factory=list)

class CareLogResponse(BaseModel):
    id: int
    batch_id: int
    log_date: date
    action_type: str
    notes: Optional[str] = None
    quantity: Optional[float] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AISummaryResponse(BaseModel):
    batch_id: int
    summary: str
    recommendation: str
    disclaimer: str = AI_DISCLAIMER


# ==================== HELPER FUNCTIONS ====================

def parse_date_obj(val: Any) -> date:
    """Ép kiểu dữ liệu ngày tháng an toàn về Python date object."""
    if not val:
        return date.today()
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        clean_str = val.split("T")[0].split(" ")[0]
        try:
            return datetime.strptime(clean_str, "%Y-%m-%d").date()
        except ValueError:
            return date.today()
    return date.today()


def normalize_care_log(log: Any) -> CareLogResponse:
    """Chuẩn hóa dữ liệu trả về Pydantic response tránh lỗi thiếu/khác tên cột trong CSDL."""
    log_id = getattr(log, "id", 0)
    batch_id = getattr(log, "batch_id", None) or getattr(log, "crop_batch_id", None) or 0
    
    raw_date = getattr(log, "log_date", None) or getattr(log, "created_at", None)
    log_date_obj = parse_date_obj(raw_date)

    action_type = (
        getattr(log, "action_type", None) or 
        getattr(log, "activity_type", None) or 
        "Chăm sóc"
    )
    notes = getattr(log, "notes", None) or getattr(log, "description", None) or ""
    quantity = getattr(log, "quantity", None)
    image_url = getattr(log, "image_url", None)

    return CareLogResponse(
        id=log_id,
        batch_id=batch_id,
        log_date=log_date_obj,
        action_type=action_type,
        notes=notes,
        quantity=quantity,
        image_url=image_url
    )


# ==================== ENDPOINTS ====================

@router.get("", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("care_logs:read"))])
@router.get("/", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, include_in_schema=False, dependencies=[Depends(require_permission("care_logs:read"))])
def get_care_logs(
    batch_id: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    """Lấy danh sách nhật ký chăm sóc (có thể lọc theo batch_id)"""
    query = db.query(CareLog)
    if batch_id:
        if hasattr(CareLog, "batch_id") and hasattr(CareLog, "crop_batch_id"):
            from sqlalchemy import or_
            query = query.filter(or_(CareLog.batch_id == batch_id, CareLog.crop_batch_id == batch_id))
        elif hasattr(CareLog, "batch_id"):
            query = query.filter(CareLog.batch_id == batch_id)
        elif hasattr(CareLog, "crop_batch_id"):
            query = query.filter(CareLog.crop_batch_id == batch_id)

    logs = query.order_by(CareLog.log_date.desc(), CareLog.id.desc()).all()
    return [normalize_care_log(l) for l in logs]


@router.get("/{batch_id}", response_model=List[CareLogResponse], status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("care_logs:read"))])
def get_care_logs_by_batch_path(
    batch_id: int, 
    db: Session = Depends(get_db)
):
    """Lấy danh sách nhật ký theo đường dẫn /{batch_id}"""
    return get_care_logs(batch_id=batch_id, db=db)


@router.post(
    "", 
    response_model=CareLogResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("care_logs:create"))]
)
@router.post(
    "/", 
    response_model=CareLogResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("care_logs:create"))],
    include_in_schema=False
)
def create_care_log(
    log_in: CareLogCreate, 
    db: Session = Depends(get_db)
):
    """Tạo nhật ký chăm sóc mới, tự động đổi trạng thái Lô trồng sang 'Đang trồng' và bắn thông báo."""
    final_action_type = log_in.action_type or log_in.activity_type
    final_notes = log_in.notes or log_in.description or ""
    final_date_obj = parse_date_obj(log_in.log_date)

    if not final_action_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Trường action_type hoặc activity_type không được để trống."
        )

    from app.models.crop_batch import CropBatch
    from sqlalchemy import or_

    search_val = str(log_in.batch_id).strip()
    batch_filters = []
    if search_val.isdigit():
        batch_filters.append(CropBatch.id == int(search_val))
    if hasattr(CropBatch, "code"):
        batch_filters.append(CropBatch.code == search_val)
    if hasattr(CropBatch, "batch_code"):
        batch_filters.append(CropBatch.batch_code == search_val)
    if hasattr(CropBatch, "batch_id"):
        batch_filters.append(CropBatch.batch_id == search_val)

    batch = db.query(CropBatch).filter(or_(*batch_filters)).first() if batch_filters else None
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lô trồng")

    resolved_batch_id = batch.id

    # Lọc danh sách cột thực tế của bảng CareLog trong CSDL
    valid_cols = {c.name: c.type for c in CareLog.__table__.columns} if hasattr(CareLog, "__table__") else {}
    log_data = {}

    if "batch_id" in valid_cols:
        log_data["batch_id"] = resolved_batch_id
    if "crop_batch_id" in valid_cols:
        log_data["crop_batch_id"] = resolved_batch_id
    if "action_type" in valid_cols:
        log_data["action_type"] = final_action_type
    if "activity_type" in valid_cols:
        log_data["activity_type"] = final_action_type
    if "notes" in valid_cols:
        log_data["notes"] = final_notes
    if "description" in valid_cols:
        log_data["description"] = final_notes
    if "log_date" in valid_cols:
        col_type = str(valid_cols["log_date"]).upper()
        log_data["log_date"] = final_date_obj if "DATE" in col_type else str(final_date_obj)
    if "quantity" in valid_cols and log_in.quantity is not None:
        log_data["quantity"] = log_in.quantity
    if "image_url" in valid_cols and log_in.image_url is not None:
        log_data["image_url"] = log_in.image_url

    try:
        # 1. Lưu bản ghi Nhật ký chăm sóc mới
        db_log = CareLog(**log_data)
        db.add(db_log)
        db.flush()

        # Trừ kho cùng transaction với nhật ký
        if log_in.supply_usages:
            from app.services.supply import deduct_supply_stock
            for usage in log_in.supply_usages:
                deduct_supply_stock(
                    db,
                    usage.supply_id,
                    usage.quantity_used,
                    db_log.id,
                    usage.notes,
                )

        # 2. ĐỒNG BỘ TRẠNG THÁI LÔ TRỒNG
        if hasattr(batch, "status"):
            curr_status = str(batch.status or "").strip().lower()
            is_harvest = final_action_type.strip().lower() in ["thu hoạch", "thu hoach", "harvest"]
            if is_harvest:
                batch.status = "Đã thu hoạch"
                db.add(batch)
            elif curr_status in ["kế hoạch", "lên kế hoạch", "planned", "planning", "ke hoach", "draft"]:
                batch.status = "Đang trồng"
                db.add(batch)

        # 3. Kích hoạt Trigger Thông báo / Cảnh báo
        notes_lower = final_notes.lower()
        pest_keywords = ["sâu", "bệnh", "rệp", "nấm", "héo", "vàng lá", "sâu ăn lá", "bọ trĩ"]

        if final_action_type in ["Bệnh hại", "Phun thuốc", "Kiểm tra sâu bệnh"] or any(kw in notes_lower for kw in pest_keywords):
            new_alert = Notification(
                type="ai_warning",
                title="Cảnh báo khẩn: Phát hiện sâu bệnh",
                message=f"Hệ thống ghi nhận nguy cơ tại Lô {log_in.batch_id}: '{final_notes}'. Vui lòng kiểm tra và xử lý ngay.",
                is_read=False
            )
            db.add(new_alert)
        elif final_action_type == "Tưới nước":
            new_info = Notification(
                type="info",
                title="Đã cập nhật lịch tưới",
                message=f"Đã ghi nhận hoạt động tưới nước tại Lô {log_in.batch_id}. Hệ thống sẽ tiếp tục theo dõi độ ẩm.",
                is_read=False
            )
            db.add(new_info)

        db.commit()
        db.refresh(db_log)
        return normalize_care_log(db_log)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi CSDL khi tạo nhật ký chăm sóc: {str(e)}"
        )


# ==================== TÍCH HỢP AI CHỨC NĂNG 3.2 ====================

@router.post(
    "/{batch_id}/ai-summary",
    response_model=AISummaryResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("care_logs:read"))]
)
def generate_ai_care_summary(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Tóm tắt nhật ký trồng trọt và đề xuất việc cần kiểm tra bằng AI."""
    logs = db.query(CareLog).filter(
        (CareLog.batch_id == batch_id) if hasattr(CareLog, "batch_id") else (CareLog.crop_batch_id == batch_id)
    ).order_by(CareLog.log_date.asc()).all()

    if not logs:
        return AISummaryResponse(
            batch_id=batch_id,
            summary="Lô trồng hiện chưa có ghi nhận nhật ký chăm sóc nào.",
            recommendation="Cần bắt đầu cập nhật hoạt động tưới nước và theo dõi tình trạng đất hàng ngày.",
            disclaimer=AI_DISCLAIMER
        )

    logs_text_list = [
        f"- Ngày {getattr(l, 'log_date', '')}: [{getattr(l, 'action_type', '') or getattr(l, 'activity_type', '')}] {getattr(l, 'notes', '') or getattr(l, 'description', '')}"
        for l in logs
    ]
    logs_summary_str = "\n".join(logs_text_list)

    system_prompt = "Bạn là trợ lý quản lý trang trại. Chỉ đưa gợi ý tham khảo dựa trên dữ liệu trồng trọt được cung cấp."
    user_prompt = f"Lô trồng: Batch #{batch_id}.\nNhật ký chăm sóc:\n{logs_summary_str}\nHãy tóm tắt tình trạng và đề xuất việc cần kiểm tra tuần tới."

    if call_gemini:
        try:
            ai_text = call_gemini(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )
            if ai_text:
                return AISummaryResponse(
                    batch_id=batch_id,
                    summary=ai_text,
                    recommendation="Đã tóm tắt từ AI Gemini dựa trên toàn bộ lịch sử chăm sóc.",
                    disclaimer=AI_DISCLAIMER
                )
        except Exception:
            pass

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(f"{system_prompt}\n\n{user_prompt}")
            ai_text = response.text.strip()
            
            return AISummaryResponse(
                batch_id=batch_id,
                summary=ai_text,
                recommendation="Đã tóm tắt từ AI Gemini dựa trên toàn bộ lịch sử chăm sóc.",
                disclaimer=AI_DISCLAIMER
            )
        except Exception:
            pass

    has_pest = any(
        kw in (getattr(l, "notes", "") or getattr(l, "description", "") or "").lower() 
        for l in logs 
        for kw in ["sâu", "bệnh", "vàng lá", "rệp", "nấm"]
    )
    water_count = sum(
        1 for l in logs 
        if (getattr(l, "action_type", "") or getattr(l, "activity_type", "")) == "Tưới nước"
    )

    summary_msg = f"Lô #{batch_id} đã ghi nhận tổng cộng {len(logs)} lượt chăm sóc. Trong đó có {water_count} lần tưới nước."
    if has_pest:
        summary_msg += " CẢNH BÁO: Đã phát hiện dấu hiệu sâu bệnh/vàng lá trong nhật ký gần đây."
        rec_msg = "Cần cho kỹ thuật viên kiểm tra trực tiếp mặt dưới lá, cách ly cây bệnh và chuẩn bị chế phẩm sinh học phù hợp."
    else:
        summary_msg += " Tình trạng sinh trưởng bình thường, chưa có phát sinh bất thường."
        rec_msg = "Duy trì lịch tưới nước hiện tại, kiểm tra độ ẩm đất vào giữa tuần và chuẩn bị đợt bón phân hữu cơ tiếp theo."

    return AISummaryResponse(
        batch_id=batch_id,
        summary=summary_msg,
        recommendation=rec_msg,
        disclaimer=AI_DISCLAIMER
    )


@router.delete(
    "/range",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("care_logs:delete"))]
)
def delete_care_logs_by_date_range(
    batch_id: int,
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
):
    """Xóa các nhật ký của một lô trong khoảng ngày, tính cả hai ngày biên."""
    if from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày bắt đầu không được lớn hơn ngày kết thúc.",
        )

    from sqlalchemy import or_

    logs = (
        db.query(CareLog)
        .filter(or_(CareLog.batch_id == batch_id, CareLog.crop_batch_id == batch_id))
        .all()
    )

    selected_logs = []
    for log in logs:
        log_day = parse_date_obj(getattr(log, "log_date", None) or getattr(log, "created_at", None))
        if from_date <= log_day <= to_date:
            selected_logs.append(log)

    for log in selected_logs:
        db.delete(log)
    db.commit()

    return {
        "message": "Đã xóa lịch sử chăm sóc trong khoảng ngày đã chọn.",
        "deleted_count": len(selected_logs),
        "from_date": from_date,
        "to_date": to_date,
    }


@router.delete(
    "/{log_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("care_logs:delete"))]
)
def delete_care_log(log_id: int, db: Session = Depends(get_db)):
    """Xóa một bản ghi nhật ký chăm sóc"""
    log_item = db.query(CareLog).filter(CareLog.id == log_id).first()
    if not log_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi nhật ký")
    
    db.delete(log_item)
    db.commit()
    return {"message": "Xóa nhật ký chăm sóc thành công"}
````

## File: app/routers/crop_batch.py
````python
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission

router = APIRouter(tags=["Crop Batches"])

# Bảng dịch trạng thái sang Tiếng Việt
STATUS_MAP_VN = {
    "growing": "Đang trồng",
    "PLANTING": "Đang trồng",
    "planting": "Đang trồng",
    "harvested": "Đã thu hoạch",
    "HARVESTED": "Đã thu hoạch",
    "cancelled": "Đã hủy",
    "CANCELLED": "Đã hủy",
    "planned": "Kế hoạch",
    "PLANNED": "Kế hoạch",
    "Đang trồng": "Đang trồng",
    "Đã thu hoạch": "Đã thu hoạch",
    "Đã hủy": "Đã hủy",
    "Kế hoạch": "Kế hoạch",
}


def get_models():
    try:
        from app.models import CropBatch, PlantVariety, Plot
        return CropBatch, PlantVariety, Plot
    except ImportError:
        from app.models.crop_batch import CropBatch
        from app.models.plant_variety import PlantVariety
        from app.models.plot import Plot
        return CropBatch, PlantVariety, Plot


def parse_date_obj(val: Any) -> Optional[date]:
    """Hàm bổ trợ ép kiểu chuỗi/datetime sang Python date object tránh lỗi SQLite Date type."""
    if not val:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        clean_str = val.split("T")[0].split(" ")[0]
        try:
            return datetime.strptime(clean_str, "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def normalize_batch(batch, db: Session):
    CropBatch, PlantVariety, Plot = get_models()

    if hasattr(batch, "__table__"):
        d = {c.name: getattr(batch, c.name) for c in batch.__table__.columns}
    else:
        d = dict(batch.__dict__)

    d.pop("_sa_instance_state", None)

    # 1. Thông tin Giống cây & Lô đất
    variety_id = getattr(batch, "variety_id", None) or getattr(batch, "plant_variety_id", None)
    variety_name = ""
    growth_days = 30

    if variety_id:
        v = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
        if v:
            variety_name = getattr(v, "name", None) or getattr(v, "variety_name", None) or ""
            growth_days = (
                getattr(v, "growth_period", None) or 
                getattr(v, "days_to_harvest", None) or 
                getattr(v, "duration", None) or 
                getattr(v, "cycle_days", None) or 30
            )

    plot_id = getattr(batch, "plot_id", None)
    plot_name = ""
    if plot_id:
        p = db.query(Plot).filter(Plot.id == plot_id).first()
        if p:
            plot_name = getattr(p, "name", None) or getattr(p, "plot_name", None) or ""

    d["plot_name"] = plot_name or "Mặc định"
    d["plotName"] = plot_name or "Mặc định"
    d["plot"] = plot_name or "Mặc định"

    d["variety_name"] = variety_name or "Chưa chọn"
    d["varietyName"] = variety_name or "Chưa chọn"
    d["variety"] = variety_name or "Chưa chọn"

    # 2. Tên lô
    raw_name = (
        getattr(batch, "name", None) or 
        getattr(batch, "batch_name", None) or 
        getattr(batch, "title", None)
    )
    if not raw_name or raw_name == "Lô trồng":
        batch_id = getattr(batch, "id", 1)
        raw_name = f"Lô {variety_name} #{batch_id}" if variety_name else f"Lô trồng #{batch_id}"

    d["name"] = raw_name
    d["batch_name"] = raw_name
    d["batchName"] = raw_name
    d["title"] = raw_name

    # 3. Xử lý Ngày gieo
    sow_val = None
    for date_key in ["sow_date", "sowing_date", "plant_date", "planting_date", "start_date", "created_at", "date"]:
        val = getattr(batch, date_key, None)
        if val:
            sow_val = val
            break

    sow_str = str(sow_val).split("T")[0].split(" ")[0] if sow_val else datetime.now().strftime("%Y-%m-%d")

    sow_keys = [
        "sow_date", "sowDate", "sowing_date", "sowingDate", 
        "plant_date", "plantDate", "planting_date", "plantingDate",
        "planted_at", "plantedAt", "sowed_at", "sowedAt",
        "start_date", "startDate", "created_at", "createdAt", "date"
    ]
    for key in sow_keys:
        d[key] = sow_str

    # 4. Xử lý Ngày dự kiến thu hoạch
    harvest_val = None
    for h_key in ["expected_harvest_date", "estimated_harvest_date", "harvest_date", "expected_harvest"]:
        val = getattr(batch, h_key, None)
        if val:
            harvest_val = val
            break

    if harvest_val:
        harvest_str = str(harvest_val).split("T")[0].split(" ")[0]
    else:
        try:
            sow_dt = datetime.strptime(sow_str, "%Y-%m-%d")
            harvest_dt = sow_dt + timedelta(days=int(growth_days))
            harvest_str = harvest_dt.strftime("%Y-%m-%d")
        except Exception:
            harvest_str = sow_str

    harvest_keys = [
        "expected_harvest_date", "expectedHarvestDate", 
        "estimated_harvest_date", "estimatedHarvestDate",
        "harvest_date", "harvestDate", 
        "expected_harvest", "expectedHarvest"
    ]
    for h_k in harvest_keys:
        d[h_k] = harvest_str

    # 5. Ép Trạng thái về Tiếng Việt
    raw_status = getattr(batch, "status", None) or getattr(batch, "batch_status", None) or "Đang trồng"
    vn_status = STATUS_MAP_VN.get(raw_status, raw_status)

    d["status"] = vn_status
    d["batch_status"] = vn_status
    d["batchStatus"] = vn_status

    return d


# 1. Lấy danh sách Lô trồng
@router.get("", status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("crop_batches:read"))])
@router.get("/", status_code=status.HTTP_200_OK, include_in_schema=False, dependencies=[Depends(require_permission("crop_batches:read"))])
def get_batches(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    CropBatch, _, _ = get_models()
    batches = db.query(CropBatch).all()
    return [normalize_batch(b, db) for b in batches]


# 2. Tạo mới Lô trồng
@router.post(
    "", 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("crop_batches:create"))]
)
@router.post(
    "/", 
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
    dependencies=[Depends(require_permission("crop_batches:create"))]
)
def create_batch(payload: dict, db: Session = Depends(get_db)):
    CropBatch, PlantVariety, Plot = get_models()
    valid_cols = {c.name: c.type for c in CropBatch.__table__.columns} if hasattr(CropBatch, "__table__") else {}
    
    data = {}

    # A. Tên lô
    name_val = payload.get("name") or payload.get("batch_name") or payload.get("batchName") or payload.get("title") or "Lô trồng"
    if "name" in valid_cols:
        data["name"] = name_val
    if "batch_name" in valid_cols:
        data["batch_name"] = name_val

    # B. Lô đất
    plot_id = payload.get("plot_id") or payload.get("plotId") or payload.get("plot")
    if not plot_id:
        raise HTTPException(status_code=400, detail="Vui lòng chọn lô đất.")
    try:
        plot_id = int(plot_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Lô đất không hợp lệ.")
    if plot_id <= 0:
        raise HTTPException(status_code=400, detail="Vui lòng chọn lô đất hợp lệ.")
    if "plot_id" in valid_cols:
        if not db.query(Plot).filter(Plot.id == plot_id).first():
            raise HTTPException(status_code=400, detail="Lô đất được chọn không tồn tại.")
        data["plot_id"] = plot_id

    # C. Giống cây & Số lượng sử dụng (Trừ kho)
    variety_id = payload.get("variety_id") or payload.get("varietyId") or payload.get("plant_variety_id") or payload.get("variety")
    if not variety_id:
        raise HTTPException(status_code=400, detail="Vui lòng chọn giống cây.")
    try:
        variety_id = int(variety_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Giống cây không hợp lệ.")
    if variety_id <= 0:
        raise HTTPException(status_code=400, detail="Vui lòng chọn giống cây hợp lệ.")
    qty = payload.get("quantity") or payload.get("quantity_used") or payload.get("seed_quantity") or 0.0
    try:
        qty = float(qty)
    except (ValueError, TypeError):
        qty = 0.0

    if "variety_id" in valid_cols:
        data["variety_id"] = variety_id

    variety = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if not variety:
        raise HTTPException(status_code=400, detail="Giống cây được chọn không tồn tại.")

    stock_attr = None
    for attr in ["stock_quantity", "quantity", "stock", "quantity_in_stock"]:
        if hasattr(variety, attr):
            stock_attr = attr
            break

    if stock_attr and qty > 0:
        current_stock = getattr(variety, stock_attr) or 0.0
        if current_stock < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng giống trong kho không đủ! (Tồn kho: {current_stock}, Cần: {qty})"
            )
        setattr(variety, stock_attr, current_stock - qty)

    # D. Số lượng trong Lô
    if "quantity" in valid_cols:
        data["quantity"] = qty
    if "seed_quantity" in valid_cols:
        data["seed_quantity"] = qty
    if "quantity_used" in valid_cols:
        data["quantity_used"] = qty

    # E. Ngày gieo
    sow_date_raw = (
        payload.get("sowing_date") or payload.get("sowingDate") or 
        payload.get("sow_date") or payload.get("sowDate") or 
        payload.get("plant_date") or datetime.now().strftime("%Y-%m-%d")
    )
    sow_date_obj = parse_date_obj(sow_date_raw) or datetime.now().date()

    for date_col in ["sow_date", "sowing_date", "plant_date", "start_date"]:
        if date_col in valid_cols:
            col_type = str(valid_cols[date_col]).upper()
            data[date_col] = sow_date_obj if "DATE" in col_type else str(sow_date_obj)

    # F. Ngày thu hoạch dự kiến
    harvest_date_raw = payload.get("expected_harvest_date") or payload.get("expectedHarvestDate") or payload.get("harvest_date")
    if not harvest_date_raw and variety_id:
        try:
            growth_days = 30
            if variety:
                growth_days = (
                    getattr(variety, "growth_period", None) or 
                    getattr(variety, "days_to_harvest", None) or 
                    getattr(variety, "cycle_days", None) or 30
                )
            harvest_date_obj = sow_date_obj + timedelta(days=int(growth_days))
        except Exception:
            harvest_date_obj = sow_date_obj + timedelta(days=30)
    else:
        harvest_date_obj = parse_date_obj(harvest_date_raw)

    if harvest_date_obj:
        for h_col in ["expected_harvest_date", "estimated_harvest_date", "harvest_date", "expected_harvest"]:
            if h_col in valid_cols:
                col_type = str(valid_cols[h_col]).upper()
                data[h_col] = harvest_date_obj if "DATE" in col_type else str(harvest_date_obj)

    # G. Mã lô
    generated_code = payload.get("batch_code") or payload.get("batchCode") or payload.get("code") or f"CB-{int(datetime.now().timestamp())}"
    if "batch_code" in valid_cols:
        data["batch_code"] = generated_code
    if "code" in valid_cols:
        data["code"] = generated_code

    # H. Trạng thái
    status_raw = payload.get("status") or payload.get("batch_status") or "Đang trồng"
    status_val = STATUS_MAP_VN.get(status_raw, status_raw)
    if "status" in valid_cols:
        data["status"] = status_val
    if "batch_status" in valid_cols:
        data["batch_status"] = status_val

    # I. Gán các trường mở rộng khác
    for k, v in payload.items():
        if k in valid_cols and k not in data:
            data[k] = v

    try:
        db_batch = CropBatch(**data)
        db.add(db_batch)
        db.commit()
        db.refresh(db_batch)
        return normalize_batch(db_batch, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể tạo lô trồng: {str(e)}"
        )


# 3. Cập nhật Lô trồng
@router.put(
    "/{batch_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("crop_batches:update"))]
)
def update_batch(batch_id: int, payload: dict, db: Session = Depends(get_db)):
    CropBatch, _, _ = get_models()
    batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô trồng")

    valid_cols = {c.name: c.type for c in CropBatch.__table__.columns} if hasattr(CropBatch, "__table__") else {}

    # Cập nhật Trạng thái
    status_in = payload.get("status") or payload.get("batch_status") or payload.get("batchStatus")
    if status_in is not None:
        status_vn = STATUS_MAP_VN.get(str(status_in), str(status_in))
        for s_col in ["status", "batch_status", "state"]:
            if s_col in valid_cols and hasattr(batch, s_col):
                setattr(batch, s_col, status_vn)

    # Cập nhật Tên lô
    name_in = payload.get("name") or payload.get("batch_name") or payload.get("batchName")
    if name_in is not None:
        for n_col in ["name", "batch_name", "title"]:
            if n_col in valid_cols and hasattr(batch, n_col):
                setattr(batch, n_col, str(name_in))

    # Cập nhật Ngày gieo
    sow_in = payload.get("sowing_date") or payload.get("sowingDate") or payload.get("sow_date") or payload.get("plant_date")
    if sow_in is not None:
        sow_obj = parse_date_obj(sow_in)
        for d_col in ["sow_date", "sowing_date", "plant_date", "start_date"]:
            if d_col in valid_cols and hasattr(batch, d_col):
                col_type = str(valid_cols[d_col]).upper()
                val_to_set = sow_obj if "DATE" in col_type else str(sow_in)
                setattr(batch, d_col, val_to_set)

    for k, v in payload.items():
        if k in valid_cols and hasattr(batch, k) and v is not None:
            setattr(batch, k, v)

    try:
        db.commit()
        db.refresh(batch)
        return normalize_batch(batch, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail=f"Lỗi cập nhật lô trồng: {str(e)}"
        )


# 4. Xóa Lô trồng
@router.delete(
    "/{batch_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("crop_batches:delete"))]
)
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    CropBatch, _, _ = get_models()
    try:
        from app.models import CareLog
    except ImportError:
        try:
            from app.models.care_log import CareLog
        except ImportError:
            CareLog = None

    batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô trồng")

    if CareLog:
        try:
            db.query(CareLog).filter(CareLog.batch_id == batch_id).delete(synchronize_session=False)
        except Exception:
            pass

    db.delete(batch)
    db.commit()
    return {"message": "Xóa lô trồng thành công"}


# 5. API Truy xuất nguồn gốc Lô trồng (Public / QR Code)
@router.get("/code/{code}/trace", status_code=status.HTTP_200_OK)
def get_batch_trace_by_code(code: str, db: Session = Depends(get_db)):
    CropBatch, PlantVariety, Plot = get_models()

    batch = None
    if hasattr(CropBatch, "batch_code"):
        batch = db.query(CropBatch).filter(CropBatch.batch_code == code).first()
    if not batch and hasattr(CropBatch, "code"):
        batch = db.query(CropBatch).filter(CropBatch.code == code).first()
    if not batch and code.isdigit():
        batch = db.query(CropBatch).filter(CropBatch.id == int(code)).first()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thông tin nông sản cho mã truy xuất: {code}"
        )

    variety_name = "Nông sản"
    variety_id = getattr(batch, "variety_id", None) or getattr(batch, "plant_variety_id", None)
    if variety_id:
        v = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
        if v:
            variety_name = getattr(v, "name", None) or getattr(v, "variety_name", None) or variety_name

    plot_name = "Khu vực canh tác"
    plot_id = getattr(batch, "plot_id", None)
    if plot_id:
        p = db.query(Plot).filter(Plot.id == plot_id).first()
        if p:
            plot_name = getattr(p, "name", None) or getattr(p, "plot_name", None) or plot_name

    care_logs_data = []
    try:
        from app.models.care_log import CareLog
        logs = db.query(CareLog).filter(CareLog.batch_id == batch.id).order_by(CareLog.log_date.asc()).all()
        for log in logs:
            care_logs_data.append({
                "id": log.id,
                "date": str(getattr(log, "log_date", "")),
                "action": getattr(log, "action_type", "") or getattr(log, "activity_type", ""),
                "notes": getattr(log, "notes", "") or getattr(log, "description", "")
            })
    except Exception:
        pass

    harvest_logs_data = []
    try:
        from app.models.harvest import HarvestLog
        harvests = db.query(HarvestLog).filter(HarvestLog.batch_id == batch.id).all()
        for h in harvests:
            harvest_logs_data.append({
                "id": h.id,
                "quantity": getattr(h, "quantity", 0),
                "unit": getattr(h, "unit", "kg"),
                "harvest_date": str(getattr(h, "harvest_date", "")),
                "qr_trace_code": getattr(h, "qr_trace_code", None)
            })
    except Exception:
        pass

    norm_batch = normalize_batch(batch, db)

    return {
        "status": "success",
        "data": {
            "code": code,
            "batch_id": batch.id,
            "batch_name": norm_batch.get("name"),
            "plant_name": variety_name,
            "plot_name": plot_name,
            "planted_date": norm_batch.get("sow_date"),
            "expected_harvest_date": norm_batch.get("expected_harvest_date"),
            "status": norm_batch.get("status"),
            "care_logs": care_logs_data,
            "harvest_logs": harvest_logs_data
        }
    }
````

## File: app/routers/dashboard.py
````python
import re
from datetime import date, datetime
from typing import Dict, List, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.crop_batch import CropBatch
from app.models.care_log import CareLog
from app.models.harvest import HarvestLog
from app.models.plant_variety import PlantVariety

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

ViewMode = Literal["day", "month", "year"]


class HarvestChartPoint(BaseModel):
    label: str
    total: float = Field(ge=0)
    model_config = {"extra": "allow"}


class HarvestChartResponse(BaseModel):
    view: ViewMode
    varieties: List[str]
    data: List[HarvestChartPoint]


def _empty_points(view: ViewMode, reference_date: date) -> List[Dict[str, object]]:
    if view == "day":
        days_in_month = date(
            reference_date.year + (reference_date.month == 12),
            1 if reference_date.month == 12 else reference_date.month + 1,
            1,
        )
        days_in_month = (days_in_month - date.resolution).day
        return [
            {"label": f"{day:02d}/{reference_date.month:02d}", "total": 0.0}
            for day in range(1, days_in_month + 1)
        ]
    if view == "month":
        return [{"label": f"T{month}", "total": 0.0} for month in range(1, 13)]
    return [{"label": str(year), "total": 0.0} for year in range(reference_date.year - 4, reference_date.year + 1)]


def _point_key(view: ViewMode, harvested_at: date) -> str:
    if view == "day":
        return f"{harvested_at.day:02d}/{harvested_at.month:02d}"
    if view == "month":
        return f"T{harvested_at.month}"
    return str(harvested_at.year)


def _parse_log_date(value: object) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _care_log_quantity(log: CareLog) -> float:
    if log.quantity and log.quantity > 0:
        return float(log.quantity)
    text = log.notes or log.description or ""
    match = re.search(r"(\d+(?:[.,]\d+)?)", text)
    return float(match.group(1).replace(",", ".")) if match else 0.0


@router.get("/harvest-chart", response_model=HarvestChartResponse)
def get_harvest_chart(
    view: ViewMode = Query("month"),
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    reference_date = date.today()
    points = _empty_points(view, reference_date)
    points_by_label = {str(point["label"]): point for point in points}
    variety_names = set()

    rows = (
        db.query(HarvestLog, CropBatch, PlantVariety)
        .join(CropBatch, HarvestLog.batch_id == CropBatch.id)
        .join(PlantVariety, CropBatch.variety_id == PlantVariety.id)
        .all()
    )

    for harvest, _batch, variety in rows:
        harvested_at = harvest.harvest_time.date() if harvest.harvest_time else None
        if harvested_at is None:
            continue
        if view == "day" and (harvested_at.year != reference_date.year or harvested_at.month != reference_date.month):
            continue
        if view == "month" and harvested_at.year != reference_date.year:
            continue
        if view == "year" and not reference_date.year - 4 <= harvested_at.year <= reference_date.year:
            continue

        variety_name = variety.name.strip() if variety.name else "Chưa phân loại"
        variety_names.add(variety_name)
        label = _point_key(view, harvested_at)
        point = points_by_label[label]
        quantity = max(float(harvest.quantity or 0), 0.0)
        point[variety_name] = float(point.get(variety_name, 0.0)) + quantity
        point["total"] = float(point["total"]) + quantity

    care_rows = (
        db.query(CareLog, CropBatch, PlantVariety)
        .join(CropBatch, CareLog.crop_batch_id == CropBatch.id)
        .join(PlantVariety, CropBatch.variety_id == PlantVariety.id)
        .filter(CareLog.action_type.in_(["Thu hoạch", "Thu hoach", "Harvest"]))
        .all()
    )

    for log, _batch, variety in care_rows:
        harvested_at = _parse_log_date(log.log_date or log.created_at)
        if harvested_at is None:
            continue
        if view == "day" and (harvested_at.year != reference_date.year or harvested_at.month != reference_date.month):
            continue
        if view == "month" and harvested_at.year != reference_date.year:
            continue
        if view == "year" and not reference_date.year - 4 <= harvested_at.year <= reference_date.year:
            continue

        quantity = _care_log_quantity(log)
        if quantity <= 0:
            continue
        variety_name = variety.name.strip() if variety.name else "Chưa phân loại"
        variety_names.add(variety_name)
        point = points_by_label[_point_key(view, harvested_at)]
        point[variety_name] = float(point.get(variety_name, 0.0)) + quantity
        point["total"] = float(point["total"]) + quantity

    return HarvestChartResponse(
        view=view,
        varieties=sorted(variety_names),
        data=[HarvestChartPoint(**point) for point in points],
    )
````

## File: app/routers/harvest.py
````python
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from app.schemas.harvest import HarvestCreate, HarvestOut
from app.services import harvest as service

# Bỏ prefix="/api/harvests" để main.py tự quản lý linh hoạt các prefix alias
router = APIRouter(tags=["Harvests"])


@router.get(
    "", 
    response_model=List[HarvestOut], 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("harvests:read"))],
    summary="Lấy tất cả danh sách thu hoạch"
)
@router.get(
    "/", 
    response_model=List[HarvestOut], 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("harvests:read"))],
    include_in_schema=False
)
def list_all_harvests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy toàn bộ danh sách các lượt thu hoạch trong hệ thống (Dùng cho biểu đồ Dashboard).
    """
    return service.list_all(db)


@router.get(
    "/batch/{batch_id}", 
    response_model=List[HarvestOut], 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("harvests:read"))],
    summary="Lấy danh sách thu hoạch theo Lô trồng"
)
def list_by_batch(
    batch_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy thông tin các lượt thu hoạch thuộc về một Lô trồng (Batch) cụ thể.
    """
    return service.list_by_batch(db, batch_id)


@router.post(
    "", 
    response_model=HarvestOut, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("harvests:create"))],
    summary="Tạo mới lượt thu hoạch"
)
@router.post(
    "/", 
    response_model=HarvestOut, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("harvests:create"))],
    include_in_schema=False
)
def create_harvest(
    payload: HarvestCreate, 
    db: Session = Depends(get_db)
):
    """
    Tạo mới một bản ghi thu hoạch nông sản.
    Tự động sinh mã truy xuất nguồn gốc (QR Trace Code).
    """
    return service.create_harvest(db, payload)


@router.get(
    "/trace/{trace_code}", 
    status_code=status.HTTP_200_OK,
    summary="Truy xuất nguồn gốc công khai theo mã QR Code"
)
def trace_harvest_by_code(
    trace_code: str, 
    db: Session = Depends(get_db)
):
    """
    API Truy xuất nguồn gốc nông sản công khai (Public - Không cần Token/Đăng nhập).
    Trả về toàn bộ chuỗi thông tin: Lô trồng, Giống cây, Vùng canh tác, Nhật ký chăm sóc & Ngày thu hoạch.
    """
    clean_code = trace_code.strip()
    trace_data = service.get_by_trace_code(db, clean_code)
    
    if not trace_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Không tìm thấy thông tin truy xuất nguồn gốc cho mã: '{clean_code}'"
        )
        
    return {
        "status": "success",
        "data": trace_data
    }
````

## File: app/routers/notification.py
````python
import re
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.notification import Notification
from app.models.plot import Plot

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
@router.get("/")
def get_notifications(db: Session = Depends(get_db)):
    notifications = db.query(Notification).order_by(Notification.created_at.desc()).limit(20).all()
    
    result = []
    for noti in notifications:
        message = noti.message or ""
        
        # Tìm số ID đằng sau chữ "Lô " (Ví dụ: "Lô 5: phát hiện...")
        match = re.search(r'Lô\s+(\d+)', message)
        if match:
            plot_id = int(match.group(1))
            # Tra cứu tên lô đất từ ID
            plot = db.query(Plot).filter(Plot.id == plot_id).first()
            if plot and plot.name:
                # Thay thế "Lô 5" thành tên thực tế "chỉ chỉ"
                message = re.sub(r'Lô\s+\d+', plot.name, message)

        # Format thời gian
        time_str = ""
        if hasattr(noti, "created_at") and noti.created_at:
            if isinstance(noti.created_at, datetime):
                time_str = noti.created_at.strftime("%H:%M:%S %d/%m/%Y")
            else:
                time_str = str(noti.created_at)

        result.append({
            "id": noti.id,
            "type": getattr(noti, "type", "warning"),
            "title": noti.title,
            "message": message,
            "time": time_str,
            "unread": not getattr(noti, "is_read", False)
        })

    return result
````

## File: app/routers/plant_variety.py
````python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_permission
from app.models.plant_variety import PlantVariety
from app.models.crop_batch import CropBatch
from app.schemas.plant_variety import (
    PlantVarietyCreate,
    PlantVarietyUpdate,
    PlantVarietyOut
)

router = APIRouter(tags=["Plant Varieties"])


@router.get(
    "", 
    response_model=List[PlantVarietyOut], 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plant_varieties:read"))]
)
@router.get(
    "/", 
    response_model=List[PlantVarietyOut], 
    dependencies=[Depends(require_permission("plant_varieties:read"))],
    include_in_schema=False
)
def get_varieties(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các giống cây trồng."""
    return db.query(PlantVariety).all()


@router.get(
    "/{variety_id}", 
    response_model=PlantVarietyOut, 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plant_varieties:read"))]
)
def get_variety_detail(variety_id: int, db: Session = Depends(get_db)):
    variety = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if not variety:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy giống cây")
    return variety


@router.post(
    "", 
    response_model=PlantVarietyOut, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("plant_varieties:create"))]
)
@router.post(
    "/", 
    response_model=PlantVarietyOut, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("plant_varieties:create"))],
    include_in_schema=False
)
def create_variety(payload: PlantVarietyCreate, db: Session = Depends(get_db)):
    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    
    if data.get("code"):
        existing = db.query(PlantVariety).filter(PlantVariety.code == data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giống cây '{data['code']}' đã tồn tại."
            )

    db_item = PlantVariety(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put(
    "/{variety_id}", 
    response_model=PlantVarietyOut, 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plant_varieties:update"))]
)
def update_variety(variety_id: int, payload: PlantVarietyUpdate, db: Session = Depends(get_db)):
    item = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy giống cây")

    update_data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)

    if update_data.get("code") and update_data["code"] != item.code:
        existing = db.query(PlantVariety).filter(PlantVariety.code == update_data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giống cây '{update_data['code']}' đã tồn tại."
            )

    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/{variety_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plant_varieties:delete"))]
)
def delete_variety(variety_id: int, db: Session = Depends(get_db)):
    variety = db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()
    if not variety:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy giống cây")

    linked_batch = db.query(CropBatch).filter(CropBatch.variety_id == variety_id).first()
    if linked_batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa giống cây đang được liên kết với lô trồng."
        )

    db.delete(variety)
    db.commit()
    return {"message": "Xóa giống cây thành công"}
````

## File: app/routers/plot.py
````python
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User

# Bỏ prefix="/api/plots" tại đây để main.py tự quản lý prefix alias
router = APIRouter(tags=["Plots"])


# =========================================================================
# DYNAMIC MODEL HELPERS
# =========================================================================
def get_plot_model():
    try:
        from app.models import Plot
        return Plot
    except ImportError:
        from app.models.plot import Plot
        return Plot


def get_seed_model():
    try:
        from app.models.plant_variety import PlantVariety
        return PlantVariety
    except ImportError:
        pass

    try:
        from app.models import PlantVariety
        return PlantVariety
    except ImportError:
        pass

    try:
        from app.models import Seed
        return Seed
    except ImportError:
        pass

    return None


def get_crop_batch_model():
    try:
        from app.models.crop_batch import CropBatch
        return CropBatch
    except ImportError:
        pass

    try:
        from app.models import CropBatch
        return CropBatch
    except ImportError:
        pass

    return None


class StartPlantingSchema(BaseModel):
    seed_id: Optional[int] = None
    seed_name: Optional[str] = None
    planting_date: str
    growth_days: Optional[int] = 30


# =========================================================================
# 1. LẤY DANH SÁCH LÔ ĐẤT
# =========================================================================
@router.get(
    "", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:read"))]
)
@router.get(
    "/", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:read"))],
    include_in_schema=False
)
def get_plots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    Plot = get_plot_model()
    plots = db.query(Plot).all()

    Seed = get_seed_model()
    result = []
    
    for p in plots:
        p_dict = p.__dict__.copy()
        p_dict.pop('_sa_instance_state', None)

        if Seed and getattr(p, 'seed_id', None) and not p_dict.get('seed_name'):
            seed_item = db.query(Seed).filter(Seed.id == p.seed_id).first()
            if seed_item:
                p_dict['seed_name'] = seed_item.name
                p_dict['growth_days'] = getattr(seed_item, 'growth_days', 30)

        result.append(p_dict)

    return result


# =========================================================================
# 2. TẠO MỚI LÔ ĐẤT
# =========================================================================
@router.post(
    "", 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("plots:create"))]
)
@router.post(
    "/", 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("plots:create"))],
    include_in_schema=False
)
def create_plot(payload: dict, db: Session = Depends(get_db)):
    Plot = get_plot_model()

    valid_keys = (
        {c.name for c in Plot.__table__.columns}
        if hasattr(Plot, "__table__")
        else payload.keys()
    )
    filtered_payload = {k: v for k, v in payload.items() if k in valid_keys}

    if "area" in filtered_payload and filtered_payload["area"] is not None:
        try:
            filtered_payload["area"] = float(filtered_payload["area"])
        except (ValueError, TypeError):
            pass

    try:
        db_item = Plot(**filtered_payload)
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi tạo lô đất: {str(e)}"
        )


# =========================================================================
# 3. LẬP KẾ HOẠCH GIEO TRỒNG
# =========================================================================
@router.post(
    "/{plot_id}/start-planting",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:update"))]
)
def start_planting(
    plot_id: int, 
    payload: StartPlantingSchema, 
    db: Session = Depends(get_db)
):
    Plot = get_plot_model()
    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô đất")

    try:
        p_date = datetime.strptime(payload.planting_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng ngày gieo không hợp lệ (yêu cầu dạng YYYY-MM-DD)"
        )

    growth_days = payload.growth_days or 30
    seed_name = payload.seed_name

    Seed = get_seed_model()
    if Seed and payload.seed_id:
        seed_item = db.query(Seed).filter(Seed.id == payload.seed_id).first()
        if seed_item:
            seed_name = seed_item.name
            growth_days = getattr(seed_item, "growth_days", growth_days)

    expected_harvest = p_date + timedelta(days=growth_days)

    plot.status = "Đang canh tác"
    
    if hasattr(plot, "seed_id"):
        plot.seed_id = payload.seed_id
    if hasattr(plot, "seed_name"):
        plot.seed_name = seed_name
    if hasattr(plot, "planting_date"):
        plot.planting_date = p_date
    if hasattr(plot, "expected_harvest_date"):
        plot.expected_harvest_date = expected_harvest

    db.commit()
    db.refresh(plot)

    return {
        "message": "Lập kế hoạch gieo trồng thành công!",
        "plot_id": plot.id,
        "status": plot.status,
        "seed_name": seed_name,
        "planting_date": str(p_date),
        "expected_harvest_date": str(expected_harvest)
    }


# =========================================================================
# 4. CẬP NHẬT LÔ ĐẤT
# =========================================================================
@router.put(
    "/{plot_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:update"))]
)
def update_plot(plot_id: int, payload: dict, db: Session = Depends(get_db)):
    Plot = get_plot_model()
    item = db.query(Plot).filter(Plot.id == plot_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô đất")

    valid_keys = (
        {c.name for c in Plot.__table__.columns}
        if hasattr(Plot, "__table__")
        else payload.keys()
    )

    for k, v in payload.items():
        if k in valid_keys and hasattr(item, k) and v is not None:
            setattr(item, k, v)

    db.commit()
    db.refresh(item)
    return item


# =========================================================================
# 5. XÓA LÔ ĐẤT
# =========================================================================
@router.delete(
    "/{plot_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("plots:delete"))]
)
def delete_plot(plot_id: int, db: Session = Depends(get_db)):
    Plot = get_plot_model()
    CropBatch = get_crop_batch_model()

    plot = db.query(Plot).filter(Plot.id == plot_id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô đất")

    if CropBatch:
        linked_batch = db.query(CropBatch).filter(CropBatch.plot_id == plot_id).first()
        if linked_batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa lô đất đang được liên kết với lô trồng."
            )

    db.delete(plot)
    db.commit()
    return {"message": "Xóa lô đất thành công"}
````

## File: app/routers/sale.py
````python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.sale import SaleCreate, SaleOut
from app.services import sale as service

router = APIRouter(prefix="/api/sales", tags=["Sales"])


@router.get("/harvest/{harvest_id}", response_model=List[SaleOut])
def list_by_harvest(harvest_id: int, db: Session = Depends(get_db)):
    return service.list_by_harvest(db, harvest_id)


@router.post("", response_model=SaleOut, status_code=201)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    return service.create_sale(db, payload)
````

## File: app/routers/search.py
````python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.harvest import HarvestLog

router = APIRouter()

@router.get("/search")
def global_search(q: str, db: Session = Depends(get_db)):
    # ... logic tìm kiếm các entity khác ...

    # Sửa db.query(Harvest) -> db.query(HarvestLog)
    harvest_results = db.query(HarvestLog).filter(
        HarvestLog.notes.ilike(f"%{q}%")
    ).all()

    return {
        "harvests": harvest_results,
        # ... kết quả khác ...
    }
````

## File: app/routers/seeds.py
````python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter(prefix="/api/v1/seeds", tags=["Seeds - Giống cây"])

@router.get("/", response_model=List[schemas.SeedResponse])
def get_all_seeds(db: Session = Depends(get_db)):
    return db.query(models.Seed).all()

@router.post("/", response_model=schemas.SeedResponse, status_code=status.HTTP_201_CREATED)
def create_seed(seed: schemas.SeedCreate, db: Session = Depends(get_db)):
    new_seed = models.Seed(**seed.model_dump())
    db.add(new_seed)
    db.commit()
    db.refresh(new_seed)
    return new_seed
````

## File: app/routers/supply.py
````python
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.deps import require_staff
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import UserRole
from app.schemas.supply import SupplyAlert, SupplyCreate, SupplyImportCreate, SupplyImportOut, SupplyOut, SupplyUpdate
from app.services import supply as service

router = APIRouter(prefix="/api/supplies", tags=["Supplies"])

@router.post("", dependencies=[Depends(require_staff)])
@router.put("/{supply_id}", dependencies=[Depends(require_staff)])
@router.get("", response_model=list[SupplyOut])
def list_supplies(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    low_stock: bool = Query(False),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return service.list_supplies(db, category, search, low_stock)


@router.get("/alerts", response_model=list[SupplyAlert])
def supply_alerts(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return service.get_alerts(db)


@router.get("/{supply_id}", response_model=SupplyOut)
def get_supply(supply_id: int, db: Session = Depends(get_db)):
    return service.get_supply_or_404(db, supply_id)


@router.post("", response_model=SupplyOut, status_code=201, dependencies=[Depends(require_roles([UserRole.MANAGER, UserRole.ADMIN]))])
def create_supply(payload: SupplyCreate, db: Session = Depends(get_db)):
    return service.create_supply(db, payload)


@router.post("/{supply_id}/import", response_model=SupplyImportOut, status_code=201, dependencies=[Depends(require_roles([UserRole.MANAGER, UserRole.ADMIN]))])
def import_supply(supply_id: int, payload: SupplyImportCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return service.import_supply(db, supply_id, payload, current_user.get("id") if isinstance(current_user, dict) else None)


@router.put("/{supply_id}", response_model=SupplyOut, dependencies=[Depends(require_roles([UserRole.MANAGER, UserRole.ADMIN]))])
def update_supply(supply_id: int, payload: SupplyUpdate, db: Session = Depends(get_db)):
    return service.update_supply(db, supply_id, payload)


@router.delete("/{supply_id}", status_code=204, dependencies=[Depends(require_roles([UserRole.MANAGER, UserRole.ADMIN]))])
def delete_supply(supply_id: int, db: Session = Depends(get_db)):
    service.delete_supply(db, supply_id)
````

## File: app/routers/traceability.py
````python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.crop_batch import CropBatch
from app.models.care_log import CareLog
from app.models.plant_variety import PlantVariety
from app.models.plot import Plot

try:
    from app.models.harvest import HarvestLog
except ImportError:
    HarvestLog = None

router = APIRouter(prefix="/api/traceability", tags=["Traceability"])

@router.get("/{batch_code}", status_code=status.HTTP_200_OK)
def get_traceability_by_code(batch_code: str, db: Session = Depends(get_db)):
    query = db.query(CropBatch)
    if batch_code.isdigit():
        batch = query.filter((CropBatch.batch_code == batch_code) | (CropBatch.id == int(batch_code))).first()
    else:
        batch = query.filter(CropBatch.batch_code == batch_code).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin lô trồng")

    # 1. Lấy Tên Giống Cây
    variety_name = None
    if batch.variety_id:
        variety = db.query(PlantVariety).filter(PlantVariety.id == batch.variety_id).first()
        if variety:
            for attr in ["name", "variety_name", "title", "crop_name"]:
                val = getattr(variety, attr, None)
                if val:
                    variety_name = val
                    break

    if not variety_name:
        variety_name = batch.name or "Chưa cập nhật giống"

    # 2. Lấy Tên Lô Đất
    plot_name = "Chưa xác định"
    if batch.plot_id:
        plot = db.query(Plot).filter(Plot.id == batch.plot_id).first()
        if plot:
            plot_name = getattr(plot, "name", "Chưa xác định")

    # 3. Lấy Ngày Gieo Trồng (Nếu sow_date NULL sẽ tự động lấy ngày tạo lô)
    seeding_date = None
    if batch.sow_date:
        seeding_date = str(batch.sow_date)
    elif hasattr(batch, "created_at") and getattr(batch, "created_at"):
        c_val = getattr(batch, "created_at")
        seeding_date = str(c_val.date()) if hasattr(c_val, "date") else str(c_val)

    # 4. Lấy Nhật ký chăm sóc
    care_logs = []
    logs = batch.care_logs if hasattr(batch, "care_logs") and batch.care_logs else db.query(CareLog).filter(CareLog.crop_batch_id == batch.id).all()
    for log in logs:
        care_logs.append({
            "log_type": getattr(log, "action_type", None) or getattr(log, "activity_type", None) or "Chăm sóc",
            "performed_at": str(getattr(log, "log_date", getattr(log, "created_at", datetime.now()))),
            "description": getattr(log, "notes", None) or getattr(log, "description", ""),
            "conditions": getattr(log, "conditions", ""),
            "supplies_used": getattr(log, "supplies_used", []) or []
        })

    # 5. Lấy Đợt Thu Hoạch & Tìm Ngày Thu Hoạch Thực Tế từ Nhật Ký
    harvests = []
    harvest_list = batch.harvest_logs if hasattr(batch, "harvest_logs") and batch.harvest_logs else []
    if not harvest_list and HarvestLog:
        harvest_list = db.query(HarvestLog).filter(HarvestLog.crop_batch_id == batch.id).all()

    actual_harvest_date = None
    for h in harvest_list:
        h_date = getattr(h, "harvest_date", getattr(h, "created_at", None))
        if h_date and not actual_harvest_date:
            actual_harvest_date = str(h_date)
        harvests.append({
            "harvest_date": str(h_date) if h_date else "",
            "quantity_kg": float(getattr(h, "quantity_kg", getattr(h, "quantity", 0))),
            "quality_grade": getattr(h, "quality_grade", getattr(h, "grade", "A")),
            "sales": []
        })

    # Nếu chưa có trong HarvestLog, kiểm tra ngày ở nhật ký ghi nhận "HARVEST"
    if not actual_harvest_date:
        for log in care_logs:
            l_type = str(log.get("log_type", "")).upper()
            if "HARVEST" in l_type or "THU HOẠCH" in l_type:
                actual_harvest_date = log.get("performed_at")
                break

    return {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status or "Đang trồng",
        "variety_name": variety_name,
        "plot_name": plot_name,
        "seeding_date": seeding_date,
        "harvest_date": actual_harvest_date or (str(batch.expected_harvest_date) if batch.expected_harvest_date else None),
        "care_logs": care_logs,
        "harvests": harvests
    }
````

## File: app/routers/user.py
````python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.user import UserCreate, UserOut
from app.services import user as service

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    return service.list_users(db)


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return service.get_user_or_404(db, user_id)


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    return service.create_user(db, payload)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    service.delete_user(db, user_id)
````

## File: app/schemas/__init__.py
````python

````

## File: app/schemas/ai_alert.py
````python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class BatchAlertItemRaw(BaseModel):
    batch_code: str
    priority_score: int = Field(..., ge=1, le=5)  # 1 = khẩn cấp nhất
    reason: str


class AlertAIRaw(BaseModel):
    """Hình dạng JSON bắt Gemini phải trả về."""
    priority_batches: List[BatchAlertItemRaw]
    disclaimer: str


class AiAlertOut(BaseModel):
    total_growing_batches: int
    priority_batches: List[BatchAlertItemRaw]
    disclaimer: str
    created_at: datetime
````

## File: app/schemas/ai_schedule.py
````python
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import date, datetime

TaskType = Literal["tuoi", "bon_phan", "kiem_tra_sau_benh"]


class ScheduleItemRaw(BaseModel):
    day_offset: int = Field(..., ge=0)  # số ngày kể từ lúc gieo - Service sẽ tự tính lại ngày thật
    task_type: TaskType
    description: str = Field(
        ...,
        min_length=10,
        max_length=300,
        description="Mô tả tiếng Việt có dấu, đúng ngữ pháp, dễ hiểu và có hướng dẫn cụ thể.",
    )


class ScheduleAIRaw(BaseModel):
    """Hình dạng JSON bắt Gemini trả về - CHÚ Ý: không có trường 'date',
    chỉ có day_offset - Service sẽ tự suy ra ngày thật, không tin AI tính."""
    schedule: List[ScheduleItemRaw]
    disclaimer: str


class ScheduleItemOut(BaseModel):
    day_offset: int
    date: date  # do Service tự tính, không phải AI
    task_type: TaskType
    description: str


class AiScheduleOut(BaseModel):
    batch_code: str
    seeding_date: date
    expected_harvest_date: Optional[date] = None  # lấy từ CSDL thật, không phải AI tính lại
    schedule: List[ScheduleItemOut]
    disclaimer: str
    created_at: datetime
````

## File: app/schemas/ai_summary.py
````python
from pydantic import BaseModel
from typing import List
from datetime import datetime


class SummaryAIRaw(BaseModel):
    """
    Hình dạng JSON bắt Gemini phải trả về.
    referenced_log_ids: BẮT BUỘC AI phải trích dẫn ID các nhật ký thật sự
    đã dùng để đưa ra tóm tắt/issue - đây là cơ chế "grounding" giúp
    backend kiểm chứng được, không phải chỉ tin lời AI nói suông.
    """
    summary: str
    issues_detected: List[str]
    referenced_log_ids: List[int]
    disclaimer: str  # AI tự trả, nhưng Service sẽ GHI ĐÈ bằng câu cố định


class AiSummaryOut(BaseModel):
    """Response thật sự trả về cho client - đã qua xử lý và KIỂM CHỨNG ở Service."""
    batch_code: str
    log_count: int
    summary: str
    issues_detected: List[str]
    referenced_log_ids: List[int]  # để client/giám khảo tự đối chiếu lại nếu muốn
    disclaimer: str
    created_at: datetime
````

## File: app/schemas/care_log.py
````python
from datetime import date, datetime
from typing import Optional, Any, List
from pydantic import BaseModel, ConfigDict, model_validator


class CareLogBase(BaseModel):
    batch_id: Optional[int] = None
    crop_batch_id: Optional[int] = None
    log_date: Optional[str] = None
    action_type: Optional[str] = None
    activity_type: Optional[str] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = 0
    image_url: Optional[str] = None


class CareLogSupplyUsage(BaseModel):
    supply_id: int
    quantity_used: float
    notes: Optional[str] = None


class CareLogCreate(CareLogBase):
    supply_usages: List[CareLogSupplyUsage] = []
    @model_validator(mode='before')
    @classmethod
    def normalize_data(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # 1. Đồng bộ batch_id & crop_batch_id
            raw_batch_id = data.get("batch_id") or data.get("crop_batch_id")
            if raw_batch_id is not None:
                try:
                    parsed_id = int(raw_batch_id)
                    data["batch_id"] = parsed_id
                    data["crop_batch_id"] = parsed_id
                except (ValueError, TypeError):
                    pass

            # 2. Map tất cả tên trường hành động về cả action_type và activity_type
            action_val = (
                data.get("action_type")
                or data.get("activity_type")
                or data.get("action")
                or data.get("actionType")
                or data.get("activity")
            )
            final_action = str(action_val) if action_val else "Tưới nước"
            data["action_type"] = final_action
            data["activity_type"] = final_action

            # 3. Map các dạng tên ghi chú (description / note / notes)
            note_val = (
                data.get("notes")
                or data.get("description")
                or data.get("note")
            )
            final_notes = str(note_val) if note_val is not None else ""
            data["notes"] = final_notes
            data["description"] = final_notes

            # 4. Map date -> log_date (gán ngày hiện tại nếu trống)
            date_val = data.get("log_date") or data.get("date")
            data["log_date"] = str(date_val) if date_val else date.today().isoformat()

            # 5. Đảm bảo có trường quantity (tránh lỗi validation nếu DB bắt buộc)
            if "quantity" in data and data["quantity"] is not None:
                try:
                    data["quantity"] = int(data["quantity"])
                except (ValueError, TypeError):
                    data["quantity"] = 0
            else:
                data["quantity"] = 0

        return data


class CareLogUpdate(BaseModel):
    batch_id: Optional[int] = None
    log_date: Optional[str] = None
    action_type: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[int] = None
    image_url: Optional[str] = None


class CareLogResponse(BaseModel):
    id: int
    batch_id: int
    action_type: str
    log_date: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[int] = 0
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
````

## File: app/schemas/crop_batch.py
````python
from datetime import date
from typing import Optional
from pydantic import BaseModel


class CropBatchBase(BaseModel):
    batch_name: Optional[str] = None
    plot_id: int
    variety_id: int
    sow_date: date
    seeding_date: Optional[date] = None
    expected_harvest_date: Optional[date] = None
    quantity_used: Optional[float] = 0.0
    status: Optional[str] = "growing"
    created_by: Optional[int] = None


class CropBatchCreate(CropBatchBase):
    pass


class CropBatchUpdate(BaseModel):
    batch_name: Optional[str] = None
    plot_id: Optional[int] = None
    variety_id: Optional[int] = None
    seeding_date: Optional[date] = None
    expected_harvest_date: Optional[date] = None
    quantity_used: Optional[float] = None
    status: Optional[str] = None


class CropBatchOut(CropBatchBase):
    id: int
    batch_code: str

    class Config:
        from_attributes = True
````

## File: app/schemas/harvest.py
````python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HarvestBase(BaseModel):
    batch_id: int
    quantity: float
    grade: Optional[str] = None
    notes: Optional[str] = None

class HarvestCreate(HarvestBase):
    harvest_time: Optional[datetime] = None

class HarvestOut(HarvestBase):
    id: int
    harvest_time: datetime

    class Config:
        from_attributes = True
````

## File: app/schemas/notification.py
````python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str

class NotificationCreate(NotificationBase):
    user_id: Optional[int] = None

class NotificationResponse(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime
    time: Optional[str] = None # Trường phụ trợ để Frontend hiển thị chữ "Vừa xong", "2 giờ trước"...

    class Config:
        from_attributes = True # Cho phép Pydantic đọc trực tiếp từ SQLAlchemy Model
````

## File: app/schemas/plant_variety.py
````python
from pydantic import BaseModel, Field, AliasChoices
from typing import Optional


class PlantVarietyBase(BaseModel):
    """Các trường dùng chung khi tạo mới và cập nhật."""
    code: Optional[str] = Field(None, description="Mã giống cây")
    name: str = Field(..., min_length=1, description="Tên giống cây")
    category: Optional[str] = Field(None, description="Nhóm cây: rau ăn lá, củ, quả...")
    stock_quantity: Optional[float] = Field(default=0.0, ge=0)
    # Chấp nhận cả tên 'growth_days' và 'growth_duration_days' từ Frontend gửi lên
    growth_days: Optional[int] = Field(
        None, 
        gt=0, 
        description="Thời gian sinh trưởng (ngày), phải > 0",
        validation_alias=AliasChoices('growth_days', 'growth_duration_days')
    )
    stock_quantity: Optional[float] = Field(0.0, ge=0)
    unit: Optional[str] = Field('kg', min_length=1)


class PlantVarietyCreate(PlantVarietyBase):
    """Dữ liệu client gửi lên khi tạo mới (POST) - chưa có id."""
    pass


class PlantVarietyUpdate(BaseModel):
    """Cập nhật (PUT/PATCH) - mọi trường đều optional, cho phép sửa từng phần."""
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    growth_days: Optional[int] = Field(
        None, 
        gt=0,
        validation_alias=AliasChoices('growth_days', 'growth_duration_days')
    )
    stock_quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1)


class PlantVarietyOut(PlantVarietyBase):
    """Dữ liệu trả về cho client - có thêm id mà lúc tạo không có."""
    id: int

    class Config:
        # Cho phép Pydantic đọc trực tiếp từ object SQLAlchemy (model)
        from_attributes = True
        populate_by_name = True
````

## File: app/schemas/plot.py
````python
from pydantic import BaseModel, Field
from typing import Optional

class PlotBase(BaseModel):
    code: Optional[str] = None
    name: str = Field(..., min_length=1)
    area: Optional[float] = Field(None, gt=0)
    soil_type: Optional[str] = "Đất thịt"  # Loại đất (Đất thịt, Đất cát, Đất đỏ bazan...)
    location: Optional[str] = None
    status: Optional[str] = "Đang nghỉ"     # Trạng thái (Đang nghỉ, Đang canh tác...)
    description: Optional[str] = None

class PlotCreate(PlotBase):
    name: str = Field(..., min_length=1)

class PlotUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    area: Optional[float] = Field(None, gt=0)
    soil_type: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

class PlotOut(PlotBase):
    id: int

    class Config:
        from_attributes = True
````

## File: app/schemas/sale.py
````python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class SaleCreate(BaseModel):
    harvest_id: int
    customer_name: Optional[str] = None
    quantity_kg: float = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    sale_date: date


class SaleOut(SaleCreate):
    id: int
    total_amount: float  # tính toán (không lưu cột riêng, tránh dữ liệu trùng lặp có thể lệch)

    class Config:
        from_attributes = True
````

## File: app/schemas/supply.py
````python
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SupplyCategory = Literal["phan_bon", "thuoc_bvtv", "giong", "dung_cu"]


class SupplyCreate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    category: SupplyCategory = "phan_bon"
    unit: str = Field(..., min_length=1, max_length=30)
    min_threshold: float = Field(0, ge=0)
    location: Optional[str] = Field(None, max_length=150)
    status: Literal["active", "inactive"] = "active"


class SupplyUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    category: Optional[SupplyCategory] = None
    unit: Optional[str] = Field(None, min_length=1, max_length=30)
    min_threshold: Optional[float] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=150)
    status: Optional[Literal["active", "inactive"]] = None


class SupplyOut(BaseModel):
    id: int
    code: Optional[str]
    name: str
    category: Optional[str]
    unit: str
    quantity: float
    min_threshold: float
    location: Optional[str]
    status: str
    model_config = ConfigDict(from_attributes=True)


class SupplyImportCreate(BaseModel):
    quantity_imported: float = Field(..., gt=0)
    unit_price: float = Field(0, ge=0)
    supplier_name: Optional[str] = Field(None, max_length=150)
    batch_number: Optional[str] = Field(None, max_length=100)
    manufacture_date: Optional[date] = None
    expiry_date: Optional[date] = None


class SupplyImportOut(SupplyImportCreate):
    id: int
    supply_id: int
    imported_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SupplyAlert(BaseModel):
    supply_id: int
    code: Optional[str]
    name: str
    alert_type: Literal["low_stock", "expiry"]
    message: str
    quantity: float
    min_threshold: float
    expiry_date: Optional[date] = None
````

## File: app/schemas/traceability.py
````python
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class TraceSupplyUsed(BaseModel):
    supply_name: str
    quantity_used: float
    unit: str


class TraceCareLog(BaseModel):
    log_type: str
    description: Optional[str]
    conditions: Optional[str]
    performed_at: datetime
    supplies_used: List[TraceSupplyUsed]


class TraceSale(BaseModel):
    customer_name: Optional[str]
    quantity_kg: float
    unit_price: float
    sale_date: date


class TraceHarvest(BaseModel):
    harvest_date: date
    quantity_kg: float
    quality_grade: Optional[str]
    sales: List[TraceSale]


class TraceabilityOut(BaseModel):
    """
    Response tổng hợp cho 1 lô trồng - đúng tinh thần 'truy xuất nguồn gốc':
    từ 1 batch_code, biết được TOÀN BỘ lịch sử: trồng ở đâu, giống gì,
    chăm sóc ra sao, dùng vật tư gì, thu hoạch bao nhiêu, bán cho ai.
    """
    batch_code: str
    status: str
    seeding_date: date
    expected_harvest_date: Optional[date]
    plot_name: str
    variety_name: str
    care_logs: List[TraceCareLog]
    harvests: List[TraceHarvest]
````

## File: app/schemas/user.py
````python
from pydantic import BaseModel, Field
from typing import Literal

Role = Literal["quan_ly", "ky_thuat_vien", "nhan_vien"]


class UserBase(BaseModel):
    username: str = Field(..., min_length=3)
    full_name: str = Field(..., min_length=1)
    role: Role


class UserCreate(UserBase):
    # Nhận password thô từ client, sẽ băm (hash) ở Service trước khi lưu -
    # Repository/Model KHÔNG BAO GIỜ được thấy password dạng chữ thường.
    password: str = Field(..., min_length=6)


class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True
        # Cố tình KHÔNG có password / password_hash trong UserOut
        # -> đảm bảo API không bao giờ trả mật khẩu ra ngoài, dù đã hash.
````

## File: app/services/__init__.py
````python

````

## File: app/services/ai_alert.py
````python
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status
import json

from app.repositories import crop_batch as batch_repo
from app.repositories import care_log as care_log_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.schemas.ai_alert import AlertAIRaw, AiAlertOut

PEST_LOOKBACK_DAYS = 14  # ngưỡng "gần đây" để tính cảnh báo sâu bệnh
PEST_KEYWORDS = ("sâu", "bệnh", "rệp", "nấm", "héo", "vàng lá", "bọ trĩ")

SYSTEM_PROMPT = (
    "Ban la tro ly phan tich uu tien cong viec trang trai. QUY TAC BAT BUOC:\n"
    "1) CHI duoc chon batch_code TRONG danh sach duoc cung cap o phan USER. "
    "TUYET DOI khong duoc bia them batch_code khong co trong danh sach.\n"
    "2) Chi dua tren 2 chi so da duoc tinh san cho moi lo (so ngay chua co "
    "nhat ky, co canh bao sau benh gan day hay khong) - khong tu suy dien "
    "them thong tin khac.\n"
    "3) Xep hang toi da 5 lo uu tien nhat, priority_score tu 1 (khan cap "
    "nhat) den 5 (it khan cap nhat trong danh sach duoc chon).\n"
    "4) Day chi la goi y tham khao dua tren du lieu he thong, khong phai "
    "chan doan chuyen mon ve sau benh hay cay trong."
)


def _compute_batch_facts(db: Session, batch) -> dict:
    logs = care_log_repo.get_by_batch(db, batch.id)
    now = datetime.now()

    dated_logs = []
    for log in logs:
        raw_date = log.log_date or log.created_at
        if isinstance(raw_date, datetime):
            log_date = raw_date
        else:
            try:
                log_date = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
                if log_date.tzinfo:
                    log_date = log_date.replace(tzinfo=None)
            except (TypeError, ValueError):
                continue
        dated_logs.append((log, log_date))

    if not dated_logs:
        days_since_last_log = None  # chưa từng có nhật ký nào - trường hợp đặc biệt
    else:
        last_log_date = max(log_date for _, log_date in dated_logs)
        days_since_last_log = (now - last_log_date).days

    has_recent_pest = any(
        (any(keyword in (log.notes or log.description or "").lower() for keyword in PEST_KEYWORDS)
         or "bệnh" in (log.action_type or "").lower())
        and (now - log_date).days <= PEST_LOOKBACK_DAYS
        for log, log_date in dated_logs
    )

    return {
        "batch_code": batch.batch_code,
        "days_since_last_log": days_since_last_log,
        "has_recent_pest": has_recent_pest,
    }


def suggest_batches_to_check(db: Session) -> AiAlertOut:
    growing_batches = batch_repo.get_growing_batches(db)
    now = datetime.now()

    # Rủi ro "dữ liệu thiếu": không có lô nào đang trồng -> không gọi AI
    if len(growing_batches) == 0:
        result = AiAlertOut(
            total_growing_batches=0, priority_batches=[],
            disclaimer=DISCLAIMER_TEXT, created_at=now,
        )
        ai_repo.create(db, "alert", None, json.dumps({"total": 0}),
                        json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)
        return result

    facts = [_compute_batch_facts(db, b) for b in growing_batches]
    valid_batch_codes = {f["batch_code"] for f in facts}  # "nguồn sự thật" để đối chiếu

    facts_lines = []
    for f in facts:
        log_status = (
            "chua co nhat ky nao" if f["days_since_last_log"] is None
            else f"{f['days_since_last_log']} ngay chua co nhat ky moi"
        )
        pest_status = "CO canh bao sau benh gan day" if f["has_recent_pest"] else "khong co canh bao sau benh"
        facts_lines.append(f"- batch_code={f['batch_code']}: {log_status}, {pest_status}")

    user_prompt = (
        f"Danh sach {len(facts)} lo dang trong (status=growing):\n"
        + "\n".join(facts_lines)
        + "\n\nHay xep hang toi da 5 lo can kiem tra uu tien nhat, kem ly do ngan gon "
        "dua tren 2 chi so da cho."
    )

    ai_result: AlertAIRaw = call_gemini_structured(SYSTEM_PROMPT, user_prompt, AlertAIRaw)

    # ===== KIỂM CHỨNG chống hallucination =====
    cited_codes = {item.batch_code for item in ai_result.priority_batches}
    invalid_codes = cited_codes - valid_batch_codes
    if invalid_codes:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI đề xuất batch_code không tồn tại trong danh sách lô đang trồng ({sorted(invalid_codes)}) - kết quả bị từ chối.",
        )
    if len(ai_result.priority_batches) > 5:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI trả về nhiều hơn 5 lô ưu tiên - vi phạm ràng buộc, kết quả bị từ chối.",
        )
    # ===== KẾT THÚC KIỂM CHỨNG =====

    result = AiAlertOut(
        total_growing_batches=len(growing_batches),
        priority_batches=ai_result.priority_batches,
        disclaimer=DISCLAIMER_TEXT,
        created_at=now,
    )

    ai_repo.create(db, "alert", None, json.dumps({"facts": facts}),
                    json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)

    return result
````

## File: app/services/ai_schedule.py
````python
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import HTTPException, status
import json

from app.repositories import crop_batch as batch_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.schemas.ai_schedule import ScheduleAIRaw, AiScheduleOut, ScheduleItemOut

SYSTEM_PROMPT = (
    "Bạn là trợ lý nông nghiệp của trang trại rau sạch, chuyên lập lịch chăm sóc "
    "tham khảo theo dữ liệu thật của lô trồng.\n"
    "QUY TẮC BẮT BUỘC:\n"
    "1) Chỉ trả về JSON đúng theo schema đã cung cấp.\n"
    "2) Tất cả nội dung trong trường description phải viết bằng tiếng Việt có dấu, "
    "đúng chính tả, đúng ngữ pháp, ngắn gọn và dễ hiểu. Không dùng tiếng Việt "
    "không dấu, không viết tắt và không dùng thuật ngữ mơ hồ.\n"
    "3) Mỗi description phải bắt đầu bằng động từ rõ ràng như 'Tưới', 'Bón', "
    "'Kiểm tra' hoặc 'Theo dõi', đồng thời nêu việc cần làm cụ thể.\n"
    "4) day_offset là số ngày kể từ ngày gieo, phải nằm trong khoảng từ 0 đến "
    "số ngày sinh trưởng tối đa được cung cấp. Không tự tính hoặc trả về trường date.\n"
    "5) Lịch phải có ít nhất một lần tưới nước, hai lần bón phân và hai lần kiểm "
    "tra sâu bệnh. Chỉ dựa trên dữ liệu được cung cấp, không tự bịa thông tin.\n"
    "6) Đây là lịch tham khảo, không thay thế đánh giá của chuyên gia nông nghiệp."
)

VIETNAMESE_DIACRITICS = (
    "ăâđêôơưĂÂĐÊÔƠƯ"
    "áàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệ"
    "íìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ"
    "ÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆ"
    "ÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ"
)


def _has_vietnamese_diacritics(text: str) -> bool:
    return any(character in VIETNAMESE_DIACRITICS for character in text)


def generate_schedule(db: Session, batch_id: int) -> AiScheduleOut:
    batch = batch_repo.get_by_id(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lô trồng")

    variety = variety_repo.get_by_id(db, batch.variety_id)
    if variety is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không tìm thấy giống cây của lô này")

    now = datetime.now()
    max_offset = getattr(variety, "growth_days", None)
    if not max_offset or max_offset <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giống cây chưa có thời gian sinh trưởng hợp lệ.",
        )
    seeding_date = batch.sow_date
    if seeding_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lô trồng chưa có ngày gieo hợp lệ.",
        )

    user_prompt = (
        f"Giống cây: {variety.name} (nhóm: {variety.category or 'chưa rõ'})\n"
        f"Thời gian sinh trưởng tối đa: {max_offset} ngày "
        f"(day_offset phải từ 0 đến {max_offset})\n"
        f"Ngày gieo: {seeding_date}\n\n"
        "Hãy đề xuất lịch chăm sóc tham khảo gồm tưới nước định kỳ, ít nhất hai "
        "lần bón phân và ít nhất hai lần kiểm tra sâu bệnh. Mỗi mô tả phải viết "
        "bằng tiếng Việt có dấu, đúng chính tả, đúng ngữ pháp và hướng dẫn rõ "
        "người làm vườn cần thực hiện việc gì."
    )

    ai_result: ScheduleAIRaw = call_gemini_structured(SYSTEM_PROMPT, user_prompt, ScheduleAIRaw)

    # ===== KIỂM CHỨNG chống hallucination =====
    # 1) Không có item nào được vượt quá số ngày sinh trưởng thật của giống cây
    out_of_range = [item for item in ai_result.schedule if item.day_offset > max_offset]
    if out_of_range:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"AI đề xuất mốc chăm sóc vượt quá thời gian sinh trưởng thật "
                f"({max_offset} ngày) - kết quả bị từ chối."
            ),
        )
    # 2) Đủ số lượng tối thiểu theo yêu cầu nghiệp vụ đã thiết kế ở KT1
    count_tuoi = sum(1 for i in ai_result.schedule if i.task_type == "tuoi")
    count_bon_phan = sum(1 for i in ai_result.schedule if i.task_type == "bon_phan")
    count_sau_benh = sum(1 for i in ai_result.schedule if i.task_type == "kiem_tra_sau_benh")
    if not ai_result.schedule or count_tuoi < 1 or count_bon_phan < 2 or count_sau_benh < 2:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"AI trả về lịch không đủ tối thiểu (cần >=1 tưới, >=2 bón phân, "
                f">=2 kiểm tra sâu bệnh; nhận được {count_tuoi} tưới, "
                f"{count_bon_phan} bón phân, {count_sau_benh} kiểm tra) "
                "- kết quả bị từ chối."
            ),
        )
        invalid_descriptions = [
            item for item in ai_result.schedule
            if not _has_vietnamese_diacritics(item.description)
        ]
        if invalid_descriptions:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI trả về mô tả lịch chăm sóc chưa có dấu tiếng Việt hoặc không đúng yêu cầu.",
            )
    # ===== KẾT THÚC KIỂM CHỨNG =====

    # 3) TỰ TÍNH ngày thật từ day_offset - không dùng bất kỳ phép tính ngày
    # tháng nào do AI đưa ra, loại bỏ hẳn rủi ro AI tính sai lịch.
    schedule_out = sorted(
        [
            ScheduleItemOut(
                day_offset=item.day_offset,
                date=seeding_date + timedelta(days=item.day_offset),
                task_type=item.task_type,
                description=item.description,
            )
            for item in ai_result.schedule
        ],
        key=lambda x: x.day_offset,
    )

    result = AiScheduleOut(
        batch_code=batch.batch_code,
        seeding_date=seeding_date,
        expected_harvest_date=batch.expected_harvest_date,  # lấy từ CSDL thật, không phải AI
        schedule=schedule_out,
        disclaimer=DISCLAIMER_TEXT,
        created_at=now,
    )

    ai_repo.create(db, "schedule", batch_id, json.dumps({"user_prompt": user_prompt}),
                    json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)

    return result
````

## File: app/services/ai_summary.py
````python
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status
import json

from app.repositories import crop_batch as batch_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import care_log as care_log_repo
from app.repositories import ai_suggestion as ai_repo
from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.schemas.ai_summary import SummaryAIRaw, AiSummaryOut

LOG_TYPE_LABEL = {
    "tuoi": "Tưới nước",
    "bon_phan": "Bón phân",
    "sau_benh": "Kiểm tra sâu bệnh",
    "khac": "Khác",
}

MAX_LOGS_FOR_SUMMARY = 100
MAX_NOTE_LENGTH = 2000

SYSTEM_PROMPT = (
    "Ban la tro ly quan ly trang trai. QUY TAC BAT BUOC:\n"
    "1) CHI duoc su dung thong tin co trong du lieu nhat ky duoc cung cap o "
    "phan USER. TUYET DOI khong duoc suy dien, gia dinh, hay bo sung bat ky "
    "chi tiet nao khong co trong du lieu (vi du: khong tu bia ngay thang, "
    "khong tu bia loai sau benh neu nhat ky khong ghi ro).\n"
    "2) Voi MOI nhat ky ban su dung de dua ra tom tat hoac phat hien van de, "
    "BAT BUOC phai dua ID cua nhat ky do vao truong referenced_log_ids. "
    "Neu ban khong the tim thay ID cho 1 nhan dinh nao do, KHONG duoc dua "
    "nhan dinh do vao ket qua.\n"
    "3) Day la tom tat tham khao, khong thay the danh gia cua chuyen gia "
    "nong nghiep."
)


def _format_logs_for_prompt(logs) -> str:
    lines = []
    for log in logs:
        action_type = log.action_type or "Chăm sóc"
        label = LOG_TYPE_LABEL.get(action_type, action_type)
        log_date = str(log.log_date or log.created_at or "Không rõ ngày")
        notes = (log.notes or log.description or "")[:MAX_NOTE_LENGTH]
        line = f"- [ID {log.id}] [{log_date}] {label}: {notes or '(không ghi chú)'}"
        lines.append(line)
    return "\n".join(lines)


def summarize_batch(db: Session, batch_id: int) -> AiSummaryOut:
    batch = batch_repo.get_by_id(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lô trồng")

    variety = variety_repo.get_by_id(db, batch.variety_id)
    logs = care_log_repo.get_by_batch(db, batch_id)
    now = datetime.now()

    if len(logs) == 0:
        result = AiSummaryOut(
            batch_code=batch.batch_code, log_count=0,
            summary="Lô trồng này chưa có nhật ký chăm sóc nào được ghi nhận, chưa đủ dữ liệu để tóm tắt.",
            issues_detected=[], referenced_log_ids=[], disclaimer=DISCLAIMER_TEXT, created_at=now,
        )
        ai_repo.create(db, "summary", batch_id, json.dumps({"log_count": 0}),
                        json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)
        return result

    logs = logs[-MAX_LOGS_FOR_SUMMARY:]
    valid_log_ids = {log.id for log in logs}  # "nguồn sự thật" để đối chiếu

    variety_name = variety.name if variety else "(không rõ giống)"
    user_prompt = (
        f"Lô trồng: {batch.batch_code} - giống {variety_name}, gieo ngày {batch.sow_date or 'chưa rõ'}.\n"
        f"Nhat ky cham soc ({len(logs)} ban ghi, sap xep theo thoi gian, moi dong co ID rieng "
        f"o dau - hay dung dung ID nay khi trich dan):\n"
        f"{_format_logs_for_prompt(logs)}\n\n"
        "Hay tom tat tinh trang hien tai cua lo trong 3-4 cau, neu ro neu co dau hieu "
        "bat thuong (sau benh, thieu cham soc keo dai). Nho dien day du referenced_log_ids."
    )

    ai_result: SummaryAIRaw = call_gemini_structured(SYSTEM_PROMPT, user_prompt, SummaryAIRaw)

    # ===== BƯỚC KIỂM CHỨNG (chống hallucination) =====
    # Đối chiếu MỌI id mà AI trích dẫn với danh sách id THẬT trong CSDL.
    # Nếu có dù chỉ 1 id không tồn tại/không thuộc lô này -> đây là bằng
    # chứng rõ ràng AI đã bịa - từ chối kết quả, không trả về cho người dùng.
    cited_ids = set(ai_result.referenced_log_ids)
    invalid_ids = cited_ids - valid_log_ids
    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"AI trích dẫn nhật ký không tồn tại trong dữ liệu thật (ID: {sorted(invalid_ids)}) "
                "- kết quả không đáng tin cậy, đã bị từ chối. Vui lòng thử lại."
            ),
        )
    # Thêm 1 lớp kiểm tra nữa: nếu AI đưa ra tóm tắt mà KHÔNG trích dẫn
    # nhật ký nào cả (referenced_log_ids rỗng) dù đã có dữ liệu -> nghi ngờ
    # AI không thực sự dựa vào dữ liệu, cũng từ chối.
    if len(cited_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI không trích dẫn nhật ký cụ thể nào để chứng minh tóm tắt - kết quả bị từ chối.",
        )
    # ===== KẾT THÚC KIỂM CHỨNG =====

    result = AiSummaryOut(
        batch_code=batch.batch_code, log_count=len(logs),
        summary=ai_result.summary, issues_detected=ai_result.issues_detected,
        referenced_log_ids=sorted(cited_ids), disclaimer=DISCLAIMER_TEXT, created_at=now,
    )

    ai_repo.create(db, "summary", batch_id, json.dumps({"user_prompt": user_prompt}),
                    json.dumps(result.model_dump(mode="json")), DISCLAIMER_TEXT, now)

    return result
````

## File: app/services/care_log.py
````python
from typing import Optional
from sqlalchemy.orm import Session
from app.schemas.care_log import CareLogCreate
from app.repositories import care_log as repo

def get_logs(db: Session, batch_id: Optional[int] = None):
    return repo.get_all(db, batch_id)

def create_log(db: Session, payload: CareLogCreate):
    return repo.create(db, payload)
````

## File: app/services/crop_batch.py
````python
from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.crop_batch import CropBatchCreate, CropBatchUpdate
from app.repositories import crop_batch as repo
from app.repositories import plot as plot_repo
from app.repositories import plant_variety as variety_repo
from app.models.crop_batch import CropBatch

def _generate_batch_code(db: Session, variety_id: int, seeding_date) -> str:
    if hasattr(repo, "count_batches"):
        count = repo.count_batches(db)
    else:
        count = db.query(CropBatch).count()
    date_str = seeding_date.strftime("%Y%m%d")
    return f"CB-{variety_id}-{date_str}-{count + 1:03d}"

def get_batch_or_404(db: Session, batch_id: int) -> CropBatch:
    batch = repo.get_by_id(db, batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy lô trồng với ID={batch_id}"
        )
    return batch

def get_batch_by_code_or_404(db: Session, batch_code: str) -> CropBatch:
    batch = repo.get_by_code(db, batch_code)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy lô trồng với mã: {batch_code}"
        )
    return batch

def create_batch(db: Session, data: CropBatchCreate) -> CropBatch:
    # Kiểm tra Lô đất
    plot = plot_repo.get_by_id(db, data.plot_id) if hasattr(plot_repo, "get_by_id") else None
    
    # Kiểm tra Giống cây
    variety = variety_repo.get_by_id(db, data.variety_id) if hasattr(variety_repo, "get_by_id") else None
    if not variety and hasattr(variety_repo, "PlantVariety"):
        variety = db.query(variety_repo.PlantVariety).filter(variety_repo.PlantVariety.id == data.variety_id).first()

    if not variety:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Giống cây ID={data.variety_id} không tồn tại"
        )

    # Trừ tồn kho giống cây
    if data.status == "growing" and data.quantity_used and data.quantity_used > 0:
        stock = getattr(variety, "stock_quantity", 0.0) or 0.0
        unit = getattr(variety, "unit", "kg") or "kg"
        if stock < data.quantity_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng giống trong kho không đủ! (Còn lại: {stock} {unit})"
            )
        variety.stock_quantity = stock - data.quantity_used

    # Tính ngày thu hoạch dự kiến
    expected_harvest_date = data.expected_harvest_date
    if expected_harvest_date is None:
        growth_days = getattr(variety, "growth_duration_days", 45) or 45
        expected_harvest_date = data.seeding_date + timedelta(days=growth_days)

    batch_code = _generate_batch_code(db, data.variety_id, data.seeding_date)
    batch_name = data.batch_name.strip() if data.batch_name else None

    batch_dict = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    batch_dict.update({
        "batch_code": batch_code,
        "batch_name": batch_name,
        "expected_harvest_date": expected_harvest_date
    })

    return repo.create(db=db, data=batch_dict)

def update_batch(db: Session, batch_id: int, payload: CropBatchUpdate) -> CropBatch:
    batch = get_batch_or_404(db, batch_id)
    if hasattr(payload, "model_dump"):
        update_data = payload.model_dump(exclude_unset=True)
    else:
        update_data = payload.dict(exclude_unset=True)
    return repo.update(db, batch, update_data)

def delete_batch(db: Session, batch_id: int) -> None:
    batch = get_batch_or_404(db, batch_id)
    repo.delete(db, batch)
````

## File: app/services/gemini_advisor.py
````python
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.ai_client import call_gemini_structured, DISCLAIMER_TEXT
from app.repositories import crop_batch as batch_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import farming_log as log_repo
from app.models.crop_batch import CropBatch
from app.models.farming_log import FarmingLog
from app.schemas.farming_log import AdviceAIRaw, AiAdvisorChatResponse, FarmingLogOut

SYSTEM_PROMPT = (
    "Bạn là chuyên gia nông nghiệp tư vấn cho người trồng rau sạch. "
    "Hãy dựa vào toàn bộ dữ liệu của tất cả các lô trồng và toàn bộ nhật ký chăm sóc trong trang trại được cung cấp; "
    "có thể tổng hợp và trả lời mọi câu hỏi liên quan đến bất kỳ ruộng/lô nào. "
    "Không suy diễn thông tin không có trong dữ liệu. "
    "Câu trả lời phải ngắn gọn, rõ ràng, có tính thực tế, phù hợp với quy trình canh tác. "
    "Nếu có dấu hiệu bất thường, hãy nêu rõ triệu chứng và cách xử lý ưu tiên."
)


def _format_all_batches_and_logs(db: Session) -> str:
    batches = db.query(CropBatch).all()
    if not batches:
        return "- Chưa có lô trồng nào trong hệ thống."

    result_lines = []
    for batch in batches:
        variety = variety_repo.get_by_id(db, batch.variety_id)
        variety_name = variety.name if variety else "không rõ"
        
        result_lines.append(f"--- LÔ TRỒNG: {batch.batch_name or batch.batch_code} (Mã: {batch.batch_code}) ---")
        result_lines.append(f"Giống cây: {variety_name}")
        result_lines.append(f"Ngày gieo: {batch.seeding_date}")
        result_lines.append(f"Dự kiến thu hoạch: {batch.expected_harvest_date or 'chưa xác định'}")
        result_lines.append(f"Trạng thái: {batch.status}")
        
        logs = db.query(FarmingLog).filter(FarmingLog.batch_id == batch.id).all()
        if logs:
            result_lines.append("Nhật ký chăm sóc:")
            for log in logs:
                result_lines.append(
                    f"  * {log.log_date} | {log.activity_type}: {log.description}"
                    + (f" | Ảnh: {log.image_url}" if log.image_url else "")
                )
        else:
            result_lines.append("Nhật ký chăm sóc: Chưa có ghi nhận.")
        result_lines.append("")

    return "\n".join(result_lines)


def generate_advice(db: Session, batch_id: int, user_question: str, log_history: Optional[List[FarmingLogOut]] = None):
    # Lấy toàn bộ thông tin tất cả các lô và nhật ký trong trang trại để cung cấp ngữ cảnh đầy đủ cho AI
    all_data_context = _format_all_batches_and_logs(db)

    context = (
        f"DỮ LIỆU TOÀN BỘ TRANG TRẠI (Tất cả các lô và nhật ký):\n"
        f"{all_data_context}\n"
        f"Câu hỏi của nông dân: {user_question}"
    )

    ai_result: AdviceAIRaw = call_gemini_structured(
        SYSTEM_PROMPT,
        context,
        AdviceAIRaw,
    )

    return AiAdvisorChatResponse(
        answer=ai_result.answer.strip(),
        disclaimer=DISCLAIMER_TEXT,
        generated_at=datetime.now(),
    )
````

## File: app/services/harvest.py
````python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.harvest import HarvestLog
from app.repositories import harvest as repo
from app.repositories import crop_batch as batch_repo
from app.schemas.harvest import HarvestCreate


def list_all(db: Session):
    return repo.get_all(db)


def list_by_batch(db: Session, batch_id: int):
    return repo.get_by_batch(db, batch_id)


def create_harvest(db: Session, data: HarvestCreate):
    # 1. Kiểm tra sự tồn tại của Lô trồng
    batch = batch_repo.get_by_id(db, data.batch_id)
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"batch_id={data.batch_id} không tồn tại"
        )
    
    # 2. Tạo bản ghi Thu hoạch mới
    harvest = repo.create(
        db, 
        data.batch_id, 
        data.harvest_date, 
        data.quantity_kg, 
        data.quality_grade, 
        data.harvested_by
    )

    # 3. ĐỒNG BỘ TRẠNG THÁI LÔ TRỒNG -> "Đã thu hoạch"
    try:
        if hasattr(batch, "status"):
            batch.status = "Đã thu hoạch"  # Hoặc "Thu hoạch" tùy theo quy chuẩn UI của bạn
            db.add(batch)
            db.commit()
            db.refresh(batch)
    except Exception as e:
        print(f">>> Cảnh báo: Lỗi tự động cập nhật trạng thái Lô trồng sau thu hoạch: {e}")

    return harvest
def get_by_trace_code(db: Session, trace_code: str):
    return db.query(HarvestLog).filter(HarvestLog.qr_trace_code == trace_code).first()
````

## File: app/services/plant_variety.py
````python
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.crop_batch import CropBatch
from app.schemas.plant_variety import PlantVarietyCreate, PlantVarietyUpdate
from app.repositories import plant_variety as repo


def _normalize_name(name: str) -> str:
    """Hàm phụ trợ: Chuyển tên về chữ thường và xóa toàn bộ khoảng trắng."""
    return name.lower().replace(" ", "") if name else ""


def get_varieties(db: Session):
    return repo.get_all(db)


def create_variety(db: Session, payload: PlantVarietyCreate):
    # 1. Chuẩn hóa tên nhập vào
    normalized_new_name = _normalize_name(payload.name)

    # 2. Lấy danh sách hiện có và kiểm tra trùng lặp
    all_varieties = repo.get_all(db)
    if any(_normalize_name(v.name) == normalized_new_name for v in all_varieties):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên giống cây này đã tồn tại trong hệ thống."
        )

    return repo.create(db, payload)


def update_variety(db: Session, variety_id: int, payload: PlantVarietyUpdate):
    variety = repo.get_by_id(db, variety_id)
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Giống cây không tồn tại."
        )

    # Nếu người dùng có cập nhật tên mới, kiểm tra xem tên mới có bị trùng với giống khác không
    if payload.name:
        normalized_new_name = _normalize_name(payload.name)
        all_varieties = repo.get_all(db)
        
        # Bỏ qua chính nó (v.id != variety_id) khi kiểm tra trùng
        if any(v.id != variety_id and _normalize_name(v.name) == normalized_new_name for v in all_varieties):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên giống cây này đã tồn tại trong hệ thống."
            )

    return repo.update(db, variety, payload)


def delete_variety(db: Session, variety_id: int):
    variety = repo.get_by_id(db, variety_id)
    if not variety:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Giống cây không tồn tại."
        )

    batch_exists = db.query(CropBatch).filter(CropBatch.variety_id == variety_id).first()
    if batch_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa giống cây đang được liên kết với lô trồng."
        )

    # Truyền object 'variety' vào hàm delete của repo
    return repo.delete(db, variety)
````

## File: app/services/plot.py
````python
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.crop_batch import CropBatch
from app.schemas.plot import PlotCreate, PlotUpdate
from app.repositories import plot as repo


def _normalize_name(name: str) -> str:
    """Hàm phụ trợ: Chuyển tên về chữ thường và xóa toàn bộ khoảng trắng."""
    return name.lower().replace(" ", "") if name else ""


def list_plots(db: Session):
    """Lấy danh sách tất cả lô đất"""
    return repo.get_all(db)


def get_plot(db: Session, plot_id: int):
    """Lấy chi tiết 1 lô đất"""
    plot = repo.get_by_id(db, plot_id)
    if not plot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lô đất không tồn tại."
        )
    return plot


def create_plot(db: Session, payload: PlotCreate):
    """Tạo mới lô đất"""
    # 1. Chuẩn hóa tên nhập vào
    normalized_new_name = _normalize_name(payload.name)

    # 2. Lấy danh sách hiện có và kiểm tra trùng lặp
    all_plots = repo.get_all(db)
    if any(_normalize_name(p.name) == normalized_new_name for p in all_plots):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên lô đất này đã tồn tại trong hệ thống."
        )

    return repo.create(db, payload)


def update_plot(db: Session, plot_id: int, payload: PlotUpdate):
    """Cập nhật lô đất"""
    plot = repo.get_by_id(db, plot_id)
    if not plot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lô đất không tồn tại."
        )

    # Nếu người dùng có cập nhật tên mới, kiểm tra xem tên mới có bị trùng với lô đất khác không
    if payload.name:
        normalized_new_name = _normalize_name(payload.name)
        all_plots = repo.get_all(db)

        # Bỏ qua chính nó (p.id != plot_id) khi kiểm tra trùng
        if any(p.id != plot_id and _normalize_name(p.name) == normalized_new_name for p in all_plots):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên lô đất này đã tồn tại trong hệ thống."
            )

    return repo.update(db, plot, payload)


def delete_plot(db: Session, plot_id: int):
    """Xóa lô đất"""
    # Kiểm tra lô đất có tồn tại không
    plot = repo.get_by_id(db, plot_id)
    if not plot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Lô đất không tồn tại."
        )

    # Chặn xóa nếu lô đất đang có lô trồng đang canh tác
    active_batch = db.query(CropBatch).filter(
        CropBatch.plot_id == plot_id,
        CropBatch.status == "growing"
    ).first()

    if active_batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa lô đất đang có lô trồng đang hoạt động (growing)."
        )

    # Xử lý lỗi khóa ngoại khi vẫn còn lô trồng trạng thái khác (harvested, v.v.)
    try:
        return repo.delete(db, plot_id)
    except IntegrityError:
        db.rollback()  # Hoàn tác transaction đang bị lỗi
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa lô đất này vì vẫn còn lịch sử canh tác (lô trồng cũ). Vui lòng xóa các lô trồng liên quan trước."
        )
````

## File: app/services/sale.py
````python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories import sale as repo
from app.repositories import harvest as harvest_repo
from app.schemas.sale import SaleCreate, SaleOut


def list_by_harvest(db: Session, harvest_id: int):
    sales = repo.get_by_harvest(db, harvest_id)
    return [_to_out(s) for s in sales]


def _to_out(sale) -> SaleOut:
    return SaleOut(
        id=sale.id, harvest_id=sale.harvest_id, customer_name=sale.customer_name,
        quantity_kg=sale.quantity_kg, unit_price=sale.unit_price, sale_date=sale.sale_date,
        total_amount=sale.quantity_kg * sale.unit_price,
    )


def create_sale(db: Session, data: SaleCreate) -> SaleOut:
    harvest = harvest_repo.get_by_id(db, data.harvest_id)
    if harvest is None:
        raise HTTPException(status_code=400, detail=f"harvest_id={data.harvest_id} không tồn tại")

    # Logic nghiệp vụ: không cho bán vượt quá sản lượng đã thu hoạch -
    # đảm bảo tính toàn vẹn của chuỗi truy xuất nguồn gốc (không thể bán
    # "rau ảo" nhiều hơn thực tế đã thu).
    already_sold = repo.sum_sold_quantity(db, data.harvest_id)
    if already_sold + data.quantity_kg > harvest.quantity_kg:
        remaining = harvest.quantity_kg - already_sold
        raise HTTPException(
            status_code=400,
            detail=f"Vượt quá sản lượng còn lại để bán (còn {remaining} kg)",
        )

    sale = repo.create(db, data.harvest_id, data.customer_name, data.quantity_kg, data.unit_price, data.sale_date)
    return _to_out(sale)
````

## File: app/services/supply.py
````python
from sqlalchemy.orm import Session
from datetime import date, timedelta
from fastapi import HTTPException, status
from sqlalchemy import or_
from app.models.supply import Supply
from app.repositories import supply as repo
from app.schemas.supply import SupplyCreate, SupplyImportCreate, SupplyOut, SupplyUpdate


def to_output(supply: Supply) -> SupplyOut:
    return SupplyOut(
        id=supply.id,
        code=supply.code,
        name=supply.name,
        category=supply.category or supply.type,
        unit=supply.unit,
        quantity=float(supply.stock_quantity or 0),
        min_threshold=float(supply.min_threshold or 0),
        location=supply.location,
        status=supply.status,
    )


def list_supplies(db: Session, category=None, search=None, low_stock=False):
    return [to_output(item) for item in repo.get_all(db, category, search, low_stock)]


def get_supply_or_404(db: Session, supply_id: int):
    supply = repo.get_by_id(db, supply_id)
    if supply is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy vật tư")
    return supply


def create_supply(db: Session, data: SupplyCreate):
    return to_output(repo.create(db, data))


def update_supply(db: Session, supply_id: int, data: SupplyUpdate):
    supply = get_supply_or_404(db, supply_id)
    return to_output(repo.update(db, supply, data))


def delete_supply(db: Session, supply_id: int):
    supply = get_supply_or_404(db, supply_id)
    repo.delete(db, supply)


def import_supply(db: Session, supply_id: int, data: SupplyImportCreate, user_id=None):
    supply = get_supply_or_404(db, supply_id)
    try:
        record = repo.create_import(db, supply, data, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return record


def get_alerts(db: Session):
    alerts = []
    for supply in db.query(Supply).all():
        if (supply.stock_quantity or 0) <= (supply.min_threshold or 0):
            alerts.append({
                "supply_id": supply.id,
                "code": supply.code,
                "name": supply.name,
                "alert_type": "low_stock",
                "message": f"Tồn kho thấp: còn {supply.stock_quantity or 0} {supply.unit}.",
                "quantity": supply.stock_quantity or 0,
                "min_threshold": supply.min_threshold or 0,
                "expiry_date": None,
            })
        for imported in supply.imports:
            if imported.expiry_date and date.today() <= imported.expiry_date <= date.today() + timedelta(days=30):
                alerts.append({
                    "supply_id": supply.id,
                    "code": supply.code,
                    "name": supply.name,
                    "alert_type": "expiry",
                    "message": f"Lô {imported.batch_number or 'chưa có số lô'} sắp hết hạn.",
                    "quantity": supply.stock_quantity or 0,
                    "min_threshold": supply.min_threshold or 0,
                    "expiry_date": imported.expiry_date,
                })
    return alerts


def deduct_supply_stock(db: Session, supply_id: int, quantity: float, care_log_id: int, notes=None):
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Số lượng vật tư sử dụng phải lớn hơn 0.")
    supply = db.query(Supply).filter(Supply.id == supply_id).with_for_update().first()
    if supply is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy vật tư.")
    if supply.stock_quantity < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Tồn kho {supply.name} không đủ (còn {supply.stock_quantity} {supply.unit}).",
        )
    supply.stock_quantity -= quantity
    from app.models.supply_usage import SupplyUsage
    usage = SupplyUsage(supply_id=supply_id, care_log_id=care_log_id, quantity_used=quantity, notes=notes)
    db.add(usage)
    return usage
````

## File: app/services/traceability.py
````python
from sqlalchemy.orm import Session

from app.repositories import crop_batch as batch_repo
from app.repositories import plot as plot_repo
from app.repositories import plant_variety as variety_repo
from app.repositories import care_log as care_log_repo
from app.repositories import supply as supply_repo
from app.repositories import harvest as harvest_repo
from app.repositories import sale as sale_repo

from app.services.crop_batch import get_batch_by_code_or_404
from app.schemas.traceability import (
    TraceabilityOut, TraceCareLog, TraceSupplyUsed, TraceHarvest, TraceSale,
)


def build_traceability(db: Session, batch_code: str) -> TraceabilityOut:
    # Bước 1: lấy lô trồng gốc theo mã - đây là "điểm vào" của toàn bộ truy xuất
    batch = get_batch_by_code_or_404(db, batch_code)

    # Bước 2: lấy thông tin lô đất + giống cây (dữ liệu tĩnh, không đổi theo thời gian)
    plot = plot_repo.get_by_id(db, batch.plot_id)
    variety = variety_repo.get_by_id(db, batch.variety_id)

    # Bước 3: lấy toàn bộ nhật ký chăm sóc, với MỖI nhật ký lại lấy tiếp
    # danh sách vật tư đã dùng kèm tên vật tư (không chỉ id, để dễ đọc)
    care_logs_out = []
    for log in care_log_repo.get_by_batch(db, batch.id):
        usages = care_log_repo.get_supply_usages(db, log.id)
        supplies_used = []
        for u in usages:
            supply = supply_repo.get_by_id(db, u.supply_id)
            supplies_used.append(TraceSupplyUsed(
                supply_name=supply.name if supply else f"(vật tư #{u.supply_id} đã bị xoá)",
                quantity_used=u.quantity_used,
                unit=supply.unit if supply else "",
            ))
        care_logs_out.append(TraceCareLog(
            log_type=log.log_type, description=log.description, conditions=log.conditions,
            performed_at=log.performed_at, supplies_used=supplies_used,
        ))

    # Bước 4: lấy toàn bộ đợt thu hoạch, với MỖI đợt lại lấy tiếp danh sách bán hàng
    harvests_out = []
    for h in harvest_repo.get_by_batch(db, batch.id):
        sales = sale_repo.get_by_harvest(db, h.id)
        sales_out = [
            TraceSale(customer_name=s.customer_name, quantity_kg=s.quantity_kg,
                      unit_price=s.unit_price, sale_date=s.sale_date)
            for s in sales
        ]
        harvests_out.append(TraceHarvest(
            harvest_date=h.harvest_date, quantity_kg=h.quantity_kg,
            quality_grade=h.quality_grade, sales=sales_out,
        ))

    # Bước 5: gộp tất cả thành 1 response duy nhất
    return TraceabilityOut(
        batch_code=batch.batch_code,
        status=batch.status,
        seeding_date=batch.seeding_date,
        expected_harvest_date=batch.expected_harvest_date,
        plot_name=plot.name if plot else "(lô đất đã bị xoá)",
        variety_name=variety.name if variety else "(giống cây đã bị xoá)",
        care_logs=care_logs_out,
        harvests=harvests_out,
    )
````

## File: app/services/user.py
````python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from passlib.hash import pbkdf2_sha256

from app.repositories import user as repo
from app.schemas.user import UserCreate


def list_users(db: Session):
    return repo.get_all(db)


def get_user_or_404(db: Session, user_id: int):
    user = repo.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    return user


def create_user(db: Session, data: UserCreate):
    # Logic nghiệp vụ 1: không cho trùng username
    if repo.get_by_username(db, data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{data.username}' đã tồn tại",
        )
    # Logic nghiệp vụ 2: băm mật khẩu trước khi lưu - đây LÀ LÝ DO
    # vì sao việc tạo user không thể để Repository tự làm, phải qua Service.
    password_hash = pbkdf2_sha256.hash(data.password)
    return repo.create(db, data.username, password_hash, data.full_name, data.role)


def delete_user(db: Session, user_id: int):
    user = get_user_or_404(db, user_id)
    repo.delete(db, user)
````

## File: app/main.py
````python
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.routers import dashboard, traceability
from app.core.database import Base, engine, ensure_legacy_schema

# Import các router bắt buộc
from app.routers import (
    ai_advisor,
    ai_alert,
    ai_schedule,
    ai_summary,
    auth,
    crop_batch,
    harvest,
    notification,
    plant_variety,
    plot,
    search,
    supply,
)

# Safe Import cho Care Log (Xử lý cả care_log và care_logs)
try:
    from app.routers import care_log
except ImportError:
    from app.routers import care_logs as care_log

# Safe Import cho Farm / Farms (Khắc phục triệt để lỗi 404 /api/v1/farms)
farm_module = None
try:
    from app.routers import farm as farm_module
except ImportError:
    try:
        from app.routers import farms as farm_module
    except ImportError:
        farm_module = None

# 1. Khởi tạo bảng CSDL
ensure_legacy_schema()
Base.metadata.create_all(bind=engine)

# 2. Khởi tạo Ứng dụng FastAPI
app = FastAPI(
    title="GreenFarm AI API",
    version="1.0.0",
    description="Hệ thống Backend Quản lý Nông trại & Trợ lý AI",
    redirect_slashes=True,
)

# 3. Cấu hình CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Health Check Endpoints
@app.get("/", tags=["Health Check"])
def root():
    return {"status": "ok", "message": "GreenFarm AI API đang chạy thành công"}

@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "ok"}

# 5. Đăng ký các Router Cố định
app.include_router(auth.router)
app.include_router(search.router)
app.include_router(notification.router)
app.include_router(ai_advisor.router)
app.include_router(ai_alert.router)
app.include_router(ai_schedule.router)
app.include_router(ai_summary.router)
app.include_router(traceability.router)
app.include_router(supply.router)
app.include_router(dashboard.router)

# 6. Đăng ký Router Quản lý kèm toàn bộ Alias Prefix (Xử lý dứt điểm 404)

# --- Thu hoạch (Harvests) ---
for prefix in ["/api/harvests", "/api/v1/harvests"]:
    app.include_router(harvest.router, prefix=prefix, tags=["Harvests"])

# --- Trang trại (Farms) ---
if farm_module and hasattr(farm_module, "router"):
    for prefix in ["/api/farms", "/api/v1/farms"]:
        app.include_router(farm_module.router, prefix=prefix, tags=["Farms"])

# --- Giống cây trồng (Plant Varieties) ---
for prefix in ["/api/varieties", "/api/v1/varieties", "/api/crop-varieties", "/api/v1/crop-varieties", "/api/plant-varieties", "/api/v1/plant-varieties"]:
    app.include_router(plant_variety.router, prefix=prefix, tags=["Plant Varieties"])

# --- Thửa đất (Land Plots) ---
for prefix in ["/api/plots", "/api/v1/plots", "/api/land-plots", "/api/v1/land-plots"]:
    app.include_router(plot.router, prefix=prefix, tags=["Plots"])

# --- Lô trồng (Crop Batches / Lots) ---
for prefix in ["/api/batches", "/api/v1/batches", "/api/crop-lots", "/api/v1/crop-lots"]:
    app.include_router(crop_batch.router, prefix=prefix, tags=["Crop Batches"])

# --- Nhật ký chăm sóc (Care Logs) ---
for prefix in ["/api/logs", "/api/v1/logs", "/api/care-logs", "/api/v1/care-logs"]:
    app.include_router(care_log.router, prefix=prefix, tags=["Care Logs"])

# 7. Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "message": exc.detail or "Tài nguyên không tồn tại hoặc không có quyền truy cập.",
            "path": str(request.url.path),
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "fail",
            "message": "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.",
            "errors": exc.errors(),
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
            "detail": str(exc),
        },
    )
````

## File: app/mock_data.py
````python
import random
from datetime import datetime, timedelta

# ==========================================
# 1. DỮ LIỆU GỐC (MASTER DATA)
# ==========================================

PLOTS = [
    {"id": 1, "name": "Khu A - Canh tác ngoài trời", "area_m2": 1000, "soil_type": "Đất phù sa"},
    {"id": 2, "name": "Khu B - Canh tác ngoài trời", "area_m2": 1200, "soil_type": "Đất thịt nhẹ"},
    {"id": 3, "name": "Nhà màng công nghệ cao 1", "area_m2": 500, "soil_type": "Giá thể xơ dừa"},
    {"id": 4, "name": "Nhà màng công nghệ cao 2", "area_m2": 500, "soil_type": "Giá thể xơ dừa"}
]

VARIETIES = [
    {"id": 1, "name": "Bắp cải trái vụ", "type": "Rau ăn lá", "growth_days": 75, "yield_per_m2": 3.5},
    {"id": 2, "name": "Cà chua Beef", "type": "Rau ăn quả", "growth_days": 90, "yield_per_m2": 5.0},
    {"id": 3, "name": "Dưa lưới Ichiba", "type": "Trái cây", "growth_days": 70, "yield_per_m2": 2.5}
]

# ==========================================
# 2. HÀM TẠO LỊCH SỬ 3 NĂM (TRANSACTION DATA)
# ==========================================

def generate_farm_history():
    batches = []
    harvests = []
    batch_id_counter = 1
    harvest_id_counter = 1
    
    # Mốc thời gian bắt đầu từ 01/01/2024 đến hiện tại (Tháng 8/2026)
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 8, 22) 
    
    for plot in PLOTS:
        current_date = start_date
        
        while current_date < end_date:
            # Chọn giống cây ngẫu nhiên hoặc theo logic (Nhà màng thường trồng Dưa lưới/Cà chua)
            if "Nhà màng" in plot["name"]:
                variety = random.choice([v for v in VARIETIES if v["id"] in [2, 3]])
            else:
                variety = random.choice([v for v in VARIETIES if v["id"] in [1, 2]])
                
            # Tính toán ngày gieo và dự kiến thu hoạch
            seeding_date = current_date
            expected_harvest = seeding_date + timedelta(days=variety["growth_days"])
            
            # Nếu ngày thu hoạch dự kiến vượt quá hiện tại, lô này đang "growing"
            if expected_harvest > end_date:
                status = "growing"
                actual_harvest_date = None
                harvested_amount = 0
            else:
                status = "harvested"
                # Có thể thu hoạch sớm hoặc trễ 1-3 ngày
                actual_harvest_date = expected_harvest + timedelta(days=random.randint(-3, 3))
                # Sản lượng thực tế (có sai số +- 15% so với lý thuyết)
                base_yield = plot["area_m2"] * variety["yield_per_m2"]
                harvested_amount = round(base_yield * random.uniform(0.85, 1.15), 1)

            # Tạo record lô trồng (CropBatch)
            batch = {
                "id": batch_id_counter,
                "batch_code": f"B{seeding_date.strftime('%y%m')}-{plot['id']}-{variety['id']}",
                "batch_name": f"{variety['name']} vụ {seeding_date.month}/{seeding_date.year}",
                "plot_id": plot["id"],
                "variety_id": variety["id"],
                "seeding_date": seeding_date.strftime("%Y-%m-%d"),
                "expected_harvest_date": expected_harvest.strftime("%Y-%m-%d"),
                "status": status
            }
            batches.append(batch)
            
            # Tạo record thu hoạch nếu đã thu hoạch
            if status == "harvested":
                harvests.append({
                    "id": harvest_id_counter,
                    "batch_id": batch_id_counter,
                    "harvest_date": actual_harvest_date.strftime("%Y-%m-%d"),
                    "amount_kg": harvested_amount,
                    "quality": random.choices(["Tốt", "Khá", "Trung bình"], weights=[70, 20, 10])[0]
                })
                harvest_id_counter += 1
                
            batch_id_counter += 1
            
            # Thời gian nghỉ giữa các vụ (cải tạo đất 10-20 ngày)
            rest_days = random.randint(10, 20)
            current_date = (actual_harvest_date if status == "harvested" else expected_harvest) + timedelta(days=rest_days)

    return {
        "plots": PLOTS,
        "varieties": VARIETIES,
        "batches": batches,
        "harvests": harvests
    }

# Biến global lưu trữ data giả lập để import vào các Router
FARM_DATA = generate_farm_history()
````

## File: app/seed_data.py
````python
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash # Hàm băm mật khẩu của bạn

def seed_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    users = [
        User(
            username="admin@farm.com",
            email="admin@farm.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Quản lý Trại",
            role=UserRole.MANAGER
        ),
        User(
            username="tech@farm.com",
            email="tech@farm.com",
            hashed_password=get_password_hash("tech123"),
            full_name="Kỹ thuật viên KTS",
            role=UserRole.TECHNICIAN
        ),
        User(
            username="staff@farm.com",
            email="staff@farm.com",
            hashed_password=get_password_hash("staff123"),
            full_name="Nhân viên Nông trại",
            role=UserRole.STAFF
        ),
    ]

    for user in users:
        existing = db.query(User).filter(User.username == user.username).first()
        if not existing:
            db.add(user)
    
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_users()
    print("✅ Đã khởi tạo 3 tài khoản mẫu thành công!")
````

## File: frontend/app/(dashboard)/batches/page.tsx
````typescript
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Plus, Search, Sprout, Trash2, ChevronDown, Sparkles, Calendar, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { api, fetcher, ApiError } from '@/lib/api'
import type { CropBatch, Plot, PlantVariety } from '@/lib/types'
import { StatusBadge } from '@/components/batches/status-badge'
import { CreateBatchModal } from '@/components/batches/create-batch-modal'

// 1. Định dạng ngày hiển thị theo chuẩn Việt Nam
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('vi-VN')
  } catch {
    return String(dateStr)
  }
}

// 2. Trích xuất ngày gieo trồng linh hoạt
function getSowingDate(b: Record<string, any>): string | null {
  return (
    b.sowing_date ||
    b.sowingDate ||
    b.sow_date ||
    b.sowDate ||
    b.seeding_date ||
    b.plant_date ||
    b.plantDate ||
    b.created_at ||
    b.createdAt ||
    null
  )
}

// 3. Trích xuất ngày thu hoạch dự kiến
function getHarvestDate(b: Record<string, any>): string | null {
  return (
    b.expected_harvest_date ||
    b.expectedHarvestDate ||
    b.estimated_harvest_date ||
    b.estimatedHarvestDate ||
    b.harvest_date ||
    b.harvestDate ||
    null
  )
}

// 4. Khớp trạng thái linh hoạt
function matchStatus(batchStatus?: string, filterStatus?: string): boolean {
  if (!filterStatus || filterStatus === 'all') return true
  if (!batchStatus) return false

  const s = batchStatus.toLowerCase()
  const f = filterStatus.toLowerCase()

  if (f === 'growing' || f === 'đang trồng') {
    return s === 'growing' || s === 'đang trồng' || s === 'planting'
  }
  if (f === 'harvested' || f === 'đã thu hoạch') {
    return s === 'harvested' || s === 'đã thu hoạch'
  }
  if (f === 'planned' || f === 'kế hoạch') {
    return s === 'planned' || s === 'kế hoạch' || s === 'draft'
  }

  return s === f
}

export default function BatchesPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | string | null>(null)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUserRole(parsedUser.role?.toLowerCase() || '')
      } catch (error) {
        console.error('Lỗi đọc dữ liệu người dùng:', error)
      }
    }
  }, [])

  // Phân quyền hệ thống
  const canManage = ['admin', 'manager', 'technician'].includes(userRole)
  const canDelete = ['admin', 'manager'].includes(userRole)

  // Fetch dữ liệu từ API
  const { data: batches, error: batchesErr } = useSWR<CropBatch[]>('/api/batches', fetcher)
  const { data: plots } = useSWR<Plot[]>('/api/plots', fetcher)
  const { data: varieties } = useSWR<PlantVariety[]>('/api/varieties', fetcher)
  const isLoading = !batches && !batchesErr

  // Ghép nối thông tin tên Lô đất
  const getPlotName = useCallback((b: Record<string, any>) => {
    if (b.plot_name) return b.plot_name
    if (b.plotName) return b.plotName
    if (b.plot?.name) return b.plot.name
    const found = plots?.find((p) => String(p.id) === String(b.plot_id))
    return found?.name ?? `Lô đất #${b.plot_id ?? '—'}`
  }, [plots])

  // Ghép nối thông tin tên Giống cây
  const getVarietyName = useCallback((b: Record<string, any>) => {
    if (b.variety_name) return b.variety_name
    if (b.varietyName) return b.varietyName
    if (b.variety?.name) return b.variety.name
    const found = varieties?.find(
      (v) => String(v.id) === String(b.variety_id || b.plant_variety_id)
    )
    return found?.name ?? `Giống #${b.variety_id ?? '—'}`
  }, [varieties])

  // Lọc và tìm kiếm dữ liệu (Tối ưu performance với useMemo)
  const filteredBatches = useMemo(() => {
    if (!batches) return []
    const query = searchQuery.trim().toLowerCase()

    return batches.filter((b: Record<string, any>) => {
      const matchesSt = matchStatus(b.status, filterStatus)
      if (!matchesSt) return false

      if (!query) return true

      const batchCode = (b.batch_code || b.code || '').toLowerCase()
      const batchName = (b.batch_name || b.name || '').toLowerCase()
      const vName = getVarietyName(b).toLowerCase()
      const pName = getPlotName(b).toLowerCase()

      return (
        batchCode.includes(query) ||
        batchName.includes(query) ||
        vName.includes(query) ||
        pName.includes(query)
      )
    })
  }, [batches, filterStatus, searchQuery, getVarietyName, getPlotName])

  // Đổi trạng thái lô trồng (Optimistic Update)
  async function handleStatusChange(batch: CropBatch, newStatus: string) {
    if (!canManage) return
    setUpdatingId(batch.id)

    // Cập nhật giao diện lập tức (Optimistic)
    const previousBatches = batches
    mutate(
      '/api/batches',
      batches?.map((b) => (b.id === batch.id ? { ...b, status: newStatus } : b)),
      false
    )

    try {
      await api(`/api/batches/${batch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      await mutate('/api/batches')
    } catch (err) {
      // Revert lại nếu có lỗi
      mutate('/api/batches', previousBatches, false)
      alert(err instanceof ApiError ? err.message : 'Không thể thay đổi trạng thái lô trồng.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Cập nhật trường dữ liệu nhanh
  async function handleBatchFieldEdit(
    batch: CropBatch,
    field: 'batch_name' | 'batch_code',
    newValue: string,
    currentValue: string
  ) {
    const trimmedVal = newValue.trim()
    if (!canManage || trimmedVal === currentValue) return

    try {
      await api(`/api/batches/${batch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: trimmedVal }),
      })
      await mutate('/api/batches')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Không thể cập nhật thông tin.')
    }
  }

  // Xóa lô trồng
  async function handleDeleteBatch(batch: CropBatch) {
    if (!canDelete) {
      alert('Bạn không có quyền xóa dữ liệu lô trồng.')
      return
    }
    const displayName =
      batch.batch_name || (batch as any).name || batch.batch_code || (batch as any).code
    
    if (!confirm(`Xác nhận xóa lô trồng "${displayName}"? Tất cả nhật ký liên quan sẽ bị loại bỏ.`)) {
      return
    }

    try {
      await api(`/api/batches/${batch.id}`, { method: 'DELETE' })
      await mutate('/api/batches')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Không thể xóa lô trồng.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Thanh công cụ */}
      <div className="surface-glass flex flex-col gap-3 rounded-2xl p-4 shadow-sm border border-border/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Ô tìm kiếm */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên lô, giống..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background/60 py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc trạng thái */}
          <div className="relative w-full sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-border/60 bg-background/60 py-2 pl-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đang trồng">Đang trồng</option>
              <option value="Kế hoạch">Kế hoạch</option>
              <option value="Đã thu hoạch">Đã thu hoạch</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Nút Tạo lô trồng */}
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 sm:w-auto"
          >
            <Plus className="size-4" />
            Tạo Lô Trồng Mới
          </button>
        )}
      </div>

      {/* Danh sách Lô Trồng */}
      <div className="surface-glass overflow-hidden rounded-3xl border border-border/50 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" />
            Đang tải dữ liệu lô trồng...
          </div>
        ) : filteredBatches && filteredBatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th className="py-3.5 pl-5 pr-3 font-semibold">Tên mẻ / lô</th>
                  <th className="py-3.5 pr-3 font-semibold">Mã lô</th>
                  <th className="py-3.5 pr-3 font-semibold">Lô đất</th>
                  <th className="py-3.5 pr-3 font-semibold">Giống cây</th>
                  <th className="py-3.5 pr-3 font-semibold">Ngày gieo</th>
                  <th className="py-3.5 pr-3 font-semibold">Dự kiến thu hoạch</th>
                  <th className="py-3.5 pr-3 font-semibold">Trạng thái</th>
                  <th className="py-3.5 pl-3 pr-5 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredBatches.map((b: Record<string, any>) => {
                  const sowDate = getSowingDate(b)
                  const harvestDate = getHarvestDate(b)
                  const currentStatus = b.status || 'Đang trồng'
                  const isUpdating = updatingId === b.id
                  const initialName = b.batch_name || b.name || ''
                  const initialCode = b.batch_code || b.code || ''

                  return (
                    <tr key={b.id} className="transition-colors hover:bg-muted/20">
                      <td className="py-3 pl-5 pr-3">
                        {canManage ? (
                          <input
                            defaultValue={initialName}
                            onBlur={(e) =>
                              handleBatchFieldEdit(b as CropBatch, 'batch_name', e.target.value, initialName)
                            }
                            placeholder="Tên lô..."
                            className="w-36 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="font-semibold text-foreground">
                            {initialName || '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs font-semibold text-foreground">
                        {canManage ? (
                          <input
                            defaultValue={initialCode}
                            onBlur={(e) =>
                              handleBatchFieldEdit(b as CropBatch, 'batch_code', e.target.value, initialCode)
                            }
                            className="w-28 rounded-lg border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span>{initialCode || '—'}</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 font-medium text-muted-foreground">{getPlotName(b)}</td>
                      <td className="py-3 pr-3 font-medium text-muted-foreground">{getVarietyName(b)}</td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          {formatDate(sowDate)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          {formatDate(harvestDate)}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={currentStatus} />
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* AI Assistant */}
                          <Link
                            href={`/care-logs?plot=${encodeURIComponent(getPlotName(b))}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                            title="Tư vấn AI cho lô này"
                          >
                            <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="hidden sm:inline">AI gợi ý</span>
                          </Link>

                          {/* Đổi trạng thái */}
                          {canManage && (
                            <select
                              disabled={isUpdating}
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(b as CropBatch, e.target.value)}
                              className="cursor-pointer rounded-lg border border-border/60 bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                            >
                              <option value="Đang trồng">Đang trồng</option>
                              <option value="Kế hoạch">Kế hoạch</option>
                              <option value="Đã thu hoạch">Đã thu hoạch</option>
                            </select>
                          )}

                          {/* Xóa */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(b as CropBatch)}
                              className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                              title="Xóa lô trồng"
                              aria-label="Xóa lô trồng"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sprout className="size-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-semibold text-foreground">Không tìm thấy lô trồng nào</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {canManage
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc tạo thêm lô trồng mới.'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Tạo Lô Mới */}
      {canManage && (
        <CreateBatchModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          plots={plots ?? []}
          varieties={varieties ?? []}
        />
      )}
    </div>
  )
}
````

## File: frontend/app/(dashboard)/care-logs/page.tsx
````typescript
'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  Bot,
  CalendarDays,
  NotebookPen,
  Plus,
  Send,
  Sparkles,
  History,
  AlertTriangle,
  Loader2,
  Lock,
  Copy,
  Download,
  Trash2,
} from 'lucide-react'
import { api, fetcher, ApiError } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'
import type { CropBatch, FarmingLog, FarmingLogActivity } from '@/lib/types'

const ACTIVITY_OPTIONS: FarmingLogActivity[] = [
  'Tưới nước',
  'Bón phân',
  'Phun thuốc',
  'Bệnh hại',
  'Thu hoạch',
  'Khác',
]

interface AiAdvisorResponse {
  reply?: string;
  answer?: string
  response?: string
  advice?: string
  message?: string
  warning?: string
  disclaimer?: string
}

type BatchOption = CropBatch & {
  batch_name?: string
  status?: string
}

type LogItem = FarmingLog & {
  action_type?: string
  notes?: string
  note?: string
  content?: string
  details?: string
}

type SupplyOption = { id: number; name: string; unit: string; quantity: number }

function parseLogsArray(data: any): LogItem[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.logs)) return data.logs
  if (Array.isArray(data.result)) return data.result
  if (Array.isArray(data.data?.logs)) return data.data.logs
  return []
}

export default function CareLogsPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [isAuthLoaded, setIsAuthLoaded] = useState(false)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUserRole(parsedUser.role)
      } catch (error) {
        console.error('Lỗi đọc dữ liệu user:', error)
      }
    }
    setIsAuthLoaded(true)
  }, [])

  const canCreateLog = checkPermission(userRole, PERMISSIONS.LOG_CREATE)
  const canDeleteLog = checkPermission(userRole, PERMISSIONS.LOG_DELETE)
  const canAskAI = checkPermission(userRole, PERMISSIONS.AI_ASK)
  const canGenerateSchedule = checkPermission(userRole, PERMISSIONS.AI_SCHEDULE)

  const {
    data: rawBatches,
    isLoading: loadingBatches,
    mutate: mutateBatches,
  } = useSWR<BatchOption[] | { data: BatchOption[] }>(
    isAuthLoaded ? '/api/batches' : null,
    fetcher
  )

  const batches: BatchOption[] = Array.isArray(rawBatches)
    ? rawBatches
    : Array.isArray(rawBatches?.data)
      ? rawBatches.data
      : []
  const { data: supplies = [] } = useSWR<SupplyOption[]>(isAuthLoaded ? '/api/supplies' : null, fetcher)

  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [showTimeline, setShowTimeline] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSupplyId, setSelectedSupplyId] = useState('')
  const [supplyQuantity, setSupplyQuantity] = useState('')

  // Chuẩn hóa Endpoint lấy danh sách nhật ký
  const {
    data: rawLogs,
    isLoading: loadingLogs,
    mutate: mutateLogs,
  } = useSWR<any>(
    isAuthLoaded && selectedBatchId ? `/api/care-logs?batch_id=${selectedBatchId}` : null,
    fetcher
  )

  const [displayLogs, setDisplayLogs] = useState<LogItem[]>([])

  useEffect(() => {
    if (selectedBatchId) {
      const apiLogs = parseLogsArray(rawLogs)

      const localLogsStr = localStorage.getItem(`local_logs_${selectedBatchId}`)
      const localLogs = localLogsStr ? JSON.parse(localLogsStr) : []

      const merged = [...localLogs, ...apiLogs].reduce((acc: LogItem[], current: LogItem) => {
        const exists = acc.find((item) => item.id === current.id)
        if (!exists) return [...acc, current]
        return acc
      }, [])

      merged.sort((a: any, b: any) => (b.id || 0) - (a.id || 0))

      setDisplayLogs(merged)
    }
  }, [rawLogs, selectedBatchId])

  const [form, setForm] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    activity_type: 'Tưới nước' as FarmingLogActivity,
    description: '',
    image_url: '',
  })

  const [chatInput, setChatInput] = useState('')
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatWarning, setChatWarning] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [schedule, setSchedule] = useState<import('@/lib/types').AiScheduleOut | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [historyFromDate, setHistoryFromDate] = useState('')
  const [historyToDate, setHistoryToDate] = useState('')
  const [isRangeDeleteOpen, setIsRangeDeleteOpen] = useState(false)
  const [isDeletingRange, setIsDeletingRange] = useState(false)

  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(String(batches[0].id))
    }
  }, [batches, selectedBatchId])

  const handleActivityChange = (activity: FarmingLogActivity) => {
    setForm((prev) => ({ ...prev, activity_type: activity }))
  }

  async function handleDeleteLog(logId: number) {
    if (!canDeleteLog || !selectedBatchId) return
    if (!window.confirm('Bạn có chắc muốn xóa nhật ký chăm sóc này không?')) return

    try {
      await api(`/api/care-logs/${logId}`, { method: 'DELETE' })
      setDisplayLogs((previous) => previous.filter((log) => log.id !== logId))
      const localLogsKey = `local_logs_${selectedBatchId}`
      const localLogs = parseLogsArray(JSON.parse(localStorage.getItem(localLogsKey) || '[]'))
      localStorage.setItem(localLogsKey, JSON.stringify(localLogs.filter((log) => log.id !== logId)))
      await mutateLogs()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Không thể xóa nhật ký.')
    }
  }

  async function handleDeleteHistoryByDateRange() {
    if (!isRangeDeleteOpen) {
      setIsRangeDeleteOpen(true)
      return
    }
    if (!canDeleteLog || !selectedBatchId || !historyFromDate || !historyToDate) {
      alert('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.')
      return
    }
    if (historyFromDate > historyToDate) {
      alert('Ngày bắt đầu không được lớn hơn ngày kết thúc.')
      return
    }
    setIsDeletingRange(true)
    try {
      await api(
        `/api/care-logs/range?batch_id=${selectedBatchId}&from_date=${historyFromDate}&to_date=${historyToDate}`,
        { method: 'DELETE' },
      )

      const isInRange = (log: LogItem) => {
        const logDate = (log.log_date || '').slice(0, 10)
        return logDate >= historyFromDate && logDate <= historyToDate
      }
      setDisplayLogs((previous) => previous.filter((log) => !isInRange(log)))
      const localLogsKey = `local_logs_${selectedBatchId}`
      const localLogs = parseLogsArray(JSON.parse(localStorage.getItem(localLogsKey) || '[]'))
      localStorage.setItem(localLogsKey, JSON.stringify(localLogs.filter((log) => !isInRange(log))))
      await mutateLogs()
      alert('Đã xóa lịch sử chăm sóc trong khoảng ngày đã chọn.')
      setHistoryFromDate('')
      setHistoryToDate('')
      setIsRangeDeleteOpen(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Không thể xóa lịch sử chăm sóc.')
    } finally {
      setIsDeletingRange(false)
    }
  }

  async function handleCreateLog(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBatchId) {
      alert('Vui lòng chọn lô trồng trước.')
      return
    }

    const trimmedDescription = form.description.trim()
    const trimmedImageUrl = form.image_url.trim()
    const selectedSupply = supplies.find((item) => item.id === Number(selectedSupplyId))
    if (selectedSupplyId && (Number(supplyQuantity) <= 0 || Number(supplyQuantity) > (selectedSupply?.quantity ?? 0))) {
      alert(selectedSupply && Number(supplyQuantity) > selectedSupply.quantity
        ? `Tồn kho không đủ. Hiện còn ${selectedSupply.quantity} ${selectedSupply.unit}.`
        : 'Số lượng vật tư sử dụng phải lớn hơn 0.')
      return
    }

    setIsSubmitting(true)

    
    const payload = {
  batch_id: selectedBatchId,
  log_date: form.log_date || new Date().toISOString().split('T')[0],
  action_type: form.activity_type || 'Tưới nước',
  activity_type: form.activity_type || 'Tưới nước',
  notes: trimmedDescription || '',
  description: trimmedDescription || '',
  quantity: 0,
  image_url: trimmedImageUrl || null,
  supply_usages: selectedSupplyId ? [{ supply_id: Number(selectedSupplyId), quantity_used: Number(supplyQuantity) }] : [],
}

    try {
  await api('/api/care-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload), 
  })

      const newLogItem: LogItem = {
        id: Date.now(),
        batch_id: Number(selectedBatchId),
        log_date: form.log_date,
        activity_type: form.activity_type,
        action_type: form.activity_type,
        description: trimmedDescription,
        notes: trimmedDescription,
        image_url: trimmedImageUrl || undefined,
      } as LogItem

      setDisplayLogs((prev) => {
        const newLogs = [newLogItem, ...prev]
        localStorage.setItem(`local_logs_${selectedBatchId}`, JSON.stringify(newLogs))
        return newLogs
      })

      await Promise.all([mutateBatches(), mutateLogs()])

      const isDisease = form.activity_type === 'Bệnh hại'
      const hasKeywords =
        trimmedDescription.toLowerCase().includes('sâu') ||
        trimmedDescription.toLowerCase().includes('bệnh')

      if (isDisease || hasKeywords) {
        const event = new CustomEvent('newPestAlert', {
          detail: {
            id: Date.now(),
            title: 'Cảnh báo sâu bệnh',
            message: `Lô ${selectedBatchId}: ${trimmedDescription || 'Phát hiện bệnh hại'}`,
            type: 'warning',
            time: new Date().toISOString(),
          },
        })
        window.dispatchEvent(event)
      }

      setForm({
        log_date: new Date().toISOString().slice(0, 10),
        activity_type: 'Tưới nước',
        description: '',
        image_url: '',
      })
      setSelectedSupplyId('')
      setSupplyQuantity('')
      setShowTimeline(true)
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : 'Không thể lưu nhật ký. Vui lòng kiểm tra lại kết nối.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSend(customPrompt?: string) {
  if (!selectedBatchId) return
  const question = (customPrompt ?? chatInput).trim()
  if (!question) return

  setChatLoading(true)
  setChatAnswer('')
  setChatWarning(null)

  try {
    // Hàm api() đã tự động xử lý Content-Type và JSON.stringify(body)
    const result = (await api('/api/v1/ai-advisor/chat', {
      method: 'POST',
      body: {
        batch_id: Number(selectedBatchId),
        message: question,
      },
    })) as AiAdvisorResponse

    const answerText =
      result.reply || result.response || result.answer || result.advice || result.message || ''
    const warningText = result.warning || result.disclaimer

    setChatAnswer(answerText)
    setChatWarning(
      warningText ||
        'Khuyến nghị mang tính chất tham khảo, vui lòng kiểm tra thực tế vườn cây.'
    )
    setChatInput('')
  } catch (err) {
    setChatAnswer(
      err instanceof ApiError
        ? `Không thể kết nối AI: ${err.message}`
        : 'Không thể kết nối AI lúc này.'
    )
  } finally {
    setChatLoading(false)
  }
  }

  async function handleGenerateSchedule() {
    if (!selectedBatchId || !canGenerateSchedule) return

    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const result = await api<import('@/lib/types').AiScheduleOut>(
        `/api/ai-schedule/batches/${selectedBatchId}/schedule`,
        { method: 'POST' },
      )
      setSchedule(result)
    } catch (err) {
      setScheduleError(
        err instanceof ApiError
          ? err.message
          : 'Không thể sinh lịch chăm sóc lúc này.',
      )
    } finally {
      setScheduleLoading(false)
    }
  }

  async function handleCopySchedule() {
    if (!schedule) return
    const text = [
      `Lịch chăm sóc tham khảo - Lô ${schedule.batch_code}`,
      `Ngày gieo: ${schedule.seeding_date}`,
      ...schedule.schedule.map(
        (item) => `${item.date} - ${scheduleTaskLabels[item.task_type]}: ${item.description}`,
      ),
      `Lưu ý: ${schedule.disclaimer}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      alert('Đã sao chép lịch chăm sóc AI.')
    } catch {
      alert('Không thể sao chép lịch chăm sóc AI.')
    }
  }

  function handleDownloadSchedule() {
    if (!schedule) return
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = schedule.schedule.map((item) => [
      item.date,
      scheduleTaskLabels[item.task_type],
      item.day_offset.toString(),
      item.description,
    ])
    const csv = `\uFEFF${[
      ['Ngày thực hiện', 'Công việc', 'Ngày sau gieo', 'Hướng dẫn'],
      ...rows,
    ].map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\r\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lich-cham-soc-ai-${schedule.batch_code}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const scheduleTaskLabels = {
    tuoi: 'Tưới nước',
    bon_phan: 'Bón phân',
    kiem_tra_sau_benh: 'Kiểm tra sâu bệnh',
  } as const

  const scheduleTaskStyles = {
    tuoi: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
    bon_phan: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    kiem_tra_sau_benh: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
  } as const

  const getActivityBadgeStyle = (activity: string) => {
    switch (activity) {
      case 'Thu hoạch':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
      case 'Tưới nước':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
      case 'Bón phân':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
      case 'Phun thuốc':
      case 'Bệnh hại':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        {/* KHỐI 1: TẠO NHẬT KÝ */}
        <section className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-[#1b3e2b]/10 p-2 text-[#1b3e2b] dark:bg-emerald-500/10 dark:text-emerald-400">
              <NotebookPen className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Ghi chép mới
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Lưu lại các hoạt động tại vườn
              </p>
            </div>
          </div>

          {loadingBatches ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
              Đang tải danh sách lô trồng...
            </div>
          ) : batches.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              Chưa có lô trồng nào. Vui lòng tạo lô trồng trước.
            </div>
          ) : !canCreateLog ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <Lock className="mb-2 size-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Không có quyền truy cập
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Bạn cần quyền Nhân viên, Quản lý hoặc Kỹ thuật viên để thêm nhật ký.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Chọn lô trồng
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value)
                    setSchedule(null)
                    setScheduleError(null)
                  }}
                  className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                >
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_name
                        ? `${batch.batch_name} (${batch.batch_code})`
                        : batch.batch_code}
                      {batch.status ? ` - [${batch.status}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleCreateLog} className="flex flex-1 flex-col space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Ngày ghi
                    </label>
                    <input
                      type="date"
                      value={form.log_date}
                      onChange={(e) => setForm({ ...form, log_date: e.target.value })}
                      className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Hoạt động
                    </label>
                    <select
                      value={form.activity_type}
                      onChange={(e) =>
                        handleActivityChange(e.target.value as FarmingLogActivity)
                      }
                      className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                    >
                      {ACTIVITY_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Ghi chú & Số liệu
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={
                      form.activity_type === 'Thu hoạch'
                        ? 'Ví dụ: Thu hoạch 300 kg, chất lượng đạt tiêu chuẩn...'
                        : 'Ví dụ: Tưới 30 lít, đất đủ ẩm, cây phát triển tốt...'
                    }
                    className="w-full resize-none rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Ảnh minh họa (tuỳ chọn)
                  </label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Vật tư sử dụng (tự động trừ kho)
                    <select value={selectedSupplyId} onChange={(event) => setSelectedSupplyId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal">
                      <option value="">Không sử dụng vật tư</option>
                      {supplies.map((supply) => <option key={supply.id} value={supply.id}>{supply.name} ({supply.quantity} {supply.unit})</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Số lượng sử dụng
                    <input type="number" min="0.01" step="any" disabled={!selectedSupplyId} value={supplyQuantity} onChange={(event) => setSupplyQuantity(event.target.value)} placeholder="Ví dụ: 2" className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal disabled:opacity-50" />
                  </label>
                </div>

                <div className="mt-auto flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedBatchId}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1b3e2b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143021] disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {isSubmitting ? 'Đang lưu...' : 'Thêm nhật ký'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                  >
                    <History className="size-4" />
                    {showTimeline ? 'Ẩn Timeline' : 'Xem Timeline'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* KHỐI 2: CỐ VẤN AI */}
        <section className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cố vấn Gemini AI
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Trợ lý thông minh phân tích và gợi ý chăm sóc
              </p>
            </div>
          </div>

          {!canAskAI ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <Lock className="mb-2 size-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Không có quyền sử dụng AI
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Bạn cần quyền Nhân viên trở lên để hỏi Cố vấn AI.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <textarea
                  rows={3}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhập câu hỏi cần trợ giúp về canh tác..."
                  className="w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-zinc-500"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={chatLoading || !selectedBatchId || !chatInput.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {chatLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {chatLoading ? 'Đang phân tích...' : 'Gửi'}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-1 flex-col justify-between rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Bot className="size-4 text-indigo-600 dark:text-indigo-400" />
                    Trả lời từ AI
                  </div>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                    {chatAnswer ||
                      'Chưa có phản hồi. Chọn lô trồng và gửi câu hỏi để nhận trợ giúp từ Gemini AI.'}
                  </div>
                </div>

                {chatWarning && (
                  <div className="mt-4 flex items-center gap-2 border-t border-red-200 pt-3 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:text-red-400">
                    <AlertTriangle className="size-4 shrink-0 text-red-500" />
                    <span>{chatWarning}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* KHỐI 2: LỊCH CHĂM SÓC AI */}
      <section className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lịch chăm sóc tham khảo</h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                AI dựa trên giống cây và ngày gieo của lô đang chọn
              </p>
            </div>
          </div>
          {canGenerateSchedule ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateSchedule}
                disabled={scheduleLoading || !selectedBatchId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {scheduleLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {scheduleLoading ? 'Đang sinh lịch...' : schedule ? 'Sinh lại lịch' : 'Sinh lịch AI'}
              </button>
              {schedule && (
                <>
                  <button type="button" onClick={handleCopySchedule} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-zinc-900 dark:text-emerald-300">
                    <Copy className="size-3.5" /> Sao chép lịch
                  </button>
                  <button type="button" onClick={handleDownloadSchedule} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-zinc-900 dark:text-emerald-300">
                    <Download className="size-3.5" /> Tải lịch Excel
                  </button>
                </>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <Lock className="size-4" /> Chỉ kỹ thuật viên và quản lý
            </span>
          )}
        </div>

        {scheduleError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{scheduleError}</span>
          </div>
        )}

        {schedule && !scheduleError && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-zinc-400">
              <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900/60">Lô: {schedule.batch_code}</span>
              <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900/60">Gieo: {schedule.seeding_date}</span>
              {schedule.expected_harvest_date && (
                <span className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-zinc-900/60">Dự kiến thu hoạch: {schedule.expected_harvest_date}</span>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {schedule.schedule.map((item) => (
                <div key={`${item.day_offset}-${item.task_type}`} className={`rounded-2xl border p-4 ${scheduleTaskStyles[item.task_type]}`}>
                  <div className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span>{scheduleTaskLabels[item.task_type]}</span>
                    <span>Ngày +{item.day_offset}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{item.description}</p>
                  <p className="mt-2 text-xs font-semibold">Thực hiện: {item.date}</p>
                </div>
              ))}
            </div>
            <p className="flex items-start gap-2 border-t border-emerald-200/70 pt-3 text-xs italic text-emerald-900/70 dark:border-emerald-900/40 dark:text-emerald-200/70">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {schedule.disclaimer}
            </p>
          </div>
        )}
      </section>

      {/* KHỐI 3: TIMELINE LỊCH SỬ CHĂM SÓC */}
      {showTimeline && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Timeline lịch sử chăm sóc
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Theo dõi tiến trình các hoạt động đã thực hiện
                </p>
              </div>
            </div>
            {canDeleteLog && (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {isRangeDeleteOpen && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/60 p-1.5 dark:border-red-900/50 dark:bg-red-950/20">
                    <label className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                      Từ
                      <input type="date" value={historyFromDate} onChange={(event) => setHistoryFromDate(event.target.value)} className="bg-transparent text-foreground outline-none" />
                    </label>
                    <span className="text-xs text-red-500">đến</span>
                    <label className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                      <input type="date" value={historyToDate} onChange={(event) => setHistoryToDate(event.target.value)} className="bg-transparent text-foreground outline-none" />
                    </label>
                  </div>
                )}
                <button type="button" onClick={handleDeleteHistoryByDateRange} disabled={isDeletingRange || !displayLogs.length} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {isDeletingRange ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  {isRangeDeleteOpen ? 'Xác nhận xóa' : 'Xóa theo ngày'}
                </button>
              </div>
            )}
          </div>

          {loadingLogs && displayLogs.length === 0 ? (
            <div className="flex justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
              Đang tải nhật ký chăm sóc...
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              Chưa có nhật ký nào được ghi nhận cho lô trồng này.
            </div>
          ) : (
            <div className="max-h-[min(60vh,680px)] overflow-y-auto overscroll-contain pr-2">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {displayLogs.map((log, index) => {
                const activityType = log.activity_type || log.action_type || 'Chăm sóc'

                const noteText =
                  log.description || log.notes || log.note || log.content || log.details

                const logDate = log.log_date
                  ? new Date(log.log_date).toLocaleDateString('vi-VN')
                  : 'Vừa xong'

                return (
                  <div
                    key={log.id || index}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#f8faf8] p-5 transition hover:border-[#1b3e2b]/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800/40"
                  >
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-200/80 pb-3 dark:border-zinc-800">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getActivityBadgeStyle(
                            activityType
                          )}`}
                        >
                          {activityType}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">{logDate}</span>
                          {canDeleteLog && (
                            <button type="button" onClick={() => handleDeleteLog(log.id)} className="rounded-lg p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" title="Xóa nhật ký" aria-label="Xóa nhật ký">
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                        {noteText ? (
                          noteText
                        ) : (
                          <span className="italic text-slate-400">
                            Không có ghi chú
                          </span>
                        )}
                      </p>
                    </div>

                    {log.image_url && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700">
                        <img
                          src={log.image_url}
                          alt="Ảnh minh họa"
                          className="max-h-40 w-full object-cover transition-transform hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
````

## File: frontend/app/(dashboard)/crop-lots/page.tsx
````typescript
'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Ruler,
  Layers,
  Mountain,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'

interface CropLot {
  id: number
  code: string
  name: string
  area?: number | string
  soil_type?: string
  crop_type?: string
  status?: 'Đang canh tác' | 'Tạm nghỉ' | 'Chuẩn bị đất' | string
  location?: string
  notes?: string
  description?: string
  created_at?: string
}

const CANDIDATE_ENDPOINTS = [
  '/api/v1/plots',
  '/api/plots',
  '/api/v1/land-plots',
  '/api/land-plots',
]

function parseLotsArray(data: any): CropLot[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.lots)) return data.lots
  if (Array.isArray(data.plots)) return data.plots
  if (Array.isArray(data.result)) return data.result
  return []
}

export default function CropLotsPage() {
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUserRole(parsedUser.role)
      } catch (error) {
        console.error('Lỗi khi đọc dữ liệu user:', error)
      }
    }
  }, [])

  const canCreate = checkPermission(userRole, (PERMISSIONS as any).CROP_LOT_CREATE || (PERMISSIONS as any).PLOT_CREATE || 'crop_lot:create')
  const canUpdate = checkPermission(userRole, (PERMISSIONS as any).CROP_LOT_UPDATE || (PERMISSIONS as any).PLOT_UPDATE || 'crop_lot:update')
  const canDelete = checkPermission(userRole, (PERMISSIONS as any).CROP_LOT_DELETE || (PERMISSIONS as any).PLOT_DELETE || 'crop_lot:delete')

  const [activeEndpoint, setActiveEndpoint] = useState<string>('/api/v1/plots')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const smartFetcher = async () => {
    let lastErr: any = null
    for (const endpoint of CANDIDATE_ENDPOINTS) {
      try {
        const res = await api(endpoint, { method: 'GET' })
        setActiveEndpoint(endpoint)
        setErrorMessage(null)
        return parseLotsArray(res)
      } catch (err: any) {
        lastErr = err
      }
    }
    setErrorMessage('Chưa tìm thấy API Lô đất tương thích trên Server Backend.')
    return []
  }

  const { data: lots = [], isLoading, mutate } = useSWR('/api/smart-crop-lots', smartFetcher)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('Tất cả trạng thái')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingLot, setEditingLot] = useState<CropLot | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    area: '',
    soil_type: 'Đất thịt',
    status: 'Đang canh tác',
    location: '',
    notes: '',
  })

  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
        setSuccessMessage(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, successMessage])

  const handleOpenAddModal = () => {
    setEditingLot(null)
    setFormData({
      code: `LO-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      area: '',
      soil_type: 'Đất thịt',
      status: 'Đang canh tác',
      location: '',
      notes: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (lot: CropLot) => {
    setEditingLot(lot)
    setFormData({
      code: lot.code || '',
      name: lot.name || '',
      area: lot.area ? String(lot.area) : '',
      soil_type: lot.soil_type || lot.crop_type || 'Đất thịt',
      status: lot.status || 'Đang canh tác',
      location: lot.location || '',
      notes: lot.notes || lot.description || '',
    })
    setIsModalOpen(true)
  }

  async function executeRequest(method: 'POST' | 'PUT' | 'DELETE', payload?: any, id?: number) {
    const targetEndpoints = activeEndpoint
      ? [activeEndpoint, ...CANDIDATE_ENDPOINTS.filter((e) => e !== activeEndpoint)]
      : CANDIDATE_ENDPOINTS

    let lastError: any = null

    for (const ep of targetEndpoints) {
      const url = id ? `${ep}/${id}` : ep
      try {
        const res = await api(url, {
          method,
          body: payload ? JSON.stringify(payload) : undefined,
        })
        setActiveEndpoint(ep)
        return res
      } catch (err: any) {
        lastError = err
        if (err?.status === 404 || err?.message?.includes('Not Found')) {
          continue
        }
        throw err
      }
    }
    throw lastError || new Error('Không thể kết nối đến API Lô đất.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMessage('Vui lòng nhập Mã lô và Tên lô đất.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      area: formData.area ? parseFloat(formData.area) || formData.area : 0,
      soil_type: formData.soil_type,
      status: formData.status,
      location: formData.location.trim(),
      notes: formData.notes.trim(),
    }

    try {
      if (editingLot) {
        await executeRequest('PUT', payload, editingLot.id)
        setSuccessMessage('Cập nhật thông tin lô đất thành công!')
      } else {
        await executeRequest('POST', payload)
        setSuccessMessage('Thêm lô đất mới thành công!')
      }

      await mutate()
      setIsModalOpen(false)
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : 'Lỗi kết nối Backend. Vui lòng kiểm tra Server Backend.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lô đất này không?')) return

    try {
      await executeRequest('DELETE', undefined, id)
      setSuccessMessage('Xóa lô đất thành công!')
      await mutate()
    } catch (err) {
      setErrorMessage('Không thể xóa lô đất. Kiểm tra lại kết nối Backend.')
    }
  }

  const filteredLots = lots.filter((lot) => {
    const matchSearch =
      lot.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.soil_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.crop_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.location?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus =
      filterStatus === 'Tất cả trạng thái' || lot.status === filterStatus

    return matchSearch && matchStatus
  })

  const totalArea = lots.reduce((acc, lot) => acc + (Number(lot.area) || 0), 0)
  const activeLotsCount = lots.filter((l) => l.status === 'Đang canh tác').length

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Thông báo lỗi & thành công */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="size-5 shrink-0 text-red-600" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Thanh công cụ: Tìm kiếm & Nút thêm mới */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã lô, tên lô đất, loại đất..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-[#1b3e2b]/30 focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="relative shrink-0 w-full sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-white pl-4 pr-10 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#1b3e2b]/30 focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            >
              <option value="Tất cả trạng thái">Tất cả trạng thái</option>
              <option value="Đang canh tác">Đang canh tác</option>
              <option value="Tạm nghỉ">Tạm nghỉ</option>
              <option value="Chuẩn bị đất">Chuẩn bị đất</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#1b3e2b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143021] active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Thêm lô đất mới
          </button>
        )}
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="rounded-xl bg-[#1b3e2b]/10 p-2.5 text-[#1b3e2b] dark:bg-emerald-500/10 dark:text-emerald-400">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Tổng số lô đất
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {lots.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
            <Ruler className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Tổng diện tích
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {totalArea > 0 ? `${totalArea.toLocaleString()} m²` : '--'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
            <Mountain className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Đang canh tác
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {activeLotsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Danh sách Lô đất */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
            Đang tải dữ liệu lô đất...
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            Chưa có lô đất nào hoặc không tìm thấy dữ liệu phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredLots.map((lot) => (
              <div
                key={lot.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#f8faf8] p-5 transition hover:border-[#1b3e2b]/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#1b3e2b] dark:text-emerald-400">
                        {lot.code}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {lot.name}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        lot.status === 'Đang canh tác'
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : lot.status === 'Chuẩn bị đất'
                            ? 'border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'border-slate-300 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {lot.status || 'Đang canh tác'}
                    </span>
                  </div>

                  <div className="space-y-2 py-2 text-xs text-slate-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Mountain className="size-4 shrink-0 text-slate-400" />
                      <span>
                        Loại đất:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {lot.soil_type || lot.crop_type || 'Chưa xác định'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Ruler className="size-4 shrink-0 text-slate-400" />
                      <span>
                        Diện tích:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {lot.area ? `${lot.area} m²` : 'Chưa cập nhật'}
                        </strong>
                      </span>
                    </div>

                    {lot.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 shrink-0 text-slate-400" />
                        <span>
                          Vị trí:{' '}
                          <strong className="text-slate-900 dark:text-white">
                            {lot.location}
                          </strong>
                        </span>
                      </div>
                    )}

                    {(lot.notes || lot.description) && (
                      <p className="mt-2 text-xs italic text-slate-600 dark:text-zinc-400 line-clamp-2">
                        "{lot.notes || lot.description}"
                      </p>
                    )}
                  </div>
                </div>

                {(canUpdate || canDelete) && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3 dark:border-zinc-800">
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenEditModal(lot)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <Pencil className="size-3.5" />
                        Sửa
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(lot.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                        Xóa
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Thêm / Sửa Lô đất */}
      {(canCreate || canUpdate) && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingLot ? 'Chỉnh sửa Lô đất' : 'Thêm Lô đất mới'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Mã lô đất *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: LO-01"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Tên lô đất *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Lô Đất Phía Bắc"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Diện tích (m²)
                  </label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="VD: 1200"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Loại đất
                  </label>
                  <select
                    value={formData.soil_type}
                    onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="Đất thịt">Đất thịt (Loam)</option>
                    <option value="Đất cát">Đất cát</option>
                    <option value="Đất phù sa">Đất phù sa</option>
                    <option value="Đất đỏ bazan">Đất đỏ bazan</option>
                    <option value="Đất sét">Đất sét</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="Đang canh tác">Đang canh tác</option>
                    <option value="Tạm nghỉ">Tạm nghỉ</option>
                    <option value="Chuẩn bị đất">Chuẩn bị đất</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Vị trí / Tọa độ
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="VD: Khu A - Hàng 1..5"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về chất đất, hệ thống tưới..."
                  className="w-full resize-none rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1b3e2b]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl bg-slate-200/80 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1b3e2b] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143021] disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingLot ? 'Cập nhật' : 'Lưu lô đất'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
````

## File: frontend/app/(dashboard)/supplies/page.tsx
````typescript
'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, Loader2, Package, Plus } from 'lucide-react'
import { api, ApiError, fetcher } from '@/lib/api'

type Supply = {
  id: number
  code: string | null
  name: string
  category: string | null
  unit: string
  quantity: number
  min_threshold: number
  location: string | null
  status: string
}

type AlertItem = {
  supply_id: number
  name: string
  alert_type: 'low_stock' | 'expiry'
  message: string
  expiry_date: string | null
}

const categories = [
  ['phan_bon', 'Phân bón'],
  ['thuoc_bvtv', 'Thuốc BVTV / Chế phẩm'],
  ['giong', 'Hạt giống / Cây giống'],
  ['dung_cu', 'Dụng cụ & Bề mặt'],
]

export default function SuppliesPage() {
  const { data: supplies, mutate } = useSWR<Supply[]>('/api/supplies', fetcher)
  const { data: alerts } = useSWR<AlertItem[]>('/api/supplies/alerts', fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ code: '', name: '', category: 'phan_bon', unit: 'kg', min_threshold: '0', location: '' })
  const [importForm, setImportForm] = useState({ quantity_imported: '', unit_price: '0', supplier_name: '', batch_number: '', expiry_date: '' })

  async function createSupply(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null)
    try {
      await api('/api/supplies', { method: 'POST', body: { ...form, min_threshold: Number(form.min_threshold) } })
      setShowCreate(false); setForm({ code: '', name: '', category: 'phan_bon', unit: 'kg', min_threshold: '0', location: '' }); await mutate(); setMessage('Đã thêm vật tư.')
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Không thể thêm vật tư.') } finally { setSaving(false) }
  }

  async function importSupply(event: FormEvent) {
    event.preventDefault(); if (!selectedSupply) return; setSaving(true); setError(null)
    try {
      await api(`/api/supplies/${selectedSupply.id}/import`, { method: 'POST', body: { ...importForm, quantity_imported: Number(importForm.quantity_imported), unit_price: Number(importForm.unit_price) } })
      setSelectedSupply(null); setImportForm({ quantity_imported: '', unit_price: '0', supplier_name: '', batch_number: '', expiry_date: '' }); await mutate(); setMessage('Đã nhập kho thành công.')
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Không thể nhập kho.') } finally { setSaving(false) }
  }

  const lowStockCount = supplies?.filter((item) => item.quantity <= item.min_threshold).length ?? 0
  const expiryCount = alerts?.filter((item) => item.alert_type === 'expiry').length ?? 0

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Package className="size-7 text-primary" /> Quản lý vật tư nông nghiệp</h1><p className="mt-1 text-sm text-muted-foreground">Theo dõi tồn kho, nhập kho và cảnh báo vật tư.</p></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Thêm vật tư</button></div>
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3"><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Tổng loại vật tư</p><p className="mt-1 text-2xl font-bold">{supplies?.length ?? 0}</p></div><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Tồn kho thấp</p><p className="mt-1 text-2xl font-bold text-amber-600">{lowStockCount}</p></div><div className="surface-glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">Sắp hết hạn</p><p className="mt-1 text-2xl font-bold text-red-600">{expiryCount}</p></div></div>
      {alerts && alerts.length > 0 && <div className="surface-glass rounded-2xl p-4"><h2 className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="size-4 text-amber-600" /> Cảnh báo vật tư</h2><div className="grid gap-2 md:grid-cols-2">{alerts.map((item, index) => <p key={`${item.supply_id}-${item.alert_type}-${index}`} className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{item.name}: {item.message}</p>)}</div></div>}
      <section className="surface-glass overflow-hidden rounded-3xl p-5"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-3 py-3">Mã</th><th className="px-3 py-3">Vật tư</th><th className="px-3 py-3">Loại</th><th className="px-3 py-3">Tồn kho</th><th className="px-3 py-3">Vị trí</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-border/60">{!supplies ? <tr><td colSpan={6} className="px-3 py-10 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr> : supplies.map((item) => { const ratio = item.min_threshold > 0 ? Math.min(item.quantity / item.min_threshold, 2) * 50 : 100; return <tr key={item.id}><td className="px-3 py-3 font-mono text-xs">{item.code || '-'}</td><td className="px-3 py-3 font-semibold">{item.name}<div className="mt-1 h-1.5 w-32 rounded-full bg-muted"><div className={`h-1.5 rounded-full ${item.quantity <= item.min_threshold ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(ratio, 100)}%` }} /></div></td><td className="px-3 py-3">{categories.find(([value]) => value === item.category)?.[1] || item.category || 'Chưa phân loại'}</td><td className="px-3 py-3">{item.quantity} {item.unit}<div className="text-xs text-muted-foreground">Tối thiểu: {item.min_threshold}</div></td><td className="px-3 py-3">{item.location || '-'}</td><td className="px-3 py-3 text-right"><button onClick={() => setSelectedSupply(item)} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Nhập kho</button></td></tr> })}</tbody></table></div></section>
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={createSupply} className="w-full max-w-lg space-y-4 rounded-2xl bg-background p-6 shadow-xl"><h2 className="text-lg font-bold">Thêm vật tư</h2><div className="grid gap-3 sm:grid-cols-2"><input placeholder="Mã VT" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" required /><input placeholder="Tên vật tư" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" required /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-border bg-background p-2.5">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input placeholder="Đơn vị: kg, lít, chai" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" required /><input type="number" min="0" placeholder="Ngưỡng tối thiểu" value={form.min_threshold} onChange={(e) => setForm({ ...form, min_threshold: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input placeholder="Vị trí kho" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-border px-4 py-2">Hủy</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">Lưu</button></div></form></div>}
      {selectedSupply && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={importSupply} className="w-full max-w-lg space-y-4 rounded-2xl bg-background p-6 shadow-xl"><h2 className="text-lg font-bold">Nhập kho: {selectedSupply.name}</h2><div className="grid gap-3 sm:grid-cols-2"><input type="number" min="0.01" step="any" required placeholder="Số lượng nhập" value={importForm.quantity_imported} onChange={(e) => setImportForm({ ...importForm, quantity_imported: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input type="number" min="0" step="any" placeholder="Đơn giá" value={importForm.unit_price} onChange={(e) => setImportForm({ ...importForm, unit_price: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input placeholder="Nhà cung cấp" value={importForm.supplier_name} onChange={(e) => setImportForm({ ...importForm, supplier_name: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input placeholder="Số lô" value={importForm.batch_number} onChange={(e) => setImportForm({ ...importForm, batch_number: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /><input type="date" aria-label="Hạn sử dụng" value={importForm.expiry_date} onChange={(e) => setImportForm({ ...importForm, expiry_date: e.target.value })} className="rounded-xl border border-border bg-background p-2.5" /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedSupply(null)} className="rounded-xl border border-border px-4 py-2">Hủy</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">Nhập kho</button></div></form></div>}
    </div>
  )
}
````

## File: frontend/app/(dashboard)/traceability/page.tsx
````typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Search, QrCode, Loader2 } from 'lucide-react'
import { fetcher, ApiError, API_BASE_URL } from '@/lib/api'
import type { TraceabilityOut } from '@/lib/types'
import { inputClass } from '@/components/ui/field'
import { TraceReport } from '@/components/traceability/trace-report'

export default function TraceabilityPage() {
  const [input, setInput] = useState('')
  const [queryCode, setQueryCode] = useState<string | null>(null)

  const { data, error, isLoading } = useSWR<TraceabilityOut>(
    queryCode ? `/api/batches/code/${encodeURIComponent(queryCode)}/trace` : null,
    fetcher,
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const code = input.trim().toUpperCase()
    if (!code) return
    setQueryCode(code)
  }

  // Nguồn gốc dùng để build mã QR + link chia sẻ cho khách hàng cuối.
  const publicUrl =
    typeof window !== 'undefined' && queryCode
      ? `${window.location.origin}/trace/${encodeURIComponent(queryCode)}`
      : undefined

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      

      <form onSubmit={handleSearch} className="surface-glass flex flex-col gap-3 rounded-3xl p-5 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập mã lô trồng, vd: A01"
          className={inputClass + ' font-mono uppercase sm:flex-1'}
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          <Search className="size-4" />
          Tra cứu
        </button>
      </form>

      {isLoading && (
        <div className="surface-glass flex items-center justify-center gap-2 rounded-3xl p-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải dữ liệu truy xuất...
        </div>
      )}

      {error && (
        <div className="surface-glass rounded-3xl p-8 text-center text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : `Không tìm thấy lô trồng có mã "${queryCode}".`}
        </div>
      )}

      {!isLoading && !error && data && <TraceReport data={data} publicUrl={publicUrl} />}

      {!queryCode && !isLoading && (
        <div className="surface-glass rounded-3xl p-12 text-center text-sm text-muted-foreground">
          Nhập mã lô trồng ở trên để bắt đầu tra cứu.
        </div>
      )}
    </div>
  )
}
````

## File: frontend/app/(dashboard)/users/page.tsx
````typescript
'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { Loader2, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { api, ApiError, fetcher } from '@/lib/api'

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Nhân viên' },
  { value: 'technician', label: 'Kỹ thuật viên' },
  { value: 'admin', label: 'Quản trị viên' },
] as const

type Account = {
  id: number
  employee_code: string | null
  username: string
  full_name: string | null
  email: string
  role: string
}

type AccountForm = {
  employee_code: string
  username: string
  full_name: string
  email: string
  password: string
  role: string
}

const initialForm: AccountForm = {
  employee_code: '',
  username: '',
  full_name: '',
  email: '',
  password: '',
  role: 'staff',
}

export default function UsersPage() {
  const { data: accounts, mutate } = useSWR<Account[]>('/api/auth/users', fetcher)
  const [form, setForm] = useState<AccountForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rolePrefix = form.role === 'technician' ? 'KT' : form.role === 'admin' ? 'QT' : 'NV'
  const generatedUsername = form.full_name.trim() || 'Chưa nhập tên'

  function updateField(field: keyof AccountForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: {
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
        },
      })
      setForm(initialForm)
      setMessage('Đã tạo tài khoản thành công.')
      await mutate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo tài khoản.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Users className="size-7 text-primary" /> Quản lý tài khoản
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Tạo tài khoản, mã nhân viên và vai trò truy cập hệ thống.</p>
      </div>

      <section className="surface-glass rounded-3xl p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary"><UserPlus className="size-5" /></div>
          <div>
            <h2 className="font-bold text-foreground">Tạo tài khoản mới</h2>
            <p className="text-xs text-muted-foreground">Chỉ Quản lý và Quản trị viên được sử dụng chức năng này.</p>
          </div>
        </div>
        {message && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {([
            ['full_name', 'Họ và tên', 'Nguyễn Văn A'],
            ['email', 'Email', 'nhanvien@farm.com'],
            ['password', 'Mật khẩu', 'Tối thiểu 6 ký tự'],
          ] as const).map(([field, label, placeholder]) => (
            <label key={field} className="text-sm font-medium text-foreground">
              {label}
              <input
                required
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={(event) => updateField(field, event.target.value)}
                placeholder={placeholder}
                minLength={field === 'password' ? 6 : undefined}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
          ))}
          <label className="text-sm font-medium text-foreground">
            Vai trò
            <select value={form.role} onChange={(event) => updateField('role', event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30">
              {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </label>
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">Thông tin tự động</p>
            <p className="mt-1 text-xs text-muted-foreground">Mã nhân viên: <strong>{rolePrefix}-TỰ-ĐỘNG</strong></p>
            <p className="mt-1 text-xs text-muted-foreground">Tên đăng nhập: <strong>{generatedUsername}</strong></p>
          </div>
          <div className="flex items-end lg:col-span-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </section>

      <section className="surface-glass overflow-hidden rounded-3xl p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-foreground"><ShieldCheck className="size-5 text-primary" /> Danh sách tài khoản</h2>
        {!accounts ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Đang tải...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-3 py-3">Mã nhân viên</th><th className="px-3 py-3">Họ tên</th><th className="px-3 py-3">Tên đăng nhập</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Vai trò</th></tr></thead>
              <tbody className="divide-y divide-border/60">{accounts.map((account) => <tr key={account.id}><td className="px-3 py-3 font-mono text-xs">{account.employee_code || 'Chưa có'}</td><td className="px-3 py-3 font-medium">{account.full_name || 'Chưa cập nhật'}</td><td className="px-3 py-3">{account.username}</td><td className="px-3 py-3">{account.email}</td><td className="px-3 py-3 capitalize">{ROLE_OPTIONS.find((role) => role.value === account.role)?.label || account.role}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
````

## File: frontend/app/(dashboard)/varieties/page.tsx
````typescript
'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  Sprout,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronDown,
  Package,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { PERMISSIONS, checkPermission } from '@/lib/permissions'

interface CropVariety {
  id: number
  code: string
  name: string
  growth_days?: number
  stock_quantity?: number
  unit?: string
  expected_yield?: string
  status?: 'active' | 'inactive' | 'testing' | string
  description?: string
  created_at?: string
}

const CANDIDATE_ENDPOINTS = [
  '/api/v1/varieties',
  '/api/varieties',
  '/api/v1/crop-varieties',
  '/api/crop-varieties',
]

function parseVarietiesArray(data: any): CropVariety[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.varieties)) return data.varieties
  return []
}

export default function VarietiesPage() {
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const rawRole = parsedUser.role || parsedUser.user?.role || ''
        setUserRole(String(rawRole).toLowerCase().trim())
      } catch (error) {
        console.error('Lỗi khi đọc dữ liệu user:', error)
      }
    }
  }, [])

  const allowedRoles = ['admin', 'manager', 'technician', 'tech', 'kythuatvien']
  const isAuthorizedRole = allowedRoles.includes(userRole)

  const canCreate = isAuthorizedRole || checkPermission(userRole, (PERMISSIONS as any).VARIETY_CREATE || 'variety:create')
  const canUpdate = isAuthorizedRole || checkPermission(userRole, (PERMISSIONS as any).VARIETY_UPDATE || 'variety:update')
  const canDelete = isAuthorizedRole || checkPermission(userRole, (PERMISSIONS as any).VARIETY_DELETE || 'variety:delete')

  const [activeEndpoint, setActiveEndpoint] = useState<string>('/api/v1/varieties')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const smartFetcher = async () => {
    let lastErr: any = null
    for (const endpoint of CANDIDATE_ENDPOINTS) {
      try {
        const res = await api(endpoint, { method: 'GET' })
        setActiveEndpoint(endpoint)
        setErrorMessage(null)
        return parseVarietiesArray(res)
      } catch (err: any) {
        lastErr = err
      }
    }
    setErrorMessage('Chưa tìm thấy API Giống cây trồng tương thích trên Server Backend.')
    return []
  }

  const { data: varieties = [], isLoading, mutate } = useSWR('/api/smart-varieties', smartFetcher)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingVariety, setEditingVariety] = useState<CropVariety | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    growth_days: '',
    stock_quantity: '',
    unit: 'cây',
    expected_yield: '',
    status: 'active',
    description: '',
  })

  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
        setSuccessMessage(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, successMessage])

  const handleOpenAddModal = () => {
    setEditingVariety(null)
    setFormData({
      code: `GC-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      growth_days: '60',
      stock_quantity: '',
      unit: 'cây',
      expected_yield: '2.5 kg/m²',
      status: 'active',
      description: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (variety: CropVariety) => {
    setEditingVariety(variety)
    setFormData({
      code: variety.code || '',
      name: variety.name || '',
      growth_days: variety.growth_days ? String(variety.growth_days) : '',
      stock_quantity: variety.stock_quantity !== undefined && variety.stock_quantity !== null
        ? String(variety.stock_quantity)
        : '',
      unit: variety.unit || 'cây',
      expected_yield: variety.expected_yield || '',
      status: variety.status || 'active',
      description: variety.description || '',
    })
    setIsModalOpen(true)
  }

  async function executeRequest(method: 'POST' | 'PUT' | 'DELETE', payload?: any, id?: number) {
    const targetEndpoints = activeEndpoint
      ? [activeEndpoint, ...CANDIDATE_ENDPOINTS.filter((e) => e !== activeEndpoint)]
      : CANDIDATE_ENDPOINTS

    let lastError: any = null

    for (const ep of targetEndpoints) {
      const url = id ? `${ep}/${id}` : ep
      try {
        const res = await api(url, {
          method,
          body: payload ? JSON.stringify(payload) : undefined,
        })
        setActiveEndpoint(ep)
        return res
      } catch (err: any) {
        lastError = err
        if (err?.status === 404 || err?.message?.includes('Not Found')) {
          continue
        }
        throw err
      }
    }
    throw lastError || new Error('Không thể kết nối đến API Giống cây.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMessage('Vui lòng nhập Mã giống và Tên giống cây.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      growth_days: parseInt(formData.growth_days) || 0,
      stock_quantity: formData.stock_quantity ? parseFloat(formData.stock_quantity) : 0,
      unit: formData.unit || 'cây',
      expected_yield: formData.expected_yield.trim(),
      status: formData.status,
      description: formData.description.trim(),
    }

    try {
      if (editingVariety) {
        await executeRequest('PUT', payload, editingVariety.id)
        setSuccessMessage('Cập nhật thông tin giống cây thành công!')
      } else {
        await executeRequest('POST', payload)
        setSuccessMessage('Thêm giống cây mới thành công!')
      }

      await mutate()
      setIsModalOpen(false)
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Lỗi kết nối Backend. Vui lòng kiểm tra Server.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!canDelete) return
    if (!confirm('Bạn có chắc chắn muốn xóa giống cây này không?')) return

    try {
      await executeRequest('DELETE', undefined, id)
      setSuccessMessage('Xóa giống cây thành công!')
      await mutate()
    } catch (err) {
      setErrorMessage('Không thể xóa giống cây. Kiểm tra lại kết nối Backend.')
    }
  }

  const filteredVarieties = varieties.filter((v) => {
    const matchesSearch =
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const currentStatus = (v.status || 'active').toLowerCase()
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
      case 'Đang canh tác':
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Đang canh tác</span>
      case 'inactive':
      case 'Tạm nghỉ':
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Tạm nghỉ</span>
      case 'testing':
      case 'Thử nghiệm':
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Thử nghiệm</span>
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">Đang canh tác</span>
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm">
          <AlertCircle className="size-5 shrink-0 text-red-600" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:opacity-75">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã giống, tên giống cây..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-300/80 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div className="relative inline-block w-full sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-full border border-slate-300/90 bg-white px-4 py-2 pr-10 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang canh tác</option>
              <option value="inactive">Tạm nghỉ</option>
              <option value="testing">Thử nghiệm</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#1b3e2b] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143021]"
          >
            <Plus className="size-4" />
            Thêm giống cây mới
          </button>
        )}
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 size-5 animate-spin text-[#1b3e2b]" />
            Đang tải dữ liệu giống cây...
          </div>
        ) : filteredVarieties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            Không tìm thấy giống cây nào phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredVarieties.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#f8faf8] p-5 transition hover:border-[#1b3e2b]/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-md bg-[#1b3e2b]/10 px-2 py-0.5 text-xs font-bold text-[#1b3e2b] dark:bg-emerald-500/10 dark:text-emerald-400">
                      {item.code}
                    </span>
                    {renderStatusBadge(item.status)}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.name}</h3>
                    <Sprout className="size-5 text-[#1b3e2b] dark:text-emerald-400" />
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-slate-400" />
                      <span>Chu kỳ sinh trưởng: <strong className="text-slate-900 dark:text-white">{item.growth_days || 0} ngày</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="size-4 text-slate-400" />
                      <span>Tồn kho: <strong className="text-slate-900 dark:text-white">{item.stock_quantity ?? 0} {item.unit || 'cây'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-slate-400" />
                      <span>Năng suất dự kiến: <strong className="text-slate-900 dark:text-white">{item.expected_yield || 'Chưa rõ'}</strong></span>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-xs italic text-slate-500 dark:text-zinc-400 line-clamp-2">
                        "{item.description}"
                      </p>
                    )}
                  </div>
                </div>

                {(canUpdate || canDelete) && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3 dark:border-zinc-800">
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <Pencil className="size-3.5" /> Sửa
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                      >
                        <Trash2 className="size-3.5" /> Xóa
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {(canCreate || canUpdate) && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingVariety ? 'Sửa Giống Cây Trồng' : 'Thêm Giống Cây Trồng'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Mã giống *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Tên giống cây *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Cà chua Cherry Red"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Chu kỳ (ngày)</label>
                  <input
                    type="number"
                    value={formData.growth_days}
                    onChange={(e) => setFormData({ ...formData, growth_days: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Năng suất dự kiến</label>
                  <input
                    type="text"
                    value={formData.expected_yield}
                    onChange={(e) => setFormData({ ...formData, expected_yield: e.target.value })}
                    placeholder="VD: 3.5 kg/m²"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Số lượng tồn kho</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="VD: 100"
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Đơn vị tính</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="cây">cây</option>
                    <option value="hạt">hạt</option>
                    <option value="kg">kg</option>
                    <option value="gói">gói</option>
                    <option value="khay">khay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Trạng thái canh tác</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="active">Đang canh tác</option>
                  <option value="testing">Thử nghiệm</option>
                  <option value="inactive">Tạm nghỉ</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">Mô tả đặc tính</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ghi chú về nhiệt độ thích hợp, độ pH đất..."
                  className="w-full resize-none rounded-xl border border-transparent bg-[#eef2ef] px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1b3e2b]/20 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl bg-slate-200/80 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1b3e2b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#143021]"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Lưu giống cây
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
````

## File: frontend/app/(dashboard)/layout.tsx
````typescript
import { AppShell } from '@/components/layout/app-shell'
import GlobalSearch from '@/components/GlobalSearch';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
````

## File: frontend/app/(dashboard)/page.tsx
````typescript
'use client'

import useSWR from 'swr'
import { Sprout, Layers, Leaf, PackageCheck } from 'lucide-react'
import { fetcher } from '@/lib/api'
import type { Plot, PlantVariety, CropBatch } from '@/lib/types'
import { StatCard } from '@/components/dashboard/stat-card'
import { WeatherWidget } from '@/components/dashboard/weather-widget'
import { HarvestYieldChart } from '@/components/dashboard/harvest-yield-chart'

export default function DashboardPage() {
  const { data: plots, isLoading: loadingPlots } = useSWR<Plot[]>('/api/plots', fetcher)
  const { data: varieties, isLoading: loadingVarieties } = useSWR<PlantVariety[]>(
    '/api/varieties',
    fetcher,
  )
  const { data: batches, isLoading: loadingBatches } = useSWR<CropBatch[]>(
    '/api/batches',
    fetcher,
  )

  const growingCount = batches?.filter((b) => b.status === 'growing').length ?? 0
  const harvestedCount = batches?.filter((b) => b.status === 'harvested').length ?? 0

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Hàng thống kê */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Lô đất"
          value={plots?.length ?? 0}
          icon={Layers}
          loading={loadingPlots}
        />
        <StatCard
          label="Giống cây"
          value={varieties?.length ?? 0}
          icon={Leaf}
          loading={loadingVarieties}
        />
        <StatCard
          label="Đang trồng"
          value={growingCount}
          icon={Sprout}
          loading={loadingBatches}
          tone="accent"
        />
        <StatCard
          label="Đã thu hoạch"
          value={harvestedCount}
          icon={PackageCheck}
          loading={loadingBatches}
        />
      </div>

      {/* Biểu đồ thu hoạch tràn rộng */}
      <div>
        <HarvestYieldChart />
      </div>
    </div>
  )
}
````

## File: frontend/app/login/page.tsx
````typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Đóng gói dữ liệu chuẩn OAuth2
      const formData = new URLSearchParams()
      formData.append('username', email.trim())
      formData.append('password', password.trim())

      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.detail || data.message || 'Tài khoản hoặc mật khẩu không chính xác'
        )
      }

      // 2. Trích xuất Token
      const token = data.access_token || data.token || (data.data && data.data.access_token)

      if (!token) {
        throw new Error('Máy chủ không trả về Token xác thực')
      }

      // 3. Giải mã Token & Lấy dữ liệu từ Backend
      const rawUser = data.user || data.data?.user || {}
      let tokenRole = ''
      let tokenUsername = ''

      try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(window.atob(base64))
        
        if (payload.role) tokenRole = String(payload.role).toUpperCase()
        if (payload.sub) tokenUsername = String(payload.sub)
      } catch (e) {
        console.warn("Không thể đọc Payload từ Token.")
      }

      // 4. Xác định Role cuối cùng
      let finalRole = tokenRole || (rawUser.role ? String(rawUser.role).toUpperCase() : '')
      if (!finalRole) {
        const emailLower = email.toLowerCase()
        if (emailLower.includes('admin')) finalRole = 'ADMIN'
        else if (emailLower.includes('manager')) finalRole = 'MANAGER'
        else if (emailLower.includes('technician')) finalRole = 'TECHNICIAN'
        else finalRole = 'USER'
      }

      // 5. Chuẩn hóa dữ liệu User
      const userData = {
        ...rawUser,
        id: rawUser.id || 1,
        email: rawUser.email || email.trim(),
        username: rawUser.username || tokenUsername || email.trim().split('@')[0],
        role: finalRole,
        full_name: rawUser.full_name || rawUser.name || (
          finalRole === 'ADMIN' ? 'Quản trị viên Hệ thống' :
          finalRole === 'MANAGER' ? 'Quản lý Trang trại' :
          finalRole === 'TECHNICIAN' ? 'Kỹ thuật viên' :
          'Nhân viên Nông trại'
        )
      }

      // =========================================================================
      // 6. ĐIỂM SỬA CHÍNH: LƯU TOKEN VÀO TẤT CẢ BỘ NHỚ ĐỂ TRÁNH LỖI 401
      // =========================================================================
      
      // A. Lưu vào localStorage (Cho Axios / Fetch Interceptors)
      localStorage.setItem('token', token)
      localStorage.setItem('access_token', token)
      localStorage.setItem('user', JSON.stringify(userData))

      // B. Lưu vào sessionStorage (Cho tab hiện tại)
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('access_token', token)
      sessionStorage.setItem('user', JSON.stringify(userData))

      // C. Lưu vào Cookie (Cho Next.js Middleware / Server Components)
      document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`

      console.log('✅ Đăng nhập thành công với vai trò:', userData.role)

      // 7. Điều hướng sang trang chính (Reload cứng để cập nhật trạng thái mới nhất)
      window.location.href = '/crop-lots'

    } catch (err: unknown) {
      console.error('Lỗi đăng nhập:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Đăng nhập thất bại, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        
        {/* LOGO & TITLE */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-700 text-white shadow-lg mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">GreenFarm AI</h1>
          <p className="text-emerald-600 font-medium text-sm mt-1">Nông trại thông minh</p>
        </div>

        {/* FORM ĐĂNG NHẬP */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* EMAIL / USERNAME */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tên đăng nhập / Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@farm.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-slate-800"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition text-slate-800"
              />
            </div>
          </div>

          {/* THÔNG BÁO LỖI */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* NÚT SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
````

## File: frontend/app/trace/[code]/page.tsx
````typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Search, QrCode, Loader2 } from 'lucide-react'
import { fetcher, ApiError, API_BASE_URL } from '@/lib/api'
import type { TraceabilityOut } from '@/lib/types'
import { inputClass } from '@/components/ui/field'
import { TraceReport } from '@/components/traceability/trace-report'

export default function TraceabilityPage() {
  const [input, setInput] = useState('')
  const [queryCode, setQueryCode] = useState<string | null>(null)

  const { data, error, isLoading } = useSWR<TraceabilityOut>(
    queryCode ? `/api/batches/code/${encodeURIComponent(queryCode)}/trace` : null,
    fetcher,
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const code = input.trim().toUpperCase()
    if (!code) return
    setQueryCode(code)
  }

  // Nguồn gốc dùng để build mã QR + link chia sẻ cho khách hàng cuối.
  const publicUrl =
    typeof window !== 'undefined' && queryCode
      ? `${window.location.origin}/trace/${encodeURIComponent(queryCode)}`
      : undefined

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
          <QrCode className="size-7 text-primary" />
          Truy xuất nguồn gốc
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhập mã lô trồng (vd. <span className="font-mono">A01</span>) để xem toàn bộ lịch sử: giống cây, lô đất,
          nhật ký chăm sóc, vật tư đã dùng, thu hoạch và bán hàng. Backend hiện lộ endpoint công khai tại{' '}
          <span className="font-mono">GET {API_BASE_URL}/api/batches/code/&#123;batch_code&#125;/trace</span> —
          đây chính là dữ liệu có thể gắn vào mã QR trên bao bì.
        </p>
      </div>

      <form onSubmit={handleSearch} className="surface-glass flex flex-col gap-3 rounded-3xl p-5 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập mã lô trồng, vd: A01"
          className={inputClass + ' font-mono uppercase sm:flex-1'}
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          <Search className="size-4" />
          Tra cứu
        </button>
      </form>

      {isLoading && (
        <div className="surface-glass flex items-center justify-center gap-2 rounded-3xl p-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải dữ liệu truy xuất...
        </div>
      )}

      {error && (
        <div className="surface-glass rounded-3xl p-8 text-center text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : `Không tìm thấy lô trồng có mã "${queryCode}".`}
        </div>
      )}

      {!isLoading && !error && data && <TraceReport data={data} publicUrl={publicUrl} />}

      {!queryCode && !isLoading && (
        <div className="surface-glass rounded-3xl p-12 text-center text-sm text-muted-foreground">
          Nhập mã lô trồng ở trên để bắt đầu tra cứu.
        </div>
      )}
    </div>
  )
}
````

## File: frontend/app/globals.css
````css
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);

  --color-ai: var(--ai);
  --color-ai-foreground: var(--ai-foreground);
  --color-ai-glow: var(--ai-glow);

  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
}

:root {
  color-scheme: light;
  /* Warm organic light-green canvas - đổi theo bản thiết kế mới (trước là #f4f6f0) */
  --background: #ebf0ec;
  --foreground: #1a1a1a;
  --card: #ffffff;
  --card-foreground: #1a1a1a;
  --popover: #ffffff;
  --popover-foreground: #1a1a1a;
  /* Deep forest green — trustworthy, ecological */
  --primary: #1b4332;
  --primary-foreground: #f4f6f0;
  /* Sprout green */
  --secondary: #d8ede0;
  --secondary-foreground: #1b4332;
  --muted: #eef1e9;
  --muted-foreground: #5b6b5e;
  --accent: #52b788;
  --accent-foreground: #0f2c20;
  --destructive: #c0432f;
  --border: rgba(27, 67, 50, 0.1);
  --input: rgba(27, 67, 50, 0.12);
  --ring: #52b788;
  /* AI — mint glow accent to distinguish AI-derived data */
  --ai: #2d6a4f;
  --ai-foreground: #f4f6f0;
  --ai-glow: #95d5b2;
  /* Charts: green-forward scale */
  --chart-1: #2d6a4f;
  --chart-2: #52b788;
  --chart-3: #74c69d;
  --chart-4: #95d5b2;
  --chart-5: #b7e4c7;
  --radius: 0.75rem;

  /* Sidebar: đổi theo bản thiết kế mới */
  --sidebar: #10261c; /* trước: #12281e */
  --sidebar-foreground: #d8ede0;
  /* Active nav = nền tối + chữ emerald sáng (trước: nền mint đặc + chữ tối).
     Đổi Ở ĐÂY DUY NHẤT - sidebar.tsx không cần sửa gì vì đã dùng đúng
     token bg-sidebar-primary / text-sidebar-primary-foreground sẵn. */
  --sidebar-primary: #1a3b2b;
  --sidebar-primary-foreground: #34d399;
  --sidebar-accent: rgba(255, 255, 255, 0.06);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: #1c382a; /* trước: rgba(255,255,255,0.08) - giờ đặc hơn theo spec */
  --sidebar-ring: #52b788;
}

.dark {
  color-scheme: dark;
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    color-scheme: dark;
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --chart-1: oklch(0.87 0 0);
    --chart-2: oklch(0.556 0 0);
    --chart-3: oklch(0.439 0 0);
    --chart-4: oklch(0.371 0 0);
    --chart-5: oklch(0.269 0 0);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
  }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer components {
  /* Glassmorphism surface with mint gradient border for AI-derived content */
  .ai-surface {
    position: relative;
    background: color-mix(in oklab, var(--card) 82%, transparent);
    backdrop-filter: blur(10px);
    border: 1px solid transparent;
    background-clip: padding-box;
  }
  .ai-surface::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(
      135deg,
      var(--ai-glow),
      color-mix(in oklab, var(--accent) 60%, transparent)
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  /*
    MỚI: glass surface DÙNG CHUNG cho card nội dung thường (thống kê, biểu đồ,
    thời tiết...) theo bản thiết kế mới. Tách riêng khỏi .ai-surface (giữ
    nguyên .ai-surface có viền gradient) để khối AI vẫn nổi bật hơn hẳn
    khối dữ liệu thường - đúng yêu cầu gốc "phân biệt dữ liệu AI".
  */
  .surface-glass {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.8);
  }
}
````

## File: frontend/app/layout.tsx
````typescript
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GreenFarm AI — Quản lý Trang trại Rau sạch Thông minh',
  description:
    'Hệ thống quản lý trang trại rau sạch tích hợp AI: theo dõi lô đất, nhật ký chăm sóc, thu hoạch và truy xuất nguồn gốc.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1b4332',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className={`light ${jakarta.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
````

## File: frontend/components/batches/create-batch-modal.tsx
````typescript
'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { X, Loader2, AlertCircle, Sprout } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Plot, PlantVariety } from '@/lib/types'

type ExtendedVariety = PlantVariety & {
  growth_days?: number
}

type CreateBatchModalProps = {
  isOpen: boolean
  onClose: () => void
  plots: Plot[]
  varieties: ExtendedVariety[]
}

export function CreateBatchModal({ isOpen, onClose, plots, varieties }: CreateBatchModalProps) {
  const [batchName, setBatchName] = useState('')
  const [plotId, setPlotId] = useState('')
  const [varietyId, setVarietyId] = useState('')
  const [quantityUsed, setQuantityUsed] = useState('')
  const [seedingDate, setSeedingDate] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Khởi tạo ngày gieo mặc định là ngày hôm nay khi mở modal
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0]
      setSeedingDate(today)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Tìm giống cây đang chọn
  const selectedVariety = varieties.find((v) => String(v.id) === varietyId)

  // Reset form dữ liệu
  const handleResetForm = () => {
    setBatchName('')
    setPlotId('')
    setVarietyId('')
    setQuantityUsed('')
    setSeedingDate(new Date().toISOString().split('T')[0])
    setError('')
  }

  const handleClose = () => {
    handleResetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const quantity = Number(quantityUsed)
    if (!plotId) {
      setError('Vui lòng chọn lô đất.')
      return
    }
    if (!varietyId) {
      setError('Vui lòng chọn giống cây.')
      return
    }
    if (isNaN(quantity) || quantity <= 0) {
      setError('Vui lòng nhập số lượng giống hợp lệ.')
      return
    }

    // Kiểm tra số lượng tồn kho
    const currentStock = selectedVariety?.stock_quantity ?? 0
    if (selectedVariety && currentStock > 0 && quantity > currentStock) {
      setError(
        `Số lượng giống trong kho không đủ! (Còn lại: ${currentStock} ${selectedVariety.unit ?? 'kg'})`
      )
      return
    }

    setSaving(true)

    try {
      await api('/api/batches', {
        method: 'POST',
        body: JSON.stringify({
          batch_name: batchName.trim() || null,
          plot_id: Number(plotId),
          variety_id: Number(varietyId),
          quantity_used: quantity,
          seeding_date: seedingDate,
        }),
      })

      // Làm mới dữ liệu cache SWR
      await Promise.all([
        mutate('/api/batches'),
        mutate('/api/varieties'),
      ])

      handleClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo lô trồng mới. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Đóng"
        >
          <X className="size-5" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="mb-5 border-b border-slate-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-[#1b3e2b] dark:bg-emerald-950/60 dark:text-emerald-400">
              <Sprout className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tạo Lô Trồng Mới</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Mã lô sẽ được hệ thống sinh tự động. Bạn chỉ cần điền tên lô gợi nhớ.
              </p>
            </div>
          </div>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên lô trồng */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Tên lô trồng
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Ví dụ: Lô rau xà lách Vụ Xuân"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500"
            />
          </div>

          {/* Chọn Lô đất */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Lô đất *
            </label>
            <select
              required
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500"
            >
              <option value="">-- Chọn lô đất --</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {plots.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Chưa có lô đất nào - Tạo lô đất trước ở danh mục "Lô đất".
              </p>
            )}
          </div>

          {/* Chọn Giống cây */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Giống cây *
            </label>
            <select
              required
              value={varietyId}
              onChange={(e) => setVarietyId(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-emerald-500"
            >
              <option value="">-- Chọn giống cây --</option>
              {varieties.map((v) => {
                const duration = v.growth_duration_days ?? v.growth_days ?? 0
                return (
                  <option key={v.id} value={v.id}>
                    {v.name} ({duration} ngày) - Kho: {v.stock_quantity ?? 0} {v.unit ?? 'kg'}
                  </option>
                )
              })}
            </select>
            {varieties.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Chưa có giống cây nào - Tạo giống cây trước ở danh mục "Giống cây".
              </p>
            )}
          </div>

          {/* Số lượng sử dụng */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Số lượng giống sử dụng *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={quantityUsed}
                onChange={(e) => setQuantityUsed(e.target.value)}
                placeholder="Ví dụ: 5"
                className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <div className="flex min-w-[80px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {selectedVariety?.unit || 'Đơn vị'}
              </div>
            </div>
            {selectedVariety && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                Tồn kho hiện có:{' '}
                <strong className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {selectedVariety.stock_quantity ?? 0} {selectedVariety.unit ?? 'kg'}
                </strong>
              </p>
            )}
          </div>

          {/* Ngày gieo */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300">
              Ngày gieo trồng *
            </label>
            <input
              type="date"
              required
              value={seedingDate}
              onChange={(e) => setSeedingDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl bg-slate-100 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || !plotId || !varietyId || plots.length === 0 || varieties.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1b3e2b] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#143021] disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? 'Đang tạo…' : 'Tạo lô trồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
````

## File: frontend/components/batches/status-badge.tsx
````typescript
import { cn } from '@/lib/utils'

export type BatchStatus = 'Đang trồng' | 'Đã thu hoạch' | 'Đã hủy' | 'Kế hoạch' | string

// Khai báo ánh xạ toàn bộ mã tiếng Anh -> Nhãn tiếng Việt
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  'Đang trồng': { label: 'Đang trồng', className: 'bg-emerald-100 text-emerald-800' },
  'Đã thu hoạch': { label: 'Đã thu hoạch', className: 'bg-blue-100 text-blue-800' },
  'Đã hủy': { label: 'Đã hủy', className: 'bg-rose-100 text-rose-800' },
  'Kế hoạch': { label: 'Kế hoạch', className: 'bg-amber-100 text-amber-800' },

  // Ánh xạ các từ tiếng Anh
  'growing': { label: 'Đang trồng', className: 'bg-emerald-100 text-emerald-800' },
  'harvested': { label: 'Đã thu hoạch', className: 'bg-blue-100 text-blue-800' },
  'cancelled': { label: 'Đã hủy', className: 'bg-rose-100 text-rose-800' },
  'planned': { label: 'Kế hoạch', className: 'bg-amber-100 text-amber-800' },

  'PLANTING': { label: 'Đang trồng', className: 'bg-emerald-100 text-emerald-800' },
  'HARVESTED': { label: 'Đã thu hoạch', className: 'bg-blue-100 text-blue-800' },
  'CANCELLED': { label: 'Đã hủy', className: 'bg-rose-100 text-rose-800' },
  'PLANNED': { label: 'Kế hoạch', className: 'bg-amber-100 text-amber-800' },
}

const DEFAULT_STATUS = {
  label: 'Đang trồng',
  className: 'bg-emerald-100 text-emerald-800',
}

export function StatusBadge({ status }: { status?: BatchStatus | null }) {
  const currentStatus = (status && STATUS_MAP[status]) 
    ? STATUS_MAP[status] 
    : { label: status ? (STATUS_MAP[status]?.label || status) : DEFAULT_STATUS.label, className: DEFAULT_STATUS.className }

  const { label, className } = currentStatus

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      {label}
    </span>
  )
}
````

## File: frontend/components/crop-lots/create-crop-lot-modal.tsx
````typescript
'use client'

import { useState } from 'react'
import { mutate } from 'swr'
import { X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

interface CreatePlotModalProps {
  isOpen: boolean
  onClose: () => void
}

const INITIAL_FORM_STATE = {
  code: '',
  name: '',
  area: '',
  soil_type: 'Đất thịt',
  status: 'Đang canh tác',
  location: '',
  description: '',
}

export function CreatePlotModal({ isOpen, onClose }: CreatePlotModalProps) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setError('')
    setFormData(INITIAL_FORM_STATE)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await api('/api/plots', {
        method: 'POST',
        body: {
          code: formData.code.trim() || `LO-${Math.floor(100 + Math.random() * 900)}`,
          name: formData.name.trim(),
          area: formData.area ? Number(formData.area) : 0,
          soil_type: formData.soil_type || null,
          status: formData.status,
          location: formData.location.trim() || null,
          description: formData.description.trim() || null,
        } as any,
      })

      // Cập nhật lại danh sách lô đất ngay lập tức
      await mutate('/api/plots')
      handleClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        {/* Nút đóng */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tiêu đề */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">Thêm Lô đất mới</h2>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}

        {/* Form nhập dữ liệu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hàng 1: Mã lô đất & Tên lô đất */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mã lô đất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="VD: LO-405"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tên lô đất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="VD: Lô Đất Phía Bắc"
              />
            </div>
          </div>

          {/* Hàng 2: Diện tích & Loại đất */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Diện tích (m²)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="VD: 1200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Loại đất
              </label>
              <select
                value={formData.soil_type}
                onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Đất thịt">Đất thịt (Loam)</option>
                <option value="Đất cát">Đất cát</option>
                <option value="Đất phù sa">Đất phù sa</option>
                <option value="Đất đỏ bazan">Đất đỏ bazan</option>
                <option value="Đất sét">Đất sét</option>
              </select>
            </div>
          </div>

          {/* Hàng 3: Trạng thái & Vị trí */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Đang canh tác">Đang canh tác</option>
                <option value="Đang nghỉ">Đang nghỉ</option>
                <option value="Đang cải tạo">Đang cải tạo</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Vị trí / Tọa độ
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="VD: Khu A – Hàng 1..5"
              />
            </div>
          </div>

          {/* Hàng 4: Ghi chú */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ghi chú
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ghi chú về chất đất, hệ thống tưới..."
            />
          </div>

          {/* Nút thao tác */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#1e3a2b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#152a1f] transition-colors disabled:opacity-60 flex items-center justify-center min-w-[110px]"
            >
              {saving ? 'Đang lưu…' : 'Lưu lô đất'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePlotModal
````

## File: frontend/components/crop-lots/edit-crop-lot-modal.tsx
````typescript
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Plot } from '@/lib/types'

type EditPlotModalProps = {
  isOpen: boolean
  plot: Plot | null
  onClose: () => void
  onSuccess: () => void
}

export function EditPlotModal({ isOpen, plot, onClose, onSuccess }: EditPlotModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    area_m2: '',
    location: '',
    soil_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (plot) {
      setFormData({
        name: plot.name || '',
        area_m2: plot.area_m2 != null ? String(plot.area_m2) : '',
        location: plot.location || '',
        soil_type: plot.soil_type || '',
      })
    }
  }, [plot])

  if (!isOpen || !plot) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      await api(`/api/plots/${plot.id}`, {
        method: 'PUT',
        body: {
          name: formData.name,
          area_m2: formData.area_m2 ? Number(formData.area_m2) : null,
          location: formData.location || null,
          soil_type: formData.soil_type || null,
        },
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-1">Sửa Lô Đất</h2>
        <p className="text-sm text-gray-500 mb-4">Cập nhật thông tin mảnh đất</p>

        {errorMsg && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên Lô Đất</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Diện tích (m²)</label>
              <input
                type="number"
                value={formData.area_m2}
                onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vị trí</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Loại Đất</label>
            <input
              type="text"
              value={formData.soil_type}
              onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
````

## File: frontend/components/dashboard/ai-alert-card.tsx
````typescript
'use client'

import { useState } from 'react'
import { Bell, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { AiAlertOut } from '@/lib/types'
import { cn } from '@/lib/utils'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<AiAlertOut | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheck() {
    setLoading(true)
    setError(null)
    try {
      // Ép kiểu trực tiếp bằng 'as AiAlertOut'
      const data = (await api('/api/ai-alert/alerts', { method: 'POST' })) as AiAlertOut
      setResult(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể kết nối tới AI')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Thông báo & Cảnh báo AI"
      >
        <Bell className="size-4" />
        {/* Chấm đỏ báo hiệu */}
        <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive ring-2 ring-background" />
      </button>

      {/* Popover Менu thả xuống */}
      {isOpen && (
        <>
          {/* Overlay bấm ra ngoài để đóng */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl transition-all">
            {/* Header Popup */}
            <div className="flex items-center justify-between border-b border-border p-3.5">
              <span className="text-sm font-semibold text-foreground">
                Thông báo & Cảnh báo AI
              </span>

              <button
                type="button"
                onClick={handleCheck}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-emerald-700"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                {result ? 'Làm mới' : 'Xem gợi ý AI'}
              </button>
            </div>

            {/* Nội dung danh sách cảnh báo */}
            <div className="max-h-[380px] overflow-y-auto p-4">
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!error && !result && !loading && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Sparkles className="mx-auto mb-2 size-6 text-emerald-600 opacity-80" />
                  <p>
                    Bấm <strong>"Xem gợi ý AI"</strong> để phân tích các lô đang trồng và xếp hạng lô cần kiểm tra ưu tiên.
                  </p>
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  {result.priority_batches.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Không có lô nào cần chú ý đặc biệt lúc này ({result.total_growing_batches} lô đang trồng).
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {result.priority_batches.map((item) => (
                        <li
                          key={item.batch_code}
                          className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs"
                        >
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-[11px] font-bold text-destructive">
                            {item.priority_score}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{item.batch_code}</p>
                            <p className="mt-0.5 text-muted-foreground">{item.reason}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {result.disclaimer && (
                    <p className="border-t border-border pt-2.5 text-[11px] italic text-muted-foreground">
                      {result.disclaimer}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
````

## File: frontend/components/dashboard/harvest-chart.tsx
````typescript
'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Calendar, BarChart3 } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { fetcher } from '@/lib/api'
import type { CropBatch, PlantVariety } from '@/lib/types'

type ViewMode = 'day' | 'month' | 'year'

const COLOR_PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

// Chuẩn hóa mọi định dạng ngày (24/8/2026, ISO string...) về YYYY-MM-DD
function normalizeDateStr(dateVal: any): string {
  if (!dateVal) return ''
  const str = String(dateVal).trim()
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2].split(' ')[0]
      return `${year}-${month}-${day}`
    }
  }
  try {
    const d = new Date(dateVal)
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  } catch {}
  return str.split('T')[0]
}

// Bóc tách số kg từ nhật ký
function parseQuantityToKg(log: any): number {
  if (!log) return 0
  if (typeof log.quantity === 'number') return log.quantity
  const searchStr = `${log.quantity || ''} ${log.notes || ''} ${log.description || ''} ${log.title || ''} ${log.details || ''}`
  const match = searchStr.match(/(\d+(?:[\.,]\d+)?)/)
  if (!match) return 0
  return parseFloat(match[1].replace(',', '.'))
}

export function HarvestChart() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  const { data: logs } = useSWR<any[]>('/api/logs', fetcher)
  const { data: batches } = useSWR<CropBatch[]>('/api/batches', fetcher)
  const { data: varieties } = useSWR<PlantVariety[]>('/api/varieties', fetcher)

  const getVarietyName = (log: any) => {
    if (log.variety_name) return log.variety_name
    if (log.variety_id) return varieties?.find((v) => v.id === log.variety_id)?.name
    if (log.batch_id) {
      const batch = batches?.find((b) => b.id === log.batch_id)
      if (batch) return varieties?.find((v) => v.id === batch.variety_id)?.name
    }
    const text = `${log.notes || ''} ${log.title || ''} ${log.description || ''}`
    const found = varieties?.find((v) => text.toLowerCase().includes(v.name.toLowerCase()))
    if (found) return found.name

    return varieties?.[0]?.name ?? 'Cây trồng'
  }

  const varietyNames = useMemo(() => {
    if (!varieties || varieties.length === 0) return ['Bắp cải', 'Cà rốt', 'Cải thìa']
    return Array.from(new Set(varieties.map((v) => v.name)))
  }, [varieties])

  // Lọc nhật ký thu hoạch
  const harvestLogs = useMemo(() => {
    if (!logs) return []
    return logs.filter((log) => {
      const actionText = `${log.type || ''} ${log.activity_type || ''} ${log.title || ''} ${log.notes || ''}`.toLowerCase()
      return actionText.includes('thu hoạch') || actionText.includes('harvest')
    })
  }, [logs])

  const chartData = useMemo(() => {
    if (viewMode === 'day') {
      const hours = ['06:00', '09:00', '12:00', '15:00', '18:00']
      
      const dayLogs = harvestLogs.filter(
        (log) => normalizeDateStr(log.date || log.created_at) === selectedDate
      )

      return hours.map((hour) => {
        const item: Record<string, any> = { label: hour }
        let total = 0

        varietyNames.forEach((vName) => {
          const matchingLogs = dayLogs.filter((log) => getVarietyName(log) === vName)
          const dayTotalKg = matchingLogs.reduce((sum, l) => sum + parseQuantityToKg(l), 0)
          
          let qty = 0
          if (dayTotalKg > 0) {
            const hasExactHour = matchingLogs.some((l) => {
              const d = new Date(l.date || l.created_at)
              return !isNaN(d.getTime()) && d.getHours() > 0
            })

            if (hasExactHour) {
              const hourNum = parseInt(hour.split(':')[0])
              qty = matchingLogs.reduce((sum, l) => {
                const d = new Date(l.date || l.created_at)
                return d.getHours() >= hourNum && d.getHours() < hourNum + 3
                  ? sum + parseQuantityToKg(l)
                  : sum
              }, 0)
            } else {
              // Gom sản lượng trong ngày hiển thị tại mốc 09:00
              qty = hour === '09:00' ? dayTotalKg : 0
            }
          }

          item[vName] = qty
          total += qty
        })

        item['Tổng sản lượng'] = total
        return item
      })
    }

    if (viewMode === 'month') {
      const currentYear = new Date(selectedDate).getFullYear() || 2026
      return Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1
        const item: Record<string, any> = { label: `T${monthNum}` }
        let total = 0

        varietyNames.forEach((vName) => {
          const matchingLogs = harvestLogs.filter((log) => {
            const dateStr = normalizeDateStr(log.date || log.created_at)
            const [y, m] = dateStr.split('-').map(Number)
            return y === currentYear && m === monthNum && getVarietyName(log) === vName
          })

          const qty = matchingLogs.reduce((sum, l) => sum + parseQuantityToKg(l), 0)
          item[vName] = qty
          total += qty
        })

        item['Tổng sản lượng'] = total
        return item
      })
    }

    // Xem theo Năm
    const currentYear = new Date().getFullYear()
    const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear]

    return years.map((yr) => {
      const item: Record<string, any> = { label: `${yr}` }
      let total = 0

      varietyNames.forEach((vName) => {
        const matchingLogs = harvestLogs.filter((log) => {
          const dateStr = normalizeDateStr(log.date || log.created_at)
          const y = parseInt(dateStr.split('-')[0])
          return y === yr && getVarietyName(log) === vName
        })

        const qty = matchingLogs.reduce((sum, l) => sum + parseQuantityToKg(l), 0)
        item[vName] = qty
        total += qty
      })

      item['Tổng sản lượng'] = total
      return item
    })
  }, [harvestLogs, viewMode, selectedDate, varietyNames, batches, varieties])

  return (
    <div className="w-full rounded-3xl border border-border/60 bg-white p-5 shadow-sm dark:bg-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Sản lượng thu hoạch</h3>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'day' && `Chi tiết thu hoạch ngày ${selectedDate.split('-').reverse().join('/')}`}
              {viewMode === 'month' && 'Thống kê tổng sản lượng từ nhật ký theo tháng'}
              {viewMode === 'year' && 'Tổng sản lượng tích lũy qua các năm'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'day' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-1 text-xs">
              <Calendar className="size-3.5 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-foreground outline-none cursor-pointer"
              />
            </div>
          )}

          <div className="flex rounded-xl bg-muted p-1 text-xs font-medium">
            <button
              onClick={() => setViewMode('day')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'day'
                  ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'month'
                  ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'year'
                  ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Năm
            </button>
          </div>
        </div>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} unit=" kg" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any) => [`${Number(value || 0).toLocaleString()} kg`]}
            />
            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />

            {varietyNames.map((vName, idx) => (
              <Bar
                key={vName}
                dataKey={vName}
                fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            ))}

            <Line
              type="monotone"
              dataKey="Tổng sản lượng"
              stroke="#EF4444"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#EF4444' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default HarvestChart
````

## File: frontend/components/dashboard/harvest-yield-chart.tsx
````typescript
'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { BarChart3, Calendar, Loader2, AlertTriangle } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetcher } from '@/lib/api'

type ViewMode = 'day' | 'month' | 'year'
type ChartValue = string | number
type ChartPoint = {
  label: string
  total: number
  [variety: string]: ChartValue
}
type HarvestChartResponse = {
  view: ViewMode
  varieties: string[]
  data: ChartPoint[]
}
type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  value?: ChartValue
  color?: string
}
type HarvestTooltipProps = {
  active?: boolean
  label?: ChartValue
  payload?: readonly TooltipEntry[]
  varieties: string[]
}
type HarvestLegendProps = {
  varieties: string[]
  colors: Record<string, string>
}

const PALETTE = ['#059669', '#2563EB', '#D97706', '#DB2777', '#7C3AED', '#0891B2', '#65A30D']
const TOTAL_COLOR = '#DC2626'

function createMockData(view: ViewMode): HarvestChartResponse {
  const labels = view === 'month'
    ? Array.from({ length: 12 }, (_, index) => `T${index + 1}`)
    : view === 'year'
      ? ['2023', '2024', '2025', '2026']
      : Array.from({ length: 30 }, (_, index) => `${String(index + 1).padStart(2, '0')}/09`)
  const varieties = ['Cà chua', 'Su su']
  const data = labels.map((label, index) => {
    const tomato = view === 'month' && [2, 5, 8].includes(index) ? 180 + index * 5 : 0
    const chayote = view === 'month' && [5, 8].includes(index) ? 120 + index * 4 : 0
    const yearlyFactor = view === 'year' ? index * 45 : 0
    const dailyValue = view === 'day' && index === 16 ? 320 : 0
    const first = tomato + yearlyFactor + dailyValue
    const second = chayote + (view === 'year' ? index * 25 : 0)
    return { label, 'Cà chua': first, 'Su su': second, total: first + second }
  })
  return { view, varieties, data }
}

function formatKg(value: ChartValue | undefined): string {
  const numericValue = typeof value === 'number' ? value : Number(value ?? 0)
  return `${numericValue.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg`
}

function HarvestTooltip({ active, label, payload, varieties }: HarvestTooltipProps) {
  if (!active || !payload?.length) return null
  const total = payload.find((entry) => entry.dataKey === 'total')?.value
  return (
    <div className="min-w-48 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
      <p className="mb-2 font-bold text-slate-900 dark:text-white">{label}</p>
      <p className="mb-2 border-b border-slate-200 pb-2 font-bold text-red-700 dark:border-zinc-700 dark:text-red-300">
        Tổng sản lượng: {formatKg(total)}
      </p>
      <div className="space-y-1.5">
        {varieties.map((variety) => {
          const entry = payload.find((item) => item.dataKey === variety)
          return (
            <div key={variety} className="flex items-center justify-between gap-4 text-slate-600 dark:text-zinc-300">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry?.color }} />
                <span className="truncate">{variety}</span>
              </span>
              <span className="font-semibold">{formatKg(entry?.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HarvestLegend({ varieties, colors }: HarvestLegendProps) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-3 text-xs text-slate-600 dark:text-zinc-300">
      {varieties.map((variety) => (
        <span key={variety} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: colors[variety] }} />
          {variety}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: TOTAL_COLOR }} />
        Tổng sản lượng
      </span>
    </div>
  )
}

export function HarvestYieldChart() {
  const [view, setView] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const endpoint = `/api/dashboard/harvest-chart?view=${view}`
  const { data, error, isLoading } = useSWR<HarvestChartResponse>(endpoint, fetcher)
  const usingMock = Boolean(error)
  const chart = data ?? (usingMock ? createMockData(view) : null)
  const colors = useMemo(
    () => Object.fromEntries((chart?.varieties ?? []).map((name, index) => [name, PALETTE[index % PALETTE.length]])),
    [chart?.varieties],
  )
  const hasHarvest = Boolean(chart?.data.some((point) => point.total > 0))

  const subtitle = view === 'day'
    ? `Thống kê từng ngày trong tháng ${selectedDate.slice(5, 7)}`
    : view === 'month'
      ? 'Thống kê tổng sản lượng theo 12 tháng trong năm'
      : 'Thống kê tổng sản lượng theo từng năm'

  return (
    <section className="surface-glass w-full rounded-3xl p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Sản lượng thu hoạch</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === 'day' && (
            <label className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
              <Calendar className="size-3.5 text-muted-foreground" />
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-transparent text-foreground outline-none" />
            </label>
          )}
          <div className="flex rounded-xl bg-muted p-1 text-xs font-medium">
            {(['day', 'month', 'year'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setView(mode)} className={`rounded-lg px-3 py-1.5 transition ${view === mode ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`}>
                {mode === 'day' ? 'Ngày' : mode === 'month' ? 'Tháng' : 'Năm'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && !chart ? (
        <div className="h-[320px] animate-pulse rounded-2xl bg-muted/60" aria-label="Đang tải biểu đồ" />
      ) : !chart || !hasHarvest ? (
        <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
          <BarChart3 className="mb-3 size-9 opacity-40" />
          <p>Chưa có dữ liệu thu hoạch để vẽ biểu đồ.</p>
          <p className="mt-1 text-xs">Hãy ghi nhật ký “Thu hoạch” kèm sản lượng.</p>
        </div>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart.data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} unit=" kg" />
              <Tooltip content={<HarvestTooltip varieties={chart.varieties} />} />
              <Legend content={<HarvestLegend varieties={chart.varieties} colors={colors} />} />
              {chart.varieties.map((variety) => (
                <Bar key={variety} dataKey={variety} stackId="harvest" fill={colors[variety]} maxBarSize={34} />
              ))}
              <Line type="monotone" dataKey="total" name="Tổng sản lượng" stroke={TOTAL_COLOR} strokeWidth={2.5} dot={{ r: 3, fill: TOTAL_COLOR }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {usingMock && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3.5" /> Đang hiển thị dữ liệu minh họa vì API chưa kết nối.
        </p>
      )}
      {isLoading && chart && <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />}
    </section>
  )
}

export default HarvestYieldChart
````

## File: frontend/components/dashboard/stat-card.tsx
````typescript
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  loading?: boolean
  tone?: 'default' | 'accent'
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
  tone = 'default',
}: StatCardProps) {
  return (
    <div className="surface-glass rounded-3xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          )}
          {hint && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            tone === 'accent'
              ? 'bg-accent/15 text-accent-foreground'
              : 'bg-secondary text-secondary-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  )
}
````

## File: frontend/components/dashboard/weather-widget.tsx
````typescript
'use client'

import { useEffect, useState } from 'react'
import { CloudSun, CloudRain, Cloud, Sun, CloudFog, CloudLightning, Loader2, MapPin } from 'lucide-react'

// Tọa độ TP. Thái Nguyên
const FARM_LAT = 21.5928
const FARM_LON = 105.8442
const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${FARM_LAT}&longitude=${FARM_LON}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FBangkok`

type WeatherData = {
  temperature: number
  humidity: number
  code: number
}

function describeWeatherCode(code: number): { label: string; Icon: typeof Sun; color: string } {
  if (code === 0) return { label: 'Trời quang', Icon: Sun, color: 'text-orange-500' }
  if (code <= 3) return { label: 'Có mây', Icon: CloudSun, color: 'text-blue-400' }
  if (code === 45 || code === 48) return { label: 'Sương mù', Icon: CloudFog, color: 'text-gray-400' }
  if (code >= 51 && code <= 67) return { label: 'Mưa nhỏ', Icon: CloudRain, color: 'text-blue-500' }
  if (code >= 80 && code <= 82) return { label: 'Mưa rào', Icon: CloudRain, color: 'text-blue-600' }
  if (code >= 95) return { label: 'Dông', Icon: CloudLightning, color: 'text-purple-600' }
  return { label: 'Nhiều mây', Icon: Cloud, color: 'text-gray-500' }
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetch(WEATHER_URL)
      .then((res) => {
        if (!res.ok) throw new Error('weather fetch failed')
        return res.json()
      })
      .then((json) => {
        if (!isMounted) return
        setData({
          temperature: json.current.temperature_2m,
          humidity: json.current.relative_humidity_2m,
          code: json.current.weather_code,
        })
      })
      .catch(() => {
        if (isMounted) setError(true)
      })
    return () => {
      isMounted = false
    }
  }, [])

  if (error) {
    return (
      <div className="flex h-10 items-center rounded-full bg-red-50 px-4 text-sm text-red-500 shadow-sm">
        Lỗi thời tiết
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin" />
        Đang tải...
      </div>
    )
  }

  const { label, Icon, color } = describeWeatherCode(data.code)

  // Giao diện thu gọn (Minimalist)
  return (
    <div className="flex w-fit items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm border border-gray-100">
      <div className="flex flex-col text-right">
        <div className="flex items-center justify-end gap-1">
          <MapPin className="size-3 text-green-600" />
          <span className="text-sm font-semibold text-gray-800">TP. Thái Nguyên</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {label} · 💧 {Math.round(data.humidity)}%
        </span>
      </div>
      
      <div className="flex items-center gap-2 border-l pl-3 border-gray-100">
        <Icon className={`size-6 ${color}`} />
        <span className="text-xl font-bold text-gray-900">
          {Math.round(data.temperature)}°C
        </span>
      </div>
    </div>
  )
}
````

## File: frontend/components/decor/rice-stalk.tsx
````typescript
'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

type RiceStalkArtworkProps = {
  className?: string
}

/*
  Hoạ tiết trang trí bông lúa - tự vẽ bằng path/ellipse (line-art gốc,
  không lấy từ ảnh/artwork có sẵn nào) để tránh vấn đề bản quyền.
  Dùng currentColor cho stroke/fill để component cha điều khiển màu qua
  className (vd: text-sidebar-foreground/20).
*/
export function RiceStalkArtwork({ className }: RiceStalkArtworkProps) {
  const grains = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8
    const x = 235 - t * 55 + (i % 2 === 0 ? 12 : -12)
    const y = 20 + t * 190
    const angle = i % 2 === 0 ? 24 : -24
    return { x, y, angle, key: i }
  })

  return (
    <motion.div
      aria-hidden="true"
      className={cn('pointer-events-none select-none', className)}
      animate={{ rotate: [-1, 1, -1], y: [0, -3, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        viewBox="0 0 400 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        {/* Thân chính uốn cong */}
        <path d="M40 500 C 60 380, 140 300, 120 180 C 105 90, 160 40, 235 20" />
        {/* Nhánh lá phụ */}
        <path d="M95 415 C 60 398, 15 405, -20 375" />
        <path d="M128 300 C 172 292, 202 262, 212 222" />
        <path d="M150 195 C 192 186, 222 156, 232 118" />
        <path d="M60 460 C 30 452, -5 460, -30 440" />
        {/* Bông lúa - chuỗi hạt dọc phần ngọn */}
        {grains.map(({ x, y, angle, key }) => (
          <ellipse
            key={key}
            cx={x}
            cy={y}
            rx="7"
            ry="12"
            transform={`rotate(${angle} ${x} ${y})`}
            fill="currentColor"
            fillOpacity="0.5"
            stroke="none"
          />
        ))}
      </svg>
    </motion.div>
  )
}
````

## File: frontend/components/layout/app-shell.tsx
````typescript
'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { RiceStalkArtwork } from '@/components/decor/rice-stalk'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    // Sửa min-h-screen thành h-screen để cố định chiều cao bằng màn hình
    <div className="flex h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen} 
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header sẽ tự động cố định ở trên cùng */}
        <Header onOpenMobile={() => setMobileOpen(true)} />

        {/* Hoạ tiết nền khu nội dung - nằm dưới mọi thứ (z-0) */}
        <RiceStalkArtwork className="absolute bottom-0 right-0 z-0 h-[75%] w-1/2 text-foreground/10 pointer-events-none" />

        {/* THÊM overflow-y-auto và tăng padding để chống lẹm tiêu đề */}
        <main className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
````

## File: frontend/components/layout/header.tsx
````typescript
'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Menu,
  Bell,
  Search,
  X,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react'

import { api, ApiError, checkHealth } from '@/lib/api'
import { NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/utils'

type HeaderProps = {
  onOpenMobile: () => void
}

type Status = 'checking' | 'online' | 'offline'

interface UserProfile {
  id?: number
  full_name?: string
  username?: string
  email?: string
  role?: string
}

interface Notification {
  id: number | string;
  type: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  const current =
    NAV_ITEMS.find((i) =>
      i.href === '/' ? pathname === '/' : pathname.startsWith(i.href),
    ) ?? NAV_ITEMS[0]

  const [status, setStatus] = useState<Status>('online')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (err) {}
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)

  // --- STATE THÔNG BÁO ---
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isClientLoaded, setIsClientLoaded] = useState(false) // FLAG quan trọng để chặn ghi đè mảng rỗng
  const notificationRef = useRef<HTMLDivElement>(null)
  
  // 1. Phục hồi thông báo từ localStorage ngay lần render đầu tiên
  useEffect(() => {
    const savedNotifications = localStorage.getItem('app_notifications')
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications))
      } catch (error) {
        console.error('Lỗi đọc cache thông báo:', error)
      }
    }
    // Đánh dấu đã đọc cache xong
    setIsClientLoaded(true)
  }, [])

  // 2. Chỉ lưu cập nhật vào localStorage NẾU quá trình đọc cache ban đầu (bước 1) đã xong
  useEffect(() => {
    if (isClientLoaded) {
      localStorage.setItem('app_notifications', JSON.stringify(notifications))
    }
  }, [notifications, isClientLoaded])

  // 3. Xử lý API và nhận cảnh báo nội bộ
  useEffect(() => {
    let isMounted = true

    const fetchSmartNotifications = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok && isMounted) {
          const data: Notification[] = await response.json()
          
          setNotifications(prev => {
            const merged = [...prev]
            data.forEach(apiItem => {
              if (!merged.some(localItem => localItem.id === apiItem.id)) {
                merged.push(apiItem)
              }
            })
            return merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          })
        }
      } catch (error) {
        // Bỏ qua lỗi nếu mất mạng, vẫn giữ thông báo local
      }
    }

    fetchSmartNotifications()
    const intervalId = setInterval(fetchSmartNotifications, 300000)

    const handleLocalAlert = (event: Event) => {
      const customEvent = event as CustomEvent
      if (isMounted) {
        setNotifications((prev) => {
          // Tránh trùng lặp nếu event bắn ra nhiều lần
          const newId = customEvent.detail.id || Date.now()
          const exists = prev.some(n => n.id === newId)
          if (exists) return prev
          
          return [{...customEvent.detail, id: newId, unread: true}, ...prev]
        })
      }
    }
    window.addEventListener('newPestAlert', handleLocalAlert)

    return () => {
      isMounted = false
      clearInterval(intervalId)
      window.removeEventListener('newPestAlert', handleLocalAlert)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, unread: false })))
    try {
      await fetch('http://localhost:8000/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
    } catch (error) {}
  }

  const handleToggleNotifications = () => {
    const willShow = !showNotifications
    setShowNotifications(willShow)
    
    // Tự động tắt chấm đỏ khi mở menu
    if (willShow && notifications.some(n => n.unread)) {
      markAllAsRead()
    }
  }

  useEffect(() => {
    let isMounted = true
    async function poll() {
      try {
        const isOk = await checkHealth()
        if (isMounted) setStatus(isOk ? 'online' : 'offline')
      } catch {
        if (isMounted) setStatus('offline')
      }
    }
    poll()
    const interval = setInterval(poll, 30000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      setIsSearching(true)
      try {
        const response = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(searchTerm)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data)
        }
      } catch (error) {} 
      finally { setIsSearching(false) }
    }
  }

  const totalResults = results
    ? (results.crop_batches?.length || 0) +
      (results.crop_varieties?.length || 0) +
      (results.plots?.length || 0) +
      (results.logs?.length || 0) +
      (results.harvests?.length || 0)
    : 0

  const formatRole = (role?: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'Quản trị viên'
      case 'MANAGER': return 'Quản lý trang trại'
      case 'FARMER': return 'Kỹ thuật / Nông dân'
      case 'USER': return 'Nhân viên'
      default: return role || 'Người dùng'
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'NT'
    const words = name.trim().split(' ')
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="rounded-lg p-2 text-foreground/70 hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0">
        <h1 className="truncate text-base font-bold text-foreground md:text-lg">
          {current.label}
        </h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {current.description}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
            {isSearching ? (
              <div className="size-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            ) : (
              <Search className="size-4" />
            )}
            <input
              type="search"
              placeholder="Tìm lô, giống cây (Enter)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              className="w-48 bg-transparent outline-none placeholder:text-muted-foreground/70 text-foreground"
            />
          </div>

          {results && (
             <div className="absolute right-0 top-full mt-2 w-80 max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-xl z-50">
             <div className="flex items-center justify-between mb-3 border-b pb-2">
               <span className="text-sm font-semibold text-foreground">Kết quả tìm kiếm</span>
               <button onClick={() => setResults(null)} className="text-muted-foreground hover:text-destructive">
                 <X className="size-4" />
               </button>
             </div>

             {totalResults === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-4">Không tìm thấy kết quả nào.</p>
             ) : (
               <div className="space-y-4">
                 {results.crop_varieties?.length > 0 && (
                   <div>
                     <h4 className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Giống cây</h4>
                     <ul className="space-y-1">
                       {results.crop_varieties.map((item: any) => (
                         <li key={`variety-${item.id}`}>
                           <Link href={item.url} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
                             {item.name}
                           </Link>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
                 {results.plots?.length > 0 && (
                   <div>
                     <h4 className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Lô đất</h4>
                     <ul className="space-y-1">
                       {results.plots.map((item: any) => (
                         <li key={`plot-${item.id}`}>
                           <Link href={item.url} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
                             {item.name}
                           </Link>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
                 {results.crop_batches?.length > 0 && (
                   <div>
                     <h4 className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Lô trồng</h4>
                     <ul className="space-y-1">
                       {results.crop_batches.map((item: any) => (
                         <li key={`batch-${item.id}`}>
                           <Link href={item.url} onClick={() => setResults(null)} className="block w-full rounded-md px-2 py-2 text-sm text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 truncate">
                             {item.name}
                           </Link>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             )}
           </div>
          )}
        </div>

        <StatusPill status={status} />

        {/* --- CHUÔNG THÔNG BÁO --- */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            className="relative rounded-full border border-white/60 bg-white/80 p-2 text-foreground/70 backdrop-blur-sm transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none"
            aria-label="Thông báo"
          >
            <Bell className="size-5" />
            {notifications.some((n) => n.unread) && (
              <span className="absolute top-0 right-0 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-red-500 border-2 border-white"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-3 border-b bg-gray-50 flex justify-between items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800 shrink-0">Thông báo</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-1.5 rounded-md font-medium shrink-0 transition-colors"
                  >
                    Đánh dấu đã đọc
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    Bạn chưa có thông báo nào.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                        n.unread ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {n.type === 'ai_warning' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">!</span>}
                          {n.type === 'ai_suggestion' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">💡</span>}
                          {n.type === 'harvest' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">✓</span>}
                          {n.type === 'warning' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xs font-bold">!</span>}
                        </div>

                        <div className="flex-1">
                          <p className={`text-sm font-medium ${n.type === 'ai_warning' || n.type === 'warning' ? 'text-red-600' : 'text-gray-800'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.time).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/80 py-1 pl-1 pr-2.5 backdrop-blur-sm transition-all hover:bg-emerald-50/50 focus:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-sm">
              {getInitials(user?.full_name || user?.username)}
            </span>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-xs font-semibold text-foreground max-w-[100px] truncate">
                {user?.full_name || user?.username || 'Nông trại'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatRole(user?.role)}
              </p>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-background p-2 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-foreground truncate">
                  {user?.full_name || user?.username || 'Nông trại'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email || 'Chưa cập nhật email'}
                </p>
                <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  {formatRole(user?.role)}
                </span>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function StatusPill({ status }: { status: Status }) {
  const map = {
    checking: { label: 'Đang kết nối…', dot: 'bg-muted-foreground', pulse: true },
    online: { label: 'API Trực tuyến', dot: 'bg-emerald-500', pulse: true },
    offline: { label: 'Mất kết nối API', dot: 'bg-destructive', pulse: false },
  }[status]

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-2 text-xs font-medium backdrop-blur-sm',
        status === 'offline' ? 'text-destructive' : 'text-foreground',
      )}
    >
      <span className="relative flex size-2">
        {map.pulse && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-75',
              map.dot,
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', map.dot)} />
      </span>
      <span className="hidden sm:inline">{map.label}</span>
    </div>
  )
}
````

## File: frontend/components/layout/notification-dropdown.tsx
````typescript
'use client'

import { useState, useEffect } from 'react'
import {
  Bell,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  LandPlot,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { AiAlertOut } from '@/lib/types'
import { cn } from '@/lib/utils'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai' | 'system'>('ai')
  
  // State AI Alerts
  const [aiResult, setAiResult] = useState<AiAlertOut | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // State System Notifications
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [systemLoading, setSystemLoading] = useState(false)

  // Tải thông báo hệ thống khi mở Popup
  useEffect(() => {
    if (isOpen && systemLogs.length === 0) {
      fetchSystemNotifications()
    }
  }, [isOpen])

  async function fetchSystemNotifications() {
    setSystemLoading(true)
    try {
      const data = await api<any[]>('/api/notifications')
      setSystemLogs(data ?? [])
    } catch {
      /* Fallback dữ liệu tĩnh nếu API chưa ready */
      setSystemLogs([])
    } finally {
      setSystemLoading(false)
    }
  }

  async function handleCheckAi() {
    setAiLoading(true)
    setAiError(null)
    try {
      const data = await api<AiAlertOut>('/api/ai/alerts', { method: 'POST' })
      setAiResult(data)
    } catch (err) {
      setAiError(
        err instanceof ApiError
          ? err.message
          : 'Không thể kết nối tới AI phân tích lúc này.'
      )
    } finally {
      setAiLoading(false)
    }
  }

  const hasUnread =
    (aiResult?.priority_batches?.length ?? 0) > 0 ||
    systemLogs.some((n) => n.unread)

  return (
    <div className="relative">
      {/* Nút Chuông Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Thông báo & Cảnh báo AI"
      >
        <Bell className="size-4" />
        {hasUnread && (
          <span className="absolute top-1 right-1 size-2.5 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
        )}
      </button>

      {/* Menu thả xuống */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-[410px] overflow-hidden rounded-3xl border border-border bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-md">
            
            {/* Header & Tabs */}
            <div className="border-b border-border bg-muted/30 p-3.5 pb-0">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-bold text-foreground">
                  Thông báo & Cảnh báo
                </span>
                {activeTab === 'ai' && (
                  <button
                    type="button"
                    onClick={handleCheckAi}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.2 text-xs font-semibold text-white transition-all hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    <RefreshCw
                      className={cn('size-3.5', aiLoading && 'animate-spin')}
                    />
                    {aiResult ? 'Cập nhật' : 'Phân tích AI'}
                  </button>
                )}
              </div>

              {/* Nút chuyển Tab */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={cn(
                    'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
                    activeTab === 'ai'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Cảnh báo AI
                  {aiResult?.priority_batches?.length ? (
                    <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                      {aiResult.priority_batches.length}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={cn(
                    'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
                    activeTab === 'system'
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Bell className="size-3.5" />
                  Hệ thống
                  {systemLogs.filter((n) => n.unread).length > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {systemLogs.filter((n) => n.unread).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="max-h-[380px] min-h-[220px] overflow-y-auto p-3.5">
              
              {/* TAB 1: CẢNH BÁO AI */}
              {activeTab === 'ai' && (
                <>
                  {aiError && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {aiLoading && (
                    <div className="space-y-2.5 py-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-16 w-full animate-pulse rounded-2xl bg-muted/60"
                        />
                      ))}
                    </div>
                  )}

                  {!aiError && !aiResult && !aiLoading && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                        <Sparkles className="size-5" />
                      </div>
                      <p className="font-medium text-foreground">
                        Sẵn sàng phân tích trang trại
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Bấm <strong>"Phân tích AI"</strong> để phát hiện sớm các lô trồng cần ưu tiên xử lý.
                      </p>
                    </div>
                  )}

                  {aiResult && !aiLoading && (
                    <div className="space-y-3">
                      {aiResult.priority_batches.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500 opacity-80" />
                          <p className="font-medium text-foreground">
                            Tất cả các lô trồng đang ổn định
                          </p>
                          <p className="mt-1 text-[11px]">
                            {aiResult.total_growing_batches} lô đang trồng không có bất thường.
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {aiResult.priority_batches.map((item) => {
                            const plotDisplayName =
                              (item as any).plot_name ??
                              (item as any).plotName ??
                              `Lô ${item.batch_code}`

                            return (
                              <li
                                key={item.batch_code}
                                className="group relative flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3 text-xs transition-all hover:border-emerald-500/40 hover:bg-accent/40"
                              >
                                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-xl bg-destructive/10 font-mono text-xs font-bold text-destructive">
                                  #{item.priority_score}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="flex items-center gap-1 font-bold text-foreground">
                                      <LandPlot className="size-3 text-emerald-600" />
                                      {plotDisplayName}
                                    </span>
                                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                      {item.batch_code}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-muted-foreground leading-relaxed">
                                    {item.reason}
                                  </p>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}

                      {aiResult.disclaimer && (
                        <div className="mt-3 flex items-start gap-1.5 border-t border-border/60 pt-2.5 text-[11px] italic text-muted-foreground">
                          <Info className="size-3.5 shrink-0 text-muted-foreground" />
                          <span>{aiResult.disclaimer}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: THÔNG BÁO HỆ THỐNG */}
              {activeTab === 'system' && (
                <>
                  {systemLoading ? (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-12 w-full animate-pulse rounded-xl bg-muted/60"
                        />
                      ))}
                    </div>
                  ) : systemLogs.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      Không có thông báo hệ thống mới nào.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {systemLogs.map((noti) => (
                        <li
                          key={noti.id}
                          className={cn(
                            'flex items-start justify-between gap-2 rounded-2xl border border-border/50 p-3 text-xs transition-colors',
                            noti.unread ? 'bg-primary/5 border-primary/20' : 'bg-card'
                          )}
                        >
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground">
                              {noti.title}
                            </p>
                            <p className="text-muted-foreground">
                              {noti.message}
                            </p>
                            <span className="inline-block text-[10px] text-muted-foreground">
                              {noti.time}
                            </span>
                          </div>
                          {noti.unread && (
                            <span className="size-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  )
}
````

## File: frontend/components/layout/sidebar.tsx
````typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/nav'
import { cn, getUserRole } from '@/lib/utils'
import { RiceStalkArtwork } from '@/components/decor/rice-stalk'

type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [role, setRole] = useState<string | null>(null)

  // Lấy role của user khi component được mount ở Client
  useEffect(() => {
    setRole(getUserRole())
  }, [])

  // Lọc các item menu hiển thị theo quyền (role)
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // Nếu item không yêu cầu roles cụ thể -> Ai cũng xem được
    if (!('roles' in item) || !item.roles || (item.roles as string[]).length === 0) {
      return true
    }
    // Nếu có danh sách roles -> Chỉ hiển thị khi role của user nằm trong danh sách này
    return role ? (item.roles as string[]).includes(role) : false
  })

  return (
    <>
      {/* Mobile scrim */}
      <div
        aria-hidden={!mobileOpen}
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 ease-in-out',
          'lg:static lg:translate-x-0',
          collapsed ? 'w-72 lg:w-20' : 'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="relative z-10 flex h-16 items-center gap-3 px-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="size-5" />
          </span>
          <div
            className={cn(
              'min-w-0 transition-opacity duration-200',
              collapsed && 'lg:pointer-events-none lg:opacity-0',
            )}
          >
            <p className="truncate text-sm font-bold leading-tight text-sidebar-accent-foreground">
              GreenFarm AI
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              Nông trại thông minh
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav list - Đã lọc theo phân quyền */}
        <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>

        {/* Hoạ tiết bông lúa */}
        <RiceStalkArtwork
          className={cn(
            'absolute inset-x-2 bottom-16 z-0 h-44 text-sidebar-foreground/20 transition-opacity duration-200',
            collapsed && 'lg:opacity-0',
          )}
        />

        {/* Collapse toggle (desktop) */}
        <div className="relative z-10 hidden border-t border-sidebar-border p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5 shrink-0" />
            ) : (
              <PanelLeftClose className="size-5 shrink-0" />
            )}
            <span className={cn(collapsed && 'lg:hidden')}>Thu gọn menu</span>
          </button>
        </div>
      </aside>
    </>
  )
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number]
  collapsed: boolean
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const active =
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span
        className={cn(
          'min-w-0 flex-1 transition-opacity duration-200',
          collapsed && 'lg:pointer-events-none lg:opacity-0',
        )}
      >
        <span className="block truncate text-sm font-semibold leading-tight">
          {item.label}
        </span>
        <span
          className={cn(
            'block truncate text-xs',
            active
              ? 'text-sidebar-primary-foreground/80'
              : 'text-sidebar-foreground/50',
          )}
        >
          {item.description}
        </span>
      </span>
    </Link>
  )
}
````

## File: frontend/components/traceability/care-log-type-badge.tsx
````typescript
import { ClipboardList, Sprout, Droplets, ShieldAlert, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fallback mặc định khi type không khớp với key nào
const DEFAULT_CONFIG = {
  label: 'Khác',
  icon: ClipboardList,
  className: 'bg-muted text-muted-foreground',
}

export const CARE_LOG_TYPE_MAP: Record<
  string,
  { label: string; icon: any; className: string }
> = {
  FERTILIZER: {
    label: 'Bón phân',
    icon: Sparkles,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  PESTICIDE: {
    label: 'Phun thuốc',
    icon: ShieldAlert,
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  WATERING: {
    label: 'Tưới nước',
    icon: Droplets,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  PLANTING: {
    label: 'Trồng / Gieo',
    icon: Sprout,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
}

export function CareLogTypeIcon({ type }: { type: string }) {
  // Bổ sung Optional Chaining & Fallback
  const config = CARE_LOG_TYPE_MAP[type] ?? DEFAULT_CONFIG
  const Icon = config.icon

  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', config.className)}>
      <Icon className="size-4" />
    </span>
  )
}

export function CareLogTypeBadge({ type }: { type: string }) {
  // Bổ sung Optional Chaining & Fallback
  const config = CARE_LOG_TYPE_MAP[type] ?? DEFAULT_CONFIG

  return (
    <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label || type}
    </span>
  )
}
````

## File: frontend/components/traceability/trace-report.tsx
````typescript
'use client'

import { useState } from 'react'
import {
  Sprout,
  LandPlot,
  CalendarDays,
  Package,
  ShoppingCart,
  Beaker,
  QrCode,
  Copy,
  Check,
  ClipboardList,
} from 'lucide-react'
import { StatusBadge } from '@/components/batches/status-badge'
import { CareLogTypeIcon, CareLogTypeBadge } from '@/components/traceability/care-log-type-badge'

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN')
}

function formatDateTime(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime())
    ? value
    : d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function formatCurrency(value?: number) {
  if (value === undefined || value === null) return '0 ₫'
  return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
}

type TraceReportProps = {
  data?: any
  publicUrl?: string
}

export function TraceReport({ data, publicUrl }: TraceReportProps) {
  if (!data) {
    return (
      <div className="surface-glass rounded-3xl p-8 text-center text-muted-foreground">
        Đang tải thông tin truy xuất nguồn gốc hoặc không có dữ liệu...
      </div>
    )
  }

  // Tự động mở bọc dữ liệu từ backend
  const raw = data?.data ?? data?.batch ?? data

  // Khai báo biến khớp 100% với JSON Backend trả về
  const batchCode = raw?.code ?? raw?.batch_code ?? raw?.batchCode ?? '—'
  const status = raw?.status ?? 'active'

  // 1. Tên giống cây (khớp plant_name: "Cà chua")
  const varietyName =
    raw?.plant_name ??
    raw?.variety_name ??
    raw?.varietyName ??
    raw?.batch_name ??
    '—'

  // 2. Tên lô đất (khớp plot_name: "Nội thành")
  const plotName = raw?.plot_name ?? raw?.plotName ?? '—'

  // 3. Ngày gieo trồng (khớp planted_date: "2026-09-17")
  const seedingDate =
    raw?.planted_date ??
    raw?.seeding_date ??
    raw?.sow_date ??
    raw?.created_at

  const careLogs: any[] = raw?.care_logs ?? raw?.careLogs ?? []
  const harvests: any[] = raw?.harvest_logs ?? raw?.harvests ?? []

  // 4. Ưu tiên lấy Ngày thu hoạch từ Nhật ký "Thu hoạch" nếu đã thu hoạch
  const harvestFromLog = careLogs.find((log: any) => {
    const act = (log.action ?? log.log_type ?? '').toLowerCase()
    return act.includes('thu hoạch') || act.includes('harvest')
  })?.date

  const harvestDate =
    harvestFromLog ??
    raw?.harvest_date ??
    raw?.harvests?.[0]?.harvest_date ??
    raw?.expected_harvest_date

  const totalHarvested = harvests.reduce(
    (sum, h) => sum + (h.quantity_kg ?? h.quantityKg ?? h.quantity ?? 0),
    0
  )
  const totalSold = harvests.reduce((sum, h) => {
    const sales = h.sales ?? h.sale_logs ?? []
    return sum + sales.reduce((s: number, sale: any) => s + (sale.quantity_kg ?? sale.quantityKg ?? sale.quantity ?? 0), 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Khối tổng quan lô trồng */}
      <div className="surface-glass rounded-3xl p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl bg-primary/10 px-3 py-1 font-mono text-lg font-bold tracking-wide text-primary">
                {batchCode}
              </span>
              {status && <StatusBadge status={status} />}
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-foreground">
                <Sprout className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  Giống: <span className="font-medium">{varietyName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <LandPlot className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  Lô đất: <span className="font-medium">{plotName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  Ngày gieo trồng: <span className="font-medium">{formatDate(seedingDate)}</span>
                </span>
              </div>
              {harvestDate && (
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    Ngày thu hoạch:{' '}
                    <span className="font-medium">{formatDate(harvestDate)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {publicUrl && <QrShareBlock publicUrl={publicUrl} />}
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-4 text-xs">
          <span className="rounded-xl bg-secondary px-3 py-1.5 font-medium text-secondary-foreground">
            {careLogs.length} nhật ký chăm sóc
          </span>
          <span className="rounded-xl bg-secondary px-3 py-1.5 font-medium text-secondary-foreground">
            {harvests.length} đợt thu hoạch · {totalHarvested.toLocaleString('vi-VN')} kg
          </span>
          <span className="rounded-xl bg-secondary px-3 py-1.5 font-medium text-secondary-foreground">
            Đã bán {totalSold.toLocaleString('vi-VN')} kg
          </span>
        </div>
      </div>

      {/* Nhật ký chăm sóc */}
      <div className="surface-glass rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <ClipboardList className="size-5 text-primary" />
          Lịch sử chăm sóc
        </h2>
        {careLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có nhật ký chăm sóc nào được ghi nhận.</p>
        ) : (
          <ol className="space-y-4">
            {careLogs.map((log, i) => {
              const logType = log.action ?? log.log_type ?? log.logType ?? 'Chăm sóc'
              const performedAt = log.date ?? log.performed_at ?? log.created_at
              const description = log.notes ?? log.description ?? ''
              const supplies = log.supplies_used ?? []

              return (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CareLogTypeIcon type={logType} />
                    {i < careLogs.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CareLogTypeBadge type={logType} />
                      <span className="text-xs text-muted-foreground">{formatDateTime(performedAt)}</span>
                    </div>
                    {description && <p className="mt-1.5 text-sm text-foreground">{description}</p>}
                    {log.conditions && (
                      <p className="mt-0.5 text-xs text-muted-foreground">Điều kiện: {log.conditions}</p>
                    )}
                    {supplies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {supplies.map((s: any, si: number) => (
                          <span
                            key={si}
                            className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground"
                          >
                            <Beaker className="size-3" />
                            {s.supply_name ?? s.name}: {s.quantity_used ?? s.quantity} {s.unit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Thu hoạch & Phân phối */}
      <div className="surface-glass rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <Package className="size-5 text-primary" />
          Thu hoạch &amp; phân phối
        </h2>
        {harvests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có đợt thu hoạch nào.</p>
        ) : (
          <div className="space-y-4">
            {harvests.map((h, i) => {
              const sales = h.sales ?? h.sale_logs ?? []
              const quantityKg = h.quantity_kg ?? h.quantityKg ?? h.quantity ?? 0
              const hDate = h.harvest_date ?? h.date ?? h.created_at
              const grade = h.quality_grade ?? h.grade

              return (
                <div key={i} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CalendarDays className="size-4 text-muted-foreground" />
                      Thu hoạch ngày {formatDate(hDate)}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary">
                        {quantityKg.toLocaleString('vi-VN')} kg
                      </span>
                      {grade && (
                        <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600">
                          Loại {grade}
                        </span>
                      )}
                    </div>
                  </div>

                  {sales.length > 0 && (
                    <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">
                              <span className="flex items-center gap-1">
                                <ShoppingCart className="size-3" /> Khách hàng
                              </span>
                            </th>
                            <th className="px-3 py-2 font-medium">Ngày bán</th>
                            <th className="px-3 py-2 text-right font-medium">Khối lượng</th>
                            <th className="px-3 py-2 text-right font-medium">Đơn giá</th>
                            <th className="px-3 py-2 text-right font-medium">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {sales.map((s: any, si: number) => {
                            const saleQty = s.quantity_kg ?? s.quantity ?? 0
                            const unitPrice = s.unit_price ?? s.price ?? 0

                            return (
                              <tr key={si}>
                                <td className="px-3 py-2 text-foreground">{s.customer_name ?? '—'}</td>
                                <td className="px-3 py-2 text-muted-foreground">{formatDate(s.sale_date)}</td>
                                <td className="px-3 py-2 text-right text-foreground">
                                  {saleQty.toLocaleString('vi-VN')} kg
                                </td>
                                <td className="px-3 py-2 text-right text-foreground">
                                  {formatCurrency(unitPrice)}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-foreground">
                                  {formatCurrency(unitPrice * saleQty)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function QrShareBlock({ publicUrl }: { publicUrl: string }) {
  const [copied, setCopied] = useState(false)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(publicUrl)}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-background p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt="Mã QR truy xuất nguồn gốc" width={112} height={112} className="rounded-lg" />
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
      </button>
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <QrCode className="size-3" /> Dán lên bao bì sản phẩm
      </span>
    </div>
  )
}
````

## File: frontend/components/ui/button.tsx
````typescript
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
````

## File: frontend/components/ui/field.tsx
````typescript
export const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}
````

## File: frontend/components/ui/modal.tsx
````typescript
'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
````

## File: frontend/components/GlobalSearch.tsx
````typescript
"use client";
import React, { useState } from 'react';
import Link from 'next/link';

const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchSearchResults = async (keyword: string) => {
    if (!keyword) {
      setIsDropdownOpen(false);
      return;
    }
    try {
      const response = await fetch(`http://localhost:8000/api/search?q=${keyword}`);
      const data = await response.json();
      
      // Kiểm tra xem có bất kỳ mảng nào có dữ liệu không
      const hasAnyResult = Object.values(data).some((arr: any) => arr && arr.length > 0);

      if (hasAnyResult) {
        setResults(data);
        setIsDropdownOpen(true);
      } else {
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchSearchResults(value);
  };

  // Cấu hình tiêu đề cho từng key trả về từ Backend
  const categoryLabels: Record<string, string> = {
    crop_batches: "Lô trồng",
    crop_varieties: "Giống cây",
    plots: "Lô đất",
    logs: "Nhật ký",
    harvests: "Thu hoạch"
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Tìm kiếm mọi thứ..."
          className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
        />
        <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>

      {isDropdownOpen && (
        <div className="absolute left-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            {Object.keys(results).map((key) => {
              const items = results[key];
              if (!items || items.length === 0) return null; // Bỏ qua nếu nhóm này không có kết quả

              return (
                <div key={key} className="border-b last:border-b-0 border-gray-100">
                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0">
                    {categoryLabels[key] || "Khác"}
                  </div>
                  <ul>
                    {items.map((item: any) => (
                      <li key={`${key}-${item.id}`} className="hover:bg-green-50 transition-colors">
                        <Link href={item.url} className="block px-4 py-3" onClick={() => setIsDropdownOpen(false)}>
                          <span className="font-medium text-gray-800">{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
````

## File: frontend/components/weather-widget.tsx
````typescript
"use client";

import { useEffect, useState } from "react";
import { CloudRain, Sun, Cloud, Loader2 } from "lucide-react"; // Dùng icon từ lucide-react

export function WeatherWidget() {
  const [weather, setWeather] = useState({
    temp: 0,
    description: "",
    loading: true,
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Lấy thời tiết chính xác tại TP Thái Nguyên (lat: 21.5942, lon: 105.8482)
        // Lưu ý: Bạn cần thay YOUR_API_KEY bằng key lấy từ openweathermap.org (miễn phí)
        const API_KEY = "YOUR_API_KEY"; 
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=21.5942&lon=105.8482&units=metric&lang=vi&appid=${API_KEY}`
        );
        const data = await res.json();

        if (data && data.main) {
          setWeather({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Lỗi tải thời tiết:", error);
        setWeather({ ...weather, loading: false });
      }
    };

    fetchWeather();
    // Cập nhật lại mỗi 30 phút
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (weather.loading) {
    return (
      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
        <Loader2 className="w-4 h-4 animate-spin text-green-600" />
        <span className="text-sm text-gray-500">Đang cập nhật...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
      <div className="flex flex-col text-right">
        <span className="text-sm font-semibold text-gray-800">TP. Thái Nguyên</span>
        <span className="text-xs text-gray-500 capitalize">{weather.description}</span>
      </div>
      <div className="flex items-center gap-1 border-l pl-3 border-gray-100">
        {/* Render icon dựa trên nhiệt độ hoặc description (ví dụ cơ bản) */}
        {weather.temp > 30 ? (
          <Sun className="w-5 h-5 text-orange-500" />
        ) : weather.description.includes("mưa") ? (
          <CloudRain className="w-5 h-5 text-blue-500" />
        ) : (
          <Cloud className="w-5 h-5 text-gray-400" />
        )}
        <span className="text-xl font-bold text-green-700">{weather.temp}°C</span>
      </div>
    </div>
  );
}
````

## File: frontend/lib/api.ts
````typescript
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Chuẩn hóa Base URL
export const RAW_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

// Đảm bảo API_BASE_URL chuẩn
export const API_BASE_URL = RAW_BASE_URL.endsWith('/api')
  ? RAW_BASE_URL
  : `${RAW_BASE_URL}/api`;

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  const localToken = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (localToken) return localToken;

  const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
  if (match) return match[2];

  return null;
}

export async function api<T = any>(
  endpoint: string,
  options: Omit<RequestInit, 'body'> & { body?: any } = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // ✅ XỬ LÝ LỖI LẶP /api/api
  let url = endpoint;
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Nếu endpoint truyền vào có chứa /api ở đầu thì xóa bớt để không trùng với API_BASE_URL
    if (cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.replace(/^\/api/, '');
    } else if (cleanEndpoint === '/api') {
      cleanEndpoint = '';
    }

    url = `${API_BASE_URL}${cleanEndpoint}`;
  }

  // Xử lý Body & Content-Type
  let body = options.body;
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (typeof body === 'object') {
      body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || errorData.detail || 'Lỗi kết nối máy chủ',
      response.status,
      errorData
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export async function fetcher<T = any>(url: string): Promise<T> {
  return api<T>(url, { method: 'GET' });
}

// ==================== CÁC HÀM GỌI API CHUẨN ====================

export async function getCareLogs(batchId?: number) {
  const endpoint = batchId ? `/care-logs?batch_id=${batchId}` : '/care-logs';
  return api(endpoint, { method: 'GET' });
}

export async function createCareLog(data: {
  batch_id: number;
  action_type: string;
  log_date?: string;
  notes?: string;
  quantity?: number;
  image_url?: string;
}) {
  return api('/care-logs', {
    method: 'POST',
    body: data,
  });
}

export async function askAiAdvisor(data: {
  batch_id: number;
  message: string;
}) {
  return api('/v1/ai-advisor/chat', {
    method: 'POST',
    body: data,
  });
}

export async function checkHealth() {
  try {
    return await api(`${RAW_BASE_URL}/health`);
  } catch {
    try {
      return await api(`${RAW_BASE_URL}/`);
    } catch {
      return null;
    }
  }
}
````

## File: frontend/lib/nav.ts
````typescript
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Leaf, LandPlot, Sprout, NotebookPen, QrCode, Users, Package } from 'lucide-react'

export type NavItem = {
  label: string
  description: string
  href: string
  icon: LucideIcon
  roles?: string[]
}

// LƯU Ý: bản gốc chỉ có 1 mục "Lô đất & Giống cây" trỏ về /crop-lots,
// nhưng hệ thống thực tế đã tách thành 3 trang riêng (Giống cây / Lô đất /
// Lô trồng) - nên tách nav thành 3 mục tương ứng, nếu không 2 trang kia
// sẽ không có lối vào từ Sidebar.
export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tổng quan',
    description: 'Dashboard & cảnh báo AI',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Giống cây',
    description: 'Danh mục giống cây trồng',
    href: '/varieties',
    icon: Leaf,
  },
  {
    label: 'Lô đất',
    description: 'Quản lý đất canh tác',
    href: '/crop-lots',
    icon: LandPlot,
  },
  {
    label: 'Lô trồng',
    description: 'Trạng thái sinh trưởng',
    href: '/batches',
    icon: Sprout,
  },
  {
    label: 'Nhật ký & Trợ lý AI',
    description: 'Chăm sóc & cố vấn Gemini',
    href: '/care-logs',
    icon: NotebookPen,
  },
  {
    label: 'Vật tư nông nghiệp',
    description: 'Tồn kho, nhập kho và cảnh báo',
    href: '/supplies',
    icon: Package,
    roles: ['admin', 'manager', 'technician', 'staff'],
  },
  {
    label: 'Truy xuất nguồn gốc',
    description: 'Thu hoạch & mã QR',
    href: '/traceability',
    icon: QrCode,
  },
  {
    label: 'Quản lý tài khoản',
    description: 'Nhân sự, vai trò và quyền truy cập',
    href: '/users',
    icon: Users,
    roles: ['admin', 'manager'],
  },
]
````

## File: frontend/lib/permissions.ts
````typescript
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  STAFF: 'staff',
}

export const PERMISSIONS = {
  PLOT_CREATE: 'plot:create',
  PLOT_UPDATE: 'plot:update',
  PLOT_DELETE: 'plot:delete',
  BATCH_CREATE: 'batch:create',
  BATCH_UPDATE: 'batch:update',
  BATCH_DELETE: 'batch:delete',
  LOG_CREATE: 'log:create',
  LOG_DELETE: 'log:delete',
  AI_ASK: 'ai:ask',
  AI_SCHEDULE: 'ai:schedule',
}

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: Object.values(PERMISSIONS),
  [ROLES.TECHNICIAN]: [
    PERMISSIONS.PLOT_CREATE,
    PERMISSIONS.PLOT_UPDATE,
    PERMISSIONS.PLOT_DELETE,
    PERMISSIONS.BATCH_CREATE,
    PERMISSIONS.BATCH_UPDATE,
    PERMISSIONS.BATCH_DELETE,
    PERMISSIONS.LOG_CREATE,
    PERMISSIONS.AI_ASK,
    PERMISSIONS.AI_SCHEDULE,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.LOG_CREATE, // Đã mở khóa quyền ghi nhật ký cho Nhân viên
    PERMISSIONS.AI_ASK,     // Đã mở khóa quyền sử dụng AI cho Nhân viên
  ],
}

export function checkPermission(role: string, permission: string): boolean {
  if (!role) return false
  const userRole = role.toLowerCase()
  const permissions = ROLE_PERMISSIONS[userRole]
  return permissions ? permissions.includes(permission) : false
}
````

## File: frontend/lib/types.ts
````typescript
// Khớp 1-1 với các Pydantic schema trong farm_backend/app/schemas/*.py
// LƯU Ý: bản trước đó của file này đã bị ghi đè theo 1 backend giả
// (dùng field growth_days, area_sqm, planted_at...) - đã khôi phục đúng
// theo backend SQLAlchemy thật (growth_duration_days, area_m2, seeding_date...).

export type BatchStatus = 'planned' | 'growing' | 'harvested'

export interface PlantVariety {
  id: number;
  name: string;
  stock_quantity: number; // Số lượng còn trong kho
  unit: string;           // Đơn vị: kg, khay, bao...
}

export interface Plot {
  id: number
  name: string
  area_m2: number | null
  location: string | null
  soil_type: string | null
}

export interface CropBatch {
  id: number; // hoặc string tùy vào DB của bạn
  batch_code: string;  // THÊM DÒNG NÀY: khai báo thuộc tính batch_code
  batch_name?: string; // THÊM DÒNG NÀY (nếu cần): dấu ? nghĩa là có thể null/undefined
  plot_id: number;
  variety_id: number;
  seeding_date: string;
  expected_harvest_date?: string;
  status: BatchStatus;
  // ... (giữ nguyên các thuộc tính khác bạn đang có)
}

export interface Supply {
  id: number
  name: string
  type: 'phan_bon' | 'thuoc_bvtv' | 'giong' | 'khac' | null
  unit: string
  stock_quantity: number
}

export type CareLogType = 'tuoi' | 'bon_phan' | 'sau_benh' | 'khac'

export interface SupplyUsageItem {
  supply_id: number
  quantity_used: number
}

export interface CareLog {
  id: number
  batch_id: number
  log_type: CareLogType
  description: string | null
  conditions: string | null
  performed_at: string
  performed_by: number | null
  supplies_used: { id: number; supply_id: number; quantity_used: number }[]
}

export interface Harvest {
  id: number
  batch_id: number
  harvest_date: string
  quantity_kg: number
  quality_grade: string | null
  harvested_by: number | null
}

export interface Sale {
  id: number
  harvest_id: number
  customer_name: string | null
  quantity_kg: number
  unit_price: number
  sale_date: string
  total_amount: number
}

export interface AiAlertBatchItem {
  batch_code: string
  priority_score: number
  reason: string
}

export interface AiAlertOut {
  total_growing_batches: number
  priority_batches: AiAlertBatchItem[]
  disclaimer: string
  created_at: string
}

export interface AiSummaryOut {
  batch_code: string
  log_count: number
  summary: string
  issues_detected: string[]
  referenced_log_ids: number[]
  disclaimer: string
  created_at: string
}

export interface AiScheduleItem {
  day_offset: number
  date: string
  task_type: 'tuoi' | 'bon_phan' | 'kiem_tra_sau_benh'
  description: string
}

export interface AiScheduleOut {
  batch_code: string
  seeding_date: string
  expected_harvest_date: string | null
  schedule: AiScheduleItem[]
  disclaimer: string
  created_at: string
}

export type FarmingLogActivity =
  | 'Tưới nước'
  | 'Bón phân'
  | 'Phun thuốc'
  | 'Bệnh hại'
  | 'Thu hoạch'
  | 'Khác'

export interface FarmingLog {
  id: number
  batch_id: number
  log_date: string
  activity_type: FarmingLogActivity
  description: string
  image_url: string | null
}

export interface AiAdvisorResponse {
  answer: string
  disclaimer: string
  generated_at: string
}
// ============================================================
// BỔ SUNG: Truy xuất nguồn gốc — khớp 1-1 với app/schemas/traceability.py
// Dán khối này vào cuối file frontend/lib/types.ts hiện có.
// ============================================================

export interface TraceSupplyUsed {
  supply_name: string
  quantity_used: number
  unit: string
}

export interface TraceCareLog {
  log_type: CareLogType
  description: string | null
  conditions: string | null
  performed_at: string
  supplies_used: TraceSupplyUsed[]
}

export interface TraceSale {
  customer_name: string | null
  quantity_kg: number
  unit_price: number
  sale_date: string
}

export interface TraceHarvest {
  harvest_date: string
  quantity_kg: number
  quality_grade: string | null
  sales: TraceSale[]
}

export interface TraceabilityOut {
  batch_code: string
  status: BatchStatus
  seeding_date: string
  expected_harvest_date: string | null
  plot_name: string
  variety_name: string
  care_logs: TraceCareLog[]
  harvests: TraceHarvest[]
}

export interface PlantVariety {
  id: number
  name: string
  category?: string
  growth_duration_days: number
  stock_quantity: number // Thêm số lượng tồn kho
  unit: string           // Thêm đơn vị (kg, khay, bao...)
}
````

## File: frontend/lib/utils.ts
````typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('token')
  if (!token) return null

  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    return payload.role || null
  } catch (e) {
    return null
  }
}
````

## File: frontend/services/api.ts
````typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', // Server FastAPI
  headers: {
    'Accept': 'application/json',
  },
});

// Tự động chèn Bearer Token vào Header của mỗi request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      console.log("Token hiện tại là:", token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
````

## File: frontend/services/authService.ts
````typescript
import api from './api';

export interface LoginPayload {
  username: string;
  password: string;
}

export const authService = {
  login: async (credentials: LoginPayload) => {
    // 1. Tạo dữ liệu dạng Form Data chuẩn OAuth2
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    // 2. Gửi request đăng nhập
    // Lưu ý: Kiểm tra đường dẫn trên Swagger UI của bạn (ví dụ: '/api/auth/login' hoặc '/auth/login' hoặc '/token')
    const response = await api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // 3. Trích xuất và lưu Access Token vào LocalStorage
    const token = response.data.access_token || response.data.token;
    if (token) {
      localStorage.setItem('token', token);
    }

    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },
};
````

## File: frontend/services/farmService.ts
````typescript
import api from './api';

// Interface cấu trúc dữ liệu Lô đất
export interface PlotPayload {
  name: string;
  area: number;
  location: string;
  soil_type: string;
}

// 1. Hàm Đăng nhập (Đã chuẩn hóa URLSearchParams & Đồng bộ Key 'token')
export async function login(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await api.post('/api/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  //  SỬA: Lưu chính xác key 'token' để khớp với api.ts
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
  }
  return response.data;
}

// 2. Hàm lấy danh sách Lô đất
export async function getPlots() {
  const response = await api.get('/api/plots');
  return response.data;
}

// 3. Hàm tạo Lô đất mới (Bổ sung để phục vụ Modal Thêm Lô Đất)
export async function createPlot(data: PlotPayload) {
  const response = await api.post('/api/plots', data);
  return response.data;
}
````

## File: frontend/.gitignore
````
node_modules/
.next/
.env.local
.DS_Store
*.log
````

## File: frontend/components.json
````json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
````

## File: frontend/next-env.d.ts
````typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";
import "./.next/dev/types/root-params.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
````

## File: frontend/next.config.mjs
````javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false, // Tắt toàn bộ dev overlay/badge ở góc màn hình
};

export default nextConfig;
````

## File: frontend/package.json
````json
{
  "name": "my-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  },
  "dependencies": {
    "@base-ui/react": "^1.5.0",
    "@vercel/analytics": "1.6.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.16.0",
    "motion": "^12.0.0",
    "next": "^16.3.0",
    "react": "^19",
    "react-dom": "^19",
    "recharts": "^3.10.1",
    "shadcn": "^4.8.0",
    "swr": "^2.3.0",
    "tailwind-merge": "^3.3.1",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "@types/node": "^24",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8.5",
    "tailwindcss": "^4.3.3",
    "typescript": "5.7.3"
  },
  "pnpm": {
    "overrides": {
      "hono": "4.12.25"
    }
  }
}
````

## File: frontend/postcss.config.mjs
````javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
````

## File: frontend/tsconfig.json
````json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "target": "ES6",
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
````

## File: frontend/tsconfig.tsbuildinfo
````
{"fileNames":["./node_modules/typescript/lib/lib.es5.d.ts","./node_modules/typescript/lib/lib.es2015.d.ts","./node_modules/typescript/lib/lib.es2016.d.ts","./node_modules/typescript/lib/lib.es2017.d.ts","./node_modules/typescript/lib/lib.es2018.d.ts","./node_modules/typescript/lib/lib.es2019.d.ts","./node_modules/typescript/lib/lib.es2020.d.ts","./node_modules/typescript/lib/lib.es2021.d.ts","./node_modules/typescript/lib/lib.es2022.d.ts","./node_modules/typescript/lib/lib.es2023.d.ts","./node_modules/typescript/lib/lib.es2024.d.ts","./node_modules/typescript/lib/lib.esnext.d.ts","./node_modules/typescript/lib/lib.dom.d.ts","./node_modules/typescript/lib/lib.dom.iterable.d.ts","./node_modules/typescript/lib/lib.es2015.core.d.ts","./node_modules/typescript/lib/lib.es2015.collection.d.ts","./node_modules/typescript/lib/lib.es2015.generator.d.ts","./node_modules/typescript/lib/lib.es2015.iterable.d.ts","./node_modules/typescript/lib/lib.es2015.promise.d.ts","./node_modules/typescript/lib/lib.es2015.proxy.d.ts","./node_modules/typescript/lib/lib.es2015.reflect.d.ts","./node_modules/typescript/lib/lib.es2015.symbol.d.ts","./node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts","./node_modules/typescript/lib/lib.es2016.array.include.d.ts","./node_modules/typescript/lib/lib.es2016.intl.d.ts","./node_modules/typescript/lib/lib.es2017.arraybuffer.d.ts","./node_modules/typescript/lib/lib.es2017.date.d.ts","./node_modules/typescript/lib/lib.es2017.object.d.ts","./node_modules/typescript/lib/lib.es2017.sharedmemory.d.ts","./node_modules/typescript/lib/lib.es2017.string.d.ts","./node_modules/typescript/lib/lib.es2017.intl.d.ts","./node_modules/typescript/lib/lib.es2017.typedarrays.d.ts","./node_modules/typescript/lib/lib.es2018.asyncgenerator.d.ts","./node_modules/typescript/lib/lib.es2018.asynciterable.d.ts","./node_modules/typescript/lib/lib.es2018.intl.d.ts","./node_modules/typescript/lib/lib.es2018.promise.d.ts","./node_modules/typescript/lib/lib.es2018.regexp.d.ts","./node_modules/typescript/lib/lib.es2019.array.d.ts","./node_modules/typescript/lib/lib.es2019.object.d.ts","./node_modules/typescript/lib/lib.es2019.string.d.ts","./node_modules/typescript/lib/lib.es2019.symbol.d.ts","./node_modules/typescript/lib/lib.es2019.intl.d.ts","./node_modules/typescript/lib/lib.es2020.bigint.d.ts","./node_modules/typescript/lib/lib.es2020.date.d.ts","./node_modules/typescript/lib/lib.es2020.promise.d.ts","./node_modules/typescript/lib/lib.es2020.sharedmemory.d.ts","./node_modules/typescript/lib/lib.es2020.string.d.ts","./node_modules/typescript/lib/lib.es2020.symbol.wellknown.d.ts","./node_modules/typescript/lib/lib.es2020.intl.d.ts","./node_modules/typescript/lib/lib.es2020.number.d.ts","./node_modules/typescript/lib/lib.es2021.promise.d.ts","./node_modules/typescript/lib/lib.es2021.string.d.ts","./node_modules/typescript/lib/lib.es2021.weakref.d.ts","./node_modules/typescript/lib/lib.es2021.intl.d.ts","./node_modules/typescript/lib/lib.es2022.array.d.ts","./node_modules/typescript/lib/lib.es2022.error.d.ts","./node_modules/typescript/lib/lib.es2022.intl.d.ts","./node_modules/typescript/lib/lib.es2022.object.d.ts","./node_modules/typescript/lib/lib.es2022.string.d.ts","./node_modules/typescript/lib/lib.es2022.regexp.d.ts","./node_modules/typescript/lib/lib.es2023.array.d.ts","./node_modules/typescript/lib/lib.es2023.collection.d.ts","./node_modules/typescript/lib/lib.es2023.intl.d.ts","./node_modules/typescript/lib/lib.es2024.arraybuffer.d.ts","./node_modules/typescript/lib/lib.es2024.collection.d.ts","./node_modules/typescript/lib/lib.es2024.object.d.ts","./node_modules/typescript/lib/lib.es2024.promise.d.ts","./node_modules/typescript/lib/lib.es2024.regexp.d.ts","./node_modules/typescript/lib/lib.es2024.sharedmemory.d.ts","./node_modules/typescript/lib/lib.es2024.string.d.ts","./node_modules/typescript/lib/lib.esnext.array.d.ts","./node_modules/typescript/lib/lib.esnext.collection.d.ts","./node_modules/typescript/lib/lib.esnext.intl.d.ts","./node_modules/typescript/lib/lib.esnext.disposable.d.ts","./node_modules/typescript/lib/lib.esnext.decorators.d.ts","./node_modules/typescript/lib/lib.esnext.iterator.d.ts","./node_modules/typescript/lib/lib.decorators.d.ts","./node_modules/typescript/lib/lib.decorators.legacy.d.ts","./node_modules/@types/react/global.d.ts","./node_modules/csstype/index.d.ts","./node_modules/@types/react/index.d.ts","./node_modules/next/dist/styled-jsx/types/css.d.ts","./node_modules/next/dist/styled-jsx/types/macro.d.ts","./node_modules/next/dist/styled-jsx/types/style.d.ts","./node_modules/next/dist/styled-jsx/types/global.d.ts","./node_modules/next/dist/styled-jsx/types/index.d.ts","./node_modules/next/dist/server/get-page-files.d.ts","./node_modules/@types/node/ts5.7/compatibility/float16array.d.ts","./node_modules/@types/node/compatibility/iterators.d.ts","./node_modules/@types/node/globals.typedarray.d.ts","./node_modules/@types/node/buffer.buffer.d.ts","./node_modules/@types/node/globals.d.ts","./node_modules/@types/node/web-globals/abortcontroller.d.ts","./node_modules/@types/node/web-globals/crypto.d.ts","./node_modules/@types/node/web-globals/domexception.d.ts","./node_modules/@types/node/web-globals/events.d.ts","./node_modules/undici-types/utility.d.ts","./node_modules/undici-types/header.d.ts","./node_modules/undici-types/readable.d.ts","./node_modules/undici-types/fetch.d.ts","./node_modules/undici-types/formdata.d.ts","./node_modules/undici-types/connector.d.ts","./node_modules/undici-types/client-stats.d.ts","./node_modules/undici-types/client.d.ts","./node_modules/undici-types/errors.d.ts","./node_modules/undici-types/dispatcher.d.ts","./node_modules/undici-types/global-dispatcher.d.ts","./node_modules/undici-types/global-origin.d.ts","./node_modules/undici-types/pool-stats.d.ts","./node_modules/undici-types/pool.d.ts","./node_modules/undici-types/handlers.d.ts","./node_modules/undici-types/balanced-pool.d.ts","./node_modules/undici-types/round-robin-pool.d.ts","./node_modules/undici-types/h2c-client.d.ts","./node_modules/undici-types/agent.d.ts","./node_modules/undici-types/mock-interceptor.d.ts","./node_modules/undici-types/mock-call-history.d.ts","./node_modules/undici-types/mock-agent.d.ts","./node_modules/undici-types/mock-client.d.ts","./node_modules/undici-types/mock-pool.d.ts","./node_modules/undici-types/snapshot-agent.d.ts","./node_modules/undici-types/mock-errors.d.ts","./node_modules/undici-types/proxy-agent.d.ts","./node_modules/undici-types/env-http-proxy-agent.d.ts","./node_modules/undici-types/retry-handler.d.ts","./node_modules/undici-types/retry-agent.d.ts","./node_modules/undici-types/api.d.ts","./node_modules/undici-types/cache-interceptor.d.ts","./node_modules/undici-types/interceptors.d.ts","./node_modules/undici-types/util.d.ts","./node_modules/undici-types/cookies.d.ts","./node_modules/undici-types/patch.d.ts","./node_modules/undici-types/websocket.d.ts","./node_modules/undici-types/eventsource.d.ts","./node_modules/undici-types/diagnostics-channel.d.ts","./node_modules/undici-types/content-type.d.ts","./node_modules/undici-types/cache.d.ts","./node_modules/undici-types/index.d.ts","./node_modules/@types/node/web-globals/fetch.d.ts","./node_modules/@types/node/web-globals/navigator.d.ts","./node_modules/@types/node/web-globals/storage.d.ts","./node_modules/@types/node/web-globals/streams.d.ts","./node_modules/@types/node/assert.d.ts","./node_modules/@types/node/assert/strict.d.ts","./node_modules/@types/node/async_hooks.d.ts","./node_modules/@types/node/buffer.d.ts","./node_modules/@types/node/child_process.d.ts","./node_modules/@types/node/cluster.d.ts","./node_modules/@types/node/console.d.ts","./node_modules/@types/node/constants.d.ts","./node_modules/@types/node/crypto.d.ts","./node_modules/@types/node/dgram.d.ts","./node_modules/@types/node/diagnostics_channel.d.ts","./node_modules/@types/node/dns.d.ts","./node_modules/@types/node/dns/promises.d.ts","./node_modules/@types/node/domain.d.ts","./node_modules/@types/node/events.d.ts","./node_modules/@types/node/fs.d.ts","./node_modules/@types/node/fs/promises.d.ts","./node_modules/@types/node/http.d.ts","./node_modules/@types/node/http2.d.ts","./node_modules/@types/node/https.d.ts","./node_modules/@types/node/inspector.d.ts","./node_modules/@types/node/inspector.generated.d.ts","./node_modules/@types/node/module.d.ts","./node_modules/@types/node/net.d.ts","./node_modules/@types/node/os.d.ts","./node_modules/@types/node/path.d.ts","./node_modules/@types/node/perf_hooks.d.ts","./node_modules/@types/node/process.d.ts","./node_modules/@types/node/punycode.d.ts","./node_modules/@types/node/querystring.d.ts","./node_modules/@types/node/readline.d.ts","./node_modules/@types/node/readline/promises.d.ts","./node_modules/@types/node/repl.d.ts","./node_modules/@types/node/sea.d.ts","./node_modules/@types/node/sqlite.d.ts","./node_modules/@types/node/stream.d.ts","./node_modules/@types/node/stream/promises.d.ts","./node_modules/@types/node/stream/consumers.d.ts","./node_modules/@types/node/stream/web.d.ts","./node_modules/@types/node/string_decoder.d.ts","./node_modules/@types/node/test.d.ts","./node_modules/@types/node/timers.d.ts","./node_modules/@types/node/timers/promises.d.ts","./node_modules/@types/node/tls.d.ts","./node_modules/@types/node/trace_events.d.ts","./node_modules/@types/node/tty.d.ts","./node_modules/@types/node/url.d.ts","./node_modules/@types/node/util.d.ts","./node_modules/@types/node/v8.d.ts","./node_modules/@types/node/vm.d.ts","./node_modules/@types/node/wasi.d.ts","./node_modules/@types/node/worker_threads.d.ts","./node_modules/@types/node/zlib.d.ts","./node_modules/@types/node/ts5.7/index.d.ts","./node_modules/@types/react/canary.d.ts","./node_modules/@types/react/experimental.d.ts","./node_modules/@types/react-dom/index.d.ts","./node_modules/@types/react-dom/canary.d.ts","./node_modules/@types/react-dom/experimental.d.ts","./node_modules/next/dist/lib/fallback.d.ts","./node_modules/next/dist/server/api-utils/index.d.ts","./node_modules/next/dist/server/node-environment-baseline.d.ts","./node_modules/next/dist/server/node-environment-extensions/error-inspect.d.ts","./node_modules/next/dist/server/node-environment-extensions/console-file.d.ts","./node_modules/next/dist/server/node-environment-extensions/console-exit.d.ts","./node_modules/next/dist/server/node-environment-extensions/console-dim.external.d.ts","./node_modules/next/dist/server/node-environment-extensions/unhandled-rejection.external.d.ts","./node_modules/next/dist/server/node-environment-extensions/random.d.ts","./node_modules/next/dist/server/node-environment-extensions/date.d.ts","./node_modules/next/dist/server/node-environment-extensions/web-crypto.d.ts","./node_modules/next/dist/server/node-environment-extensions/node-crypto.d.ts","./node_modules/next/dist/server/node-environment-extensions/fast-set-immediate.external.d.ts","./node_modules/next/dist/server/node-environment.d.ts","./node_modules/next/dist/server/require-hook.d.ts","./node_modules/next/dist/server/node-polyfill-crypto.d.ts","./node_modules/next/dist/compiled/webpack/webpack.d.ts","./node_modules/next/dist/shared/lib/modern-browserslist-target.d.ts","./node_modules/next/dist/shared/lib/entry-constants.d.ts","./node_modules/next/dist/shared/lib/constants.d.ts","./node_modules/next/dist/lib/bundler.d.ts","./node_modules/next/dist/server/config.d.ts","./node_modules/next/dist/lib/load-custom-routes.d.ts","./node_modules/next/dist/shared/lib/image-config.d.ts","./node_modules/next/dist/build/webpack/plugins/subresource-integrity-plugin.d.ts","./node_modules/next/dist/server/base-http/index.d.ts","./node_modules/next/dist/server/body-streams.d.ts","./node_modules/next/dist/server/request/search-params.d.ts","./node_modules/next/dist/server/app-render/vary-params.d.ts","./node_modules/next/dist/server/request/params.d.ts","./node_modules/next/dist/server/route-kind.d.ts","./node_modules/next/dist/server/route-definitions/route-definition.d.ts","./node_modules/next/dist/server/route-matches/route-match.d.ts","./node_modules/next/dist/client/components/app-router-headers.d.ts","./node_modules/next/dist/server/lib/cache-control.d.ts","./node_modules/next/dist/shared/lib/segment-cache/vary-params-decoding.d.ts","./node_modules/next/dist/shared/lib/app-router-types.d.ts","./node_modules/next/dist/server/lib/cache-handlers/types.d.ts","./node_modules/next/dist/server/use-cache/use-cache-wrapper.d.ts","./node_modules/next/dist/server/resume-data-cache/cache-store.d.ts","./node_modules/next/dist/server/resume-data-cache/resume-data-cache.d.ts","./node_modules/next/dist/lib/constants.d.ts","./node_modules/next/dist/server/render-result.d.ts","./node_modules/next/dist/server/response-cache/types.d.ts","./node_modules/next/dist/server/response-cache/index.d.ts","./node_modules/next/dist/next-devtools/userspace/pages/pages-dev-overlay-setup.d.ts","./node_modules/next/dist/build/static-paths/types.d.ts","./node_modules/next/dist/server/route-definitions/app-page-route-definition.d.ts","./node_modules/next/dist/build/webpack/plugins/flight-manifest-plugin.d.ts","./node_modules/next/dist/build/adapter/setup-node-env.external.d.ts","./node_modules/next/dist/server/instrumentation/types.d.ts","./node_modules/next/dist/lib/setup-exception-listeners.d.ts","./node_modules/next/dist/lib/worker.d.ts","./node_modules/next/dist/server/lib/experimental/ppr.d.ts","./node_modules/next/dist/build/page-extensions-type.d.ts","./node_modules/next/dist/build/segment-config/app/app-segment-config.d.ts","./node_modules/next/dist/server/route-modules/app-page/module.compiled.d.ts","./node_modules/next/dist/server/route-definitions/app-route-route-definition.d.ts","./node_modules/next/dist/server/lib/i18n-provider.d.ts","./node_modules/next/dist/server/web/next-url.d.ts","./node_modules/next/dist/compiled/@edge-runtime/cookies/index.d.ts","./node_modules/next/dist/server/web/spec-extension/cookies.d.ts","./node_modules/next/dist/server/web/spec-extension/request.d.ts","./node_modules/next/dist/shared/lib/deep-readonly.d.ts","./node_modules/next/dist/server/lib/incremental-cache/index.d.ts","./node_modules/next/dist/shared/lib/router/utils/middleware-route-matcher.d.ts","./node_modules/next/dist/build/webpack/plugins/next-font-manifest-plugin.d.ts","./node_modules/next/dist/server/route-definitions/locale-route-definition.d.ts","./node_modules/next/dist/server/route-definitions/pages-route-definition.d.ts","./node_modules/next/dist/shared/lib/mitt.d.ts","./node_modules/next/dist/client/with-router.d.ts","./node_modules/next/dist/client/router.d.ts","./node_modules/next/dist/client/route-loader.d.ts","./node_modules/next/dist/client/page-loader.d.ts","./node_modules/next/dist/shared/lib/bloom-filter.d.ts","./node_modules/next/dist/shared/lib/router/router.d.ts","./node_modules/next/dist/shared/lib/router-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/loadable-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/loadable.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/image-config-context.shared-runtime.d.ts","./node_modules/next/dist/client/components/readonly-url-search-params.d.ts","./node_modules/next/dist/shared/lib/hooks-client-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/head-manager-context.shared-runtime.d.ts","./node_modules/next/dist/client/flight-data-helpers.d.ts","./node_modules/next/dist/client/components/segment-cache/cache-key.d.ts","./node_modules/next/dist/client/components/router-reducer/fetch-server-response.d.ts","./node_modules/next/dist/client/components/segment-cache/types.d.ts","./node_modules/next/dist/client/components/segment-cache/navigation-testing-lock.d.ts","./node_modules/next/dist/shared/lib/segment-cache/segment-value-encoding.d.ts","./node_modules/next/dist/client/components/segment-cache/scheduler.d.ts","./node_modules/next/dist/client/components/segment-cache/cache-map.d.ts","./node_modules/next/dist/client/components/segment-cache/vary-path.d.ts","./node_modules/next/dist/client/components/segment-cache/cache.d.ts","./node_modules/next/dist/client/components/router-reducer/ppr-navigations.d.ts","./node_modules/next/dist/client/components/segment-cache/navigation.d.ts","./node_modules/next/dist/client/components/router-reducer/router-reducer-types.d.ts","./node_modules/next/dist/shared/lib/app-router-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/server-inserted-html.shared-runtime.d.ts","./node_modules/next/dist/server/route-modules/pages/vendored/contexts/entrypoints.d.ts","./node_modules/next/dist/server/route-modules/pages/module.compiled.d.ts","./node_modules/next/dist/build/templates/pages.d.ts","./node_modules/next/dist/server/route-modules/pages/module.d.ts","./node_modules/next/dist/server/render.d.ts","./node_modules/next/dist/build/webpack/plugins/pages-manifest-plugin.d.ts","./node_modules/next/dist/server/route-definitions/pages-api-route-definition.d.ts","./node_modules/next/dist/server/route-matches/pages-api-route-match.d.ts","./node_modules/next/dist/server/route-matchers/route-matcher.d.ts","./node_modules/next/dist/server/route-matcher-providers/route-matcher-provider.d.ts","./node_modules/next/dist/server/route-matcher-managers/route-matcher-manager.d.ts","./node_modules/next/dist/server/normalizers/normalizer.d.ts","./node_modules/next/dist/server/normalizers/locale-route-normalizer.d.ts","./node_modules/next/dist/server/normalizers/request/pathname-normalizer.d.ts","./node_modules/next/dist/server/normalizers/request/suffix.d.ts","./node_modules/next/dist/server/normalizers/request/rsc.d.ts","./node_modules/next/dist/server/normalizers/request/next-data.d.ts","./node_modules/next/dist/server/after/builtin-request-context.d.ts","./node_modules/next/dist/server/normalizers/request/segment-prefix-rsc.d.ts","./node_modules/next/dist/server/route-modules/pages/builtin/_error.d.ts","./node_modules/next/dist/server/load-default-error-components.d.ts","./node_modules/next/dist/server/base-server.d.ts","./node_modules/next/dist/server/after/after.d.ts","./node_modules/next/dist/server/web/spec-extension/adapters/request-cookies.d.ts","./node_modules/next/dist/server/async-storage/draft-mode-provider.d.ts","./node_modules/next/dist/server/web/spec-extension/adapters/headers.d.ts","./node_modules/next/dist/server/app-render/cache-signal.d.ts","./node_modules/next/dist/server/app-render/instant-validation/boundary-tracking.d.ts","./node_modules/next/dist/server/app-render/instant-validation/instant-validation-error.d.ts","./node_modules/next/dist/shared/lib/router/utils/parse-relative-url.d.ts","./node_modules/next/dist/server/app-render/instant-validation/instant-samples.d.ts","./node_modules/next/dist/server/app-render/dynamic-rendering.d.ts","./node_modules/next/dist/server/app-render/work-unit-async-storage-instance.d.ts","./node_modules/next/dist/server/lib/lazy-result.d.ts","./node_modules/next/dist/server/lib/implicit-tags.d.ts","./node_modules/next/dist/server/app-render/staged-rendering.d.ts","./node_modules/next/dist/server/app-render/work-unit-async-storage.external.d.ts","./node_modules/next/dist/server/after/after-context.d.ts","./node_modules/next/dist/server/app-render/work-async-storage-instance.d.ts","./node_modules/next/dist/server/app-render/create-error-handler.d.ts","./node_modules/next/dist/shared/lib/action-revalidation-kind.d.ts","./node_modules/next/dist/server/app-render/work-async-storage.external.d.ts","./node_modules/next/dist/server/async-storage/work-store.d.ts","./node_modules/next/dist/server/web/http.d.ts","./node_modules/next/dist/client/components/hooks-server-context.d.ts","./node_modules/next/dist/server/route-modules/app-route/shared-modules.d.ts","./node_modules/next/dist/client/components/redirect-status-code.d.ts","./node_modules/next/dist/client/components/redirect-error.d.ts","./node_modules/next/dist/build/templates/app-route.d.ts","./node_modules/next/dist/server/app-render/action-async-storage-instance.d.ts","./node_modules/next/dist/server/app-render/action-async-storage.external.d.ts","./node_modules/next/dist/server/route-modules/app-route/module.d.ts","./node_modules/next/dist/server/route-modules/app-route/module.compiled.d.ts","./node_modules/next/dist/build/segment-config/app/app-segments.d.ts","./node_modules/next/dist/build/get-supported-browsers.d.ts","./node_modules/next/dist/build/utils.d.ts","./node_modules/next/dist/build/rendering-mode.d.ts","./node_modules/next/dist/server/lib/router-utils/build-prefetch-segment-data-route.d.ts","./node_modules/next/dist/server/lib/cpu-profile.d.ts","./node_modules/next/dist/build/turborepo-access-trace/types.d.ts","./node_modules/next/dist/build/turborepo-access-trace/result.d.ts","./node_modules/next/dist/build/turborepo-access-trace/helpers.d.ts","./node_modules/next/dist/build/turborepo-access-trace/index.d.ts","./node_modules/next/dist/export/routes/types.d.ts","./node_modules/next/dist/export/types.d.ts","./node_modules/next/dist/export/worker.d.ts","./node_modules/next/dist/build/worker.d.ts","./node_modules/next/dist/build/index.d.ts","./node_modules/next/dist/lib/coalesced-function.d.ts","./node_modules/next/dist/server/lib/router-utils/types.d.ts","./node_modules/next/dist/trace/types.d.ts","./node_modules/next/dist/trace/trace.d.ts","./node_modules/next/dist/trace/shared.d.ts","./node_modules/next/dist/trace/index.d.ts","./node_modules/next/dist/build/load-jsconfig.d.ts","./node_modules/@next/env/dist/index.d.ts","./node_modules/next/dist/build/webpack/plugins/telemetry-plugin/use-cache-tracker-utils.d.ts","./node_modules/next/dist/build/webpack/plugins/telemetry-plugin/telemetry-plugin.d.ts","./node_modules/next/dist/telemetry/storage.d.ts","./node_modules/next/dist/build/build-context.d.ts","./node_modules/next/dist/build/webpack-config.d.ts","./node_modules/next/dist/build/swc/generated-native.d.ts","./node_modules/next/dist/build/define-env.d.ts","./node_modules/next/dist/build/swc/index.d.ts","./node_modules/next/dist/build/swc/types.d.ts","./node_modules/next/dist/server/dev/parse-version-info.d.ts","./node_modules/next/dist/next-devtools/shared/types.d.ts","./node_modules/next/dist/server/dev/dev-indicator-server-state.d.ts","./node_modules/next/dist/next-devtools/dev-overlay/cache-indicator.d.ts","./node_modules/next/dist/server/lib/parse-stack.d.ts","./node_modules/next/dist/next-devtools/server/shared.d.ts","./node_modules/next/dist/next-devtools/shared/stack-frame.d.ts","./node_modules/next/dist/next-devtools/dev-overlay/utils/get-error-by-type.d.ts","./node_modules/next/dist/next-devtools/dev-overlay/container/runtime-error/render-error.d.ts","./node_modules/next/dist/shared/lib/request-insights.d.ts","./node_modules/next/dist/next-devtools/shared/request-insights.d.ts","./node_modules/next/dist/next-devtools/dev-overlay/shared.d.ts","./node_modules/@types/react-dom/client.d.ts","./node_modules/@types/react-dom/static.d.ts","./node_modules/@types/react-dom/server.d.ts","./node_modules/next/dist/server/app-render/app-render-prerender-utils.d.ts","./node_modules/next/dist/server/app-render/stream-ops.web.d.ts","./node_modules/next/dist/server/app-render/stream-ops.d.ts","./node_modules/next/dist/server/dev/debug-channel.d.ts","./node_modules/next/dist/server/dev/hot-reloader-types.d.ts","./node_modules/next/dist/server/lib/types.d.ts","./node_modules/next/dist/server/lib/lru-cache.d.ts","./node_modules/next/dist/server/lib/dev-bundler-service.d.ts","./node_modules/next/dist/server/base-http/node.d.ts","./node_modules/next/dist/server/lib/render-server.d.ts","./node_modules/next/dist/server/lib/router-server.d.ts","./node_modules/next/dist/shared/lib/router/utils/path-match.d.ts","./node_modules/next/dist/server/lib/router-utils/filesystem.d.ts","./node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.d.ts","./node_modules/next/dist/server/lib/router-utils/router-server-context.d.ts","./node_modules/next/dist/server/route-modules/route-module.d.ts","./node_modules/next/dist/server/load-components.d.ts","./node_modules/next/dist/server/web/spec-extension/fetch-event.d.ts","./node_modules/next/dist/server/web/spec-extension/response.d.ts","./node_modules/next/dist/build/segment-config/middleware/middleware-config.d.ts","./node_modules/next/dist/server/web/types.d.ts","./node_modules/next/dist/server/web/adapter.d.ts","./node_modules/next/dist/server/app-render/types.d.ts","./node_modules/next/dist/build/webpack/loaders/metadata/types.d.ts","./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.d.ts","./node_modules/next/dist/server/lib/app-dir-module.d.ts","./node_modules/next/dist/server/app-render/debug-channel-server.web.d.ts","./node_modules/next/dist/server/app-render/debug-channel-server.node.d.ts","./node_modules/next/dist/server/app-render/debug-channel-server.d.ts","./node_modules/next/dist/server/app-render/instant-validation/instant-validation.d.ts","./node_modules/next/dist/server/app-render/dev-validation-worker-globals.d.ts","./node_modules/next/dist/server/app-render/app-render.d.ts","./node_modules/next/dist/server/route-modules/app-page/vendored/contexts/entrypoints.d.ts","./node_modules/next/dist/client/components/error-boundary.d.ts","./node_modules/next/dist/client/components/layout-router.d.ts","./node_modules/next/dist/client/components/render-from-template-context.d.ts","./node_modules/next/dist/client/components/client-page.d.ts","./node_modules/next/dist/client/components/client-segment.d.ts","./node_modules/next/dist/client/components/http-access-fallback/error-boundary.d.ts","./node_modules/next/dist/lib/metadata/types/alternative-urls-types.d.ts","./node_modules/next/dist/lib/metadata/types/extra-types.d.ts","./node_modules/next/dist/lib/metadata/types/metadata-types.d.ts","./node_modules/next/dist/lib/metadata/types/manifest-types.d.ts","./node_modules/next/dist/lib/metadata/types/opengraph-types.d.ts","./node_modules/next/dist/lib/metadata/types/twitter-types.d.ts","./node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts","./node_modules/next/dist/lib/metadata/types/resolvers.d.ts","./node_modules/next/dist/lib/metadata/types/icons.d.ts","./node_modules/next/dist/lib/metadata/resolve-metadata.d.ts","./node_modules/next/dist/lib/metadata/metadata.d.ts","./node_modules/next/dist/lib/framework/boundary-components.d.ts","./node_modules/next/dist/server/app-render/rsc/preloads.d.ts","./node_modules/next/dist/server/app-render/postponed-state.d.ts","./node_modules/next/dist/server/app-render/rsc/postpone.d.ts","./node_modules/next/dist/server/app-render/rsc/taint.d.ts","./node_modules/next/dist/server/app-render/collect-segment-data.d.ts","./node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.d.ts","./node_modules/next/dist/server/app-render/entry-base.d.ts","./node_modules/next/dist/build/templates/app-page.d.ts","./node_modules/next/dist/server/route-modules/app-page/helpers/prerender-manifest-matcher.d.ts","./node_modules/@types/react/jsx-dev-runtime.d.ts","./node_modules/@types/react/jsx-runtime.d.ts","./node_modules/@types/react/compiler-runtime.d.ts","./node_modules/next/dist/server/route-modules/app-page/vendored/rsc/entrypoints.d.ts","./node_modules/next/dist/server/route-modules/app-page/vendored/ssr/entrypoints.d.ts","./node_modules/next/dist/server/route-modules/app-page/module.d.ts","./node_modules/next/dist/server/request/fallback-params.d.ts","./node_modules/next/dist/server/web/spec-extension/image-response.d.ts","./node_modules/next/dist/server/web/spec-extension/user-agent.d.ts","./node_modules/next/dist/server/web/spec-extension/url-pattern.d.ts","./node_modules/next/dist/server/after/index.d.ts","./node_modules/next/dist/server/request/connection.d.ts","./node_modules/next/dist/server/web/exports/index.d.ts","./node_modules/next/dist/server/request-meta.d.ts","./node_modules/next/dist/cli/next-test.d.ts","./node_modules/next/dist/server/use-cache/cache-life-profile.d.ts","./node_modules/next/dist/server/use-cache/cache-life.d.ts","./node_modules/next/dist/shared/lib/size-limit.d.ts","./node_modules/next/dist/server/config-shared.d.ts","./node_modules/next/dist/lib/page-types.d.ts","./node_modules/next/dist/build/segment-config/pages/pages-segment-config.d.ts","./node_modules/next/dist/build/analysis/get-page-static-info.d.ts","./node_modules/next/dist/build/webpack/loaders/get-module-build-info.d.ts","./node_modules/next/dist/build/webpack/plugins/middleware-plugin.d.ts","./node_modules/next/dist/shared/lib/router/utils/parse-url.d.ts","./node_modules/next/dist/server/lib/async-callback-set.d.ts","./node_modules/next/dist/shared/lib/router/utils/route-regex.d.ts","./node_modules/next/dist/shared/lib/router/utils/route-matcher.d.ts","./node_modules/@img/colour/index.d.ts","./node_modules/sharp/dist/index.d.mts","./node_modules/next/dist/server/image-optimizer.d.ts","./node_modules/next/dist/server/next-server.d.ts","./node_modules/next/dist/server/dev/static-paths-worker.d.ts","./node_modules/next/dist/server/dev/next-dev-server.d.ts","./node_modules/next/dist/server/next.d.ts","./node_modules/next/dist/build/adapter/build-complete.d.ts","./node_modules/next/dist/client/router-transition-types.d.ts","./node_modules/next/dist/types.d.ts","./node_modules/next/dist/shared/lib/html-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/utils.d.ts","./node_modules/next/dist/pages/_app.d.ts","./node_modules/next/app.d.ts","./node_modules/next/dist/server/web/spec-extension/unstable-cache.d.ts","./node_modules/next/dist/server/web/spec-extension/revalidate.d.ts","./node_modules/next/dist/server/web/spec-extension/unstable-no-store.d.ts","./node_modules/next/dist/server/request/io.d.ts","./node_modules/next/dist/server/use-cache/cache-tag.d.ts","./node_modules/next/cache.d.ts","./node_modules/next/dist/pages/_document.d.ts","./node_modules/next/document.d.ts","./node_modules/next/dist/shared/lib/dynamic.d.ts","./node_modules/next/dynamic.d.ts","./node_modules/next/dist/pages/_error.d.ts","./node_modules/next/dist/client/components/catch-error.d.ts","./node_modules/next/dist/api/error.d.ts","./node_modules/next/error.d.ts","./node_modules/next/dist/shared/lib/head.d.ts","./node_modules/next/head.d.ts","./node_modules/next/dist/server/request/cookies.d.ts","./node_modules/next/dist/server/request/headers.d.ts","./node_modules/next/dist/server/request/draft-mode.d.ts","./node_modules/next/headers.d.ts","./node_modules/next/dist/shared/lib/get-img-props.d.ts","./node_modules/next/dist/api/image.d.ts","./node_modules/next/dist/client/image-component.d.ts","./node_modules/next/dist/shared/lib/image-external.d.ts","./node_modules/next/image.d.ts","./node_modules/next/dist/client/link.d.ts","./node_modules/next/link.d.ts","./node_modules/next/dist/client/components/unrecognized-action-error.d.ts","./node_modules/next/dist/client/components/redirect.d.ts","./node_modules/next/dist/client/components/not-found.d.ts","./node_modules/next/dist/client/components/forbidden.d.ts","./node_modules/next/dist/client/components/unauthorized.d.ts","./node_modules/next/dist/client/components/unstable-rethrow.d.ts","./node_modules/next/dist/client/components/navigation.react-server.d.ts","./node_modules/next/dist/client/components/navigation.d.ts","./node_modules/next/navigation.d.ts","./node_modules/next/router.d.ts","./node_modules/next/dist/client/script.d.ts","./node_modules/next/script.d.ts","./node_modules/next/dist/compiled/@edge-runtime/primitives/url.d.ts","./node_modules/next/dist/compiled/@vercel/og/satori/index.d.ts","./node_modules/next/dist/compiled/@vercel/og/types.d.ts","./node_modules/next/server.d.ts","./node_modules/next/types/global.d.ts","./node_modules/next/types/compiled.d.ts","./node_modules/next/types.d.ts","./node_modules/next/index.d.ts","./node_modules/next/image-types/global.d.ts","./.next/types/routes.d.ts","./.next/types/root-params.d.ts","./next-env.d.ts","./lib/api.ts","./node_modules/lucide-react/dist/lucide-react.d.ts","./lib/nav.ts","./lib/permissions.ts","./lib/types.ts","./node_modules/clsx/clsx.d.mts","./node_modules/tailwind-merge/dist/types.d.ts","./lib/utils.ts","../node_modules/axios/index.d.ts","./services/api.ts","./services/authservice.ts","./services/farmservice.ts","./node_modules/@vercel/analytics/dist/next/index.d.mts","./node_modules/next/dist/compiled/@next/font/dist/types.d.ts","./node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts","./node_modules/next/font/google/index.d.ts","./app/layout.tsx","./node_modules/motion-utils/dist/index.d.ts","./node_modules/motion-dom/dist/index.d.ts","./node_modules/framer-motion/dist/index.d.ts","./node_modules/motion/dist/react.d.ts","./components/decor/rice-stalk.tsx","./components/layout/sidebar.tsx","./components/layout/header.tsx","./components/layout/app-shell.tsx","./components/globalsearch.tsx","./app/(dashboard)/layout.tsx","./node_modules/swr/dist/events-ny18dyc2.d.ts","./node_modules/dequal/index.d.ts","./node_modules/swr/dist/types-l2s7dphv.d.ts","./node_modules/swr/dist/index/index.d.mts","./components/dashboard/stat-card.tsx","./components/dashboard/weather-widget.tsx","./node_modules/@types/d3-time/index.d.ts","./node_modules/@types/d3-scale/index.d.ts","./node_modules/victory-vendor/d3-scale.d.ts","./node_modules/recharts/types/shape/dot.d.ts","./node_modules/recharts/types/component/text.d.ts","./node_modules/recharts/types/zindex/zindexlayer.d.ts","./node_modules/recharts/types/cartesian/getcartesianposition.d.ts","./node_modules/recharts/types/component/label.d.ts","./node_modules/recharts/types/cartesian/cartesianaxis.d.ts","./node_modules/recharts/types/util/scale/customscaledefinition.d.ts","./node_modules/redux/dist/redux.d.ts","./node_modules/immer/dist/immer.d.ts","./node_modules/reselect/dist/reselect.d.ts","./node_modules/redux-thunk/dist/redux-thunk.d.ts","./node_modules/@reduxjs/toolkit/dist/uncheckedindexed.ts","./node_modules/@reduxjs/toolkit/dist/index.d.mts","./node_modules/recharts/types/state/cartesianaxisslice.d.ts","./node_modules/recharts/types/synchronisation/types.d.ts","./node_modules/recharts/types/chart/types.d.ts","./node_modules/recharts/types/component/defaulttooltipcontent.d.ts","./node_modules/recharts/types/context/brushupdatecontext.d.ts","./node_modules/recharts/types/state/chartdataslice.d.ts","./node_modules/recharts/types/state/types/linesettings.d.ts","./node_modules/recharts/types/state/types/scattersettings.d.ts","./node_modules/@types/d3-path/index.d.ts","./node_modules/@types/d3-shape/index.d.ts","./node_modules/victory-vendor/d3-shape.d.ts","./node_modules/recharts/types/shape/curve.d.ts","./node_modules/recharts/types/component/labellist.d.ts","./node_modules/recharts/types/component/defaultlegendcontent.d.ts","./node_modules/recharts/types/util/payload/getuniqpayload.d.ts","./node_modules/recharts/types/util/useelementoffset.d.ts","./node_modules/recharts/types/component/legend.d.ts","./node_modules/recharts/types/state/legendslice.d.ts","./node_modules/recharts/types/state/types/stackedgraphicalitem.d.ts","./node_modules/recharts/types/util/stacks/stacktypes.d.ts","./node_modules/recharts/types/util/scale/rechartsscale.d.ts","./node_modules/recharts/types/util/chartutils.d.ts","./node_modules/recharts/types/state/selectors/areaselectors.d.ts","./node_modules/recharts/types/animation/easing.d.ts","./node_modules/recharts/types/animation/matchby.d.ts","./node_modules/recharts/types/animation/animateditems.d.ts","./node_modules/recharts/types/cartesian/arearevealshape.d.ts","./node_modules/recharts/types/cartesian/area.d.ts","./node_modules/recharts/types/state/types/areasettings.d.ts","./node_modules/recharts/types/shape/rectangle.d.ts","./node_modules/recharts/types/cartesian/bar.d.ts","./node_modules/recharts/types/util/barutils.d.ts","./node_modules/recharts/types/state/types/barsettings.d.ts","./node_modules/recharts/types/state/types/radialbarsettings.d.ts","./node_modules/recharts/types/util/svgpropertiesnoevents.d.ts","./node_modules/recharts/types/util/useuniqueid.d.ts","./node_modules/recharts/types/state/types/piesettings.d.ts","./node_modules/recharts/types/state/types/radarsettings.d.ts","./node_modules/recharts/types/state/graphicalitemsslice.d.ts","./node_modules/recharts/types/state/tooltipslice.d.ts","./node_modules/recharts/types/state/optionsslice.d.ts","./node_modules/recharts/types/state/layoutslice.d.ts","./node_modules/recharts/types/util/ifoverflow.d.ts","./node_modules/recharts/types/util/resolvedefaultprops.d.ts","./node_modules/recharts/types/cartesian/referenceline.d.ts","./node_modules/recharts/types/state/referenceelementsslice.d.ts","./node_modules/recharts/types/state/brushslice.d.ts","./node_modules/recharts/types/state/rootpropsslice.d.ts","./node_modules/recharts/types/state/polaraxisslice.d.ts","./node_modules/recharts/types/state/polaroptionsslice.d.ts","./node_modules/recharts/types/cartesian/linedrawshape.d.ts","./node_modules/recharts/types/cartesian/line.d.ts","./node_modules/recharts/types/shape/symbols.d.ts","./node_modules/recharts/types/util/constants.d.ts","./node_modules/recharts/types/util/scatterutils.d.ts","./node_modules/recharts/types/cartesian/scatter.d.ts","./node_modules/recharts/types/cartesian/errorbar.d.ts","./node_modules/recharts/types/state/errorbarslice.d.ts","./node_modules/recharts/types/state/zindexslice.d.ts","./node_modules/recharts/types/state/eventsettingsslice.d.ts","./node_modules/recharts/types/state/renderedticksslice.d.ts","./node_modules/recharts/types/state/store.d.ts","./node_modules/recharts/types/cartesian/getticks.d.ts","./node_modules/recharts/types/cartesian/cartesiangrid.d.ts","./node_modules/recharts/types/state/selectors/combiners/combinedisplayedstackeddata.d.ts","./node_modules/recharts/types/state/selectors/selecttooltipaxistype.d.ts","./node_modules/recharts/types/types.d.ts","./node_modules/recharts/types/hooks.d.ts","./node_modules/recharts/types/state/selectors/axisselectors.d.ts","./node_modules/recharts/types/component/dots.d.ts","./node_modules/recharts/types/util/typeddatakey.d.ts","./node_modules/recharts/types/util/types.d.ts","./node_modules/recharts/types/container/surface.d.ts","./node_modules/recharts/types/container/layer.d.ts","./node_modules/recharts/types/component/cursor.d.ts","./node_modules/recharts/types/component/tooltip.d.ts","./node_modules/recharts/types/component/responsivecontainer.d.ts","./node_modules/recharts/types/component/cell.d.ts","./node_modules/recharts/types/component/customized.d.ts","./node_modules/recharts/types/shape/sector.d.ts","./node_modules/recharts/types/shape/polygon.d.ts","./node_modules/recharts/types/shape/cross.d.ts","./node_modules/recharts/types/polar/polargrid.d.ts","./node_modules/recharts/types/polar/defaultpolarradiusaxisprops.d.ts","./node_modules/recharts/types/polar/polarradiusaxis.d.ts","./node_modules/recharts/types/polar/defaultpolarangleaxisprops.d.ts","./node_modules/recharts/types/polar/polarangleaxis.d.ts","./node_modules/recharts/types/context/tooltipcontext.d.ts","./node_modules/recharts/types/polar/pie.d.ts","./node_modules/recharts/types/polar/radar.d.ts","./node_modules/recharts/types/util/radialbarutils.d.ts","./node_modules/recharts/types/polar/radialbar.d.ts","./node_modules/recharts/types/cartesian/brush.d.ts","./node_modules/recharts/types/cartesian/referencedot.d.ts","./node_modules/recharts/types/util/excludeeventprops.d.ts","./node_modules/recharts/types/util/svgpropertiesandevents.d.ts","./node_modules/recharts/types/cartesian/referencearea.d.ts","./node_modules/recharts/types/cartesian/barstack.d.ts","./node_modules/recharts/types/cartesian/xaxis.d.ts","./node_modules/recharts/types/cartesian/yaxis.d.ts","./node_modules/recharts/types/cartesian/zaxis.d.ts","./node_modules/recharts/types/chart/linechart.d.ts","./node_modules/recharts/types/chart/barchart.d.ts","./node_modules/recharts/types/chart/piechart.d.ts","./node_modules/recharts/types/chart/treemap.d.ts","./node_modules/recharts/types/chart/sankey.d.ts","./node_modules/recharts/types/chart/radarchart.d.ts","./node_modules/recharts/types/chart/scatterchart.d.ts","./node_modules/recharts/types/chart/areachart.d.ts","./node_modules/recharts/types/chart/radialbarchart.d.ts","./node_modules/recharts/types/chart/composedchart.d.ts","./node_modules/recharts/types/chart/sunburstchart.d.ts","./node_modules/recharts/types/shape/trapezoid.d.ts","./node_modules/recharts/types/cartesian/funnel.d.ts","./node_modules/recharts/types/chart/funnelchart.d.ts","./node_modules/recharts/types/util/global.d.ts","./node_modules/recharts/types/animation/animationhandle.d.ts","./node_modules/recharts/types/animation/timeoutcontroller.d.ts","./node_modules/recharts/types/animation/animationcontroller.d.ts","./node_modules/recharts/types/animation/useanimationcontroller.d.ts","./node_modules/recharts/types/zindex/defaultzindexes.d.ts","./node_modules/decimal.js-light/decimal.d.ts","./node_modules/recharts/types/util/scale/getnicetickvalues.d.ts","./node_modules/recharts/types/context/chartlayoutcontext.d.ts","./node_modules/recharts/types/util/getrelativecoordinate.d.ts","./node_modules/recharts/types/util/createcartesiancharts.d.ts","./node_modules/recharts/types/util/createpolarcharts.d.ts","./node_modules/recharts/types/util/datautils.d.ts","./node_modules/recharts/types/theme/rechartstheme.d.ts","./node_modules/recharts/types/theme/rechartsthemecontext.d.ts","./node_modules/recharts/types/theme/darktheme.d.ts","./node_modules/recharts/types/theme/lighttheme.d.ts","./node_modules/recharts/types/theme/legacytheme.d.ts","./node_modules/recharts/types/index.d.ts","./components/dashboard/harvest-yield-chart.tsx","./app/(dashboard)/page.tsx","./components/batches/status-badge.tsx","./components/batches/create-batch-modal.tsx","./app/(dashboard)/batches/page.tsx","./app/(dashboard)/care-logs/page.tsx","./app/(dashboard)/crop-lots/page.tsx","./app/(dashboard)/supplies/page.tsx","./components/ui/field.tsx","./components/traceability/care-log-type-badge.tsx","./components/traceability/trace-report.tsx","./app/(dashboard)/traceability/page.tsx","./app/(dashboard)/users/page.tsx","./app/(dashboard)/varieties/page.tsx","./app/login/page.tsx","./app/trace/[code]/page.tsx","./components/weather-widget.tsx","./components/crop-lots/create-crop-lot-modal.tsx","./components/crop-lots/edit-crop-lot-modal.tsx","./components/dashboard/ai-alert-card.tsx","./components/dashboard/harvest-chart.tsx","./components/layout/notification-dropdown.tsx","./node_modules/@base-ui/react/internals/reason-parts.d.mts","./node_modules/@base-ui/react/internals/reasons.d.mts","./node_modules/@base-ui/react/internals/createbaseuieventdetails.d.mts","./node_modules/@base-ui/react/types/index.d.mts","./node_modules/@base-ui/react/internals/types.d.mts","./node_modules/@base-ui/react/button/button.d.mts","./node_modules/@base-ui/react/button/index.d.mts","./node_modules/class-variance-authority/dist/types.d.ts","./node_modules/class-variance-authority/dist/index.d.ts","./components/ui/button.tsx","./components/ui/modal.tsx","./.next/types/cache-life.d.ts","./.next/types/validator.ts","./.next/dev/types/cache-life.d.ts","./.next/dev/types/root-params.d.ts","./.next/dev/types/routes.d.ts","./.next/dev/types/validator.ts","./node_modules/@types/d3-array/index.d.ts","./node_modules/@types/d3-color/index.d.ts","./node_modules/@types/d3-ease/index.d.ts","./node_modules/@types/d3-interpolate/index.d.ts","./node_modules/@types/d3-timer/index.d.ts","./node_modules/@types/use-sync-external-store/index.d.ts","./node_modules/@types/validate-npm-package-name/index.d.ts"],"fileIdsList":[[91,146,163,164,502,503,504,505,506,769],[91,146,163,164,769,771],[91,146,163,164,461,547,569,579,737,740,741,742,743,747,748,749,750,751,769,771,773],[91,146,163,164,502,503,504,505,506,771],[91,146,163,164,461,547,550,569,579,737,740,741,742,747,748,749,750,751,769,771],[81,91,146,163,164,461,528,553,554,557,583,738,739,769,771],[81,91,146,163,164,461,553,554,556,557,583,769,771],[81,91,146,163,164,461,553,554,556,583,769,771],[91,146,163,164,461,577,578,769,771],[91,146,163,164,461,553,554,557,583,584,585,736,769,771],[81,91,146,163,164,461,553,554,583,769,771],[81,91,146,163,164,461,553,554,557,583,744,746,769,771],[91,146,163,164,461,545,548,565,568,769,771],[81,91,146,163,164,461,537,554,769,771],[81,91,146,163,164,461,553,554,557,583,769,771],[91,146,163,164,461,560,769,771],[81,91,146,163,164,461,553,554,557,769,771],[81,91,146,163,164,461,553,554,557,560,769,771],[81,91,146,163,164,461,553,554,557,583,735,769,771],[81,91,146,163,164,461,553,554,583,735,769,771],[91,146,163,164,461,554,560,769,771],[81,91,146,163,164,461,554,769,771],[91,146,163,164,461,560,573,769,771],[81,91,146,163,164,461,528,769,771],[81,91,146,163,164,461,574,575,576,769,771],[81,91,146,163,164,461,528,537,553,554,555,560,769,771],[81,91,146,163,164,461,528,537,554,555,560,574,769,771],[81,91,146,163,164,461,554,738,745,769,771],[91,146,163,164,461,560,764,766,769,771],[91,146,163,164,461,769,771],[91,146,163,164,461,554,769,771],[91,146,163,164,461,558,559,769,771],[91,146,163,164,548,549,550,551,769,771],[81,91,146,163,164,762,769,771],[91,146,163,164,763,769,771],[91,146,163,164,759,769,771],[91,146,163,164,758,769,771],[81,91,146,163,164,761,769,771],[81,91,146,163,164,760,769,771],[91,146,163,164,596,597,598,599,600,769,771],[91,146,163,164,769,771,776],[91,146,163,164,586,769,771],[91,146,163,164,610,769,771],[91,143,144,146,163,164,769,771],[91,145,146,163,164,769,771],[146,163,164,769,771],[91,146,151,163,164,181,769,771],[91,146,147,152,157,163,164,166,178,189,769,771],[91,146,147,148,157,163,164,166,769,771],[91,146,149,163,164,190,769,771],[91,146,150,151,158,163,164,167,769,771],[91,146,151,163,164,178,186,769,771],[91,146,152,154,157,163,164,166,769,771],[91,145,146,153,163,164,769,771],[91,146,154,155,163,164,769,771],[91,146,156,157,163,164,769,771],[91,145,146,157,163,164,769,771],[91,146,157,158,159,163,164,178,189,769,771],[91,146,157,158,159,163,164,173,178,181,769,771],[91,138,146,154,157,160,163,164,166,178,189,769,771],[91,146,157,158,160,161,163,164,166,178,186,189,769,771],[91,146,160,162,163,164,178,186,189,769,771],[91,146,157,163,164,769,771],[91,146,163,164,165,189,769,771],[91,146,154,157,163,164,166,178,769,771],[91,146,163,164,167,769,771],[91,146,163,164,168,769,771],[91,145,146,163,164,169,769,771],[91,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,769,771],[91,146,163,164,171,769,771],[91,146,163,164,172,769,771],[91,146,157,163,164,173,174,769,771],[91,146,163,164,173,175,190,192,769,771],[91,146,158,163,164,769,771],[91,146,157,163,164,178,179,181,769,771],[91,146,163,164,180,181,769,771],[91,146,163,164,178,179,769,771],[91,146,163,164,181,769,771],[91,146,163,164,182,769,771],[91,143,146,163,164,178,183,189,769,771],[91,146,157,163,164,184,185,769,771],[91,146,163,164,184,185,769,771],[91,146,151,163,164,166,178,186,769,771],[91,146,163,164,187,769,771],[88,89,90,91,92,93,94,95,96,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,769,771],[91,146,163,164,166,188,769,771],[91,146,160,163,164,172,189,769,771],[91,146,151,163,164,190,769,771],[91,146,163,164,178,191,769,771],[91,146,163,164,165,192,769,771],[91,146,163,164,193,769,771],[91,146,151,163,164,769,771],[91,138,146,163,164,769,771],[91,146,163,164,194,769,771],[91,138,146,157,159,163,164,169,178,181,189,191,192,194,769,771],[91,146,163,164,178,195,769,771],[81,85,91,146,163,164,197,198,199,200,201,497,543,769,771],[81,91,146,163,164,769,771],[81,85,91,146,163,164,197,198,199,200,397,497,543,769,771],[81,85,91,146,163,164,197,198,200,201,497,543,769,771],[81,91,146,163,164,201,397,398,769,771],[81,91,146,163,164,201,397,769,771],[81,85,91,146,163,164,198,199,200,201,497,543,769,771],[81,85,91,146,163,164,197,199,200,201,497,543,769,771],[79,80,91,146,163,164,769,771],[91,146,163,164,558,765,769,771],[91,146,163,164,558,769,771],[81,91,146,163,164,461,570,571,769,771],[91,146,163,164,570,769,771],[91,146,163,164,572,769,771],[91,146,163,164,500,769,771],[91,146,163,164,502,503,504,505,506,769,771],[91,146,163,164,433,512,513,769,771],[91,146,163,164,525,769,771],[91,146,163,164,221,222,224,236,356,367,478,483,769,771],[91,146,163,164,224,257,478,479,480,482,769,771],[91,146,163,164,203,224,373,375,377,378,380,478,769,771],[91,146,163,164,224,276,478,481,769,771],[91,146,163,164,203,222,224,235,236,243,248,254,355,356,357,366,478,769,771],[91,146,163,164,478,769,771],[91,146,163,164,231,238,257,258,352,769,771],[91,146,163,164,224,769,771],[91,146,163,164,202,231,238,769,771],[91,146,163,164,384,769,771],[91,146,163,164,381,382,384,769,771],[91,146,163,164,381,383,478,769,771],[91,146,160,163,164,457,465,473,769,771],[91,146,160,163,164,336,341,344,352,473,769,771],[91,146,160,163,164,301,473,769,771],[91,146,163,164,360,769,771],[91,146,163,164,359,360,361,769,771],[91,146,163,164,359,769,771],[87,91,146,160,163,164,202,215,216,224,236,243,248,255,256,257,353,354,367,478,483,497,769,771],[91,146,163,164,221,224,276,373,374,379,478,481,546,769,771],[91,146,163,164,481,546,769,771],[91,146,163,164,221,256,423,478,546,769,771],[91,146,163,164,546,769,771],[91,146,163,164,224,481,482,546,769,771],[91,146,163,164,376,546,769,771],[91,146,163,164,216,355,358,365,769,771],[81,91,146,163,164,433,769,771],[81,91,146,163,164,172,231,769,771],[81,91,146,163,164,231,769,771],[81,91,146,163,164,298,769,771],[81,91,146,163,164,238,433,769,771],[91,146,163,164,231,283,298,299,529,535,769,771],[91,146,163,164,282,530,531,532,533,534,769,771],[91,146,163,164,346,769,771],[91,146,163,164,346,347,769,771],[91,146,163,164,235,238,285,286,769,771],[91,146,163,164,238,293,294,769,771],[91,146,163,164,238,287,295,296,769,771],[91,146,163,164,293,769,771],[91,146,163,164,237,238,285,286,287,288,289,290,291,292,293,296,769,771],[91,146,163,164,238,288,294,769,771],[91,146,163,164,238,285,293,294,295,297,769,771],[91,146,163,164,238,286,288,289,290,294,769,771],[91,146,163,164,286,288,292,294,769,771],[91,146,163,164,238,769,771],[81,91,146,163,164,225,522,523,769,771],[81,91,146,163,164,189,769,771],[81,91,146,163,164,274,481,769,771],[81,91,146,163,164,367,481,769,771],[91,146,163,164,272,277,769,771],[81,91,146,163,164,273,499,769,771],[91,146,163,164,566,769,771],[81,85,91,146,160,163,164,197,198,199,200,201,497,542,769,771],[91,146,160,163,164,238,769,771],[91,146,160,163,164,222,227,236,242,304,321,362,363,367,416,422,478,769,771],[91,146,163,164,215,364,769,771],[91,146,163,164,497,769,771],[91,146,163,164,223,769,771],[81,91,146,163,164,229,231,425,446,448,769,771],[91,146,163,164,172,231,425,445,446,447,545,769,771],[91,146,163,164,439,440,441,442,443,444,769,771],[91,146,163,164,441,769,771],[91,146,163,164,445,769,771],[81,91,146,163,164,391,392,396,769,771],[81,91,146,163,164,238,385,386,387,388,393,395,769,771],[91,146,163,164,391,393,769,771],[91,146,163,164,389,769,771],[91,146,163,164,394,769,771],[91,146,163,164,390,769,771],[81,91,146,163,164,498,499,769,771],[81,91,146,163,164,499,769,771],[91,146,163,164,321,322,336,769,771],[91,146,163,164,322,769,771],[91,146,160,163,164,499,769,771],[91,146,163,164,350,769,771],[91,145,146,163,164,349,769,771],[91,146,163,164,178,769,771],[91,146,163,164,227,231,238,244,246,329,334,336,341,402,422,425,429,430,465,466,473,769,771],[91,146,163,164,237,238,250,290,769,771],[91,146,163,164,426,427,769,771],[91,146,163,164,178,426,769,771],[91,146,163,164,400,769,771],[91,146,163,164,225,231,429,431,466,473,478,769,771],[91,146,163,164,327,330,336,341,769,771],[81,91,146,163,164,178,229,231,344,384,429,434,435,436,437,438,449,450,451,452,453,454,455,456,546,769,771],[91,146,163,164,229,231,257,323,324,325,328,329,341,769,771],[91,146,163,164,178,238,257,327,335,402,425,428,431,473,769,771],[91,146,163,164,231,242,398,466,769,771],[91,146,163,164,331,769,771],[91,146,163,164,398,401,769,771],[91,146,163,164,398,399,400,546,769,771],[91,146,160,163,164,172,203,225,227,238,242,252,265,266,268,321,388,402,416,421,465,478,497,546,769,771],[91,146,163,164,229,231,769,771],[91,146,163,164,341,769,771],[91,145,146,163,164,227,240,257,265,266,333,337,338,339,340,478,769,771],[91,146,163,164,336,769,771],[91,145,146,163,164,230,231,242,246,263,323,324,325,326,327,330,331,332,334,335,341,466,769,771],[91,146,160,163,164,203,263,323,769,771],[91,146,163,164,227,257,266,321,341,422,478,769,771],[91,146,160,163,164,203,478,769,771],[91,146,160,163,164,178,203,227,473,769,771],[91,146,160,163,164,172,202,203,227,231,236,244,246,248,250,252,260,265,266,267,268,304,305,307,310,312,315,316,317,318,320,367,416,422,473,478,481,769,771],[91,146,160,163,164,178,769,771],[91,146,163,164,224,225,226,255,384,473,474,476,477,497,499,546,769,771],[91,146,163,164,221,222,478,769,771],[91,146,163,164,402,404,769,771],[91,146,160,163,164,178,189,233,380,384,385,386,387,388,395,396,402,403,546,769,771],[91,146,163,164,172,189,202,231,233,246,248,266,305,310,320,321,373,407,408,416,420,422,473,478,484,491,492,769,771],[91,146,163,164,215,216,248,255,266,478,769,771],[91,146,160,163,164,225,236,246,266,473,478,489,769,771],[91,146,163,164,424,769,771],[91,146,160,163,164,404,405,406,413,769,771],[91,146,163,164,473,478,769,771],[91,146,163,164,333,466,769,771],[91,146,163,164,246,265,367,499,769,771],[91,146,160,163,164,172,223,310,369,373,407,408,473,491,494,769,771],[91,146,160,163,164,215,216,373,409,769,771],[91,146,163,164,203,224,267,367,411,478,769,771],[91,146,160,163,164,189,388,402,478,769,771],[91,146,160,163,164,267,367,368,369,378,404,410,412,478,481,769,771],[87,91,146,160,163,164,250,265,415,497,499,769,771],[91,146,163,164,319,416,769,771],[91,146,160,163,164,172,215,216,231,234,236,238,244,246,252,266,268,305,307,317,320,321,367,408,416,420,422,473,483,484,485,487,490,499,769,771],[91,146,160,163,164,178,216,413,473,491,493,769,771],[91,146,163,164,205,206,207,208,209,210,211,212,213,214,769,771],[91,146,163,164,260,311,769,771],[91,146,163,164,313,769,771],[91,146,163,164,311,769,771],[91,146,163,164,313,314,769,771],[91,146,160,163,164,178,227,235,236,238,242,243,769,771],[91,146,160,163,164,172,203,223,225,244,247,250,265,268,303,416,473,497,499,769,771],[91,146,160,163,164,172,189,227,228,234,235,246,247,266,414,466,472,769,771],[91,146,163,164,323,769,771],[91,146,163,164,324,769,771],[91,146,163,164,238,248,465,769,771],[91,146,163,164,325,769,771],[91,146,163,164,230,769,771],[91,146,163,164,232,245,769,771],[91,146,160,163,164,232,236,244,769,771],[91,146,163,164,240,245,769,771],[91,146,163,164,241,769,771],[91,146,163,164,232,233,769,771],[91,146,163,164,232,269,769,771],[91,146,163,164,232,769,771],[91,146,163,164,234,260,309,769,771],[91,146,163,164,308,769,771],[91,146,163,164,231,233,234,769,771],[91,146,163,164,234,306,769,771],[91,146,163,164,231,233,769,771],[91,146,163,164,265,367,769,771],[91,146,163,164,465,769,771],[91,146,160,163,164,189,227,244,246,249,265,367,415,422,425,430,431,432,458,459,463,464,466,473,769,771],[91,146,163,164,278,281,283,284,298,299,769,771],[81,91,146,163,164,199,200,201,460,461,462,769,771],[81,91,146,163,164,199,200,201,399,460,461,462,769,771],[91,146,163,164,351,769,771],[91,146,163,164,203,257,259,264,265,336,341,342,343,344,345,347,348,350,353,415,422,478,769,771],[91,146,163,164,298,769,771],[91,146,160,163,164,303,473,769,771],[91,146,163,164,303,769,771],[91,146,160,163,164,244,270,300,302,304,415,473,497,499,769,771],[91,146,163,164,278,279,280,281,283,284,298,299,498,769,771],[87,91,146,160,163,164,172,189,227,232,233,246,252,265,266,268,367,413,414,416,473,478,497,769,771],[91,146,163,164,475,769,771],[91,146,163,164,229,231,239,769,771],[91,146,163,164,264,266,417,420,769,771],[91,146,163,164,264,418,467,468,469,470,471,769,771],[91,146,160,163,164,260,478,769,771],[91,146,160,163,164,769,771],[91,146,163,164,263,336,769,771],[91,146,163,164,262,769,771],[91,146,163,164,264,317,769,771],[91,146,163,164,261,263,478,769,771],[91,146,160,163,164,227,228,264,417,418,419,473,478,769,771],[81,91,146,163,164,231,238,297,769,771],[81,91,146,163,164,237,769,771],[91,146,163,164,219,220,769,771],[81,91,146,163,164,225,769,771],[81,91,146,163,164,231,282,769,771],[81,87,91,146,163,164,265,268,497,499,769,771],[91,146,163,164,225,522,524,769,771],[81,91,146,163,164,277,769,771],[81,91,146,163,164,172,189,223,271,273,275,276,499,769,771],[91,146,163,164,227,231,481,769,771],[91,146,163,164,231,486,769,771],[81,91,146,158,160,163,164,172,221,223,277,375,497,498,769,771],[81,91,146,163,164,197,198,199,200,201,497,543,769,771],[81,82,83,84,85,91,146,163,164,769,771],[91,146,163,164,370,371,372,769,771],[91,146,163,164,370,769,771],[81,85,91,146,160,162,163,164,172,196,197,198,199,200,201,202,203,223,252,257,445,494,495,496,499,543,769,771],[91,146,163,164,508,769,771],[91,146,163,164,510,769,771],[91,146,163,164,514,769,771],[91,146,163,164,567,769,771],[91,146,163,164,516,769,771],[91,146,163,164,518,519,520,769,771],[86,91,146,163,164,501,507,509,511,515,517,521,526,528,537,538,540,544,545,546,547,769,771],[91,146,163,164,527,769,771],[91,146,163,164,536,769,771],[91,146,163,164,273,769,771],[91,146,163,164,539,769,771],[91,145,146,163,164,264,417,418,420,467,468,470,471,541,543,769,771],[91,146,163,164,196,769,771],[81,91,146,163,164,625,626,673,769,771],[91,146,163,164,718,719,769,771],[91,146,163,164,625,769,771],[91,146,163,164,673,769,771],[81,91,146,163,164,720,769,771],[81,91,146,163,164,591,602,605,607,613,614,621,623,624,626,627,628,630,670,673,769,771],[81,91,146,163,164,613,673,769,771],[81,91,146,163,164,591,602,605,607,612,614,623,625,626,627,631,633,634,670,673,769,771],[81,91,146,163,164,623,631,675,769,771],[81,91,146,163,164,606,673,769,771],[81,91,146,163,164,590,591,593,602,673,769,771],[81,91,146,163,164,591,602,623,664,673,769,771],[81,91,146,163,164,591,632,653,657,673,769,771],[81,91,146,163,164,605,614,626,627,640,641,673,714,769,771],[91,146,163,164,590,673,769,771],[91,146,163,164,602,673,769,771],[81,91,146,163,164,591,602,605,607,613,614,626,627,652,670,673,769,771],[81,91,146,163,164,591,593,631,644,697,769,771],[81,91,146,163,164,589,591,593,644,769,771],[81,91,146,163,164,591,593,622,644,645,673,769,771],[81,91,146,163,164,591,602,605,609,613,614,626,627,641,654,656,670,673,769,771],[81,91,146,163,164,595,602,673,769,771],[81,91,146,163,164,595,602,670,673,769,771],[81,91,146,163,164,673,769,771],[81,91,146,163,164,673,735,769,771],[81,91,146,163,164,631,641,673,769,771],[81,91,146,163,164,590,641,673,769,771],[81,91,146,163,164,641,673,769,771],[81,91,146,163,164,603,769,771],[81,91,146,163,164,591,641,673,769,771],[81,91,146,163,164,589,591,673,769,771],[81,91,146,163,164,590,591,592,673,769,771],[81,91,146,163,164,590,591,593,673,735,769,771],[81,91,146,163,164,592,615,616,617,673,769,771],[81,91,146,163,164,602,604,605,616,641,673,676,769,771],[91,146,163,164,663,673,769,771],[91,146,163,164,602,603,622,668,670,673,769,771],[91,146,163,164,589,590,591,592,593,594,595,602,603,605,613,614,615,618,622,624,625,626,627,628,629,631,632,641,644,646,652,653,654,656,657,658,665,668,669,670,673,674,675,677,678,679,680,681,682,683,684,686,688,690,691,692,693,694,695,698,699,700,701,702,703,704,705,706,707,708,709,710,711,712,713,714,715,716,717,718,719,720,721,722,724,725,726,727,728,729,730,731,732,733,734,769,771],[81,91,146,163,164,591,605,607,614,626,627,636,638,640,655,673,689,735,769,771],[81,91,146,163,164,591,595,602,645,673,687,769,771],[81,91,146,163,164,591,602,769,771],[81,91,146,163,164,591,595,602,645,673,685,769,771],[81,91,146,163,164,591,614,622,626,627,637,645,673,769,771],[81,91,146,163,164,591,602,605,607,612,614,623,626,627,670,673,681,689,692,769,771],[81,91,146,163,164,612,673,769,771],[81,91,146,163,164,625,673,769,771],[91,146,163,164,596,601,673,769,771],[91,146,163,164,594,595,596,601,670,673,769,771],[91,146,163,164,596,601,606,769,771],[91,146,163,164,596,601,640,658,673,769,771],[91,146,163,164,596,601,602,607,608,609,630,634,635,638,639,673,769,771],[91,146,163,164,592,596,601,615,618,673,769,771],[91,146,163,164,596,601,641,673,769,771],[91,146,163,164,596,601,602,769,771],[91,146,163,164,596,601,769,771],[91,146,163,164,596,597,601,602,644,646,769,771],[91,146,163,164,596,597,601,602,673,769,771],[91,146,163,164,596,601,603,629,673,769,771],[91,146,163,164,621,640,663,673,769,771],[91,146,163,164,602,607,620,621,622,640,647,650,659,663,665,666,667,669,673,769,771],[91,146,163,164,602,607,620,621,769,771],[91,146,163,164,663,769,771],[91,146,163,164,601,602,607,619,640,641,642,643,647,648,649,650,651,659,660,661,662,769,771],[91,146,163,164,596,601,602,604,605,640,673,769,771],[91,146,163,164,607,620,629,640,673,769,771],[91,146,163,164,620,633,640,769,771],[91,146,163,164,607,640,673,769,771],[81,91,146,163,164,605,636,637,640,673,769,771],[91,146,163,164,640,769,771],[91,146,163,164,620,640,769,771],[91,146,163,164,605,607,640,673,769,771],[91,146,163,164,623,640,673,769,771],[91,146,163,164,641,673,769,771],[91,146,163,164,730,769,771],[81,91,146,163,164,730,769,771],[81,91,146,163,164,631,632,673,769,771],[91,146,163,164,605,612,619,621,622,641,670,673,769,771],[81,91,146,163,164,605,629,632,653,657,673,677,700,701,702,715,769,771],[81,91,146,163,164,605,673,677,686,688,690,691,693,769,771],[81,91,146,163,164,673,693,735,769,771],[91,146,163,164,602,673,723,769,771],[91,146,163,164,595,673,769,771],[81,91,146,163,164,640,654,655,657,673,769,771],[91,146,163,164,612,620,623,640,769,771],[81,91,146,163,164,636,696,769,771],[81,91,146,163,164,588,589,590,593,594,595,602,603,604,607,625,629,636,670,671,672,735,769,771],[91,146,163,164,596,769,771],[91,146,163,164,178,196,488,769,771],[91,146,163,164,582,769,771],[81,91,146,163,164,580,581,769,771],[91,103,106,109,110,146,163,164,189,769,771],[91,106,146,163,164,178,189,769,771],[91,106,110,146,163,164,189,769,771],[91,100,146,163,164,769,771],[91,104,146,163,164,769,771],[91,102,103,106,146,163,164,189,769,771],[91,146,163,164,166,186,769,771],[91,100,146,163,164,196,769,771],[91,102,106,146,163,164,166,189,769,771],[91,97,98,99,101,105,146,157,163,164,178,189,769,771],[91,106,115,123,146,163,164,769,771],[91,98,104,146,163,164,769,771],[91,106,132,133,146,163,164,769,771],[91,98,101,106,146,163,164,181,189,196,769,771],[91,106,146,163,164,769,771],[91,102,106,146,163,164,189,769,771],[91,97,146,163,164,769,771],[91,100,101,102,104,105,106,107,108,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,133,134,135,136,137,146,163,164,769,771],[91,106,125,128,146,154,163,164,769,771],[91,106,115,116,117,146,163,164,769,771],[91,104,106,116,118,146,163,164,769,771],[91,105,146,163,164,769,771],[91,98,100,106,146,163,164,769,771],[91,106,110,116,118,146,163,164,769,771],[91,110,146,163,164,769,771],[91,104,106,109,146,163,164,189,769,771],[91,98,102,106,115,146,163,164,769,771],[91,106,125,146,163,164,769,771],[91,118,146,163,164,769,771],[91,100,106,132,146,163,164,181,194,196,769,771],[91,146,163,164,587,769,771],[91,146,163,164,611,769,771],[91,146,163,164,461,561,769,771],[91,146,163,164,461,562,769,771]],"fileInfos":[{"version":"e41c290ef7dd7dab3493e6cbe5909e0148edf4a8dad0271be08edec368a0f7b9","affectsGlobalScope":true,"impliedFormat":1},{"version":"45b7ab580deca34ae9729e97c13cfd999df04416a79116c3bfb483804f85ded4","impliedFormat":1},{"version":"3facaf05f0c5fc569c5649dd359892c98a85557e3e0c847964caeb67076f4d75","impliedFormat":1},{"version":"e44bb8bbac7f10ecc786703fe0a6a4b952189f908707980ba8f3c8975a760962","impliedFormat":1},{"version":"5e1c4c362065a6b95ff952c0eab010f04dcd2c3494e813b493ecfd4fcb9fc0d8","impliedFormat":1},{"version":"68d73b4a11549f9c0b7d352d10e91e5dca8faa3322bfb77b661839c42b1ddec7","impliedFormat":1},{"version":"5efce4fc3c29ea84e8928f97adec086e3dc876365e0982cc8479a07954a3efd4","impliedFormat":1},{"version":"feecb1be483ed332fad555aff858affd90a48ab19ba7272ee084704eb7167569","impliedFormat":1},{"version":"ee7bad0c15b58988daa84371e0b89d313b762ab83cb5b31b8a2d1162e8eb41c2","impliedFormat":1},{"version":"27bdc30a0e32783366a5abeda841bc22757c1797de8681bbe81fbc735eeb1c10","impliedFormat":1},{"version":"8fd575e12870e9944c7e1d62e1f5a73fcf23dd8d3a321f2a2c74c20d022283fe","impliedFormat":1},{"version":"e12a46ce14b817d4c9e6b2b478956452330bf00c9801b79de46f7a1815b5bd40","impliedFormat":1},{"version":"4fd3f3422b2d2a3dfd5cdd0f387b3a8ec45f006c6ea896a4cb41264c2100bb2c","affectsGlobalScope":true,"impliedFormat":1},{"version":"69e65d976bf166ce4a9e6f6c18f94d2424bf116e90837ace179610dbccad9b42","affectsGlobalScope":true,"impliedFormat":1},{"version":"c57796738e7f83dbc4b8e65132f11a377649c00dd3eee333f672b8f0a6bea671","affectsGlobalScope":true,"impliedFormat":1},{"version":"dc2df20b1bcdc8c2d34af4926e2c3ab15ffe1160a63e58b7e09833f616efff44","affectsGlobalScope":true,"impliedFormat":1},{"version":"515d0b7b9bea2e31ea4ec968e9edd2c39d3eebf4a2d5cbd04e88639819ae3b71","affectsGlobalScope":true,"impliedFormat":1},{"version":"62bb211266ee48b2d0edf0d8d1b191f0c24fc379a82bd4c1692a082c540bc6b1","affectsGlobalScope":true,"impliedFormat":1},{"version":"0dc1e7ceda9b8b9b455c3a2d67b0412feab00bd2f66656cd8850e8831b08b537","affectsGlobalScope":true,"impliedFormat":1},{"version":"ce691fb9e5c64efb9547083e4a34091bcbe5bdb41027e310ebba8f7d96a98671","affectsGlobalScope":true,"impliedFormat":1},{"version":"8d697a2a929a5fcb38b7a65594020fcef05ec1630804a33748829c5ff53640d0","affectsGlobalScope":true,"impliedFormat":1},{"version":"4ff2a353abf8a80ee399af572debb8faab2d33ad38c4b4474cff7f26e7653b8d","affectsGlobalScope":true,"impliedFormat":1},{"version":"936e80ad36a2ee83fc3caf008e7c4c5afe45b3cf3d5c24408f039c1d47bdc1df","affectsGlobalScope":true,"impliedFormat":1},{"version":"d15bea3d62cbbdb9797079416b8ac375ae99162a7fba5de2c6c505446486ac0a","affectsGlobalScope":true,"impliedFormat":1},{"version":"68d18b664c9d32a7336a70235958b8997ebc1c3b8505f4f1ae2b7e7753b87618","affectsGlobalScope":true,"impliedFormat":1},{"version":"eb3d66c8327153d8fa7dd03f9c58d351107fe824c79e9b56b462935176cdf12a","affectsGlobalScope":true,"impliedFormat":1},{"version":"38f0219c9e23c915ef9790ab1d680440d95419ad264816fa15009a8851e79119","affectsGlobalScope":true,"impliedFormat":1},{"version":"69ab18c3b76cd9b1be3d188eaf8bba06112ebbe2f47f6c322b5105a6fbc45a2e","affectsGlobalScope":true,"impliedFormat":1},{"version":"fef8cfad2e2dc5f5b3d97a6f4f2e92848eb1b88e897bb7318cef0e2820bceaab","affectsGlobalScope":true,"impliedFormat":1},{"version":"2f11ff796926e0832f9ae148008138ad583bd181899ab7dd768a2666700b1893","affectsGlobalScope":true,"impliedFormat":1},{"version":"4de680d5bb41c17f7f68e0419412ca23c98d5749dcaaea1896172f06435891fc","affectsGlobalScope":true,"impliedFormat":1},{"version":"954296b30da6d508a104a3a0b5d96b76495c709785c1d11610908e63481ee667","affectsGlobalScope":true,"impliedFormat":1},{"version":"ac9538681b19688c8eae65811b329d3744af679e0bdfa5d842d0e32524c73e1c","affectsGlobalScope":true,"impliedFormat":1},{"version":"0a969edff4bd52585473d24995c5ef223f6652d6ef46193309b3921d65dd4376","affectsGlobalScope":true,"impliedFormat":1},{"version":"9e9fbd7030c440b33d021da145d3232984c8bb7916f277e8ffd3dc2e3eae2bdb","affectsGlobalScope":true,"impliedFormat":1},{"version":"811ec78f7fefcabbda4bfa93b3eb67d9ae166ef95f9bff989d964061cbf81a0c","affectsGlobalScope":true,"impliedFormat":1},{"version":"717937616a17072082152a2ef351cb51f98802fb4b2fdabd32399843875974ca","affectsGlobalScope":true,"impliedFormat":1},{"version":"d7e7d9b7b50e5f22c915b525acc5a49a7a6584cf8f62d0569e557c5cfc4b2ac2","affectsGlobalScope":true,"impliedFormat":1},{"version":"71c37f4c9543f31dfced6c7840e068c5a5aacb7b89111a4364b1d5276b852557","affectsGlobalScope":true,"impliedFormat":1},{"version":"576711e016cf4f1804676043e6a0a5414252560eb57de9faceee34d79798c850","affectsGlobalScope":true,"impliedFormat":1},{"version":"89c1b1281ba7b8a96efc676b11b264de7a8374c5ea1e6617f11880a13fc56dc6","affectsGlobalScope":true,"impliedFormat":1},{"version":"74f7fa2d027d5b33eb0471c8e82a6c87216223181ec31247c357a3e8e2fddc5b","affectsGlobalScope":true,"impliedFormat":1},{"version":"f1e2a172204962276504466a6393426d2ca9c54894b1ad0a6c9dad867a65f876","affectsGlobalScope":true,"impliedFormat":1},{"version":"063600664504610fe3e99b717a1223f8b1900087fab0b4cad1496a114744f8df","affectsGlobalScope":true,"impliedFormat":1},{"version":"934019d7e3c81950f9a8426d093458b65d5aff2c7c1511233c0fd5b941e608ab","affectsGlobalScope":true,"impliedFormat":1},{"version":"52ada8e0b6e0482b728070b7639ee42e83a9b1c22d205992756fe020fd9f4a47","affectsGlobalScope":true,"impliedFormat":1},{"version":"3bdefe1bfd4d6dee0e26f928f93ccc128f1b64d5d501ff4a8cf3c6371200e5e6","affectsGlobalScope":true,"impliedFormat":1},{"version":"59fb2c069260b4ba00b5643b907ef5d5341b167e7d1dbf58dfd895658bda2867","affectsGlobalScope":true,"impliedFormat":1},{"version":"639e512c0dfc3fad96a84caad71b8834d66329a1f28dc95e3946c9b58176c73a","affectsGlobalScope":true,"impliedFormat":1},{"version":"368af93f74c9c932edd84c58883e736c9e3d53cec1fe24c0b0ff451f529ceab1","affectsGlobalScope":true,"impliedFormat":1},{"version":"af3dd424cf267428f30ccfc376f47a2c0114546b55c44d8c0f1d57d841e28d74","affectsGlobalScope":true,"impliedFormat":1},{"version":"995c005ab91a498455ea8dfb63aa9f83fa2ea793c3d8aa344be4a1678d06d399","affectsGlobalScope":true,"impliedFormat":1},{"version":"959d36cddf5e7d572a65045b876f2956c973a586da58e5d26cde519184fd9b8a","affectsGlobalScope":true,"impliedFormat":1},{"version":"965f36eae237dd74e6cca203a43e9ca801ce38824ead814728a2807b1910117d","affectsGlobalScope":true,"impliedFormat":1},{"version":"3925a6c820dcb1a06506c90b1577db1fdbf7705d65b62b99dce4be75c637e26b","affectsGlobalScope":true,"impliedFormat":1},{"version":"0a3d63ef2b853447ec4f749d3f368ce642264246e02911fcb1590d8c161b8005","affectsGlobalScope":true,"impliedFormat":1},{"version":"b5ce7a470bc3628408429040c4e3a53a27755022a32fd05e2cb694e7015386c7","affectsGlobalScope":true,"impliedFormat":1},{"version":"8444af78980e3b20b49324f4a16ba35024fef3ee069a0eb67616ea6ca821c47a","affectsGlobalScope":true,"impliedFormat":1},{"version":"3287d9d085fbd618c3971944b65b4be57859f5415f495b33a6adc994edd2f004","affectsGlobalScope":true,"impliedFormat":1},{"version":"b4b67b1a91182421f5df999988c690f14d813b9850b40acd06ed44691f6727ad","affectsGlobalScope":true,"impliedFormat":1},{"version":"bab26767638ab3557de12c900f0b91f710c7dc40ee9793d5a27d32c04f0bf646","affectsGlobalScope":true,"impliedFormat":1},{"version":"436aaf437562f276ec2ddbee2f2cdedac7664c1e4c1d2c36839ddd582eeb3d0a","affectsGlobalScope":true,"impliedFormat":1},{"version":"8e3c06ea092138bf9fa5e874a1fdbc9d54805d074bee1de31b99a11e2fec239d","affectsGlobalScope":true,"impliedFormat":1},{"version":"87dc0f382502f5bbce5129bdc0aea21e19a3abbc19259e0b43ae038a9fc4e326","affectsGlobalScope":true,"impliedFormat":1},{"version":"b1cb28af0c891c8c96b2d6b7be76bd394fddcfdb4709a20ba05a7c1605eea0f9","affectsGlobalScope":true,"impliedFormat":1},{"version":"2fef54945a13095fdb9b84f705f2b5994597640c46afeb2ce78352fab4cb3279","affectsGlobalScope":true,"impliedFormat":1},{"version":"ac77cb3e8c6d3565793eb90a8373ee8033146315a3dbead3bde8db5eaf5e5ec6","affectsGlobalScope":true,"impliedFormat":1},{"version":"56e4ed5aab5f5920980066a9409bfaf53e6d21d3f8d020c17e4de584d29600ad","affectsGlobalScope":true,"impliedFormat":1},{"version":"4ece9f17b3866cc077099c73f4983bddbcb1dc7ddb943227f1ec070f529dedd1","affectsGlobalScope":true,"impliedFormat":1},{"version":"0a6282c8827e4b9a95f4bf4f5c205673ada31b982f50572d27103df8ceb8013c","affectsGlobalScope":true,"impliedFormat":1},{"version":"1c9319a09485199c1f7b0498f2988d6d2249793ef67edda49d1e584746be9032","affectsGlobalScope":true,"impliedFormat":1},{"version":"e3a2a0cee0f03ffdde24d89660eba2685bfbdeae955a6c67e8c4c9fd28928eeb","affectsGlobalScope":true,"impliedFormat":1},{"version":"811c71eee4aa0ac5f7adf713323a5c41b0cf6c4e17367a34fbce379e12bbf0a4","affectsGlobalScope":true,"impliedFormat":1},{"version":"51ad4c928303041605b4d7ae32e0c1ee387d43a24cd6f1ebf4a2699e1076d4fa","affectsGlobalScope":true,"impliedFormat":1},{"version":"d4b1d2c51d058fc21ec2629fff7a76249dec2e36e12960ea056e3ef89174080f","affectsGlobalScope":true,"impliedFormat":1},{"version":"61d6a2092f48af66dbfb220e31eea8b10bc02b6932d6e529005fd2d7b3281290","affectsGlobalScope":true,"impliedFormat":1},{"version":"8e7f8264d0fb4c5339605a15daadb037bf238c10b654bb3eee14208f860a32ea","affectsGlobalScope":true,"impliedFormat":1},{"version":"782dec38049b92d4e85c1585fbea5474a219c6984a35b004963b00beb1aab538","affectsGlobalScope":true,"impliedFormat":1},{"version":"7e29f41b158de217f94cb9676bf9cbd0cd9b5a46e1985141ed36e075c52bf6ad","affectsGlobalScope":true,"impliedFormat":1},{"version":"ac51dd7d31333793807a6abaa5ae168512b6131bd41d9c5b98477fc3b7800f9f","impliedFormat":1},{"version":"814d5c7384f3ca276e9dc4bcfde5545801a3ea0bfae09916b3336774e662fd1b","impliedFormat":1},{"version":"acd8fd5090ac73902278889c38336ff3f48af6ba03aa665eb34a75e7ba1dccc4","impliedFormat":1},{"version":"d6258883868fb2680d2ca96bc8b1352cab69874581493e6d52680c5ffecdb6cc","impliedFormat":1},{"version":"1b61d259de5350f8b1e5db06290d31eaebebc6baafd5f79d314b5af9256d7153","impliedFormat":1},{"version":"f258e3960f324a956fc76a3d3d9e964fff2244ff5859dcc6ce5951e5413ca826","impliedFormat":1},{"version":"643f7232d07bf75e15bd8f658f664d6183a0efaca5eb84b48201c7671a266979","impliedFormat":1},{"version":"68d7453aee169c6f39bf6a87d2a07e21209dfe085ce8469b7331bc7f8f0545eb","impliedFormat":1},{"version":"cebfeedf63623d54f7423d58cae1ec204c0d8d97a66d5fb17579e26a902085e1","affectsGlobalScope":true,"impliedFormat":1},{"version":"d153a11543fd884b596587ccd97aebbeed950b26933ee000f94009f1ab142848","affectsGlobalScope":true,"impliedFormat":1},{"version":"378281aa35786c27d5811af7e6bcaa492eebd0c7013d48137c35bbc69a2b9751","affectsGlobalScope":true,"impliedFormat":1},{"version":"3af97acf03cc97de58a3a4bc91f8f616408099bc4233f6d0852e72a8ffb91ac9","affectsGlobalScope":true,"impliedFormat":1},{"version":"1b2dd1cbeb0cc6ae20795958ba5950395ebb2849b7c8326853dd15530c77ab0c","affectsGlobalScope":true,"impliedFormat":1},{"version":"1db0b7dca579049ca4193d034d835f6bfe73096c73663e5ef9a0b5779939f3d0","affectsGlobalScope":true,"impliedFormat":1},{"version":"387a023d363f755eb63450a66c28b14cdd7bc30a104565e2dbf0a8988bb4a56c","affectsGlobalScope":true,"impliedFormat":1},{"version":"9798340ffb0d067d69b1ae5b32faa17ab31b82466a3fc00d8f2f2df0c8554aaa","affectsGlobalScope":true,"impliedFormat":1},{"version":"f26b11d8d8e4b8028f1c7d618b22274c892e4b0ef5b3678a8ccbad85419aef43","affectsGlobalScope":true,"impliedFormat":1},{"version":"cdcf9ea426ad970f96ac930cd176d5c69c6c24eebd9fc580e1572d6c6a88f62c","impliedFormat":1},{"version":"23cd712e2ce083d68afe69224587438e5914b457b8acf87073c22494d706a3d0","impliedFormat":1},{"version":"156a859e21ef3244d13afeeba4e49760a6afa035c149dda52f0c45ea8903b338","impliedFormat":1},{"version":"10ec5e82144dfac6f04fa5d1d6c11763b3e4dbbac6d99101427219ab3e2ae887","impliedFormat":1},{"version":"615754924717c0b1e293e083b83503c0a872717ad5aa60ed7f1a699eb1b4ea5c","impliedFormat":1},{"version":"074de5b2fdead0165a2757e3aaef20f27a6347b1c36adea27d51456795b37682","impliedFormat":1},{"version":"68834d631c8838c715f225509cfc3927913b9cc7a4870460b5b60c8dbdb99baf","impliedFormat":1},{"version":"24371e69a38fc33e268d4a8716dbcda430d6c2c414a99ff9669239c4b8f40dea","impliedFormat":1},{"version":"ccab02f3920fc75c01174c47fcf67882a11daf16baf9e81701d0a94636e94556","impliedFormat":1},{"version":"3e11fce78ad8c0e1d1db4ba5f0652285509be3acdd519529bc8fcef85f7dafd9","impliedFormat":1},{"version":"ea6bc8de8b59f90a7a3960005fd01988f98fd0784e14bc6922dde2e93305ec7d","impliedFormat":1},{"version":"36107995674b29284a115e21a0618c4c2751b32a8766dd4cb3ba740308b16d59","impliedFormat":1},{"version":"914a0ae30d96d71915fc519ccb4efbf2b62c0ddfb3a3fc6129151076bc01dc60","impliedFormat":1},{"version":"9c32412007b5662fd34a8eb04292fb5314ec370d7016d1c2fb8aa193c807fe22","impliedFormat":1},{"version":"7fd1b31fd35876b0aa650811c25ec2c97a3c6387e5473eb18004bed86cdd76b6","impliedFormat":1},{"version":"4d327f7d72ad0918275cea3eee49a6a8dc8114ae1d5b7f3f5d0774de75f7439a","impliedFormat":1},{"version":"6ebe8ebb8659aaa9d1acbf3710d7dae3e923e97610238b9511c25dc39023a166","impliedFormat":1},{"version":"e85d7f8068f6a26710bff0cc8c0fc5e47f71089c3780fbede05857331d2ddec9","impliedFormat":1},{"version":"7befaf0e76b5671be1d47b77fcc65f2b0aad91cc26529df1904f4a7c46d216e9","impliedFormat":1},{"version":"0a60a292b89ca7218b8616f78e5bbd1c96b87e048849469cccb4355e98af959a","impliedFormat":1},{"version":"0b6e25234b4eec6ed96ab138d96eb70b135690d7dd01f3dd8a8ab291c35a683a","impliedFormat":1},{"version":"9666f2f84b985b62400d2e5ab0adae9ff44de9b2a34803c2c5bd3c8325b17dc0","impliedFormat":1},{"version":"40cd35c95e9cf22cfa5bd84e96408b6fcbca55295f4ff822390abb11afbc3dca","impliedFormat":1},{"version":"b1616b8959bf557feb16369c6124a97a0e74ed6f49d1df73bb4b9ddf68acf3f3","impliedFormat":1},{"version":"5b03a034c72146b61573aab280f295b015b9168470f2df05f6080a2122f9b4df","impliedFormat":1},{"version":"40b463c6766ca1b689bfcc46d26b5e295954f32ad43e37ee6953c0a677e4ae2b","impliedFormat":1},{"version":"249b9cab7f5d628b71308c7d9bb0a808b50b091e640ba3ed6e2d0516f4a8d91d","impliedFormat":1},{"version":"80aae6afc67faa5ac0b32b5b8bc8cc9f7fa299cff15cf09cc2e11fd28c6ae29e","impliedFormat":1},{"version":"f473cd2288991ff3221165dcf73cd5d24da30391f87e85b3dd4d0450c787a391","impliedFormat":1},{"version":"499e5b055a5aba1e1998f7311a6c441a369831c70905cc565ceac93c28083d53","impliedFormat":1},{"version":"8aee8b6d4f9f62cf3776cda1305fb18763e2aade7e13cea5bbe699112df85214","impliedFormat":1},{"version":"c63b9ada8c72f95aac5db92aea07e5e87ec810353cdf63b2d78f49a58662cf6c","impliedFormat":1},{"version":"1cc2a09e1a61a5222d4174ab358a9f9de5e906afe79dbf7363d871a7edda3955","impliedFormat":1},{"version":"5d0375ca7310efb77e3ef18d068d53784faf62705e0ad04569597ae0e755c401","impliedFormat":1},{"version":"59af37caec41ecf7b2e76059c9672a49e682c1a2aa6f9d7dc78878f53aa284d6","impliedFormat":1},{"version":"addf417b9eb3f938fddf8d81e96393a165e4be0d4a8b6402292f9c634b1cb00d","impliedFormat":1},{"version":"b64d4d1c5f877f9c666e98e833f0205edb9384acc46e98a1fef344f64d6aba44","impliedFormat":1},{"version":"adf27937dba6af9f08a68c5b1d3fce0ca7d4b960c57e6d6c844e7d1a8e53adae","impliedFormat":1},{"version":"12950411eeab8563b349cb7959543d92d8d02c289ed893d78499a19becb5a8cc","impliedFormat":1},{"version":"2e85db9e6fd73cfa3d7f28e0ab6b55417ea18931423bd47b409a96e4a169e8e6","impliedFormat":1},{"version":"c46e079fe54c76f95c67fb89081b3e399da2c7d109e7dca8e4b58d83e332e605","impliedFormat":1},{"version":"c9381908473a1c92cb8c516b184e75f4d226dad95c3a85a5af35f670064d9a2f","impliedFormat":1},{"version":"f724236417941ea77ec8d38c6b7021f5fb7f8521c7f8c1538e87661f2c6a0774","affectsGlobalScope":true,"impliedFormat":1},{"version":"1cf059eaf468efcc649f8cf6075d3cb98e9a35a0fe9c44419ec3d2f5428d7123","affectsGlobalScope":true,"impliedFormat":1},{"version":"e7721c4f69f93c91360c26a0a84ee885997d748237ef78ef665b153e622b36c1","affectsGlobalScope":true,"impliedFormat":1},{"version":"d97fb21da858fb18b8ae72c314e9743fd52f73ebe2764e12af1db32fc03f853f","affectsGlobalScope":true,"impliedFormat":1},{"version":"4ea15fd99b2e34cb25fe8346c955000bb70c8b423ae4377a972ef46bfb37f595","impliedFormat":1},{"version":"7cf69dd5502c41644c9e5106210b5da7144800670cbe861f66726fa209e231c4","impliedFormat":1},{"version":"72c1f5e0a28e473026074817561d1bc9647909cf253c8d56c41d1df8d95b85f7","impliedFormat":1},{"version":"f9b4137a0d285bd77dba2e6e895530112264310ae47e07bf311feae428fb8b61","affectsGlobalScope":true,"impliedFormat":1},{"version":"c06b2652ffeb89afd0f1c52c165ced77032f9cd09bc481153fbd6b5504c69494","impliedFormat":1},{"version":"51aecd2df90a3cffea1eb4696b33b2d78594ea2aa2138e6b9471ec4841c6c2ee","impliedFormat":1},{"version":"9d8f9e63e29a3396285620908e7f14d874d066caea747dc4b2c378f0599166b4","affectsGlobalScope":true,"impliedFormat":1},{"version":"5524481e56c48ff486f42926778c0a3cce1cc85dc46683b92b1271865bcf015a","impliedFormat":1},{"version":"612422d5ba6b4a5c4537f423e9199645468ad80a689801da63ab7edb43f7b835","impliedFormat":1},{"version":"db9ada976f9e52e13f7ae8b9a320f4b67b87685938c5879187d8864b2fbe97f3","impliedFormat":1},{"version":"9f39e70a354d0fba29ac3cdf6eca00b7f9e96f64b2b2780c432e8ea27f133743","impliedFormat":1},{"version":"0dace96cc0f7bc6d0ee2044921bdf19fe42d16284dbcc8ae200800d1c9579335","impliedFormat":1},{"version":"a2e2bbde231b65c53c764c12313897ffdfb6c49183dd31823ee2405f2f7b5378","impliedFormat":1},{"version":"1cbdcdef62bf42688e5d825898c3a59458466c48ad8a4ef3f88d8a1cd04310d6","impliedFormat":1},{"version":"c64e1888baaa3253ca4405b455e4bf44f76357868a1bd0a52998ade9a092ad78","affectsGlobalScope":true,"impliedFormat":1},{"version":"dc8c6f5322961b56d9906601b20798725df60baeab45ec014fba9f795d5596fd","impliedFormat":1},{"version":"67e435fa530778903f5525904e6645b7368eb5ac622055febd19bb399e328ccd","impliedFormat":1},{"version":"060d305fe4494d8cb2b99d620928d369d1ee55c1645f5e729a2aca07d0f108cb","impliedFormat":1},{"version":"5b22bf96be06fca1e134e3a85351ffe7aa2edf0c9a5bd175b7239ee48186dbf5","impliedFormat":1},{"version":"0c50296ee73dae94efc3f0da4936b1146ca6ce2217acfabb44c19c9a33fa30e5","impliedFormat":1},{"version":"bbf42f98a5819f4f06e18c8b669a994afe9a17fe520ae3454a195e6eabf7700d","impliedFormat":1},{"version":"5b48cc670da1dfe926036deaf349085caf822def460a6d50de23f1cc12a5f8cd","impliedFormat":1},{"version":"418f34087d52d001e2688a6282a5de9bf583ff771ed5546af0ae36e4f60a458b","affectsGlobalScope":true,"impliedFormat":1},{"version":"036c9a03b01281f99f8251fdc7088e894566be44b3f139a9d48501a978b611df","impliedFormat":1},{"version":"ff65b8a8bd380c6d129becc35de02f7c29ad7ce03300331ca91311fb4044d1a9","impliedFormat":1},{"version":"04bf1aa481d1adfb16d93d76e44ce71c51c8ef68039d849926551199489637f6","impliedFormat":1},{"version":"2c9adcc85574b002c9a6311ff2141055769e0071856ec979d92ff989042b1f1b","affectsGlobalScope":true,"impliedFormat":1},{"version":"1569ad5969ae0de6ad0bdfaaab0dabcd8878bc3147ab096206eed2019bb84e7f","affectsGlobalScope":true,"impliedFormat":1},{"version":"a58a15da4c5ba3df60c910a043281256fa52d36a0fcdef9b9100c646282e88dd","impliedFormat":1},{"version":"b36beffbf8acdc3ebc58c8bb4b75574b31a2169869c70fc03f82895b93950a12","impliedFormat":1},{"version":"42a350ce4f6f291198dc89833afcc4fd078248b4e1fdc9d05c846c66a670f710","impliedFormat":1},{"version":"77fbe5eecb6fac4b6242bbf6eebfc43e98ce5ccba8fa44e0ef6a95c945ff4d98","impliedFormat":1},{"version":"8c81fd4a110490c43d7c578e8c6f69b3af01717189196899a6a44f93daa57a3a","impliedFormat":1},{"version":"5fb39858b2459864b139950a09adae4f38dad87c25bf572ce414f10e4bd7baab","impliedFormat":1},{"version":"b03754211d839cdc48979996525a32eb62130682c2f9801dfc2f25533ce7238d","impliedFormat":1},{"version":"3910dab597c40e173bf0e0d419d3ce9682c54ebf6ae84849f9b829b1451a17ec","impliedFormat":1},{"version":"37ba7b45141a45ce6e80e66f2a96c8a5ab1bcef0fc2d0f56bb58df96ec67e972","impliedFormat":1},{"version":"45650f47bfb376c8a8ed39d4bcda5902ab899a3150029684ee4c10676d9fbaee","impliedFormat":1},{"version":"486c074a5c0f2254345c0d1c9540380f5463999e42d7e1a159305ea823d3c4b1","affectsGlobalScope":true,"impliedFormat":1},{"version":"c119835edf36415081dfd9ed15fc0cd37aaa28d232be029ad073f15f3d88c323","impliedFormat":1},{"version":"f4d99ac08c4097a3cc202bec2c7198c19dcdd80d4ec6c62d1356b10d03b119d5","impliedFormat":1},{"version":"9705cd157ffbb91c5cab48bdd2de5a437a372e63f870f8a8472e72ff634d47c1","affectsGlobalScope":true,"impliedFormat":1},{"version":"ae86f30d5d10e4f75ce8dcb6e1bd3a12ecec3d071a21e8f462c5c85c678efb41","impliedFormat":1},{"version":"ca77e83162eccec633513723d178d4203bdd5465297267696be08013bab0aa1d","impliedFormat":1},{"version":"e03460fe72b259f6d25ad029f085e4bedc3f90477da4401d8fbc1efa9793230e","impliedFormat":1},{"version":"4286a3a6619514fca656089aee160bb6f2e77f4dd53dc5a96b26a0b4fc778055","impliedFormat":1},{"version":"f61c153d5abbe4381a1fba0d41be0babdd5de51c626ee7ff14cede14dedc33f1","affectsGlobalScope":true,"impliedFormat":1},{"version":"7803171d745ab18e77f16bf82e742268ff72b7f7382ab191e4277527580c2d89","affectsGlobalScope":true,"impliedFormat":1},{"version":"0e9ba65cd3d6d194bdda7343f9f2917f7144ead96a924ca58d1a14919992dc20","impliedFormat":1},{"version":"255d948f87f24ffd57bcb2fdf95792fd418a2e1f712a98cf2cce88744d75085c","impliedFormat":1},{"version":"0d5b085f36e6dc55bc6332ecb9c733be3a534958c238fb8d8d18d4a2b6f2a15a","impliedFormat":1},{"version":"0b0dfb2d3e8420ead06f6a11acfb02ddcec42257e6ce391993e895ba0af86de4","affectsGlobalScope":true,"impliedFormat":1},{"version":"bfd3b3c21a56104693183942e221c1896ee23bcb8f8d91ab0b941f7b32985411","impliedFormat":1},{"version":"63228283eda38338f98e629d8033bffe727d2247ba2f3a1cbd1273a6827a1ec4","impliedFormat":1},{"version":"2beff543f6e9a9701df88daeee3cdd70a34b4a1c11cb4c734472195a5cb2af54","impliedFormat":1},{"version":"2e07abf27aa06353d46f4448c0bbac73431f6065eef7113128a5cd804d0c384d","impliedFormat":1},{"version":"be1cc4d94ea60cbe567bc29ed479d42587bf1e6cba490f123d329976b0fe4ee5","impliedFormat":1},{"version":"66be1299a7a3129ceb488b340c291cf575bebb0e337f92e169dec38231472e34","impliedFormat":1},{"version":"9894dafe342b976d251aac58e616ac6df8db91fb9d98934ff9dd103e9e82578f","impliedFormat":1},{"version":"413df52d4ea14472c2fa5bee62f7a40abd1eb49be0b9722ee01ee4e52e63beb2","impliedFormat":1},{"version":"9222cd69f4ea6f0aadc222f649b08830757a081a0f170bf3e392fafb90ce6888","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881","impliedFormat":1},{"version":"8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881","impliedFormat":1},{"version":"aa14cee20aa0db79f8df101fc027d929aec10feb5b8a8da3b9af3895d05b7ba2","impliedFormat":1},{"version":"493c700ac3bd317177b2eb913805c87fe60d4e8af4fb39c41f04ba81fae7e170","impliedFormat":1},{"version":"aeb554d876c6b8c818da2e118d8b11e1e559adbe6bf606cc9a611c1b6c09f670","impliedFormat":1},{"version":"acf5a2ac47b59ca07afa9abbd2b31d001bf7448b041927befae2ea5b1951d9f9","impliedFormat":1},{"version":"8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881","impliedFormat":1},{"version":"d71291eff1e19d8762a908ba947e891af44749f3a2cbc5bd2ec4b72f72ea795f","impliedFormat":1},{"version":"c0480e03db4b816dff2682b347c95f2177699525c54e7e6f6aa8ded890b76be7","impliedFormat":1},{"version":"25a5f6fd3a2243c859eddc99ab5fba11d970af2fe7a5df9c32b7668f76f97b01","impliedFormat":1},{"version":"8d207e1f9d2c30d6f77dfa693f3827c3fbf0d89240297e10bdfe1041d433df68","impliedFormat":1},{"version":"6c301d40aec56a74ec7bd7324e31a728dadf9bfba3e96def02938d3d973534ec","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"db6d2d9daad8a6d83f281af12ce4355a20b9a3e71b82b9f57cddcca0a8964a96","impliedFormat":1},{"version":"446a50749b24d14deac6f8843e057a6355dd6437d1fac4f9e5ce4a5071f34bff","impliedFormat":1},{"version":"182e9fcbe08ac7c012e0a6e2b5798b4352470be29a64fdc114d23c2bab7d5106","impliedFormat":1},{"version":"a7fa84b28bea56e199ea2d937ed3743645d969d520f7e937cf4b09d818ffa7e6","impliedFormat":1},{"version":"260e85ffab04d2d16cbaf3899fcb0cfdfa696cb99948d7b703fb28af9ff383fb","impliedFormat":1},{"version":"fbf9959ac279b397cdcd47b6155c32ace1e33ea148c6c1b87815225cb919685f","impliedFormat":1},{"version":"fd4e24ccff3966390600d7f5d6aa1fed5a512e92ada735ea5fbc933d313ad3d3","impliedFormat":1},{"version":"b7cddfe1aa6b86b5fad3c9ccb30d05b3ccb165aebbf112f48d2d8a5f69dd98b1","impliedFormat":1},{"version":"a86f82d646a739041d6702101afa82dcb935c416dd93cbca7fd754fd0282ce1f","impliedFormat":1},{"version":"35e6379c3f7cb27b111ad4c1aa69538fd8e788ab737b8ff7596a1b40e96f4f90","impliedFormat":1},{"version":"8353adc36468bb55b52ac03d199285bd57fe5cc6530a0ab3ec0156f6459a2e9e","impliedFormat":1},{"version":"6820bbf8a6224854ee584c7524679a3fbd37aff253910b3eb589293f8d1dcd71","impliedFormat":1},{"version":"6dcbc15455c4fcb581da53e9143ebec5c73dc60c881dc6d0255b26180682bea0","impliedFormat":1},{"version":"ab2acae979239e320dce1c8288d717113dd3155a4a5639c07082b4aa9adb7ca7","impliedFormat":1},{"version":"3e7efde639c6a6c3edb9847b3f61e308bf7a69685b92f665048c45132f51c218","impliedFormat":1},{"version":"df45ca1176e6ac211eae7ddf51336dc075c5314bc5c253651bae639defd5eec5","impliedFormat":1},{"version":"8a0e762ceb20c7e72504feef83d709468a70af4abccb304f32d6b9bac1129b2c","impliedFormat":1},{"version":"f6e0694f98a39a8fcc85e98c3f9ecea676cd784b96bfecbf9be7670df6df7775","impliedFormat":1},{"version":"ce75b1aebb33d510ff28af960a9221410a3eaf7f18fc5f21f9404075fba77256","impliedFormat":1},{"version":"d357f3dda6eeae33718e68567bb5d7654984c343f6a3086c19e853fc03b433bc","impliedFormat":1},{"version":"54a749a0a6b2a82499390d3deee0f52f5b1d1da118fda8e52a28cf87cdd158ce","impliedFormat":1},{"version":"ee8df1cb8d0faaca4013a1b442e99130769ce06f438d18d510fed95890067563","impliedFormat":1},{"version":"16e4d5ea9246286cd59579c7949a1c7f84e036c85f49e527002b8e458844cea8","impliedFormat":1},{"version":"bd9809e72e9a7a5760e91b49f976667d3ff9fb19d517cacf4e8339c628f5ad7f","impliedFormat":1},{"version":"54d63313c49d96380bed92e595e3befe179e4076085eb4f21459446148b75ade","impliedFormat":1},{"version":"e4cbf2f1e89ecccaddd2c045e600ae41b732295953fb06247c7dcbc2d281ed30","impliedFormat":1},{"version":"be7a66c05d3bc06fd639ba98316086470616858c0e4c04325fffe4f529662c36","impliedFormat":1},{"version":"8c1697d90c394a6fd955b98eae01238eff628e129b987a68aea10f898a48e7da","impliedFormat":1},{"version":"b2f4d55a673acbd87c62494b0916dfbb09f8081ad290bf11be707dfbdf30e4f6","impliedFormat":1},{"version":"a49e1f0fe346d8302d5f0a7c13f70badb03afca56b6f44b4ad7fdfd89364a9dd","impliedFormat":1},{"version":"d10d63718e1646c2279e3b33831f82c60e31f622b2b7020f1196409ca4c09242","impliedFormat":1},{"version":"106c6025f1d99fd468fd8bf6e5bda724e11e5905a4076c5d29790b6c3745e50c","impliedFormat":1},{"version":"a365c4d3bed3be4e4e20793c999c51f5cd7e6792322f14650949d827fbcd170f","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"148679c6d0f449210a96e7d2e562d589e56fcde87f843a92808b3ff103f1a774","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"02436d7e9ead85e09a2f8e27d5f47d9464bced31738dec138ca735390815c9f0","impliedFormat":1},{"version":"f8d5ff8eafd37499f2b6a98659dd9b45a321de186b8db6b6142faed0fea3de77","impliedFormat":1},{"version":"b620391fe8060cf9bedc176a4d01366e6574d7a71e0ac0ab344a4e76576fcbb8","impliedFormat":1},{"version":"7deaed322f7c34cebdd096b779fb81676f3303044ac2c6563574fe7178db8765","impliedFormat":1},{"version":"6ac6715916fa75a1f7ebdfeacac09513b4d904b667d827b7535e84ff59679aff","impliedFormat":1},{"version":"2652448ac55a2010a1f71dd141f828b682298d39728f9871e1cdf8696ef443fd","impliedFormat":1},{"version":"d682336018141807fb602709e2d95a192828fcb8d5ba06dda3833a8ea98f69e3","impliedFormat":1},{"version":"6124e973eab8c52cabf3c07575204efc1784aca6b0a30c79eb85fe240a857efa","impliedFormat":1},{"version":"0d891735a21edc75df51f3eb995e18149e119d1ce22fd40db2b260c5960b914e","impliedFormat":1},{"version":"3b414b99a73171e1c4b7b7714e26b87d6c5cb03d200352da5342ab4088a54c85","impliedFormat":1},{"version":"4fbd3116e00ed3a6410499924b6403cc9367fdca303e34838129b328058ede40","impliedFormat":1},{"version":"9c82171d836c47486074e4ca8e059735bf97b205e70b196535b5efd40cbe1bc5","impliedFormat":1},{"version":"48dcc919f76c040a999c0d46d2bf25ab089645ca21b837f120b222f56a86cd76","impliedFormat":1},{"version":"2f9c89cbb29d362290531b48880a4024f258c6033aaeb7e59fbc62db26819650","impliedFormat":1},{"version":"c5426dbfc1cf90532f66965a7aa8c1136a78d4d0f96d8180ecbfc11d7722f1a5","impliedFormat":1},{"version":"65a15fc47900787c0bd18b603afb98d33ede930bed1798fc984d5ebb78b26cf9","impliedFormat":1},{"version":"9d202701f6e0744adb6314d03d2eb8fc994798fc83d91b691b75b07626a69801","impliedFormat":1},{"version":"de9d2df7663e64e3a91bf495f315a7577e23ba088f2949d5ce9ec96f44fba37d","impliedFormat":1},{"version":"c7af78a2ea7cb1cd009cfb5bdb48cd0b03dad3b54f6da7aab615c2e9e9d570c5","impliedFormat":1},{"version":"1ee45496b5f8bdee6f7abc233355898e5bf9bd51255db65f5ff7ede617ca0027","impliedFormat":1},{"version":"2352f74bc51c0e2c36f3fe406986dd4d0b1385faae349507403517d75bc2be8f","affectsGlobalScope":true,"impliedFormat":1},{"version":"3fbdd025f9d4d820414417eeb4107ffa0078d454a033b506e22d3a23bc3d9c41","affectsGlobalScope":true,"impliedFormat":1},{"version":"dba114fb6a32b355a9cfc26ca2276834d72fe0e94cd2c3494005547025015369","impliedFormat":1},{"version":"a8f8e6ab2fa07b45251f403548b78eaf2022f3c2254df3dc186cb2671fe4996d","affectsGlobalScope":true,"impliedFormat":1},{"version":"fa6c12a7c0f6b84d512f200690bfc74819e99efae69e4c95c4cd30f6884c526e","impliedFormat":1},{"version":"f1c32f9ce9c497da4dc215c3bc84b722ea02497d35f9134db3bb40a8d918b92b","impliedFormat":1},{"version":"b73c319af2cc3ef8f6421308a250f328836531ea3761823b4cabbd133047aefa","affectsGlobalScope":true,"impliedFormat":1},{"version":"e433b0337b8106909e7953015e8fa3f2d30797cea27141d1c5b135365bb975a6","impliedFormat":1},{"version":"9f9bb6755a8ce32d656ffa4763a8144aa4f274d6b69b59d7c32811031467216e","impliedFormat":1},{"version":"5c32bdfbd2d65e8fffbb9fbda04d7165e9181b08dad61154961852366deb7540","impliedFormat":1},{"version":"ddff7fc6edbdc5163a09e22bf8df7bef75f75369ebd7ecea95ba55c4386e2441","impliedFormat":1},{"version":"0c05e9842ec4f8b7bfebfd3ca61604bb8c914ba8da9b5337c4f25da427a005f2","impliedFormat":1},{"version":"67c2f945a841d2d15e96ee2b24841c38c7699d71bd33d6ae4bbe6eb0f3017dce","impliedFormat":1},{"version":"115457fedf74d22765b39e3edec4bc292ddd3c5f5457bf26a03d2f13a60a3ee0","impliedFormat":1},{"version":"036c8aa095343338b51d319022cdcbe38f0af122623f78aad845237036c4bae8","impliedFormat":1},{"version":"46fe040a203b27c54e0e13b2e4c4b7a4c22c3bd489e6ce2432af854d61dd52b6","impliedFormat":1},{"version":"d96b39301d0ded3f1a27b47759676a33a02f6f5049bfcbde81e533fd10f50dcb","impliedFormat":1},{"version":"60ac007e762f0b081edfd3b33e8a0371412da51b6cdfed9600773a688d79856a","impliedFormat":1},{"version":"61265d88af5048c8ce9298b6443d59d9d8a2a1ff603114f0f9d87d9e75deaa1d","impliedFormat":1},{"version":"5245b69dc79a7479e5ab458e48d8736acde868efe7fb77adf283c6a738fdf614","impliedFormat":1},{"version":"2ba2bd63ab8bbe212d1989a780226a0c5834330256b5721e8c5c59e2d13bbb63","impliedFormat":1},{"version":"8bad4a35156873321512f1a280017f31f14c7ac53995caa68f6882787d0345c4","impliedFormat":1},{"version":"123df0c468e09762cf0967e45cb5944f02818783752014a11998571b31863f54","impliedFormat":1},{"version":"36c68bb0319a8c160a7423607cc90f383f93eda550839fb9e5c2382499c82575","impliedFormat":1},{"version":"aaecf377e26c5beb7d279eccf4477813da24d3070542239d934c2e9795d310c2","impliedFormat":1},{"version":"2e4f37ffe8862b14d8e24ae8763daaa8340c0df0b859d9a9733def0eee7562d9","impliedFormat":1},{"version":"d38530db0601215d6d767f280e3a3c54b2a83b709e8d9001acb6f61c67e965fc","impliedFormat":1},{"version":"6ac6715916fa75a1f7ebdfeacac09513b4d904b667d827b7535e84ff59679aff","impliedFormat":1},{"version":"b499af2054a037a162b3b72cd886f48bbf32a3502c865c6e29fac7d2ab3ce0b5","impliedFormat":1},{"version":"b83cb14474fa60c5f3ec660146b97d122f0735627f80d82dd03e8caa39b4388c","impliedFormat":1},{"version":"8e32dbb4b6c849d57a5f05963fb00def58507eda37b8ca726682c337d0c27cca","impliedFormat":1},{"version":"7274fbffbd7c9589d8d0ffba68157237afd5cecff1e99881ea3399127e60572f","impliedFormat":1},{"version":"b73cbf0a72c8800cf8f96a9acfe94f3ad32ca71342a8908b8ae484d61113f647","impliedFormat":1},{"version":"bae6dd176832f6423966647382c0d7ba9e63f8c167522f09a982f086cd4e8b23","impliedFormat":1},{"version":"20865ac316b8893c1a0cc383ccfc1801443fbcc2a7255be166cf90d03fac88c9","impliedFormat":1},{"version":"c9958eb32126a3843deedda8c22fb97024aa5d6dd588b90af2d7f2bfac540f23","impliedFormat":1},{"version":"461d0ad8ae5f2ff981778af912ba71b37a8426a33301daa00f21c6ccb27f8156","impliedFormat":1},{"version":"e927c2c13c4eaf0a7f17e6022eee8519eb29ef42c4c13a31e81a611ab8c95577","impliedFormat":1},{"version":"fcafff163ca5e66d3b87126e756e1b6dfa8c526aa9cd2a2b0a9da837d81bbd72","impliedFormat":1},{"version":"70246ad95ad8a22bdfe806cb5d383a26c0c6e58e7207ab9c431f1cb175aca657","impliedFormat":1},{"version":"f00f3aa5d64ff46e600648b55a79dcd1333458f7a10da2ed594d9f0a44b76d0b","impliedFormat":1},{"version":"772d8d5eb158b6c92412c03228bd9902ccb1457d7a705b8129814a5d1a6308fc","impliedFormat":1},{"version":"802e797bcab5663b2c9f63f51bdf67eff7c41bc64c0fd65e6da3e7941359e2f7","impliedFormat":1},{"version":"b01bd582a6e41457bc56e6f0f9de4cb17f33f5f3843a7cf8210ac9c18472fb0f","impliedFormat":1},{"version":"8b4327413e5af38cd8cb97c59f48c3c866015d5d642f28518e3a891c469f240e","impliedFormat":1},{"version":"4cceef18d7f088e797a463e90b7a9dad10c6bc667724b7686e3e740ae00122be","impliedFormat":1},{"version":"7ee86fbb3754388e004de0ef9e6505485ddfb3be7640783d6d015711c03d302d","impliedFormat":1},{"version":"f8647078da50b446b99ceb9978f45176cda89cce07c62ec2d42cc001b5becc1c","impliedFormat":1},{"version":"a67b87d0281c97dfc1197ef28dfe397fc2c865ccd41f7e32b53f647184cc7307","impliedFormat":1},{"version":"6bbf33947658770121ce0afa44828e1ea9294b1e6c4c7984c0f6da7cc5c53216","impliedFormat":1},{"version":"ebb8af215c7d449add233d33aae1ae80eadf70d3b1e333c55ee09e6dd9181781","impliedFormat":1},{"version":"34f70c9160faa29e4df3922a1f6386c64aaad35ae4a93f43e9fa66dc7e34a4e0","impliedFormat":1},{"version":"d88ea80a6447d7391f52352ec97e56b52ebec934a4a4af6e2464cfd8b39c3ba8","impliedFormat":1},{"version":"51e3224b75ad7b7c4a81c06f61bff8183bee782ac68e8a6d46c56d75540ab7c4","impliedFormat":1},{"version":"0b603555f1881f87256ffd6344d3e3ed6d466c2e701eabf381f28be8c2125892","impliedFormat":1},{"version":"897e4f7662488e3ecc79e743bdd3b78f13bdb69a97851afa5b440c4211e32ea9","impliedFormat":1},{"version":"e2e1c6d3b2d93add5200bd7bc1a8cccb4e446836b2111ece45db8683a2c765de","impliedFormat":1},{"version":"8c2e1ebaafd7328ead715fdcb7b20edd298e42f4ecf52590956aea427500fe51","impliedFormat":1},{"version":"27ff4196654e6373c9af16b6165120e2dd2169f9ad6abb5c935af5abd8c7938c","impliedFormat":1},{"version":"bb8f2dbc03533abca2066ce4655c119bff353dd4514375beb93c08590c03e023","impliedFormat":1},{"version":"2c4de79f406d137390608e8c0a44fba2ff8e00bacfcae7c9d1781fef10e9440d","impliedFormat":1},{"version":"dad21634c57f7bd554d29a890c1b802544bc8906d9584a61d41c7ff8f191ab15","impliedFormat":1},{"version":"bbb4a08132d0aba7f5a6af74aba6a3c149970afb6ae2792eec1a6af0e87cf590","impliedFormat":1},{"version":"15d87d8f5dae7e0ba772297a455b264d4b657653b0a50bdacd383469b759da02","impliedFormat":1},{"version":"232f70c0cf2b432f3a6e56a8dc3417103eb162292a9fd376d51a3a9ea5fbbf6f","impliedFormat":1},{"version":"706dd95827e7ebaabda91d5db2b755233e0952d98570e9c032b0f066a15c1177","affectsGlobalScope":true,"impliedFormat":1},{"version":"0b103e9abfe82d14c0ad06a55d9f91d6747154ef7cacc73cf27ecad2bfb3afcf","impliedFormat":1},{"version":"7bf521084cbac17e0677399adb10c7d2e13f72532f3d34f5441cd657cdcdced9","impliedFormat":1},{"version":"218b13bb77ff5557caaf5b1e67604d5a3fd6930ede939d14dada9b4c6fd1d221","impliedFormat":1},{"version":"120599fd965257b1f4d0ff794bc696162832d9d8467224f4665f713a3119078b","impliedFormat":1},{"version":"43ba4f2fa8c698f5c304d21a3ef596741e8e85a810b7c1f9b692653791d8d97a","impliedFormat":1},{"version":"5433f33b0a20300cca35d2f229a7fc20b0e8477c44be2affeb21cb464af60c76","impliedFormat":1},{"version":"db036c56f79186da50af66511d37d9fe77fa6793381927292d17f81f787bb195","impliedFormat":1},{"version":"a6805fcafed712aea7759f8bc731014f9d22738c1d6ef9d43b8091d1d48346d5","impliedFormat":1},{"version":"775f181bd4a533d6f8b5e55ec1d9f1624559720ae8a70e9432258da26b38d27c","impliedFormat":1},{"version":"796273b2edc72e78a04e86d7c58ae94d370ab93a0ddf40b1aa85a37a1c29ecd7","impliedFormat":1},{"version":"5df15a69187d737d6d8d066e189ae4f97e41f4d53712a46b2710ff9f8563ec9f","impliedFormat":1},{"version":"4fb3dafb3267bf8c19a6b2a1e4d9f79b9d64cd33febf8abd1642fcfa995140e7","impliedFormat":1},{"version":"6ac6715916fa75a1f7ebdfeacac09513b4d904b667d827b7535e84ff59679aff","impliedFormat":1},{"version":"9c7715de1326710dc72578a58f92c208268d5b91105db0845d86a2c68448a45a","impliedFormat":1},{"version":"cd8ce8d68567f62dd580b3c3c37777ac3f5b81944c7417f5ea83030eab533385","impliedFormat":1},{"version":"898338d9e4b3b583b0e0fef52e68a50509fc7ead2d766c35330ea7f5ce2a59f5","impliedFormat":1},{"version":"9e2739b32f741859263fdba0244c194ca8e96da49b430377930b8f721d77c000","impliedFormat":1},{"version":"a9e6c0ff3f8186fccd05752cf75fc94e147c02645087ac6de5cc16403323d870","impliedFormat":1},{"version":"49af4b52f0d4d2304c5f2c6fe5fab3e153e0acc38830d0202821b877c097dd02","impliedFormat":1},{"version":"49c346823ba6d4b12278c12c977fb3a31c06b9ca719015978cb145eb86da1c61","impliedFormat":1},{"version":"bfac6e50eaa7e73bb66b7e052c38fdc8ccfc8dbde2777648642af33cf349f7f1","impliedFormat":1},{"version":"92f7c1a4da7fbfd67a2228d1687d5c2e1faa0ba865a94d3550a3941d7527a45d","impliedFormat":1},{"version":"f53b120213a9289d9a26f5af90c4c686dd71d91487a0aa5451a38366c70dc64b","impliedFormat":1},{"version":"e68b8e5a1df7c1be2bc105141456ecba70215806e1c28bfbc5c12bfce4be6e68","impliedFormat":1},{"version":"a44ed6e5de4d6baa5d269f6e256c41fae69f47b9bf8b269ce0c7fe8b201ac130","impliedFormat":1},{"version":"57d67b72e06059adc5e9454de26bbfe567d412b962a501d263c75c2db430f40e","impliedFormat":1},{"version":"6db920eb76bc2f044dd32b36288a99298d60ab9747af38a3750ef27a319ed45b","impliedFormat":1},{"version":"243ae05c3426b4178fa05932626e742e0bc695e27f1fe4160cc1d15cd21cbf69","impliedFormat":1},{"version":"6459054aabb306821a043e02b89d54da508e3a6966601a41e71c166e4ea1474f","impliedFormat":1},{"version":"bb37588926aba35c9283fe8d46ebf4e79ffe976343105f5c6d45f282793352b2","impliedFormat":1},{"version":"f89488602bec98a142072fae7ea5ba99431a569ff580c64b7be39896474799d8","impliedFormat":1},{"version":"bbbc47961f39a57df103cf4ca3bb8f8732b4b6678a18225a0aa76d59c466956c","impliedFormat":1},{"version":"2e6114a7dd6feeef85b2c80120fdbfb59a5529c0dcc5bfa8447b6996c97a69f5","impliedFormat":1},{"version":"2ffb043dc5163458e473b7010859f86e01dc4edffcae0a93d885d028b426a546","impliedFormat":1},{"version":"c8f004e6036aa1c764ad4ec543cf89a5c1893a9535c80ef3f2b653e370de45e6","impliedFormat":1},{"version":"dd80b1e600d00f5c6a6ba23f455b84a7db121219e68f89f10552c54ba46e4dc9","impliedFormat":1},{"version":"b064c36f35de7387d71c599bfcf28875849a1dbc733e82bd26cae3d1cd060521","impliedFormat":1},{"version":"05c7280d72f3ed26f346cbe7cbbbb002fb7f15739197cbbee6ab3fd1a6cb9347","impliedFormat":1},{"version":"8de9fe97fa9e00ec00666fa77ab6e91b35d25af8ca75dabcb01e14ad3299b150","impliedFormat":1},{"version":"04b7b2e0832dfd3c31e81df3975e8d8fda28e7ff999b0aa2932608a8f6661d5c","impliedFormat":1},{"version":"ade4bcded5ae1610dcdef8a98668fa7ca41064c5ace9a49c1f78993ff3c3b6ae","impliedFormat":1},{"version":"c605ac51446efce34a0d4db764b4e6d4adf70d5e16e833ef99de12b7b7760823","impliedFormat":1},{"version":"5c4d626b4902f2ef8a1cc146d761d276cef988016dc674e3b98fbad70e64bc9f","impliedFormat":1},{"version":"abd5b0b9a913d5e809064dc5af3177702e5626d5423a690ad0711f62b6da3dfa","impliedFormat":1},{"version":"f09538129123053bc778452a43b25446ba6f8dec65118fc0bb82fca53fca9bf8","impliedFormat":1},{"version":"f974e4a06953682a2c15d5bd5114c0284d5abf8bc0fe4da25cb9159427b70072","impliedFormat":1},{"version":"50256e9c31318487f3752b7ac12ff365c8949953e04568009c8705db802776fb","impliedFormat":1},{"version":"7d73b24e7bf31dfb8a931ca6c4245f6bb0814dfae17e4b60c9e194a631fe5f7b","impliedFormat":1},{"version":"9917f2694799516bf571e62e4b76cfcb22df50a74335302223e10e839c01c60c","impliedFormat":1},{"version":"413586add0cfe7369b64979d4ec2ed56c3f771c0667fbde1bf1f10063ede0b08","impliedFormat":1},{"version":"5d5179db368664843aca3825b6e7ffa69f47cbe3f138b543fb20dba48dbab4d8","impliedFormat":1},{"version":"7303b45138d2511035056a5901a1490ebdcbf055cbb1276f8629c5121cbe733e","impliedFormat":1},{"version":"47bf8f46d61fa63278a5d10630f6bd7063394bb69284e484c61b352ebe0d8e6e","impliedFormat":1},{"version":"40b084057d65a340263757fe0b08217422e02f42ae70236e74a8042b3e1eab1e","impliedFormat":1},{"version":"46e48e65148cc2afd03fad660f54cb5705ace4c45e80aace208ed7833a96f404","impliedFormat":1},{"version":"b0fb2e6b4a7b366ae1a7a441ef27586e5a8f480b48583b644c2e16fa3537ac5d","impliedFormat":1},{"version":"c7be836e57d8250946c5c6c17c4ed5bdede19933ebdcbcf5c880f083c78e3871","impliedFormat":1},{"version":"bc03c3c352f689e38c0ddd50c39b1e65d59273991bfc8858a9e3c0ebb79c023b","impliedFormat":1},{"version":"19df3488557c2fc9b4d8f0bac0fd20fb59aa19dec67c81f93813951a81a867f8","affectsGlobalScope":true,"impliedFormat":1},{"version":"b25350193e103ae90423c5418ddb0ad1168dc9c393c9295ef34980b990030617","affectsGlobalScope":true,"impliedFormat":1},{"version":"ab7dfff19354646b5dd29676783546c81498f8289f679650f9e612f49f8481f0","impliedFormat":1},{"version":"9dfde20de9ff2fac31c1317b9a14f5b83690aea715adca8820407f1302a7d186","impliedFormat":1},{"version":"74eca395ab8ca0411b94a9fb37afb288436a8117965aa7b48ba07fcd024087f8","impliedFormat":1},{"version":"4f58011d28e315f844e72bc05c1a35416a467f09ac8fb49d5ed90114569bc283","impliedFormat":1},{"version":"ecf51081d23a86d2e961b5890562e48b0043a5500d251ec155aba3e97d5db3f6","impliedFormat":1},{"version":"d663134457d8d669ae0df34eabd57028bddc04fc444c4bc04bc5215afc91e1f4","impliedFormat":1},{"version":"103c58438e43570fb39bc14944f6773b836526043f519414f8e6570427e663be","impliedFormat":1},{"version":"da1bc1be19354bc4712aa812f103975b40c663ba99fc58d4f17491714d594e0d","impliedFormat":1},{"version":"1a82deef4c1d39f6882f28d275cad4c01f907b9b39be9cbc472fcf2cf051e05b","impliedFormat":1},{"version":"c8e7690654991ceb5b476c2eed7ea526403e26bb7e62113250ff6cb41df76511","impliedFormat":1},{"version":"e0cee12109e0a10a4c3d6769fcc7644b7c1ea7f52365bea51728f5af29f8a137","impliedFormat":1},{"version":"7d4254b4c6c67a29d5e7f65e67d72540480ac2cfb041ca484847f5ae70480b62","impliedFormat":1},{"version":"3536968defef8a75514f547ead5e2e9c1e984820290ec9b00c5fdfb6ef786535","impliedFormat":1},{"version":"d83773870080c30a230e322ce13a9c6f3398e8dacea4ea8a83e26370f3bac23e","impliedFormat":1},{"version":"1822b02aa6421ad770f1003fb9b9cce97694d0168fedc5de3712915ee2825184","impliedFormat":1},{"version":"f97020f048bcad55177284c547c020e0c0d3af7cc32a588ab436bf32e33493ae","impliedFormat":1},{"version":"c9df081660108cfec15ea7c7467e180a7993cc26966373e1da5986151fae9292","impliedFormat":1},{"version":"0a437ae178f999b46b6153d79095b60c42c996bc0458c04955f1c996dc68b971","impliedFormat":1},{"version":"74b2a5e5197bd0f2e0077a1ea7c07455bbea67b87b0869d9786d55104006784f","impliedFormat":1},{"version":"4a7baeb6325920044f66c0f8e5e6f1f52e06e6d87588d837bdf44feb6f35c664","impliedFormat":1},{"version":"87cc05fe13108f02e12da7e3efd8e360fef78d96a0c9e11408ea1b1b9fb3e03d","impliedFormat":1},{"version":"60681e13f3545be5e9477acb752b741eae6eaf4cc01658a25ec05bff8b82a2ef","impliedFormat":1},{"version":"3ca55d3682dfb90ff521f98850a433646d3d69f3a836f8ff27f2b450a9bd0bf4","impliedFormat":1},{"version":"a57b1802794433adec9ff3fed12aa79d671faed86c49b09e02e1ac41b4f1d33a","impliedFormat":1},{"version":"34e16eb7c31768a11a08aebcfb3d70d7b8f0b016197e98d8419e566ceae6d6c8","impliedFormat":1},{"version":"5e17c6748e336bdf5a83eef55499c4a09ac20ef7e8ac533411dd0e97d23d3ccf","impliedFormat":1},{"version":"5f3820872e54f04cc7d1ed5833aa91c5d45f72d6c82787d03590388063641887","impliedFormat":1},{"version":"5541971ac5ca5a07fbf99b18d072960d29c06558c143e26fa3fd34eda1cd2604","impliedFormat":1},{"version":"bf6e368c991c772a8cfd766b1e5ca38313a98591d56b7467cc9942923b7ca375","impliedFormat":1},{"version":"27fc1b956bd89f524ce386c9c24fb2d13521893aeaece6271704a59c1a0bdf8b","impliedFormat":1},{"version":"4445258a6cf1a626e60f46a2b3ecb69a6a94c2bc18f34a8f979517c25eef0bf0","impliedFormat":1},{"version":"4402ddf37e9cf7a95e0c66eb47c4f3cb5ff7e31e988c3a45029f82d983b47d63","impliedFormat":1},{"version":"01479d9d5a5dda16d529b91811375187f61a06e74be294a35ecce77e0b9e8d6c","impliedFormat":1},{"version":"bfd922cd6c7e5404cb2beb99ab0be844b0440dc8ad220894ad32efb85db97bcd","impliedFormat":1},{"version":"a52429ff820c9878482940e2b7752e5b004e0f16635c0cefa2a8da473556201f","impliedFormat":1},{"version":"ce0df82a9ae6f914ba08409d4d883983cc08e6d59eb2df02d8e4d68309e7848b","impliedFormat":1},{"version":"649588d1787139707a4ee0ea5a7ac8a54d94c6d9823b15bbb28f18b79392e295","impliedFormat":1},{"version":"ff64fa5b9727f769066ac59eb42bdfe0931dbb61c9f42aecb3e0f412d0186f88","impliedFormat":1},{"version":"00e981b1c8e1499dfeb6003893f56c4b40dc386826dcc0227c9eb9425a7a3c7f","impliedFormat":1},{"version":"72105519d0390262cf0abe84cf41c926ade0ff475d35eb21307b2f94de985778","impliedFormat":1},{"version":"456006a6975b26c0a1785feddae165f6d307e2d601ffde27e21fc4a790e448a4","impliedFormat":1},{"version":"c857e0aae3f5f444abd791ec81206020fbcc1223e187316677e026d1c1d6fe08","impliedFormat":1},{"version":"ccf6dd45b708fb74ba9ed0f2478d4eb9195c9dfef0ff83a6092fa3cf2ff53b4f","impliedFormat":1},{"version":"1fe0d18b111e1145a7e7601855bccd4ca20f24e3b9a5aba6bb1fa9d1a7059170","impliedFormat":1},{"version":"5632c3c26d420c063eebe64c45b1248b9492a67bf44f1d0c57e9dc8f6cf449bb","impliedFormat":1},{"version":"4c536efd581b2109005df14e670ffbf799dea8731b33db3fd2c3ab655b4eafc6","impliedFormat":1},{"version":"8fca3039857709484e5893c05c1f9126ab7451fa6c29e19bb8c2411a2e937345","impliedFormat":1},{"version":"35069c2c417bd7443ae7c7cafd1de02f665bf015479fec998985ffbbf500628c","impliedFormat":1},{"version":"1a41f92c8593f4639b2e11762df152cb7e5b72f9bb5324158207d3278be73b2a","impliedFormat":1},{"version":"79698c679c34d3836789ee51ccb5984e0697664d3a4572cb76736a6d4b429cd3","impliedFormat":1},{"version":"7e0b7f91c5ab6e33f511efc640d36e6f933510b11be24f98836a20a2dc914c2d","impliedFormat":1},{"version":"045b752f44bf9bbdcaffd882424ab0e15cb8d11fa94e1448942e338c8ef19fba","impliedFormat":1},{"version":"c096c3c58933c3ecd67ff94335f11b9abfc8405a89d9d3e2552223aee3eaac88","impliedFormat":1},{"version":"2894c56cad581928bb37607810af011764a2f511f575d28c9f4af0f2ef02d1ab","impliedFormat":1},{"version":"0a72186f94215d020cb386f7dca81d7495ab6c17066eb07d0f44a5bf33c1b21a","impliedFormat":1},{"version":"8047e76600d42d495952c1c8a16d0a51c8681bd8996524a8b0e9c9065c8e7066","impliedFormat":1},{"version":"10b2c5fc764c6dc12b9e022b178b4ff41a08733074b376611578e34a8f79a2e8","impliedFormat":1},{"version":"3b958309a72d9b99300d585fdc69f23f03df4caa424cf7007bafdacc0d2366f9","affectsGlobalScope":true,"impliedFormat":1},{"version":"c6e51008cf8190894ff2fc8e672273bf950d246084a03bfb7c3a274fa810c2d9","impliedFormat":1},{"version":"b213dad76ca37fd552274c9499056e1c0d9c1bd38a55bb7f68b22ba6b84c3ad7","impliedFormat":1},{"version":"c30436b130b6218b7714314dc41d3f459590db4bdf099eecd51cb1bda32109a8","impliedFormat":1},{"version":"b838d4c72740eb0afd284bf7575b74c624b105eff2e8c7b4aeead57e7ac320ff","impliedFormat":1},{"version":"20fa37b636fdcc1746ea0738f733d0aed17890d1cd7cb1b2f37010222c23f13e","impliedFormat":1},{"version":"d90b9f1520366d713a73bd30c5a9eb0040d0fb6076aff370796bc776fd705943","impliedFormat":1},{"version":"bef86adb77316505c6b471da1d9b8c9e428867c2566270e8894d4d773a1c4dc2","impliedFormat":1},{"version":"d8a770e32e4da593ddda3ac6370ef644cd977be8f4057ecf3d703cc7745ee4ab","impliedFormat":1},{"version":"6ee598cdfdd0fa52039dca135b3dfff7b49035dc13292143e0a93843e3861967","impliedFormat":1},{"version":"27be6622e2922a1b412eb057faa854831b95db9db5035c3f6d4b677b902ab3b7","impliedFormat":1},{"version":"5c634644d45a1b6bc7b05e71e05e52ec04f3d73d9ac85d5927f647a5f965181a","impliedFormat":1},{"version":"5bd12e52bdd0135ed15e1584e0e4206591ddea86a92b0c76d7851a0b09462f8e","impliedFormat":1},{"version":"63a7595a5015e65262557f883463f934904959da563b4f788306f699411e9bac","impliedFormat":1},{"version":"4ba137d6553965703b6b55fd2000b4e07ba365f8caeb0359162ad7247f9707a6","impliedFormat":1},{"version":"0b77b819b5417775fccb20c678293cf614c054a5b1a65421a5b933a9124ba998","impliedFormat":1},{"version":"5666d5734e5152a1e79dd2df5a68531e522bdc4654e06739b2fb799b86367567","impliedFormat":1},{"version":"9252d498a77517aab5d8d4b5eb9d71e4b225bbc7123df9713e08181de63180f6","impliedFormat":1},{"version":"ef8b9028d751f291df91ebb3e5b1a6607fa99dcfe64563b7e85a9b22034b60fa","impliedFormat":1},{"version":"ce11568d7135fbe99854aa6088b327f9e4c234707c94c4e91e1a52919a881bcf","impliedFormat":1},{"version":"b1f1d57fde8247599731b24a733395c880a6561ec0c882efaaf20d7df968c5af","impliedFormat":1},{"version":"de4b52839326d274a30022a82f8586e19a657d4a21a95fd5322347733ee69885","impliedFormat":1},{"version":"c86fe861cf1b4c46a0fb7d74dffe596cf679a2e5e8b1456881313170f092e3fa","impliedFormat":1},{"version":"540cc83ab772a2c6bc509fe1354f314825b5dba3669efdfbe4693ecd3048e34f","impliedFormat":1},{"version":"121b0696021ab885c570bbeb331be8ad82c6efe2f3b93a6e63874901bebc13e3","impliedFormat":1},{"version":"612d9da66bb046a9c1e2e8d026245ded881fc4b9f98cbfae714415d57ee0ae0b","impliedFormat":1},{"version":"32c2ad9494dad5d11b0564a619fee18f388db6c1e9e2cd3c360b3122549691eb","impliedFormat":1},{"version":"1abbf67c218d23c2ce76887caac2df6c7dab3d97ba2b65348432b876f510002a","impliedFormat":1},{"version":"4b20fcf10a5413680e39f5666464859fc56b1003e7dfe2405ced82371ebd49b6","impliedFormat":1},{"version":"c06ef3b2569b1c1ad99fcd7fe5fba8d466e2619da5375dfa940a94e0feea899b","impliedFormat":1},{"version":"f7d628893c9fa52ba3ab01bcb5e79191636c4331ee5667ecc6373cbccff8ae12","impliedFormat":1},{"version":"2467b00d963828f540f4acd7910f4c04cfe4b489550e6bb682212f65583bca5b","impliedFormat":1},{"version":"854e50b93090b3f8fd6e355b074e1d24dce1ae0240f1ce46563e35fea210a6d5","impliedFormat":99},{"version":"416c3250d0f78e396c76ddee847e968a7e0edf46c159e3996d99ecfc3b7f069a","impliedFormat":1},{"version":"a6dba407fc287f1e25454e75028c91bbc00675f2d1c4e8b3edcc36c08611a486","impliedFormat":1},{"version":"43003214ab539d7b34b11259b86e41c5c361929472ba2ce95a327922090eb17a","impliedFormat":1},{"version":"9ec11a9084111c6caeac336b4a2fd3ec0086b32d21409a33a2af3ea66d9b85b0","impliedFormat":1},{"version":"700b7bfceda84ab84ddc75ed540247c62568f240d5d5bea4c9352b8f7e148a12","impliedFormat":1},{"version":"6115297fd1e00c450f1456d84c30453c6aefc38690b530d7d31393e361c33050","impliedFormat":1},{"version":"360fe40be059e5206b565f91e130ac2768169b06ecd714f982b0ef4c602e96cd","impliedFormat":1},{"version":"dba74745294baf7b83a2531303b56b4c3824b91a71cbac16dd501ecd2f6d96d3","affectsGlobalScope":true,"impliedFormat":1},{"version":"e8daa443eaf9a27fd382cc1f8ebe30330c0f4d89511cfb469166874806751d35","impliedFormat":1},{"version":"fcbfb0670d0a9fd2edca0705a1bc421773d58035a312216291fc64903e327a6c","impliedFormat":1},{"version":"1640728521f6ab040fc4a85edd2557193839d0cd0e41c02004fc8d415363d4e2","impliedFormat":1},{"version":"65c24a8baa2cca1de069a0ba9fba82a173690f52d7e2d0f1f7542d59d5eb4db0","impliedFormat":1},{"version":"f9fe6af238339a0e5f7563acee3178f51db37f32a2e7c09f85273098cee7ec49","impliedFormat":1},{"version":"d748648024504c3ddb46411e310b4c69050b8a695e0e1982683bf5594d5a2d8b","impliedFormat":1},{"version":"77e71242e71ebf8528c5802993697878f0533db8f2299b4d36aa015bae08a79c","impliedFormat":1},{"version":"043b4931cc88f57ad36d9cb9d11ff7f688ceded5ea90bfef50f812fdd625e449","impliedFormat":1},{"version":"98a787be42bd92f8c2a37d7df5f13e5992da0d967fab794adbb7ee18370f9849","impliedFormat":1},{"version":"bd4c4556a30a24c353ec3aab92f2fa9517a83fae02370bad181d784a723a718b","impliedFormat":1},{"version":"26f8627d501decb20e9494ee1d9a7eb27c21e9b50df506aae1fe1ad3f9b11aa0","impliedFormat":1},{"version":"4545c1a1ceca170d5d83452dd7c4994644c35cf676a671412601689d9a62da35","impliedFormat":1},{"version":"320f4091e33548b554d2214ce5fc31c96631b513dffa806e2e3a60766c8c49d9","impliedFormat":1},{"version":"a2d648d333cf67b9aeac5d81a1a379d563a8ffa91ddd61c6179f68de724260ff","impliedFormat":1},{"version":"ec2804a1343f9af99b504838771f77a92cc756ee564c4df3df67cee0ebccc292","impliedFormat":1},{"version":"07a86ec5e70855b9fb5ed27f6a7a84d3ba3f63ba521c9e3cf2ea53ad8484a46a","impliedFormat":1},{"version":"d7bcbc84a8a0137869fbb37985d21d0fbf1d9903e1afbe692577302d865fba60","impliedFormat":1},{"version":"1b16beb8414a7abf9e9d82c0df4d5f2ec6c17fac3fb7d6185004ae506d034651","impliedFormat":1},{"version":"153a111b813b430aaa37a352abc884f0434665c9a6b6b3a4deb1ecaf3a74e17a","impliedFormat":1},{"version":"47699512e6d8bebf7be488182427189f999affe3addc1c87c882d36b7f2d0b0e","impliedFormat":1},{"version":"6ceb10ca57943be87ff9debe978f4ab73593c0c85ee802c051a93fc96aaf7a20","impliedFormat":1},{"version":"1de3ffe0cc28a9fe2ac761ece075826836b5a02f340b412510a59ba1d41a505a","impliedFormat":1},{"version":"e46d6cc08d243d8d0d83986f609d830991f00450fb234f5b2f861648c42dc0d8","impliedFormat":1},{"version":"1c0a98de1323051010ce5b958ad47bc1c007f7921973123c999300e2b7b0ecc0","impliedFormat":1},{"version":"ff863d17c6c659440f7c5c536e4db7762d8c2565547b2608f36b798a743606ca","impliedFormat":1},{"version":"fb8b0045bf577879db8f7b16426f7728862b820c0372506c78c79d384781026a","impliedFormat":1},{"version":"fc85587d32e46b46e698053316f16472d7e2e78bf45d177b47dae651f3891aaa","impliedFormat":1},{"version":"ad036a85efcd9e5b4f7dd5c1a7362c8478f9a3b6c3554654ca24a29aa850a9c5","impliedFormat":1},{"version":"fedebeae32c5cdd1a85b4e0504a01996e4a8adf3dfa72876920d3dd6e42978e7","impliedFormat":1},{"version":"e297c0a524edee7677939122f90027bfbe5f2698939d9a85728e5044b39c7124","impliedFormat":1},{"version":"cdf21eee8007e339b1b9945abf4a7b44930b1d695cc528459e68a3adc39a622e","impliedFormat":1},{"version":"bc9ee0192f056b3d5527bcd78dc3f9e527a9ba2bdc0a2c296fbc9027147df4b2","impliedFormat":1},{"version":"cdcb96ffdab6204c3ded7f53ff8a3e730c3689eb83f8b2eb065287bfa8e7b1f0","impliedFormat":1},{"version":"1d9c0a9a6df4e8f29dc84c25c5aa0bb1da5456ebede7a03e03df08bb8b27bae6","impliedFormat":1},{"version":"84380af21da938a567c65ef95aefb5354f676368ee1a1cbb4cae81604a4c7d17","impliedFormat":1},{"version":"1af3e1f2a5d1332e136f8b0b95c0e6c0a02aaabd5092b36b64f3042a03debf28","impliedFormat":1},{"version":"09d8a449a9f38eefc0383f6e08c52cefe471943d99cc3c2242a21c02235b6dcd","impliedFormat":1},{"version":"41eb514d9ce0a6e87957f08a4b7af70d93f87637f37dee706e2d92a6601c25a9","impliedFormat":1},{"version":"e7765aa8bcb74a38b3230d212b4547686eb9796621ffb4367a104451c3f9614f","impliedFormat":1},{"version":"1de80059b8078ea5749941c9f863aa970b4735bdbb003be4925c853a8b6b4450","impliedFormat":1},{"version":"1d079c37fa53e3c21ed3fa214a27507bda9991f2a41458705b19ed8c2b61173d","impliedFormat":1},{"version":"5bf5c7a44e779790d1eb54c234b668b15e34affa95e78eada73e5757f61ed76a","impliedFormat":1},{"version":"5835a6e0d7cd2738e56b671af0e561e7c1b4fb77751383672f4b009f4e161d70","impliedFormat":1},{"version":"4b7f74b772140395e7af67c4841be1ab867c11b3b82a51b1aeb692822b76c872","impliedFormat":1},{"version":"7bd01f0f28cd3aeb2046274d85208e245965f6f2948edf4f7b2057bcf9f22ccc","impliedFormat":99},{"version":"d2f2cf2b8cc92bea913cda4a076e0f790b23a21e84f989d12f0116a7fe3906e0","impliedFormat":99},{"version":"6de125ea94866c736c6d58d68eb15272cf7d1020a5b459fea1c660027eca9a90","affectsGlobalScope":true,"impliedFormat":1},{"version":"7caf3c4129eb3eadfa1a6033206d56145984ebbd46ada269509bcb64d508b9c1","affectsGlobalScope":true,"impliedFormat":1},{"version":"064ac1c2ac4b2867c2ceaa74bbdce0cb6a4c16e7c31a6497097159c18f74aa7c","impliedFormat":1},{"version":"3dc14e1ab45e497e5d5e4295271d54ff689aeae00b4277979fdd10fa563540ae","impliedFormat":1},{"version":"d3b315763d91265d6b0e7e7fa93cfdb8a80ce7cdd2d9f55ba0f37a22db00bdb8","impliedFormat":1},{"version":"b789bf89eb19c777ed1e956dbad0925ca795701552d22e68fd130a032008b9f9","impliedFormat":1},{"version":"c037c0ce3fb0bed24c697b39de961a478bf6a21b5324227cbddc47451ec97407","affectsGlobalScope":true},"f3387dd7800eec3c34273f7a8efad13e864598c7e8f788d321e407390989bb59","1b59d4c6b83807db275d43f3cf2cc8e9323f465fab764eea091cc5becd5bad37",{"version":"169797215de8f49c07059b488d0cfc2612418cadf11c81f02bc74354ff7e0686","signature":"8fc0c587f0da90db69cd9a4838f962e9e572cd7d4aa1e0f4d718fa1998f43c5d"},{"version":"715e969755738b0f0b2874f203c72ab38f1beee10fe20374bcb024df41f27618","impliedFormat":1},{"version":"9e84bb09171ae5ccd7132e5d2e2a6c9a494f11ae252ed08b9b99c2ee8df58e2c","signature":"02a415a44a718f5b0b142be84d7c277351ca688d24f39afc05f5e4dfeb9f8f5f"},{"version":"e6ab0670bfa5c52f375190c44c2fd536df7bd6e54832bb33f3ad4ecbe2136c16","signature":"1923291ed617da7aed1b5b1b899ed47fb70ec7ef4299b146b9847ea1e8db1db9"},{"version":"52e81558af29b2b5b26100d6e4920e7e7c160b4cdafe12d74ff09ad32e3c25e7","signature":"30d4f7fbeb6304f6697954a1202ace434954ced41a939bcea2839ac83346b597"},{"version":"c57b441e0c0a9cbdfa7d850dae1f8a387d6f81cbffbc3cd0465d530084c2417d","impliedFormat":99},{"version":"ff4bfe3c147eadc1b722a8ac9e4d350e66411b5c9022eabe5f4ada871c9adc41","impliedFormat":1},{"version":"22da7ee54109d9695ed4d10dac98531c2dc3d8f07230adb4b5a167eb05e1b0ef","signature":"1dd6b4a845edea5f267bbbf1de6c72cbc5fe4dab4d13ceb2034bd0a5504d5ee7"},{"version":"2368a31d44ccc59758e3b3c682fee74e820b08fad98623905a85092018c06e3b","impliedFormat":99},{"version":"d13d1e30d9cd2c0dc2bd6367bc61f2feb4f4b5d54f7dfcd393be607d35515845","signature":"ed07f82a62266283074240a9c4554d7ae7c6fdbc07fe0da7664b3b2f662cc786"},{"version":"1b4a5f1509686c300a49cb2ff16fb36f6d40f557cca62f7ec0712dcfcef768d2","signature":"4412976bee8ddb70fa58d2bc069cbd4d38e3d5dc7d48b5637b600c90b66a31d5"},{"version":"69255157c506045b675ceafe2c95b4f813e867caf78fb5f194d2f8bf59152d0b","signature":"f8f76c0e7cd59a355c7b86bf32304241fa1e2b439788ac14e59e28a8faa35be6"},{"version":"6e33223b4de404a63f431d223ce05f7c6afbeff873199b608773bdd9ad70f9cc","affectsGlobalScope":true,"impliedFormat":99},{"version":"fe93c474ab38ac02e30e3af073412b4f92b740152cf3a751fdaee8cbea982341","impliedFormat":1},{"version":"54a99ba46c134a0f697cf3539249cb97efb159ae7d0b4b2881208a6563bafbc0","impliedFormat":1},{"version":"1e00b8bf9e3766c958218cd6144ffe08418286f89ff44ba5a2cc830c03dd22c7","impliedFormat":1},{"version":"38a353a20da8343d985801132cf59fab374494c0d42c7d9aa39556195bce594a","signature":"8dae0a6772a7154a07f283cc6597a754ffb07c1df58273b44187d039150a724c"},{"version":"ffeb91f2c925ded5147acdeaef2b5060a8e48f5c5e528e646ea872f4440bd2be","impliedFormat":1},{"version":"c9652107f5ecd1a5c86b601026821138f54454353e58543162b2690bd175cb3a","affectsGlobalScope":true,"impliedFormat":1},{"version":"5e8ef26ea90fb5636ac95a08903ffec4f20b585575dcffa56c32da0df53830b9","impliedFormat":1},{"version":"58a2f3be7277f1d44040962e1770733c012ca5ef00972d444df98ba94d957664","impliedFormat":1},{"version":"28618caee9d3b1e918020188579cca35d9f3d70b12494edeb9a025a7243f3171","signature":"88c0039c43583155eed1a270ebd70e3856105130a26e464c6f25d8b75664dc66"},{"version":"1ea1258c0b012cb0aee4a3133b8358b53b49dd4670d32f0eabf65eb58821b584","signature":"e57c6be79cba3b4704b00e8d7b76913bb92ddba677415c0a34ba0fcd10f1bcee"},{"version":"85d98aa485b0749de53f71bfcd3db518c975887313865fdf381e343c60591765","signature":"6e8b657455525cc8b50715199aaf9544ad11b89bb9bfb908bdbdd97368c080f2"},{"version":"7789dd6f29db7ea22ff27e720d92eb38f1b978a7056ffdfa27cd66a234255e8b","signature":"56cdbcc3006f632aa95609975cbc0100574077a751415cc52ae4b56e40010b59"},{"version":"eda751256e51095e36521d53a6969dcd2d18f8f3c0d96cbcbecfe0e20b985619","signature":"7cffcfb5de3a26c64e671785c2fc131f3fb8b4f5ba938c90b0a14eed27972a2f"},{"version":"5e3d059f9b43d321e1424bfe5826032de28aa5f6a7f1c0dccfbf6f23b8eccd04","signature":"7fced774d307155dbe328583316013de87b8d033941c7c306909e3dba9a401d1"},{"version":"d38e5f2cf94b126d84c23e7e80ee27478edc23cebfc5ed61b5eabd1c74621402","impliedFormat":1},{"version":"41a5ae482e864a6128e6054e88f1c0e06884793f92aff5c67144fb02d2373079","impliedFormat":1},{"version":"f02b90e3af99cf385243311c6d2d7509694a6f6f0fd51be90f0541ca3e350300","impliedFormat":1},{"version":"6bf935b820c0cc7edee60f4753d7ed2e2fd421bfff3e35db86ab160af090a127","impliedFormat":99},{"version":"b9bb51d52f5068c43f4ddcadca42e7a866c18ea7ea4198d5e9ff2b2e8445f2a5","signature":"c341882982d616bd8834c08084e6b6574928be8a845efe816620a7977c24b598"},{"version":"f25d70857c1265bc21cac228e2ce97b89b3475c41919166648edbe707be9dfb0","signature":"a28a9be7abddfc30fb74ec1602625d46b2f833ae63d215de614f6485353a447d"},{"version":"56208c500dcb5f42be7e18e8cb578f257a1a89b94b3280c506818fed06391805","impliedFormat":1},{"version":"0c94c2e497e1b9bcfda66aea239d5d36cd980d12a6d9d59e66f4be1fa3da5d5a","impliedFormat":1},{"version":"eb9271b3c585ea9dc7b19b906a921bf93f30f22330408ffec6df6a22057f3296","impliedFormat":1},{"version":"aa4a927d0c7239dff845a64e676c71aeed2bbda89a7fb486baab22eb7688ba1d","impliedFormat":1},{"version":"340a990742a00862049b378aaa482b5bb8323d443c799dded51ce711f4f8eb51","impliedFormat":1},{"version":"89eeeebbc612a079c6e7ebe0bde08e06fbc46cfeaebf6157ea3051ed55967b10","impliedFormat":1},{"version":"8ed381bd34abd050f65b0fef9978b0af4993cc89c00b3424ec72e1d39666d33f","impliedFormat":1},{"version":"15d8dcd70d6cc6c75476a75ea83c53df1115bdd551c73ef2168a9b4a4bd55a51","impliedFormat":1},{"version":"104fbc2171a980f2b4ff0eba6fc9dd2535ce0195b21ecf2c59cde225ab2d0496","impliedFormat":1},{"version":"c812eabb7d2e13c8e72e216208448f92341a4094dd107cbb0bdb2cb23d1a83e7","impliedFormat":1},{"version":"f734b58ea162765ff4d4a36f671ee06da898921e985a2064510f4925ec1ed062","affectsGlobalScope":true,"impliedFormat":1},{"version":"57658b130a56abe2ba4f7eb1490038f0b31aa2f3cc2e42d24032626fcf6b1be3","impliedFormat":1},{"version":"9eb8e1320fc0ecbfba15c0f3452dfc1957543dfbd466aaf8b67ddb0f2ad0f217","impliedFormat":1},{"version":"9c5c84c449a3d74e417343410ba9f1bd8bfeb32abd16945a1b3d0592ded31bc8","impliedFormat":1},{"version":"a7f09d2aaf994dbfd872eda4f2411d619217b04dbe0916202304e7a3d4b0f5f8","impliedFormat":1},{"version":"86ac756569f83cf0571646c916b546634652e92a775e964304912ecafa81dc42","impliedFormat":99},{"version":"547e97719cedbe21afd8e22413f1c91f57d877eae7c7ed119d69e244647e258d","impliedFormat":1},{"version":"bee66a62aa1da254412bb2c3c8c1a0dd12efea0722d35cc6ea7b5fdaa6778fd1","impliedFormat":1},{"version":"05d80364872e31465f8a1eaf2697e4fc418f78aa336f4cea68620a23f1379f6f","impliedFormat":1},{"version":"7345ba3b9eb2182d8cdc4c961b62847c3c9918985179ddefd5ca58a80d8b9e6a","impliedFormat":1},{"version":"81c4a0e6de3d5674ec3a721e04b3eb3244180bda86a22c4185ecac0e3f051cd8","impliedFormat":1},{"version":"39975a01d837394bcac2559639e88ecdc4cfd22433327b46ea6f78eb2c584813","impliedFormat":1},{"version":"7261cabedede09ebfd50e135af40be34f76fb9dbc617e129eaec21b00161ae86","impliedFormat":1},{"version":"ea554794a0d4136c5c6ea8f59ae894c3c0848b17848468a63ed5d3a307e148ae","impliedFormat":1},{"version":"2c378d9368abcd2eba8c29b294d40909845f68557bc0b38117e4f04fc56e5f9c","impliedFormat":1},{"version":"a843946c6e71a80d5940bd48c6bd0d5e08eb64d70206d774d4ffec4206775113","affectsGlobalScope":true,"impliedFormat":1},{"version":"c60b14c297cc569c648ddaea70bc1540903b7f4da416edd46687e88a543515a1","impliedFormat":1},{"version":"efcdea26e9115d5c05b3f4c5827fe3b32b4fef1b59dbd67f529c6cb685c7d9c4","impliedFormat":1},{"version":"bb0c361fd2b4bdabbf1307f1a61fd14c953f2692fa642391f93276f2df41de50","impliedFormat":1},{"version":"844e38e7f6f9f7fb5f4a70a65cd128ce3a1fb4d477ad8d25ed1778a5361970d5","impliedFormat":1},{"version":"6ce50ada4bc9d2ad69927dce35cead36da337a618de0a2daaaeeafe38c692597","impliedFormat":1},{"version":"5fbc333346d28f290d42ac81cf16e454fd3947c6e524384dfd3ce59d4ac3af04","impliedFormat":1},{"version":"332e0235f2477a3311fc8d3947ebab4660c39ebc95142c860d5afdd669a1ed29","impliedFormat":1},{"version":"57962f64e72832cf9f0bd829067c37612079de93e28395dfd55a538a07e00755","impliedFormat":1},{"version":"846068dbe466864be6e2cae9993a4e3ac492a5cb05a36d5ce36e98690fde41f4","impliedFormat":1},{"version":"94c8c60f751015c8f38923e0d1ae32dd4780b572660123fa087b0cf9884a68a8","impliedFormat":1},{"version":"db8747c785df161ef65237bac36a7716168e5ebf18976ab16fd2fff69cf9c6ce","impliedFormat":1},{"version":"3085abdf921a6d225ad037c89eb2ba26a4c3b2c262f842dd3061949d1969b784","impliedFormat":1},{"version":"8e8f7b36675be31c4e9538529c30a552538c42ff866ba59fe70f23ba18479c5a","impliedFormat":1},{"version":"1fe8b45c1564eca8b1bd27d427d193ea8c1a5d64f7144a5a64665d5d0f27a9e4","impliedFormat":1},{"version":"a03c6f93651e458531f223d52eac1a12f2aee8adc2cbc4b4154a3fe515984e5c","impliedFormat":1},{"version":"8d05dbd747569cb1b0cc2ec1018a3378c47d803de0e7d34f7e12909ff48bb437","impliedFormat":1},{"version":"1afb31819f4b7d04f4089d575acd30854a4cc614baea960066f7cc5755e9efcd","impliedFormat":1},{"version":"d2bf4138c95a16ec25e60e131b9134d98b4af79be09d29cf9321d102bf4fc4ac","impliedFormat":1},{"version":"c5b47653a15ec7c0bde956e77e5ca103ddc180d40eb4b311e4a024ef7c668fb0","impliedFormat":1},{"version":"0528a80462b04f2f2ad8bee604fe9db235db6a359d1208f370a236e23fc0b1e0","impliedFormat":1},{"version":"94153ca0b430f575f45a5e07d66771dc5ab331af7791691855ba3499958c4e49","impliedFormat":1},{"version":"dd361fe00d3033451e4a43c9eaeafcd1b9b6777adfbc8b8f91d63ea56818c31c","impliedFormat":1},{"version":"b86720947f763bbb869c2b183f8e58bca9fa089ed8f9c5a1574b2bea18cfbc02","impliedFormat":1},{"version":"fb7e20b94d23d989fa7c7d20fccebef31c1ef2d3d9ca179cadba6516e4e918ad","impliedFormat":1},{"version":"8326f735a1f0d2b4ad20539cda4e0d2e7c5fc0b534e3c0d503d5ed20a5711009","impliedFormat":1},{"version":"8d720cd4ee809af1d81f4ce88f02168568d5fded574d89875afd8fe7afd9549e","impliedFormat":1},{"version":"df87c2628c5567fd71dc0b765c845b0cbfef61e7c2e56961ac527bfb615ea639","impliedFormat":1},{"version":"659a83f1dd901de4198c9c2aa70e4a46a9bd0c41ce8a42ee26f2dbff5e86b1f3","impliedFormat":1},{"version":"1db5c2491eebd894eb9be03408601cddfe1b08357d021aeb86c3fb6c329a7843","impliedFormat":1},{"version":"224f85b48786de61fb0b018fbea89620ebec6289179daa78ed33c0f83014fc75","impliedFormat":1},{"version":"05fbfcb5c5c247a8b8a1d97dd8557c78ead2fff524f0b6380b4ac9d3e35249fb","impliedFormat":1},{"version":"322f70408b4e1f550ecc411869707764d8b28da3608e4422587630b366daf9de","impliedFormat":1},{"version":"c4ef9e9e0fcb14b52c97ce847fb26a446b7d668d9db98a7de915a22c46f44c37","impliedFormat":1},{"version":"0e447b14e81b5b3e5d83cbea58b734850f78fb883f810e46d3dedba1a5124658","impliedFormat":1},{"version":"b16a6680ef4108fb2982b1d47e7ce36a8b2c382cf76b3e1b500de70f0a62fdff","impliedFormat":1},{"version":"929939785efdef0b6781b7d3a7098238ea3af41be010f18d6627fd061b6c9edf","impliedFormat":1},{"version":"fca68ac3b92725dbf3dac3f9fbc80775b66d2a9c642e75595a4a11a2095b3c9a","impliedFormat":1},{"version":"245d13141d7f9ec6edd36b14844b247e0680950c1c3289774d431cbbd47e714e","impliedFormat":1},{"version":"4326dc453ff5bf36ad778e93b7021cdd9abcfc4efe75a5c04032324f404af558","impliedFormat":1},{"version":"27b47fbd2f2d0d3cd44b8c7231c800f8528949cc56f421093e2b829d6976f173","impliedFormat":1},{"version":"d5426c0e36296daf07cf2f38227907469c33a53473d9c2721d21dc515c5724df","impliedFormat":1},{"version":"cc03a3e284393b02fdb646931e8576f6dbe839a249d172eb3397adec80559450","impliedFormat":1},{"version":"3d94a259051acf8acd2108cee57ad58fee7f7b278de76a7a5746f0656eecbff6","impliedFormat":1},{"version":"f35e2650b2d1a0427829a69f20497cbf1c7fbd8df16d8f6533dd45043e30e665","impliedFormat":1},{"version":"199d42a358b3b73312d499dd04d9f855bf8ad492452765de4ef80b8cb6871cd3","impliedFormat":1},{"version":"eafa048ffaf72cdb64fa1d0dae49aa91280a7bb94e0b034883ae48cec27a04d7","impliedFormat":1},{"version":"593bcf66433eff881c9abb75d2e55a7403c57905aa61d818a616bb3c7f076b49","impliedFormat":1},{"version":"3f3526aea8d29f0c53f8fb99201c770c87c357b5e87349aca8494bfd0c145c26","impliedFormat":1},{"version":"6ee92d844e5a1c0eb562d110676a3a17f00d2cd2ea2aaaff0a98d7881b9a4041","impliedFormat":1},{"version":"b9dc36d1f7c5c2350feafb55c090127104e59b7d2a20729b286dab00d70e283d","impliedFormat":1},{"version":"45d3f1d53fa99783a5e3c29debb065d6060d0db650a6a1055308a8619bd6b263","impliedFormat":1},{"version":"a14febaf38fd75a88620a0808732cf9841afc403da2dc3de7a6fc9a49d36bdbc","impliedFormat":1},{"version":"6052522a593f094cfee0e99c76312a229cf2d49ac2e75095af83813ec9f4b109","impliedFormat":1},{"version":"deb8492c17df1f0444405fbfa688556ee2d619b2d6ba874cddc53d2e43f9264c","impliedFormat":1},{"version":"a63ce903dd08c662702e33700a3d28ca66ed21ac0591e1dbf4a0b309ae80e690","impliedFormat":1},{"version":"2b63d2725550866e0f2b56b2394ce001ebf1145cb4b04dc9daa29d73867b878c","impliedFormat":1},{"version":"e885933b92f26fa3204403999eddc61651cd3109faf8bffa4f6b6e558b0ab2fa","impliedFormat":1},{"version":"22338cc18afb909a95a6c55417f1a67db99badecbac1710a963f0bf63c952124","impliedFormat":1},{"version":"e61b31fd5fd627c73da6041d201c0bbd721170288381f09055cad4fcb2ad327b","impliedFormat":1},{"version":"6e2d2b63c278fd1c8dd54da2328622c964f50afa62978ed1a73ccd85e99a4fc7","impliedFormat":1},{"version":"e151e41c82004cf09b7ea863f591348c9035e0f7a69d4189cbac89cc9611b89d","impliedFormat":1},{"version":"c0821ef4d96542fab33465c8ddb97a0ca2fed71a01f2428f98bf306ec5077f72","impliedFormat":1},{"version":"b83ffe71adbac91c5596133251e5ec0c9e6664017ee5b776841effe93de8f466","impliedFormat":1},{"version":"61ecf051972c69e7c992bab9cf74c511ecba51b273c4e1590574d97a542bd4ea","impliedFormat":1},{"version":"068f5afbae92a20a5fcd9cfce76f7b90de2c59a952396b5da225b61f95a1d60a","impliedFormat":1},{"version":"b6766f0a61eb239758a27a90c14acd8151ad69d5a4265f95c708229a11c52c99","impliedFormat":1},{"version":"d7ded5d2060ac6a4404e6001a46d5a704e3f325f95e2cb0dc055ea05404c9cf6","impliedFormat":1},{"version":"99c88ea4f93e883d10c04961dbf37c403c4f3c8444948b86effec0bf52176d0e","impliedFormat":1},{"version":"e88f3729fcc3d38d2a1b3cdcbd773d13d72ea3bdf4d0c0c784818e3bfbe7998d","impliedFormat":1},{"version":"f25b1264b694a647593b0a9a044a267098aaf249d646981a7f0503b8bb185352","impliedFormat":1},{"version":"964d0862660f8e46675c83793f42ab2af336f3d6106dee966a4053d5dc433063","impliedFormat":1},{"version":"292ad4203c181f33beb9eb8fe7c6aaae29f62163793278a7ffc2fcc0d0dbed19","impliedFormat":1},{"version":"aa8e5ac3f73eede931d5da74ef1797c174b00854ac701ead5c4a7d6ce4a49029","impliedFormat":1},{"version":"f1a4ca3688d951daa2d7740da5a0827fa34d4a7709eed7b8225215986ee87108","impliedFormat":1},{"version":"08e159b5ef9d14bdd329457c5cbe181e84f13c4ff2546a24b9eb9129b0c71c46","impliedFormat":1},{"version":"f8453a3fe0fe49ab718357120bec2b8205e15eb91ff62eada60a4780458fa91e","impliedFormat":1},{"version":"06f186bb9a6408ef8563dbf17d53cbe23e68422518b49b96afac732844ddbaa1","impliedFormat":1},{"version":"525f9c06245b5b43b1237cfd757396fd7fd8090e5d6a4ded758c7ce17a04bf42","impliedFormat":1},{"version":"e46b752c48b3aec77516d23b5cbc0b85df78c740c058a822b43a32c958e468f0","impliedFormat":1},{"version":"f693b1fce39951823f128590c6c837b70f844b6d3746ef778b7fae7f1340338a","impliedFormat":1},{"version":"bc264419318f0b174b5dabdd465e1eddb82f872e899b6c696c67217b346e958c","impliedFormat":1},{"version":"6046bffaa17bbb55ffd62926a966a7badce21b27d6239ba0b569b8266bedaf19","impliedFormat":1},{"version":"9376cce4d849f1d6ad2cb0048807c77cfeb78cee6e29b61dcfe74c7ab2980e18","impliedFormat":1},{"version":"2e0dc55ea1ade444d285576a4ed7915834d4a87f71b147c38afdb877ebb0ad2d","impliedFormat":1},{"version":"4edfc4848068bf58016856dfeb27341c15679884575e1a501e2389a1fea5c579","impliedFormat":1},{"version":"0c3d7a094ef401b3c36c8e3d88382a7e7a8b1e4f702769eba861d03db559876b","impliedFormat":1},{"version":"1a3b915d24b2a26df000ef55ed356028dec11ff54f7e93a5c095c313d7016e1c","impliedFormat":1},{"version":"7e3a4800683a39375bc99f0d53b21328b0a0377ab7cbb732c564ca7ca04d9b37","impliedFormat":1},{"version":"b1fa1cd1640dfa791a7d90dbeab84f15088b5c8948434309f50f209ef5a7c184","impliedFormat":1},{"version":"8d87de8b839a017541ec1baec68292ddbcdfad0f2f3b5f2ae8abd61f06105cbd","impliedFormat":1},{"version":"7cb0d946957daea11f78a31b85de435e00bcd8964eba66d3e8056ba9d14b9c55","impliedFormat":1},{"version":"b3e441cdb9d9e55e6e120052fe8bf2a8b5e5a46287f21d5bc39561594574e1a9","impliedFormat":1},{"version":"0870e8eb0527c044e844a1d83127f020aa7f79048218a62b2875e818355f8cb2","impliedFormat":1},{"version":"38400b70ac70600c632ad498df2d956ed8ca6c6774dfb0ef69a2d35a9450df7a","impliedFormat":1},{"version":"abab86c01d001d0cc410c7aee59168eb09bdb7d6d9d39d3c0081b36235e2824f","impliedFormat":1},{"version":"a163498a4b96c552507c138d58e0182094109e78a88a68393d3812b06e35c0f7","impliedFormat":1},{"version":"dc0f3099379383bf14f2263c7987584e81b6d9b60259c9e31390455ca0619dba","impliedFormat":1},{"version":"6dd704b0ba0131eb9e707aeedc39be6a224b4669544e518217a75eb7f5dd65c2","impliedFormat":1},{"version":"6effa89f483e5c83c0e0063df5f1d8b006d9d0f1de7eed2233886642424dc8fb","impliedFormat":1},{"version":"5c6dc17513298b4daac99bf8e88ad4e4a504310cf69a0cf3cffefa5912b85234","impliedFormat":1},{"version":"d43130c35762a80da2299f8b59a4321b6e64acfb0b11a36183379b4c7b83314b","impliedFormat":1},{"version":"6bf44b890824799af8e20c0387ffa987e890fac5c5954a3a7352351eefe55d5d","impliedFormat":1},{"version":"e61999c06ae79ec587c2e7db514a024d85732b32ee2c997bf4a1ceb2b561c611","impliedFormat":1},{"version":"aecd29a5bc49b1de6b933344e9c96384cd098162c46873673ffa1408e6195c52","impliedFormat":1},{"version":"f83afa274e0f11860c6609198ecca220f5df60690923b990ca06cae21771016e","impliedFormat":1},{"version":"af31f37264ea5d5349eec50786ceca75c572ed3be91bdd7cb428fdd8cd14b17c","impliedFormat":1},{"version":"86d01647c3c215e53729aa2cb15d7bcc2b049088bc76bdb5e04a0bf25f97c386","impliedFormat":1},{"version":"9d3173cf740b742d1048d8ab20469060a2b5e2d426f8ff7df36042e6829c4aa8","impliedFormat":1},{"version":"f1063f0e6ca22a9fae0c0338768b03911c954b8e6ad4fff5381cc6a964b34324","impliedFormat":1},{"version":"4f85d12a28937e950b123e5385448a3bce0f04dccbca7ceb8aef351ffeccb228","impliedFormat":1},{"version":"85e4673ec8507aef18afd4a9acfae0294bdfaac29458ede0b8b56f5a63738486","impliedFormat":1},{"version":"40683566071340b03c74d0a4ffa84d49fedb181a691ce04c97e11b231a7deee4","impliedFormat":1},{"version":"81c8ab81daa2286241ad27468d6fc7ad3ecc62da04b18b77ce9b9b437f6b0863","impliedFormat":1},{"version":"101cffc458e03338e7a01bc06dd26a54aac993e3e4a6a31b7f7ca02f38f41e46","impliedFormat":1},{"version":"8e56db8febfe127a9142435940c9a5a1ad17ddb2b2a6d8e9e8984785a76db1fd","impliedFormat":1},{"version":"f1efa458a3f630de51e30c823a8e1109eadf8562b8b90c764ef1fd989329bcaf","impliedFormat":1},{"version":"1ea64554b23db011171f7e0dd59d006b239fd4ec2e7e8b31ecf995528de79423","impliedFormat":1},{"version":"46788ee6b4670d904a54d56fe9e3bb308ab4c4ba01a435d39d8beaebf85f1a54","impliedFormat":1},{"version":"977111df303073945a139cd47e84c687bf997d82be6901ceb28b3b60e710c876","impliedFormat":1},{"version":"e49567e130fdc3a740ac9182783c7e2ec1affc1d53cec55923f8f380f4565877","impliedFormat":1},{"version":"19bb9ced776a482715d07f83cd183c7e59a7ce0501393073848f2975a43613be","impliedFormat":1},{"version":"a2734be3f441e8392c9fdb1528b4d957c9669bde24fc7489e78f06514ad09324","impliedFormat":1},{"version":"d8fc87e3a13695aab6bf9c4b65b291b3108eff460fc6259a8b8ee2e6b1c2a87f","impliedFormat":1},{"version":"4fb7ce879ffdf88f5fd8f3eaedc43059e32d71c8b21e1585a97d47c2e686ac25","impliedFormat":1},{"version":"ec885335115a060e72bed1f0e84c6b51a850c069082579ebac4b8061bcd1693e","signature":"abfa940df21cf4516bd84fb60289fcfd6b493ded96ef7827580e519ce466bdae"},{"version":"8e8bd6b3eb90d3c56e02103c0f93b124deff88513c416a010955611b85f1fd0b","signature":"6c45675928d5db83b67f6f8d0c2238049d5290a975c3d1c99b7d2cdf8b415168"},{"version":"2448569705942f5a0fe8d4805c35a79470d420539ebeafd9176feb599eafc415","signature":"8d150e459b071ac9af6bb077e1c9f92abe2ba29b33b6a8bcb49971ed6e22927c"},{"version":"f4375f783647dc1e9d37dfc4e656746ff7d809c418c939238d6ab98ac3dcbbce","signature":"4755e0d114f9eb8e41642be93745fdba18dfb087affa864253d5e18fa0a4ec70"},{"version":"334689b7354321014c4173b5b14c3514af2481cdf228f7bd30d96dc22ef07f3a","signature":"3d38df8452fd8d0aa6c7963f134a57219163a4dc2d6a340ac17c504db7c4aed5"},{"version":"1fbe1bd1f736e861e445fc4d4a50d40f8aa00aa1e7d29b1eac66aecbcf81ecd0","signature":"85cb6fb858983f366afb2f9952580580dff903e030d73d2d576907ab6c5cbb7e"},{"version":"3f617d8a61f5e4882a367ec5b0881b34e743b08d0fee8af27d782e362b85db57","signature":"91fbc007ed1e399350b95adf95e061b3ff62a9441f966a2656ee151ffbbbb749"},{"version":"80f0986304e93ff68401b13213655d08c56a4caa08b513472b7ca2ebc5ca0de3","signature":"c598ac267a896a7c561ef6d36c8b0d16a2789367c924c819132df267466643d0"},{"version":"9db3ee04b65eb6116716780372d8761c214484fcb7a88af265e5d58ce7378ba1","signature":"91ffe1f3b3a8196fb73d5ed97f42eaa41d87207b522a71c1ed090bb97e90477a"},{"version":"b28e98dd229e73eaa5c077f304494c5047af57a61d7fb8ddd23a9b1152eb5b00","signature":"78b4d608ebf9db379cb0d01e5d32e7a99d55a1e34ee0094feaad60dff3600822"},{"version":"f38bfa2bffe331ff76de74fbfdadac02af5c6ef0356747056217e0f1b6ea32fd","signature":"af79d723ba242c7173cbdffbe59c0e9780efe023cf75967b2b4d686c8c63be91"},{"version":"dc6baebb1dd7c301f76bf064480312e68efbe01eda9a4433b43c3afd805bd320","signature":"4e0736e5640d640b2b7f303dc46f74ea378dd8f9655dbf174e8c8f4199e4996b"},{"version":"a13e313e35f370a42d45b9f24853f6203306c08679c2e9249dd9cdebf990829e","signature":"7837dd9c018c571283ac6e26b11fd830ca92edacdfde40f0dbf8ad4e9643b736"},{"version":"7ac3b480727596accaad1990e6be0c9cc6bcd58aaf82a5a28173136dda9b5120","signature":"a97b8a941f7d52176550fbea89eea9ccdaec650cad26b941eb11e87c61297488"},{"version":"579be923eb10886e8c0745065808751b85866bdd6aacddf7758fc428002fdc8c","signature":"45b373ad2e114de335dd3eaf62f9658266d71c2f34537489f88f3b4815fa72f8"},{"version":"41c14864c2b903aef32fee1965e7c5a05a91745f366f908fe219f3aa56479260","signature":"4e0736e5640d640b2b7f303dc46f74ea378dd8f9655dbf174e8c8f4199e4996b"},{"version":"5d606f468b64b5f41435e0ffb99dd08194864dc645e9f8b72304f30fae5ce6c5","signature":"a28a9be7abddfc30fb74ec1602625d46b2f833ae63d215de614f6485353a447d"},{"version":"9d2c05e5fd6ff32c635ce8c042b4d26bb113bf8bc19d5b76f46667087c0762af","signature":"03d296aa750f2ba1a8426bafee4659583bb30910e362626fe6417e1f9035368a"},{"version":"ff7fcab816772546b31f5fe49cbb8602dddc78b68305269eabe8961e2ccba369","signature":"a849bb0568042faafe6c00ed989f95d8693f4c7d477d7c8cc7e03146c6d369e9"},{"version":"11ecf73c0411c34575a311c78338bd3dd0a656f6f6257127d56baf50c8659a80","signature":"a9064e668b7a211cf37891905afae477786f0b458cac06b50df022bfe1989996"},{"version":"a78aae617afb5da15ba7645064714be0cc50268cb4edcf8e1832d164383685a6","signature":"71b0cf0009aa0d28ebd08adb4c46d8111eec06404364d03666bf36deb4468801"},{"version":"d25e61fe56c22d6fe375a1e6f56b3523ffb86a7735b75d7393f082e041a09c68","signature":"a9064e668b7a211cf37891905afae477786f0b458cac06b50df022bfe1989996"},{"version":"ddc62c8eb6b7fb8e8fd0f0f19809530b1e5ba5a131471a6eef65028d0d3b5a6e","impliedFormat":99},{"version":"802cbde8e06732ca0356927b4c9fbc39f5961df58a18b74fdc4e131269293a5d","impliedFormat":99},{"version":"c142b7ee0627e27db02e8d890746074ab491589f017da78283c452dafc443d3e","impliedFormat":99},{"version":"3ac6eb2cafcb89a552a4923213c705f0fc3c2b50e466eae9dc1a540e3af18bc0","impliedFormat":99},{"version":"073f96a1cfddfedf8695401f8328a8e84a4d98fa5b08b4d894c3885069083cd6","impliedFormat":99},{"version":"9277cadea8fcd4c10616d7667f521274c5fc6cef385861f6962ef880db3e612d","impliedFormat":99},{"version":"20b20c535eb79b2a4a62229abf83f0fcdd3dc1f041fc3c588dbe01e3a7666ef9","impliedFormat":99},{"version":"2fbe402f0ee5aa8ab55367f88030f79d46211c0a0f342becaa9f648bf8534e9d","impliedFormat":1},{"version":"b94258ef37e67474ac5522e9c519489a55dcb3d4a8f645e335fc68ea2215fe88","impliedFormat":1},{"version":"4e679215c9c8480ea8b876cf74d77c1225da544adaf6acba43634a434275a69d","signature":"43bc3e691c9f7d671270af45725f2866e58942e713b9f5b62aee775e40da2f20"},{"version":"4e514dfdeeaad6612896f54eb4d0ba0a88a10a1405a67d30765802f8b108aaf5","signature":"47014b1b270bfe53ef40d1f58edffe590bf9c2d638ff84d33f100de8418accb7"},"4f984436b10cfb43ccf7fc3114dcb851cbefa4d58b7d8ae741aaae0f6e330129",{"version":"68afe78b322d3dadc2fd111128e7407723a7e0ec80cc5c56c5a7e39dce0ef096","signature":"8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881"},"4f984436b10cfb43ccf7fc3114dcb851cbefa4d58b7d8ae741aaae0f6e330129","f3387dd7800eec3c34273f7a8efad13e864598c7e8f788d321e407390989bb59",{"version":"1769fd6631d19c021382014cfd799311257bc8e4393060cadfe6214c2c7c0491","affectsGlobalScope":true},{"version":"40ab294cbb68766870e6443f9f852bc4ab4bb57913712b309387ddd5b00bee41","signature":"8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881"},{"version":"b1538a92b9bae8d230267210c5db38c2eb6bdb352128a3ce3aa8c6acf9fc9622","impliedFormat":1},{"version":"6fc1a4f64372593767a9b7b774e9b3b92bf04e8785c3f9ea98973aa9f4bbe490","impliedFormat":1},{"version":"ff09b6fbdcf74d8af4e131b8866925c5e18d225540b9b19ce9485ca93e574d84","impliedFormat":1},{"version":"d5895252efa27a50f134a9b580aa61f7def5ab73d0a8071f9b5bf9a317c01c2d","impliedFormat":1},{"version":"1f366bde16e0513fa7b64f87f86689c4d36efd85afce7eb24753e9c99b91c319","impliedFormat":1},{"version":"7fa8d75d229eeaee235a801758d9c694e94405013fe77d5d1dd8e3201fc414f1","impliedFormat":1},{"version":"0b301e46295e7dee8bcead624b4a0f94ab8ba1cb3f572b726977322293be2196","impliedFormat":1}],"root":[[550,553],[555,557],560,[562,564],569,[574,579],584,585,[736,757],[767,774]],"options":{"allowJs":true,"esModuleInterop":true,"jsx":4,"module":99,"skipLibCheck":true,"strict":true,"target":2},"referencedMap":[[771,1],[772,2],[773,2],[774,3],[769,4],[551,2],[550,2],[770,5],[740,6],[741,7],[742,8],[579,9],[737,10],[743,11],[747,12],[748,11],[749,8],[569,13],[750,14],[751,12],[739,15],[738,16],[753,11],[754,17],[755,18],[756,19],[736,20],[584,21],[585,22],[574,23],[578,24],[577,25],[576,26],[757,18],[575,27],[745,21],[746,28],[767,29],[744,30],[768,22],[752,22],[553,30],[555,31],[556,30],[557,30],[560,32],[552,33],[763,34],[764,35],[760,36],[758,2],[759,37],[762,38],[761,39],[488,2],[375,2],[601,40],[600,30],[775,2],[776,2],[777,2],[778,41],[610,2],[587,42],[611,43],[586,2],[779,2],[143,44],[144,44],[145,45],[91,46],[146,47],[147,48],[148,49],[89,2],[149,50],[150,51],[151,52],[152,53],[153,54],[154,55],[155,55],[156,56],[157,57],[158,58],[159,59],[92,2],[90,2],[160,60],[161,61],[162,62],[163,63],[164,2],[165,64],[166,65],[167,66],[168,67],[169,68],[170,69],[171,70],[172,71],[173,72],[174,72],[175,73],[176,2],[177,74],[178,75],[180,76],[179,77],[181,78],[182,79],[183,80],[184,81],[185,82],[186,83],[187,84],[88,2],[196,85],[188,86],[189,87],[190,88],[191,89],[192,90],[193,91],[93,2],[94,92],[95,2],[96,2],[139,93],[140,94],[141,2],[142,78],[194,95],[195,96],[200,97],[397,98],[201,99],[199,100],[399,101],[398,102],[197,103],[462,2],[198,104],[79,2],[81,105],[460,98],[461,98],[780,2],[781,2],[565,2],[766,106],[765,107],[558,2],[80,2],[723,2],[581,2],[572,108],[597,2],[554,98],[571,109],[570,2],[573,110],[501,111],[507,112],[514,113],[523,114],[495,115],[251,2],[481,116],[379,117],[382,118],[354,2],[367,119],[374,120],[256,2],[356,2],[257,2],[353,121],[419,122],[480,2],[248,123],[381,124],[383,125],[384,126],[458,127],[348,128],[302,129],[361,130],[362,131],[360,132],[359,2],[355,133],[380,134],[482,135],[423,2],[424,136],[250,137],[483,138],[268,137],[305,137],[226,137],[377,139],[376,2],[366,140],[474,2],[235,2],[513,141],[436,142],[437,143],[433,144],[532,2],[344,2],[438,98],[434,145],[536,146],[535,147],[531,2],[282,2],[347,148],[346,2],[530,149],[435,98],[287,150],[295,151],[297,152],[286,2],[292,153],[294,154],[289,155],[296,156],[291,157],[288,2],[293,158],[533,2],[529,2],[534,2],[285,159],[524,160],[527,161],[275,162],[274,163],[496,2],[273,164],[539,98],[272,165],[262,2],[541,2],[567,166],[566,2],[542,98],[543,167],[218,2],[363,168],[364,169],[365,170],[222,2],[368,2],[243,171],[202,2],[450,98],[224,172],[449,173],[448,174],[439,2],[440,2],[447,2],[442,2],[445,175],[441,2],[443,176],[446,177],[444,176],[479,2],[253,2],[254,137],[388,2],[393,178],[396,179],[392,180],[390,181],[395,182],[391,183],[386,2],[456,98],[247,98],[500,165],[508,184],[512,185],[337,186],[322,2],[317,2],[470,187],[203,188],[349,189],[350,190],[400,191],[431,192],[326,2],[455,193],[339,98],[428,194],[427,195],[426,196],[430,197],[331,198],[457,199],[327,2],[330,200],[328,2],[429,201],[452,202],[453,203],[451,2],[454,2],[335,2],[402,204],[401,205],[422,206],[230,207],[338,208],[341,209],[332,210],[336,211],[324,212],[342,213],[227,214],[408,215],[321,216],[228,217],[478,218],[223,219],[403,220],[387,2],[404,221],[493,222],[385,2],[492,223],[87,2],[490,224],[252,2],[425,225],[485,2],[236,2],[239,2],[358,2],[407,226],[255,2],[260,227],[334,228],[266,229],[333,2],[406,2],[389,2],[409,230],[410,231],[357,2],[412,232],[414,233],[413,234],[369,2],[405,217],[416,235],[320,236],[491,237],[494,238],[204,2],[208,2],[207,2],[206,2],[211,2],[205,2],[214,2],[213,2],[210,2],[209,2],[212,2],[215,239],[217,2],[312,240],[311,2],[316,241],[313,242],[315,243],[318,241],[314,242],[244,244],[304,245],[473,246],[471,2],[518,247],[520,248],[466,249],[519,250],[505,2],[231,251],[229,251],[216,2],[246,252],[245,253],[241,254],[242,255],[249,256],[259,256],[269,256],[306,257],[270,257],[233,258],[232,2],[310,259],[309,260],[308,261],[307,262],[234,263],[459,264],[258,265],[465,266],[432,267],[463,268],[464,269],[352,270],[351,271],[345,272],[319,273],[301,274],[303,275],[300,276],[415,277],[475,2],[476,278],[506,2],[240,279],[421,280],[472,281],[343,2],[261,282],[325,283],[323,284],[263,285],[417,286],[467,2],[264,287],[418,287],[503,2],[502,2],[504,2],[469,2],[468,2],[420,288],[340,2],[298,289],[238,290],[276,2],[221,291],[265,2],[510,98],[220,2],[522,292],[284,98],[516,98],[283,293],[498,294],[281,292],[225,2],[525,295],[279,98],[280,98],[271,2],[219,2],[394,2],[278,296],[277,297],[267,298],[329,71],[484,71],[411,2],[487,299],[486,2],[290,159],[237,2],[299,98],[477,171],[499,300],[82,98],[85,301],[86,302],[83,98],[84,2],[378,92],[373,303],[372,2],[371,304],[370,2],[497,305],[509,306],[511,307],[515,308],[568,309],[517,310],[521,311],[549,114],[526,114],[548,312],[528,313],[537,314],[538,315],[540,316],[544,317],[547,171],[546,2],[545,318],[627,319],[720,320],[718,321],[625,2],[626,322],[719,2],[721,323],[629,324],[628,325],[632,326],[699,327],[694,328],[594,329],[665,330],[658,331],[715,332],[592,333],[664,334],[653,335],[652,325],[698,336],[695,337],[646,338],[657,339],[700,340],[701,340],[702,341],[710,342],[704,342],[712,342],[716,342],[703,342],[705,343],[708,343],[711,343],[707,344],[709,342],[713,345],[706,346],[604,347],[679,98],[676,348],[680,98],[615,342],[605,342],[671,349],[593,350],[614,351],[618,352],[678,342],[590,98],[677,353],[675,98],[674,342],[606,98],[725,354],[689,346],[669,355],[735,356],[687,2],[685,2],[690,357],[688,358],[684,359],[686,360],[691,361],[693,362],[683,98],[613,363],[589,342],[682,342],[631,364],[681,98],[654,363],[714,342],[648,365],[602,366],[607,367],[659,368],[661,365],[640,369],[643,365],[619,370],[642,371],[650,372],[651,373],[647,374],[662,375],[649,376],[624,377],[670,378],[666,379],[667,380],[663,381],[641,382],[630,383],[634,384],[608,385],[638,386],[639,387],[635,388],[609,389],[620,390],[660,373],[603,391],[732,392],[734,392],[733,392],[730,2],[731,393],[668,2],[633,394],[623,395],[655,2],[727,396],[728,397],[729,322],[696,2],[726,322],[717,2],[644,2],[616,2],[692,398],[645,2],[595,322],[724,399],[622,400],[656,401],[621,402],[697,403],[636,2],[672,2],[673,404],[617,2],[637,2],[722,2],[591,98],[599,405],[596,2],[598,2],[489,406],[580,2],[583,407],[582,408],[559,2],[77,2],[78,2],[13,2],[14,2],[16,2],[15,2],[2,2],[17,2],[18,2],[19,2],[20,2],[21,2],[22,2],[23,2],[24,2],[3,2],[25,2],[26,2],[4,2],[27,2],[31,2],[28,2],[29,2],[30,2],[32,2],[33,2],[34,2],[5,2],[35,2],[36,2],[37,2],[38,2],[6,2],[42,2],[39,2],[40,2],[41,2],[43,2],[7,2],[44,2],[49,2],[50,2],[45,2],[46,2],[47,2],[48,2],[8,2],[54,2],[51,2],[52,2],[53,2],[55,2],[9,2],[56,2],[57,2],[58,2],[60,2],[59,2],[61,2],[62,2],[10,2],[63,2],[64,2],[65,2],[11,2],[66,2],[67,2],[68,2],[69,2],[70,2],[1,2],[71,2],[72,2],[12,2],[75,2],[74,2],[73,2],[76,2],[115,409],[127,410],[112,411],[128,191],[137,412],[103,413],[104,414],[102,415],[136,318],[131,416],[135,417],[106,418],[124,419],[105,420],[134,421],[100,422],[101,416],[107,423],[108,2],[114,424],[111,423],[98,425],[138,426],[129,427],[118,428],[117,423],[119,429],[122,430],[116,431],[120,432],[132,318],[109,433],[110,434],[123,435],[99,191],[126,436],[125,423],[113,434],[121,437],[130,2],[97,2],[133,438],[588,439],[612,440],[562,441],[563,442],[564,442],[561,2]],"affectedFilesPendingEmit":[774,770,740,741,742,579,737,743,747,748,749,569,750,751,739,738,753,754,755,756,736,584,585,574,578,577,576,757,575,745,746,767,744,768,752,553,555,556,557,560,562,563,564],"version":"5.7.3"}
````

## File: .gitignore
````
# Frontend
frontend/node_modules/
frontend/.next/
frontend/.env*
!frontend/.env.example

# Backend
farm_backend/__pycache__/
farm_backend/*.pyc
farm_backend/venv/
farm_backend/.venv/
farm_backend/.env

# System
.DS_Store
*.log
node_modules
````

## File: create_admin.py
````python
import os
import sqlite3
from app.core.security import hash_password

DB_PATH = "farm.db"

def fix_and_create_users():
    if not os.path.exists(DB_PATH):
        print(f"❌ Không tìm thấy file CSDL: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("🌱 Đang làm sạch dữ liệu Enum cũ và khởi tạo tài khoản...")

        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        if "employee_code" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN employee_code VARCHAR(50)")

        # 1. Sửa toàn bộ giá trị 'ADMIN' bị lỗi cũ thành 'MANAGER' trực tiếp trong CSDL
        cursor.execute("UPDATE users SET role = 'MANAGER' WHERE role = 'ADMIN'")

        # 2. Cấu hình danh sách tài khoản hợp lệ
        users = [
            ("NV-0001", "admin", "admin@farm.com", hash_password("admin123"), "ADMIN", "Quản Trị Viên Hệ Thống"),
            ("NV-0002", "kythuatvien", "kythuat@farm.com", hash_password("tech123"), "TECHNICIAN", "Kỹ Thuật Viên Canh Tác"),
            ("NV-0003", "nhanvien", "nhanvien@farm.com", hash_password("staff123"), "STAFF", "Nhân Viên Nông Trại"),
        ]

        # 3. Kiểm tra cấu trúc các cột trong bảng users
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]

        has_username = "username" in columns
        has_fullname = "full_name" in columns

        has_employee_code = "employee_code" in columns

        for employee_code, username, email, pwd_hash, role, full_name in users:
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()

            if row:
                # Nếu đã tồn tại -> Cập nhật
                if has_fullname:
                    cursor.execute(
                        "UPDATE users SET employee_code = ?, username = ?, role = ?, hashed_password = ?, full_name = ? WHERE email = ?",
                        (employee_code, username, role, pwd_hash, full_name, email),
                    )
                else:
                    cursor.execute(
                        "UPDATE users SET username = ?, role = ?, hashed_password = ? WHERE email = ?",
                        (username, role, pwd_hash, email),
                    )
                print(f"🔄 Đã cập nhật tài khoản: {email} [{role}]")
            else:
                # Nếu chưa có -> Tạo mới
                if has_employee_code and has_username and has_fullname:
                    cursor.execute(
                        "INSERT INTO users (employee_code, username, email, hashed_password, role, full_name) VALUES (?, ?, ?, ?, ?, ?)",
                        (employee_code, username, email, pwd_hash, role, full_name),
                    )
                elif has_username and has_fullname:
                    cursor.execute(
                        "INSERT INTO users (username, email, hashed_password, role, full_name) VALUES (?, ?, ?, ?, ?)",
                        (username, email, pwd_hash, role, full_name),
                    )
                elif has_username:
                    cursor.execute(
                        "INSERT INTO users (username, email, hashed_password, role) VALUES (?, ?, ?, ?)",
                        (username, email, pwd_hash, role),
                    )
                else:
                    cursor.execute(
                        "INSERT INTO users (email, hashed_password, role) VALUES (?, ?, ?)",
                        (email, pwd_hash, role),
                    )
                print(f"✅ Đã tạo mới tài khoản: {email} [{role}]")

        conn.commit()
        print("\n============================================")
        print("🎉 KHỞI TẠO TÀI KHOẢN PHÂN QUYỀN THÀNH CÔNG!")
        print("============================================")

    except Exception as e:
        conn.rollback()
        print(f"❌ Có lỗi xảy ra: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_and_create_users()
````

## File: package.json
````json
{
  "dependencies": {
    "axios": "^1.20.0",
    "recharts": "^3.10.1"
  },
  "devDependencies": {
    "@types/node": "^26.4.1",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.5"
  }
}
````

## File: quick_test.sh
````bash
#!/bin/bash
# Chạy sau khi server đã bật (uvicorn app.main:app --reload)
# Mục đích: đi qua toàn bộ luồng nghiệp vụ 1 lần, kết thúc bằng truy xuất nguồn gốc.
set -e
BASE="http://127.0.0.1:8000"

echo "1) Tạo giống cây..."
VARIETY_ID=$(curl -s -X POST $BASE/api/varieties -H "Content-Type: application/json" \
  -d '{"name":"Cai chip","category":"Rau an la","growth_duration_days":30}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  -> variety_id=$VARIETY_ID"

echo "2) Tạo lô đất..."
PLOT_ID=$(curl -s -X POST $BASE/api/plots -H "Content-Type: application/json" \
  -d '{"name":"Lo A1","area_m2":100,"location":"Khu 1","soil_type":"Dat thit"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  -> plot_id=$PLOT_ID"

echo "3) Tạo vật tư..."
SUPPLY_ID=$(curl -s -X POST $BASE/api/supplies -H "Content-Type: application/json" \
  -d '{"name":"Phan huu co","type":"phan_bon","unit":"kg","stock_quantity":100}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  -> supply_id=$SUPPLY_ID"

echo "4) Tạo lô trồng (batch_code + expected_harvest_date sẽ tự sinh)..."
BATCH_JSON=$(curl -s -X POST $BASE/api/batches -H "Content-Type: application/json" \
  -d "{\"plot_id\":$PLOT_ID,\"variety_id\":$VARIETY_ID,\"seeding_date\":\"2026-08-01\"}")
echo "  -> $BATCH_JSON"
BATCH_CODE=$(echo $BATCH_JSON | python3 -c "import sys,json;print(json.load(sys.stdin)['batch_code'])")
BATCH_ID=$(echo $BATCH_JSON | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo "5) Ghi nhật ký chăm sóc kèm dùng vật tư..."
curl -s -X POST $BASE/api/care-logs -H "Content-Type: application/json" \
  -d "{\"batch_id\":$BATCH_ID,\"log_type\":\"bon_phan\",\"description\":\"Bon phan dot 1\",\"conditions\":\"Nang nhe\",\"performed_at\":\"2026-08-05T08:00:00\",\"supplies_used\":[{\"supply_id\":$SUPPLY_ID,\"quantity_used\":5}]}" | python3 -m json.tool

echo "6) Ghi nhận thu hoạch..."
HARVEST_ID=$(curl -s -X POST $BASE/api/harvests -H "Content-Type: application/json" \
  -d "{\"batch_id\":$BATCH_ID,\"harvest_date\":\"2026-08-31\",\"quantity_kg\":20,\"quality_grade\":\"A\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  -> harvest_id=$HARVEST_ID"

echo "7) Ghi nhận bán hàng..."
curl -s -X POST $BASE/api/sales -H "Content-Type: application/json" \
  -d "{\"harvest_id\":$HARVEST_ID,\"customer_name\":\"Sieu thi Xanh\",\"quantity_kg\":15,\"unit_price\":25000,\"sale_date\":\"2026-09-01\"}" | python3 -m json.tool

echo "8) TRUY XUẤT NGUỒN GỐC theo batch_code=$BATCH_CODE ..."
curl -s $BASE/api/batches/code/$BATCH_CODE/trace | python3 -m json.tool

echo "9) [KT3] Gọi AI tóm tắt nhật ký cho batch_id=$BATCH_ID ..."
curl -s -X POST $BASE/api/ai/batches/$BATCH_ID/summary | python3 -m json.tool

echo "10) Tạo thêm 1 lô thứ 2 KHÔNG có nhật ký nào (để test xếp hạng có ý nghĩa)..."
BATCH2_JSON=$(curl -s -X POST $BASE/api/batches -H "Content-Type: application/json" \
  -d "{\"plot_id\":$PLOT_ID,\"variety_id\":$VARIETY_ID,\"seeding_date\":\"2026-08-01\"}")
echo "  -> $BATCH2_JSON"
BATCH2_ID=$(echo $BATCH2_JSON | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo "10b) Chuyển cả 2 lô sang status=growing (mặc định là planned, hàm gợi ý chỉ xét lô đang trồng)..."
curl -s -X PUT $BASE/api/batches/$BATCH_ID -H "Content-Type: application/json" -d '{"status":"growing"}' > /dev/null
curl -s -X PUT $BASE/api/batches/$BATCH2_ID -H "Content-Type: application/json" -d '{"status":"growing"}' > /dev/null
echo "  -> đã chuyển status"

echo "11) [KT3] Gọi AI gợi ý lô cần kiểm tra (toàn hệ thống) ..."
curl -s -X POST $BASE/api/ai/alerts | python3 -m json.tool

echo "12) [KT3] Gọi AI sinh lịch chăm sóc tham khảo cho batch_id=$BATCH_ID ..."
curl -s -X POST $BASE/api/ai/batches/$BATCH_ID/schedule | python3 -m json.tool

echo ""
echo "=== XONG - kiểm tra bước 9, 11, 12 (đủ 3 chức năng AI) có trả JSON hợp lệ, có disclaimer không ==="
````

## File: README.md
````markdown
# 🌾 HỆ THỐNG QUẢN LÝ TRANG TRẠI (FARM MANAGEMENT SYSTEM)

Dự án phát triển ứng dụng quản lý trang trại thông minh, hỗ trợ theo dõi lô đất, giống cây trồng, lô trồng, nhật ký canh tác và thu hoạch. Dự án được phát triển nhằm đáp ứng các tiêu chuẩn nghiệp vụ và kỹ thuật trong bài kiểm tra.

---

## 🏗️ Cấu Trúc Dự Án

Dự án được phân chia rõ ràng theo mô hình **Client - Server**:

```text
FARM_MANAGEMENT/
├── app/                  # BACKEND (FastAPI - Python)
│   ├── core/             # Cấu hình DB, Security, Settings
│   ├── models/           # ORM Database Models (SQLAlchemy)
│   ├── schemas/          # Pydantic Schemas (Validation)
│   ├── repositories/     # Tầng truy xuất dữ liệu (Data Access)
│   ├── services/         # Tầng xử lý logic nghiệp vụ (Business Logic)
│   ├── routers/          # Tầng định tuyến API (Endpoints)
│   └── main.py           # File khởi chạy server FastAPI
│
├── frontend/             # FRONTEND (Next.js - React & TypeScript)
│   ├── app/              # Next.js App Router (Pages, Layouts)
│   ├── components/       # Các UI Component tái sử dụng
│   ├── lib/              # API Fetcher, Types, Utilities
│   └── package.json      # Dependencies Frontend
│
├── docs/                 # TÀI LIỆU DỰ ÁN
│   ├── README.md         # Hướng dẫn cài đặt và vận hành
│   └── ai_prompts_log.md # Nhật ký Prompt AI & Kiểm thử
│
├── .env                  # Biến môi trường Backend
└── requirements.txt      # Thư viện Python Backend

🛠️ Công Nghệ Sử Dụng
Backend: Python 3.10+, FastAPI, SQLAlchemy, Pydantic, Uvicorn, SQLite/PostgreSQL.

Frontend: Next.js 14+ (TypeScript), Tailwind CSS, Lucide Icons, SWR.

Authentication: JWT (JSON Web Tokens), OAuth2 with Password Hashing (Bcrypt).
.

🚀 Hướng Dẫn Cài Đặt và Chạy Dự Án
1. Yêu cầu tiền đề (Prerequisites)
Python 3.10 trở lên

Node.js v18 trở lên & npm/yarn

2. Khởi chạy Backend (FastAPI)
Mở terminal tại thư mục gốc của dự án (FARM_BACKEND).

Kích hoạt môi trường ảo Python:
-Trên Windows: venv\Scripts\activate
-Trên macOS/Linux: source venv/bin/activate

Cài đặt các thư viện phụ thuộc:

pip install -r requirements.txt

Khởi chạy Uvicorn Server:

uvicorn app.main:app --
🌐 Backend sẽ chạy tại: http://127.0.0.1:8000

📖 Trang tài liệu API (Swagger UI): http://127.0.0.1:8000/docs

3. Khởi chạy Frontend (Next.js)

Mở một cửa sổ terminal mới và di chuyển vào thư mục frontend

cd frontend

Cài đặt các gói phụ thuộc (Dependencies):
npm install
Khởi chạy Server Development:
npm run dev

🌐 Frontend sẽ chạy tại: http://localhost:3000

🔐 Cấu Hình Biến Môi Trường (.env)
Tạo file .env ở thư mục gốc (hoặc tham khảo file .env.example):
# Backend Settings
SECRET_KEY=your_super_secret_jwt_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database Connection
DATABASE_URL=sqlite:///./farm.db
Và file frontend/.env.local:
NEXT_PUBLIC_API_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)

Xác thực & Phân quyền: Đăng nhập, đăng ký, bảo vệ API bằng JWT.

Quản lý Giống cây & Lô đất: Thêm, xem, sửa, xóa với ràng buộc chống trùng tên.

Quản lý Lô trồng: Theo dõi chu kỳ gieo trồng, trạng thái (Kế hoạch, Đang trồng, Đã thu hoạch).

Nhật ký canh tác & Thu hoạch: Ghi chép hoạt động hàng ngày và sản lượng thu hoạch.

Tìm kiếm & Báo cáo: Tìm kiếm linh hoạt, thống kê trực quan qua Dashboard.

Cảm ơn :}
````

## File: requirements.txt
````
fastapi>=0.115
uvicorn[standard]>=0.30
sqlalchemy>=2.0
pydantic>=2.9
passlib>=1.7.4
python-dotenv>=1.0
google-genai>=1.20
PyJWT>=2.8
cryptography>=42
````

## File: seed_db.py
````python
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.plot import Plot
from app.models.plant_variety import PlantVariety

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Tạo user
    user = User(username="admin", password_hash="hashed_pwd", full_name="Admin", role="quan_ly")
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"✓ Created user: {user.id}")

    # Tạo plot (lô đất)
    plot = Plot(name="Lô đất 1", area_m2=1000, location="Khu A", soil_type="đất tốt")
    db.add(plot)
    db.commit()
    db.refresh(plot)
    print(f"✓ Created plot: {plot.id}")

    # Tạo plant variety (giống cây)
    variety = PlantVariety(name="Bập cải", growth_duration_days=45, category="Rau lá")
    db.add(variety)
    db.commit()
    db.refresh(variety)
    print(f"✓ Created variety: {variety.id}")

    print("\n✓ Database seeding complete!")
finally:
    db.close()
````

## File: test_batch.py
````python
import requests
import json

payload = {
    "batch_name": "Test Batch",
    "plot_id": 1,
    "variety_id": 1,
    "seeding_date": "2026-08-15"
}

try:
    response = requests.post(
        "http://localhost:8000/api/batches",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Text: {response.text}")
    try:
        print(f"Response JSON: {json.dumps(response.json(), indent=2)}")
    except:
        print("(Response is not JSON)")
except Exception as e:
    print(f"Error: {e}")
````

## File: test_batch2.py
````python
import requests

payload = {
    'batch_name': 'Second Batch',
    'plot_id': 1,
    'variety_id': 1,
    'seeding_date': '2026-08-20'
}

r = requests.post('http://localhost:8000/api/batches', json=payload)
print(f'Status: {r.status_code}')
print(f'Batch Code: {r.json()["batch_code"]}')
print(f'Expected Harvest: {r.json()["expected_harvest_date"]}')
````

## File: test_list_batches.py
````python
import requests

r = requests.get('http://localhost:8000/api/batches')
print(f'Status: {r.status_code}')
print(f'Batches count: {len(r.json())}')
for batch in r.json():
    print(f'  - {batch["batch_code"]}: {batch["batch_name"]}')
````

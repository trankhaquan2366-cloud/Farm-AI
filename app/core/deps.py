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
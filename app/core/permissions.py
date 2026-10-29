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
    # Admin and manager have farm-wide management rights.
    "plots:read": ["admin", "manager", "technician", "staff"],
    "plots:create": ["admin", "manager"],
    "plots:update": ["admin", "manager"],
    "plots:delete": ["admin", "manager"],
    "plots:assign": ["admin", "manager"],

    "plant_varieties:read": ["admin", "manager", "technician", "staff"],
    "plant_varieties:create": ["admin", "manager"],
    "plant_varieties:update": ["admin", "manager"],
    "plant_varieties:delete": ["admin", "manager"],

    "crop_batches:read": ["admin", "manager", "technician", "staff"],
    "crop_batches:create": ["admin", "manager", "technician"],
    "crop_batches:update": ["admin", "manager", "technician"],
    "crop_batches:delete": ["admin", "manager", "technician"],

    "care_logs:read": ["admin", "manager", "technician", "staff"],
    "care_logs:create": ["admin", "manager", "technician", "staff"],
    "care_logs:update": ["admin", "manager", "technician"],
    "care_logs:approve": ["admin", "manager", "technician"],
    "care_logs:delete": ["admin", "manager", "technician"],

    "supplies:read": ["admin", "manager", "technician", "staff"],
    "supplies:report": ["admin", "manager", "technician", "staff"],
    "supplies:create": ["admin", "manager"],
    "supplies:update": ["admin", "manager"],
    "supplies:delete": ["admin", "manager"],
    "supplies:approve": ["admin", "manager"],

    "harvests:read": ["admin", "manager", "technician", "staff"],
    "harvests:create": ["admin", "manager", "technician"],
    "harvests:update": ["admin", "manager", "technician"],
    "harvests:delete": ["admin", "manager"],

    "traceability:read": ["admin", "manager", "technician", "staff"],
    "traceability:create": ["admin", "manager", "technician"],
    "ai:ask": ["admin", "manager", "technician", "staff"],
    "ai:schedule": ["admin", "manager", "technician"],

    "users:read": ["admin", "manager"],
    "users:create": ["admin", "manager"],
    "users:update": ["admin", "manager"],
    "users:delete": ["admin", "manager"],
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
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
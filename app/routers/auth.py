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
import re
import unicodedata
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user, RequireRole
from app.models.user import User, UserRole
from app.models.plot import Plot

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterSchema(BaseModel):
    employee_code: Optional[str] = Field(None, min_length=2, max_length=50)
    username: Optional[str] = Field(None, min_length=3, max_length=150)
    full_name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = UserRole.STAFF  # Mặc định tạo tài khoản Nhân viên
    plot_id: Optional[int] = Field(None, gt=0)


class AccountUpdateSchema(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=150)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    plot_id: Optional[int] = Field(None, gt=0)


class PasswordResetSchema(BaseModel):
    password: str = Field(..., min_length=6, max_length=128)


class PasswordChangeSchema(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)


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
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
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
            "role": user_role_str,  # Frontend uses this for permission-aware UI.
            "plot_id": user.plot_id,
        }
    }


# 2. API TẠO TÀI KHOẢN MỚI (Chỉ Quản lý MANAGER mới có quyền)
@router.post(
    "/register", 
    status_code=status.HTTP_201_CREATED, 
    dependencies=[Depends(RequireRole([UserRole.MANAGER, UserRole.ADMIN]))]
)
def register(
    payload: RegisterSchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    actor_role = str(current_user.get("role", "")).strip().lower()
    if actor_role == "manager" and payload.role in {UserRole.ADMIN, UserRole.MANAGER}:
        raise HTTPException(
            status_code=403,
            detail="Quản lý chỉ có thể tạo tài khoản Kỹ thuật viên hoặc Nhân viên.",
        )
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

    if payload.plot_id is not None and db.query(Plot).filter(Plot.id == payload.plot_id).first() is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô đất được chọn.")

    new_user = User(
        employee_code=employee_code,
        username=username,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        plot_id=payload.plot_id,
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
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        key: current_user.get(key)
        for key in ("id", "employee_code", "username", "full_name", "email", "role", "plot_id", "is_active")
    }


@router.post("/me/password")
def change_my_password(
    payload: PasswordChangeSchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.get("id")).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác.")
    if verify_password(payload.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại.")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Đã đổi mật khẩu thành công."}


@router.get(
    "/users",
    dependencies=[Depends(RequireRole([UserRole.MANAGER, UserRole.ADMIN]))],
)
def list_users(db: Session = Depends(get_db)):
    """Danh sách tài khoản để quản lý/admin theo dõi và quản lý nhân sự."""
    users = db.query(User).order_by(User.id.asc()).all()
    plots = {
        plot.id: plot.name
        for plot in db.query(Plot).filter(Plot.id.in_([user.plot_id for user in users if user.plot_id])).all()
    }
    return [
        {
            "id": user.id,
            "employee_code": user.employee_code,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "plot_id": user.plot_id,
            "is_active": user.is_active,
            "plot_name": plots.get(user.plot_id),
        }
        for user in users
    ]


def _get_managed_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
    return user


def _ensure_manageable_by(current_user: dict, user: User) -> None:
    actor_role = str(current_user.get("role", "")).strip().lower()
    target_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if actor_role != "admin" and str(target_role).strip().lower() in {"admin", "manager"}:
        raise HTTPException(
            status_code=403,
            detail="Chỉ Quản trị viên mới có thể quản lý tài khoản Quản trị viên hoặc Quản lý.",
        )


@router.put(
    "/users/{user_id}",
    dependencies=[Depends(RequireRole([UserRole.MANAGER, UserRole.ADMIN]))],
)
def update_user(
    user_id: int,
    payload: AccountUpdateSchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_managed_user_or_404(db, user_id)
    _ensure_manageable_by(current_user, user)
    changes = payload.model_dump(exclude_unset=True)
    if (
        str(current_user.get("role", "")).strip().lower() != "admin"
        and changes.get("role") in {UserRole.ADMIN, UserRole.MANAGER}
    ):
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên mới có thể phân quyền Quản lý.")

    if "full_name" in changes:
        full_name = changes["full_name"].strip()
        if not full_name:
            raise HTTPException(status_code=422, detail="Họ tên không được để trống.")
        username_conflict = db.query(User).filter(
            User.username == full_name,
            User.id != user_id,
        ).first()
        if username_conflict:
            raise HTTPException(status_code=400, detail="Tên đăng nhập đã được sử dụng.")
        user.full_name = full_name
        user.username = full_name

    if "email" in changes:
        email = str(changes["email"]).strip().lower()
        email_conflict = db.query(User).filter(
            User.email == email,
            User.id != user_id,
        ).first()
        if email_conflict:
            raise HTTPException(status_code=400, detail="Email đã được sử dụng.")
        user.email = email

    if "role" in changes and changes["role"] is not None:
        user.role = changes["role"]

    if "plot_id" in changes:
        plot_id = changes["plot_id"]
        if plot_id is not None:
            if db.query(Plot).filter(Plot.id == plot_id).first() is None:
                raise HTTPException(status_code=404, detail="Không tìm thấy lô đất được chọn.")
        user.plot_id = plot_id

    db.commit()
    db.refresh(user)
    return {"message": "Đã cập nhật tài khoản.", "user_id": user.id}


@router.post(
    "/users/{user_id}/reset-password",
    dependencies=[Depends(RequireRole([UserRole.MANAGER, UserRole.ADMIN]))],
)
def reset_user_password(
    user_id: int,
    payload: PasswordResetSchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_managed_user_or_404(db, user_id)
    _ensure_manageable_by(current_user, user)
    user.hashed_password = hash_password(payload.password)
    db.commit()
    return {"message": "Đã đặt lại mật khẩu."}


@router.patch(
    "/users/{user_id}/status",
    dependencies=[Depends(RequireRole([UserRole.MANAGER, UserRole.ADMIN]))],
)
def update_user_status(
    user_id: int,
    is_active: bool,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_managed_user_or_404(db, user_id)
    _ensure_manageable_by(current_user, user)
    if not is_active and user.email == current_user.get("sub"):
        raise HTTPException(status_code=400, detail="Bạn không thể khóa tài khoản đang sử dụng.")
    user.is_active = is_active
    db.commit()
    return {"message": "Đã cập nhật trạng thái tài khoản.", "is_active": user.is_active}


@router.delete(
    "/users/{user_id}",
    dependencies=[Depends(RequireRole([UserRole.MANAGER, UserRole.ADMIN]))],
)
def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_managed_user_or_404(db, user_id)
    _ensure_manageable_by(current_user, user)
    if user.email == current_user.get("sub"):
        raise HTTPException(status_code=400, detail="Bạn không thể xóa tài khoản đang sử dụng.")
    try:
        db.delete(user)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Không thể xóa tài khoản đang được tham chiếu bởi dữ liệu khác. Hãy khóa tài khoản thay thế.",
        ) from error
    return {"message": "Đã xóa tài khoản."}
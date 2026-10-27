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

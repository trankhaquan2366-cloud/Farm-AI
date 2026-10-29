from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import RequireRole
from app.models.user import UserRole
from app.schemas.user import UserCreate, UserOut
from app.services import user as service

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "",
    response_model=List[UserOut],
    dependencies=[Depends(RequireRole([UserRole.ADMIN, UserRole.MANAGER]))],
)
def list_users(db: Session = Depends(get_db)):
    return service.list_users(db)


@router.get(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(RequireRole([UserRole.ADMIN, UserRole.MANAGER]))],
)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return service.get_user_or_404(db, user_id)


@router.post(
    "",
    response_model=UserOut,
    status_code=201,
    dependencies=[Depends(RequireRole([UserRole.ADMIN, UserRole.MANAGER]))],
)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    return service.create_user(db, payload)


@router.delete(
    "/{user_id}",
    status_code=204,
    dependencies=[Depends(RequireRole([UserRole.ADMIN, UserRole.MANAGER]))],
)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    service.delete_user(db, user_id)

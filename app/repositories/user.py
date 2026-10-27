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

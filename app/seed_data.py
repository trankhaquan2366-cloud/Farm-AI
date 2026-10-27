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
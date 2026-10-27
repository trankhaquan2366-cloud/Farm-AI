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
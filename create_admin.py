"""Tạo/cập nhật bộ tài khoản dev trong SQLite.

Quy tắc an toàn:
- Mật khẩu lấy từ biến môi trường DEMO_PASSWORD, không hard-code.
- Khi DEBUG=False (mặc định), KHÔNG đặt lại mật khẩu của tài khoản đã tồn tại.
- Chỉ đặt/đổi mật khẩu khi tạo tài khoản mới hoặc khi DEBUG=True.
- Không in mật khẩu ra màn hình.
"""
import os
import sqlite3
import sys

from dotenv import load_dotenv

try:  # Console Windows (cp1252) không in được tiếng Việt nếu không đổi mã hóa.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001 - môi trường không hỗ trợ reconfigure
    pass

load_dotenv()

from app.core.security import hash_password

DB_PATH = os.getenv("DB_PATH", "farm.db")
DEBUG = os.getenv("DEBUG", "false").strip().lower() in {"1", "true", "yes", "on"}
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "").strip()

USERS = [
    ("NV-0001", "admin", "admin@farm.com", "ADMIN", "Quản Trị Viên Hệ Thống"),
    ("NV-0002", "kythuatvien", "kythuat@farm.com", "TECHNICIAN", "Kỹ Thuật Viên Canh Tác"),
    ("NV-0003", "nhanvien", "nhanvien@farm.com", "STAFF", "Nhân Viên Nông Trại"),
]


def _require_password() -> str:
    if not DEMO_PASSWORD:
        raise SystemExit(
            "Thiếu DEMO_PASSWORD. Đặt biến môi trường DEMO_PASSWORD trước khi tạo "
            "tài khoản (xem .env.example)."
        )
    return hash_password(DEMO_PASSWORD)


def fix_and_create_users():
    if not os.path.exists(DB_PATH):
        print(f"Không tìm thấy file CSDL: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Đang kiểm tra cấu trúc và khởi tạo tài khoản...")

        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        if "employee_code" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN employee_code VARCHAR(50)")

        # Không tự đổi role: trước đây đoạn UPDATE ADMIN -> MANAGER đã hạ quyền
        # toàn bộ tài khoản ADMIN khi chạy script. Nếu cần migration role, phải
        # làm bằng một script riêng có xác nhận, không chạy ngầm ở đây.

        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        has_username = "username" in columns
        has_fullname = "full_name" in columns
        has_employee_code = "employee_code" in columns

        password_hash = None
        for employee_code, username, email, role, full_name in USERS:
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()

            if row:
                # Tài khoản đã tồn tại: chỉ đổi mật khẩu khi DEBUG=True.
                if DEBUG:
                    password_hash = password_hash or _require_password()
                    cursor.execute(
                        "UPDATE users SET employee_code = ?, username = ?, role = ?, "
                        "hashed_password = ?, full_name = ? WHERE email = ?",
                        (employee_code, username, role, password_hash, full_name, email),
                    )
                    print(f"Đã cập nhật tài khoản (kèm mật khẩu vì DEBUG=True): {email} [{role}]")
                else:
                    cursor.execute(
                        "UPDATE users SET employee_code = ?, username = ?, role = ?, "
                        "full_name = ? WHERE email = ?",
                        (employee_code, username, role, full_name, email),
                    )
                    print(f"Đã cập nhật tài khoản (giữ nguyên mật khẩu): {email} [{role}]")
            else:
                password_hash = password_hash or _require_password()
                if has_employee_code and has_username and has_fullname:
                    cursor.execute(
                        "INSERT INTO users (employee_code, username, email, hashed_password, "
                        "role, full_name) VALUES (?, ?, ?, ?, ?, ?)",
                        (employee_code, username, email, password_hash, role, full_name),
                    )
                elif has_username and has_fullname:
                    cursor.execute(
                        "INSERT INTO users (username, email, hashed_password, role, full_name) "
                        "VALUES (?, ?, ?, ?, ?)",
                        (username, email, password_hash, role, full_name),
                    )
                elif has_username:
                    cursor.execute(
                        "INSERT INTO users (username, email, hashed_password, role) "
                        "VALUES (?, ?, ?, ?)",
                        (username, email, password_hash, role),
                    )
                else:
                    cursor.execute(
                        "INSERT INTO users (email, hashed_password, role) VALUES (?, ?, ?)",
                        (email, password_hash, role),
                    )
                print(f"Đã tạo mới tài khoản: {email} [{role}]")

        conn.commit()
        print("Hoàn tất. Mật khẩu không được in ra log.")
        return 0

    except Exception as exc:
        conn.rollback()
        print(f"Có lỗi xảy ra: {exc}")
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(fix_and_create_users())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite lưu vào 1 file duy nhất trong thư mục dự án -> dễ nộp bài, dễ demo trên máy khác
SQLALCHEMY_DATABASE_URL = "sqlite:///./farm.db"

# check_same_thread=False: SQLite mặc định chỉ cho 1 thread dùng chung 1 connection.
# FastAPI xử lý mỗi request trên 1 thread khác nhau -> bắt buộc phải tắt giới hạn này.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# SessionLocal là "nhà máy" tạo ra 1 phiên làm việc (session) với DB mỗi khi có request.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base là lớp cha mà MỌI model (bảng) trong app phải kế thừa.
Base = declarative_base()


def ensure_legacy_schema():
    """Bổ sung các cột mới cho SQLite hiện có mà không làm mất dữ liệu."""
    with engine.begin() as connection:
        columns = connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        column_names = {row[1] for row in columns}
        if columns and "employee_code" not in column_names:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN employee_code VARCHAR(50)"
            )
        supply_columns = connection.exec_driver_sql("PRAGMA table_info(supplies)").fetchall()
        supply_column_names = {row[1] for row in supply_columns}
        additions = {
            "code": "VARCHAR(50)",
            "category": "VARCHAR(50)",
            "min_threshold": "FLOAT NOT NULL DEFAULT 0",
            "location": "VARCHAR(150)",
            "status": "VARCHAR(30) NOT NULL DEFAULT 'active'",
        }
        for name, sql_type in additions.items():
            if supply_columns and name not in supply_column_names:
                connection.exec_driver_sql(f"ALTER TABLE supplies ADD COLUMN {name} {sql_type}")

        usage_columns = connection.exec_driver_sql("PRAGMA table_info(supply_usage)").fetchall()
        usage_column_names = {row[1] for row in usage_columns}
        for name, sql_type in {
            "used_at": "DATETIME",
            "notes": "VARCHAR(255)",
        }.items():
            if usage_columns and name not in usage_column_names:
                connection.exec_driver_sql(f"ALTER TABLE supply_usage ADD COLUMN {name} {sql_type}")


def get_db():
    """
    Dependency Injection của FastAPI
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
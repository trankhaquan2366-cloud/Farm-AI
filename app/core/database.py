from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import os

from dotenv import load_dotenv

# Đọc .env trước khi lấy DATABASE_URL để cấu hình trong .env cũng có hiệu lực.
load_dotenv()

# Cho phép trỏ sang CSDL khác (ví dụ bản demo sạch farm_demo.db) mà không sửa code.
# Mặc định vẫn là farm.db để không thay đổi hành vi cũ.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./farm.db")

# check_same_thread=False: SQLite mặc định chỉ cho 1 thread dùng chung 1 connection.
# FastAPI xử lý mỗi request trên 1 thread khác nhau -> bắt buộc phải tắt giới hạn này.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)


@event.listens_for(engine, "connect")
def _apply_sqlite_pragmas(dbapi_connection, _connection_record):
    """Tăng tốc đọc/ghi của SQLite mà không thay đổi dữ liệu trả về API."""
    cursor = dbapi_connection.cursor()
    try:
        # SQLite mặc định TẮT kiểm tra khóa ngoại; bật cho mọi kết nối để dữ liệu
        # không thể trỏ tới lô/vật tư/giống không tồn tại.
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-20000")  # ~20MB page cache
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA mmap_size=134217728")  # 128MB memory-mapped I/O
    finally:
        cursor.close()


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
        if columns and "plot_id" not in column_names:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN plot_id INTEGER REFERENCES plots(id) ON DELETE SET NULL"
            )
        if columns and "is_active" not in column_names:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"
            )
        supply_columns = connection.exec_driver_sql("PRAGMA table_info(supplies)").fetchall()
        supply_column_names = {row[1] for row in supply_columns}
        additions = {
            "code": "VARCHAR(50)",
            "category": "VARCHAR(50)",
            "min_threshold": "FLOAT NOT NULL DEFAULT 0",
            "location": "VARCHAR(150)",
            "usage_notes": "VARCHAR(2000)",
            "storage_notes": "VARCHAR(2000)",
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

        variety_columns = connection.exec_driver_sql(
            "PRAGMA table_info(plant_varieties)"
        ).fetchall()
        variety_column_names = {row[1] for row in variety_columns}
        variety_additions = {
            "supplier": "VARCHAR(150)",
            "germination_day": "INTEGER",
            "development_day": "INTEGER",
            "harvest_day": "INTEGER",
            "expected_yield_value": "FLOAT",
            "expected_yield_unit": "VARCHAR(20)",
            "suitable_seasons": "JSON NOT NULL DEFAULT '[]'",
            "ph_min": "FLOAT",
            "ph_max": "FLOAT",
            "temperature_min": "FLOAT",
            "temperature_max": "FLOAT",
            "air_humidity_min": "FLOAT",
            "air_humidity_max": "FLOAT",
            "soil_humidity_min": "FLOAT",
            "soil_humidity_max": "FLOAT",
            "status": "VARCHAR(30) NOT NULL DEFAULT 'active'",
            "description": "TEXT",
        }
        for name, sql_type in variety_additions.items():
            if variety_columns and name not in variety_column_names:
                connection.exec_driver_sql(
                    f"ALTER TABLE plant_varieties ADD COLUMN {name} {sql_type}"
                )

        plot_columns = connection.exec_driver_sql("PRAGMA table_info(plots)").fetchall()
        plot_column_names = {row[1] for row in plot_columns}
        plot_additions = {
            "cultivation_model": "VARCHAR(50)",
            "irrigation_systems": "JSON NOT NULL DEFAULT '[]'",
            "ph_current": "FLOAT",
            "ec_ms_cm": "FLOAT",
            "previous_crop": "VARCHAR(150)",
        }
        for name, sql_type in plot_additions.items():
            if plot_columns and name not in plot_column_names:
                connection.exec_driver_sql(
                    f"ALTER TABLE plots ADD COLUMN {name} {sql_type}"
                )

        batch_columns = connection.exec_driver_sql(
            "PRAGMA table_info(crop_batches)"
        ).fetchall()
        batch_column_names = {row[1] for row in batch_columns}
        batch_additions = {
            "planting_method": "VARCHAR(50)",
            "certification_standard": "VARCHAR(50)",
            "notes": "TEXT",
        }
        for name, sql_type in batch_additions.items():
            if batch_columns and name not in batch_column_names:
                connection.exec_driver_sql(
                    f"ALTER TABLE crop_batches ADD COLUMN {name} {sql_type}"
                )

        care_log_columns = connection.exec_driver_sql(
            "PRAGMA table_info(care_logs)"
        ).fetchall()
        care_log_column_names = {row[1] for row in care_log_columns}
        if care_log_columns and "quality_percent" not in care_log_column_names:
            connection.exec_driver_sql(
                "ALTER TABLE care_logs ADD COLUMN quality_percent FLOAT"
            )

        ai_suggestion_columns = connection.exec_driver_sql(
            "PRAGMA table_info(ai_suggestions)"
        ).fetchall()
        ai_suggestion_column_names = {row[1] for row in ai_suggestion_columns}
        if ai_suggestion_columns and "description" not in ai_suggestion_column_names:
            connection.exec_driver_sql(
                "ALTER TABLE ai_suggestions ADD COLUMN description TEXT"
            )

        _ensure_indexes(connection)


# Các cột được lọc / JOIN / ORDER BY thường xuyên. SQLite không tự tạo index cho
# khóa ngoại nên phải bổ sung thủ công cho CSDL đã tồn tại (create_all chỉ tạo
# index cho bảng mới). Dùng IF NOT EXISTS để chạy nhiều lần vẫn an toàn.
LEGACY_INDEXES = (
    ("ix_crop_batches_plot_id", "crop_batches", "plot_id"),
    ("ix_crop_batches_variety_id", "crop_batches", "variety_id"),
    ("ix_crop_batches_status", "crop_batches", "status"),
    ("ix_care_logs_crop_batch_id", "care_logs", "crop_batch_id"),
    ("ix_care_logs_action_type", "care_logs", "action_type"),
    ("ix_care_logs_log_date", "care_logs", "log_date"),
    ("ix_care_logs_created_at", "care_logs", "created_at"),
    ("ix_harvest_logs_batch_id", "harvest_logs", "batch_id"),
    ("ix_harvest_logs_harvest_time", "harvest_logs", "harvest_time"),
    ("ix_harvest_logs_qr_trace_code", "harvest_logs", "qr_trace_code"),
    ("ix_supplies_status", "supplies", "status"),
    ("ix_supply_imports_supply_id", "supply_imports", "supply_id"),
    ("ix_supply_imports_expiry_date", "supply_imports", "expiry_date"),
    ("ix_supply_usage_supply_id", "supply_usage", "supply_id"),
    ("ix_supply_usage_care_log_id", "supply_usage", "care_log_id"),
    ("ix_users_plot_id", "users", "plot_id"),
    ("ix_notifications_user_id", "notifications", "user_id"),
    ("ix_ai_suggestions_batch_id", "ai_suggestions", "batch_id"),
    ("ix_sales_harvest_id", "sales", "harvest_id"),
    ("ix_plots_status", "plots", "status"),
)


def _ensure_indexes(connection):
    for index_name, table_name, column_name in LEGACY_INDEXES:
        exists = connection.exec_driver_sql(
            "SELECT 1 FROM sqlite_master WHERE type='index' AND name=?", (index_name,)
        ).fetchone()
        if exists:
            continue
        table_info = connection.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
        if not table_info:
            continue
        if column_name not in {row[1] for row in table_info}:
            continue
        connection.exec_driver_sql(
            f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({column_name})"
        )


def get_db():
    """
    Dependency Injection của FastAPI
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
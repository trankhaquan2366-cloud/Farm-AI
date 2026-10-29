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


def get_db():
    """
    Dependency Injection của FastAPI
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
import os
import sys
from logging.config import fileConfig

from alembic import context

# 1. Thêm thư mục gốc vào Python Path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 2. Import engine và Base từ app.core.database
from app.core.database import Base, engine
from app.models.user import User

config = context.config

# 3. Nạp URL database tự động từ engine
config.set_main_option("sqlalchemy.url", str(engine.url))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,  # Đã thêm dấu phẩy ở đây
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
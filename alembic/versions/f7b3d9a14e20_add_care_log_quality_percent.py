"""Add measured quality percentage to care logs.

Revision ID: f7b3d9a14e20
Revises: d782a4e91c6b
Create Date: 2026-10-29 03:42:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7b3d9a14e20"
down_revision: Union[str, Sequence[str], None] = "d782a4e91c6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if "care_logs" not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns("care_logs")}


def upgrade() -> None:
    if "quality_percent" not in _existing_columns():
        op.add_column("care_logs", sa.Column("quality_percent", sa.Float(), nullable=True))


def downgrade() -> None:
    if "quality_percent" in _existing_columns():
        op.drop_column("care_logs", "quality_percent")

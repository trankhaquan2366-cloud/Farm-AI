"""Add planting method, standard, and notes to crop batches.

Revision ID: d782a4e91c6b
Revises: c4e8b6a1d2f3
Create Date: 2026-10-29 03:30:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d782a4e91c6b"
down_revision: Union[str, Sequence[str], None] = "c4e8b6a1d2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if "crop_batches" not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns("crop_batches")}


def upgrade() -> None:
    existing_columns = _existing_columns()
    if not existing_columns:
        return

    new_columns = (
        sa.Column("planting_method", sa.String(length=50), nullable=True),
        sa.Column("certification_standard", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    with op.batch_alter_table("crop_batches") as batch_op:
        for column in new_columns:
            if column.name not in existing_columns:
                batch_op.add_column(column)


def downgrade() -> None:
    existing_columns = _existing_columns()
    if not existing_columns:
        return

    with op.batch_alter_table("crop_batches") as batch_op:
        for name in ("notes", "certification_standard", "planting_method"):
            if name in existing_columns:
                batch_op.drop_column(name)

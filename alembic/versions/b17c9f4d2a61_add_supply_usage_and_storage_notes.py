"""Add usage and storage notes to supplies.

Revision ID: b17c9f4d2a61
Revises: f7b3d9a14e20
Create Date: 2026-10-29 04:30:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b17c9f4d2a61"
down_revision: Union[str, Sequence[str], None] = "f7b3d9a14e20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if "supplies" not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns("supplies")}


def upgrade() -> None:
    existing_columns = _existing_columns()
    if not existing_columns:
        return

    with op.batch_alter_table("supplies") as batch_op:
        for column in (
            sa.Column("usage_notes", sa.String(length=2000), nullable=True),
            sa.Column("storage_notes", sa.String(length=2000), nullable=True),
        ):
            if column.name not in existing_columns:
                batch_op.add_column(column)


def downgrade() -> None:
    existing_columns = _existing_columns()
    if not existing_columns:
        return

    with op.batch_alter_table("supplies") as batch_op:
        for name in ("storage_notes", "usage_notes"):
            if name in existing_columns:
                batch_op.drop_column(name)

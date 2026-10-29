"""Add infrastructure and soil sensor data to plots.

Revision ID: c4e8b6a1d2f3
Revises: a91d2c7e4f60
Create Date: 2026-11-18 00:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4e8b6a1d2f3"
down_revision: Union[str, Sequence[str], None] = "a91d2c7e4f60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if "plots" not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns("plots")}


def upgrade() -> None:
    existing_columns = _existing_columns()
    if not existing_columns:
        return

    new_columns = (
        sa.Column("cultivation_model", sa.String(length=50), nullable=True),
        sa.Column(
            "irrigation_systems",
            sa.JSON(),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column("ph_current", sa.Float(), nullable=True),
        sa.Column("ec_ms_cm", sa.Float(), nullable=True),
        sa.Column("previous_crop", sa.String(length=150), nullable=True),
    )
    with op.batch_alter_table("plots") as batch_op:
        for column in new_columns:
            if column.name not in existing_columns:
                batch_op.add_column(column)


def downgrade() -> None:
    existing_columns = _existing_columns()
    if not existing_columns:
        return

    with op.batch_alter_table("plots") as batch_op:
        for name in (
            "previous_crop",
            "ec_ms_cm",
            "ph_current",
            "irrigation_systems",
            "cultivation_model",
        ):
            if name in existing_columns:
                batch_op.drop_column(name)

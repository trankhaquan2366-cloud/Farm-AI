"""Add growing and sensor target data to plant varieties.

Revision ID: a91d2c7e4f60
Revises: 48c254cd80ae
Create Date: 2026-10-29 02:35:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a91d2c7e4f60"
down_revision: Union[str, Sequence[str], None] = "48c254cd80ae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    existing_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("plant_varieties")
    }
    new_columns = (
        sa.Column("supplier", sa.String(length=150), nullable=True),
        sa.Column("germination_day", sa.Integer(), nullable=True),
        sa.Column("development_day", sa.Integer(), nullable=True),
        sa.Column("harvest_day", sa.Integer(), nullable=True),
        sa.Column("expected_yield_value", sa.Float(), nullable=True),
        sa.Column("expected_yield_unit", sa.String(length=20), nullable=True),
        sa.Column(
            "suitable_seasons",
            sa.JSON(),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column("ph_min", sa.Float(), nullable=True),
        sa.Column("ph_max", sa.Float(), nullable=True),
        sa.Column("temperature_min", sa.Float(), nullable=True),
        sa.Column("temperature_max", sa.Float(), nullable=True),
        sa.Column("air_humidity_min", sa.Float(), nullable=True),
        sa.Column("air_humidity_max", sa.Float(), nullable=True),
        sa.Column("soil_humidity_min", sa.Float(), nullable=True),
        sa.Column("soil_humidity_max", sa.Float(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=30),
            server_default="active",
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
    )
    with op.batch_alter_table("plant_varieties") as batch_op:
        for column in new_columns:
            if column.name not in existing_columns:
                batch_op.add_column(column)


def downgrade() -> None:
    existing_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("plant_varieties")
    }
    new_column_names = (
        "description",
        "status",
        "soil_humidity_max",
        "soil_humidity_min",
        "air_humidity_max",
        "air_humidity_min",
        "temperature_max",
        "temperature_min",
        "ph_max",
        "ph_min",
        "suitable_seasons",
        "expected_yield_unit",
        "expected_yield_value",
        "harvest_day",
        "development_day",
        "germination_day",
        "supplier",
    )
    with op.batch_alter_table("plant_varieties") as batch_op:
        for name in new_column_names:
            if name in existing_columns:
                batch_op.drop_column(name)

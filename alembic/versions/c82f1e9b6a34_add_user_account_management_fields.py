"""Add user account status and assigned plot.

Revision ID: c82f1e9b6a34
Revises: b17c9f4d2a61
Create Date: 2026-10-29 04:54:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c82f1e9b6a34"
down_revision: Union[str, Sequence[str], None] = "b17c9f4d2a61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _user_columns() -> set[str]:
    if "users" not in _tables():
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}


def upgrade() -> None:
    if not _user_columns():
        return

    columns = _user_columns()
    with op.batch_alter_table("users") as batch_op:
        if "plot_id" not in columns:
            batch_op.add_column(sa.Column("plot_id", sa.Integer(), nullable=True))
            if "plots" in _tables():
                batch_op.create_foreign_key(
                    "fk_users_plot_id_plots",
                    "plots",
                    ["plot_id"],
                    ["id"],
                    ondelete="SET NULL",
                )
        if "is_active" not in columns:
            batch_op.add_column(
                sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true())
            )


def downgrade() -> None:
    columns = _user_columns()
    if not columns:
        return

    foreign_keys = sa.inspect(op.get_bind()).get_foreign_keys("users")
    has_plot_fk = any(
        foreign_key.get("name") == "fk_users_plot_id_plots"
        for foreign_key in foreign_keys
    )
    with op.batch_alter_table("users") as batch_op:
        if has_plot_fk:
            batch_op.drop_constraint("fk_users_plot_id_plots", type_="foreignkey")
        if "is_active" in columns:
            batch_op.drop_column("is_active")
        if "plot_id" in columns:
            batch_op.drop_column("plot_id")

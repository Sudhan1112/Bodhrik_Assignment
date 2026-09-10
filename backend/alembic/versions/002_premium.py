"""premium marketplace schema

Revision ID: 002_premium
Revises: 001_initial
Create Date: 2026-09-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_premium"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("cover_url", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("category", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("review_summary", sa.Text(), nullable=True))

    op.create_table(
        "services",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("duration_minutes > 0", name="ck_services_duration_positive"),
        sa.CheckConstraint("price_cents >= 0", name="ck_services_price_nonneg"),
        sa.ForeignKeyConstraint(["provider_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_services_provider_id", "services", ["provider_id"])

    op.create_table(
        "availability_rules",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.CheckConstraint("weekday >= 0 AND weekday <= 6", name="ck_availability_weekday"),
        sa.CheckConstraint("end_time > start_time", name="ck_availability_end_after_start"),
        sa.ForeignKeyConstraint(["provider_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_availability_provider_weekday",
        "availability_rules",
        ["provider_id", "weekday"],
    )

    op.add_column("bookings", sa.Column("service_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_bookings_service_id",
        "bookings",
        "services",
        ["service_id"],
        ["id"],
    )

    op.add_column("reviews", sa.Column("provider_reply", sa.Text(), nullable=True))
    op.add_column("reviews", sa.Column("replied_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("reviews", "replied_at")
    op.drop_column("reviews", "provider_reply")
    op.drop_constraint("fk_bookings_service_id", "bookings", type_="foreignkey")
    op.drop_column("bookings", "service_id")
    op.drop_index("ix_availability_provider_weekday", table_name="availability_rules")
    op.drop_table("availability_rules")
    op.drop_index("ix_services_provider_id", table_name="services")
    op.drop_table("services")
    op.drop_column("users", "review_summary")
    op.drop_column("users", "category")
    op.drop_column("users", "city")
    op.drop_column("users", "cover_url")
    op.drop_column("users", "avatar_url")

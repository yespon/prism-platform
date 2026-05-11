"""add_platform_announcements

Revision ID: b1c2d3e4f5a6
Revises: e4a1b7c9d210
Create Date: 2026-04-07 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: str | Sequence[str] | None = "e4a1b7c9d210"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "platform_announcements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("scope", sa.String(), nullable=False),
        sa.Column("target_roles_json", sa.JSON(), nullable=False),
        sa.Column("target_tenant_ids_json", sa.JSON(), nullable=False),
        sa.Column("publish_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expire_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pinned_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_platform_announcements_type", "platform_announcements", ["type"], unique=False)
    op.create_index("ix_platform_announcements_severity", "platform_announcements", ["severity"], unique=False)
    op.create_index("ix_platform_announcements_scope", "platform_announcements", ["scope"], unique=False)
    op.create_index("ix_platform_announcements_publish_at", "platform_announcements", ["publish_at"], unique=False)
    op.create_index("ix_platform_announcements_expire_at", "platform_announcements", ["expire_at"], unique=False)
    op.create_index("ix_platform_announcements_status", "platform_announcements", ["status"], unique=False)
    op.create_index("ix_platform_announcements_created_by", "platform_announcements", ["created_by"], unique=False)

    op.create_table(
        "platform_announcement_reads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("announcement_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("announcement_id", "user_id", "tenant_id", name="uq_announcement_read_user_tenant"),
    )
    op.create_index(
        "ix_platform_announcement_reads_announcement_id",
        "platform_announcement_reads",
        ["announcement_id"],
        unique=False,
    )
    op.create_index("ix_platform_announcement_reads_user_id", "platform_announcement_reads", ["user_id"], unique=False)
    op.create_index(
        "ix_platform_announcement_reads_tenant_id",
        "platform_announcement_reads",
        ["tenant_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_platform_announcement_reads_tenant_id", table_name="platform_announcement_reads")
    op.drop_index("ix_platform_announcement_reads_user_id", table_name="platform_announcement_reads")
    op.drop_index("ix_platform_announcement_reads_announcement_id", table_name="platform_announcement_reads")
    op.drop_table("platform_announcement_reads")

    op.drop_index("ix_platform_announcements_created_by", table_name="platform_announcements")
    op.drop_index("ix_platform_announcements_status", table_name="platform_announcements")
    op.drop_index("ix_platform_announcements_expire_at", table_name="platform_announcements")
    op.drop_index("ix_platform_announcements_publish_at", table_name="platform_announcements")
    op.drop_index("ix_platform_announcements_scope", table_name="platform_announcements")
    op.drop_index("ix_platform_announcements_severity", table_name="platform_announcements")
    op.drop_index("ix_platform_announcements_type", table_name="platform_announcements")
    op.drop_table("platform_announcements")

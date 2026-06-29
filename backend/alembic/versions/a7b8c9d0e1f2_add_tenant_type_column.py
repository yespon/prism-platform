"""add_tenant_type_column

Revision ID: a7b8c9d0e1f2
Revises: ef71a511e35d
Create Date: 2026-06-29 01:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: str | Sequence[str] | None = "3efa3d189b85"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tenants",
        sa.Column(
            "tenant_type",
            sa.String(),
            nullable=False,
            server_default="ops",
        ),
    )
    op.create_index("ix_tenants_tenant_type", "tenants", ["tenant_type"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tenants_tenant_type", table_name="tenants")
    op.drop_column("tenants", "tenant_type")

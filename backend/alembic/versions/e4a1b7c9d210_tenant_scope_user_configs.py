"""tenant_scope_user_configs

Revision ID: e4a1b7c9d210
Revises: 9d1a6b2f4c33
Create Date: 2026-03-31 23:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4a1b7c9d210"
down_revision: str | Sequence[str] | None = "9d1a6b2f4c33"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("user_configs") as batch_op:
        batch_op.add_column(sa.Column("tenant_id", sa.String(), nullable=True))
        batch_op.create_index("ix_user_configs_tenant_id", ["tenant_id"], unique=False)
        batch_op.drop_index("ix_user_configs_user_id")
        batch_op.create_index("ix_user_configs_user_id", ["user_id"], unique=False)
        batch_op.create_unique_constraint("uq_user_configs_tenant_user", ["tenant_id", "user_id"])


def downgrade() -> None:
    with op.batch_alter_table("user_configs") as batch_op:
        batch_op.drop_constraint("uq_user_configs_tenant_user", type_="unique")
        batch_op.drop_index("ix_user_configs_user_id")
        batch_op.create_index("ix_user_configs_user_id", ["user_id"], unique=True)
        batch_op.drop_index("ix_user_configs_tenant_id")
        batch_op.drop_column("tenant_id")

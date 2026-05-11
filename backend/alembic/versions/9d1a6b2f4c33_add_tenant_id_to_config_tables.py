"""add_tenant_id_to_config_tables

Revision ID: 9d1a6b2f4c33
Revises: 2a6f7d3c9e11
Create Date: 2026-03-31 20:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9d1a6b2f4c33"
down_revision: str | Sequence[str] | None = "2a6f7d3c9e11"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tenant_model_configs") as batch_op:
        batch_op.add_column(sa.Column("tenant_id", sa.String(), nullable=True))
        batch_op.create_index("ix_tenant_model_configs_tenant_id", ["tenant_id"], unique=False)
        batch_op.drop_constraint("uq_tenant_model_user_name", type_="unique")
        batch_op.create_unique_constraint("uq_tenant_model_tenant_user_name", ["tenant_id", "user_id", "name"])

    with op.batch_alter_table("tenant_mcp_servers") as batch_op:
        batch_op.add_column(sa.Column("tenant_id", sa.String(), nullable=True))
        batch_op.create_index("ix_tenant_mcp_servers_tenant_id", ["tenant_id"], unique=False)
        batch_op.drop_constraint("uq_tenant_mcp_user_name", type_="unique")
        batch_op.create_unique_constraint("uq_tenant_mcp_tenant_user_name", ["tenant_id", "user_id", "name"])

    with op.batch_alter_table("tenant_skills") as batch_op:
        batch_op.add_column(sa.Column("tenant_id", sa.String(), nullable=True))
        batch_op.create_index("ix_tenant_skills_tenant_id", ["tenant_id"], unique=False)
        batch_op.drop_constraint("uq_tenant_skill_user_name", type_="unique")
        batch_op.create_unique_constraint("uq_tenant_skill_tenant_user_name", ["tenant_id", "user_id", "name"])


def downgrade() -> None:
    with op.batch_alter_table("tenant_skills") as batch_op:
        batch_op.drop_constraint("uq_tenant_skill_tenant_user_name", type_="unique")
        batch_op.create_unique_constraint("uq_tenant_skill_user_name", ["user_id", "name"])
        batch_op.drop_index("ix_tenant_skills_tenant_id")
        batch_op.drop_column("tenant_id")

    with op.batch_alter_table("tenant_mcp_servers") as batch_op:
        batch_op.drop_constraint("uq_tenant_mcp_tenant_user_name", type_="unique")
        batch_op.create_unique_constraint("uq_tenant_mcp_user_name", ["user_id", "name"])
        batch_op.drop_index("ix_tenant_mcp_servers_tenant_id")
        batch_op.drop_column("tenant_id")

    with op.batch_alter_table("tenant_model_configs") as batch_op:
        batch_op.drop_constraint("uq_tenant_model_tenant_user_name", type_="unique")
        batch_op.create_unique_constraint("uq_tenant_model_user_name", ["user_id", "name"])
        batch_op.drop_index("ix_tenant_model_configs_tenant_id")
        batch_op.drop_column("tenant_id")

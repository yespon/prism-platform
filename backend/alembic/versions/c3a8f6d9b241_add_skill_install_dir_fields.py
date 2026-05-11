"""add_skill_install_dir_fields

Revision ID: c3a8f6d9b241
Revises: 7f5db0a1c2d1
Create Date: 2026-03-26 21:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3a8f6d9b241"
down_revision: str | Sequence[str] | None = "7f5db0a1c2d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("tenant_skills")}

    if "category" not in existing_columns:
        op.add_column("tenant_skills", sa.Column("category", sa.String(), nullable=False, server_default="custom"))
    if "relative_path" not in existing_columns:
        op.add_column("tenant_skills", sa.Column("relative_path", sa.String(), nullable=False, server_default=""))
    if "install_dir" not in existing_columns:
        op.add_column("tenant_skills", sa.Column("install_dir", sa.String(), nullable=False, server_default=""))

    bind.execute(
        sa.text(
            """
            UPDATE tenant_skills
            SET relative_path = CASE
                WHEN relative_path = '' THEN name
                ELSE relative_path
            END
            """
        )
    )


def downgrade() -> None:
    op.drop_column("tenant_skills", "install_dir")
    op.drop_column("tenant_skills", "relative_path")
    op.drop_column("tenant_skills", "category")

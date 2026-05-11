"""add_normalized_tenant_config_tables

Revision ID: 7f5db0a1c2d1
Revises: 0ccb23cdfd00
Create Date: 2026-03-26 20:10:00.000000

"""

import json
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7f5db0a1c2d1"
down_revision: str | Sequence[str] | None = "0ccb23cdfd00"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _to_dict(raw):
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _extract_models(app_payload):
    models = app_payload.get("models") if isinstance(app_payload, dict) else []
    if not isinstance(models, list):
        return []

    rows = []
    for model in models:
        if not isinstance(model, dict):
            continue
        name = str(model.get("name", "")).strip()
        model_name = str(model.get("model", "")).strip()
        if not name or not model_name:
            continue
        rows.append(
            {
                "name": name,
                "model": model_name,
                "use": str(model.get("use", "") or ""),
                "display_name": model.get("display_name"),
                "description": model.get("description"),
                "supports_thinking": bool(model.get("supports_thinking", False)),
                "supports_reasoning_effort": bool(model.get("supports_reasoning_effort", False)),
                "supports_vision": bool(model.get("supports_vision", False)),
                "settings": model,
            }
        )
    return rows


def _extract_mcp(ext_payload):
    mcp = ext_payload.get("mcpServers") if isinstance(ext_payload, dict) else {}
    if not isinstance(mcp, dict):
        return []

    rows = []
    for name, server in mcp.items():
        if not isinstance(server, dict):
            continue
        rows.append(
            {
                "name": name,
                "enabled": bool(server.get("enabled", True)),
                "transport_type": str(server.get("type", "stdio")),
                "command": server.get("command"),
                "args": server.get("args") if isinstance(server.get("args"), list) else [],
                "env": server.get("env") if isinstance(server.get("env"), dict) else {},
                "url": server.get("url"),
                "headers": server.get("headers") if isinstance(server.get("headers"), dict) else {},
                "oauth": server.get("oauth") if isinstance(server.get("oauth"), dict) else None,
                "description": str(server.get("description", "")),
            }
        )
    return rows


def _extract_skills(ext_payload):
    skills = ext_payload.get("skills") if isinstance(ext_payload, dict) else {}
    if not isinstance(skills, dict):
        return []

    rows = []
    for name, cfg in skills.items():
        enabled = bool(cfg.get("enabled", True)) if isinstance(cfg, dict) else True
        rows.append({"name": name, "enabled": enabled})
    return rows


def upgrade() -> None:
    op.create_table(
        "tenant_model_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("use", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("supports_thinking", sa.Boolean(), nullable=False),
        sa.Column("supports_reasoning_effort", sa.Boolean(), nullable=False),
        sa.Column("supports_vision", sa.Boolean(), nullable=False),
        sa.Column("settings", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_tenant_model_user_name"),
    )
    op.create_index("ix_tenant_model_configs_user_id", "tenant_model_configs", ["user_id"], unique=False)
    op.create_index("ix_tenant_model_configs_name", "tenant_model_configs", ["name"], unique=False)

    op.create_table(
        "tenant_mcp_servers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("transport_type", sa.String(), nullable=False),
        sa.Column("command", sa.String(), nullable=True),
        sa.Column("args", sa.JSON(), nullable=False),
        sa.Column("env", sa.JSON(), nullable=False),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("headers", sa.JSON(), nullable=False),
        sa.Column("oauth", sa.JSON(), nullable=True),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_tenant_mcp_user_name"),
    )
    op.create_index("ix_tenant_mcp_servers_user_id", "tenant_mcp_servers", ["user_id"], unique=False)
    op.create_index("ix_tenant_mcp_servers_name", "tenant_mcp_servers", ["name"], unique=False)

    op.create_table(
        "tenant_skills",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_tenant_skill_user_name"),
    )
    op.create_index("ix_tenant_skills_user_id", "tenant_skills", ["user_id"], unique=False)
    op.create_index("ix_tenant_skills_name", "tenant_skills", ["name"], unique=False)

    bind = op.get_bind()
    tenant_model_table = sa.table(
        "tenant_model_configs",
        sa.column("user_id", sa.String),
        sa.column("name", sa.String),
        sa.column("model", sa.String),
        sa.column("use", sa.String),
        sa.column("display_name", sa.String),
        sa.column("description", sa.String),
        sa.column("supports_thinking", sa.Boolean),
        sa.column("supports_reasoning_effort", sa.Boolean),
        sa.column("supports_vision", sa.Boolean),
        sa.column("settings", sa.JSON),
    )
    tenant_mcp_table = sa.table(
        "tenant_mcp_servers",
        sa.column("user_id", sa.String),
        sa.column("name", sa.String),
        sa.column("enabled", sa.Boolean),
        sa.column("transport_type", sa.String),
        sa.column("command", sa.String),
        sa.column("args", sa.JSON),
        sa.column("env", sa.JSON),
        sa.column("url", sa.String),
        sa.column("headers", sa.JSON),
        sa.column("oauth", sa.JSON),
        sa.column("description", sa.String),
    )
    tenant_skill_table = sa.table(
        "tenant_skills",
        sa.column("user_id", sa.String),
        sa.column("name", sa.String),
        sa.column("enabled", sa.Boolean),
    )

    rows = bind.execute(sa.text("SELECT user_id, app_config, extensions_config FROM user_configs")).fetchall()

    for row in rows:
        user_id = row[0]
        app_payload = _to_dict(row[1])
        ext_payload = _to_dict(row[2])

        for model in _extract_models(app_payload):
            bind.execute(tenant_model_table.insert().values(user_id=user_id, **model))

        for mcp in _extract_mcp(ext_payload):
            bind.execute(tenant_mcp_table.insert().values(user_id=user_id, **mcp))

        for skill in _extract_skills(ext_payload):
            bind.execute(tenant_skill_table.insert().values(user_id=user_id, **skill))


def downgrade() -> None:
    op.drop_index("ix_tenant_skills_name", table_name="tenant_skills")
    op.drop_index("ix_tenant_skills_user_id", table_name="tenant_skills")
    op.drop_table("tenant_skills")

    op.drop_index("ix_tenant_mcp_servers_name", table_name="tenant_mcp_servers")
    op.drop_index("ix_tenant_mcp_servers_user_id", table_name="tenant_mcp_servers")
    op.drop_table("tenant_mcp_servers")

    op.drop_index("ix_tenant_model_configs_name", table_name="tenant_model_configs")
    op.drop_index("ix_tenant_model_configs_user_id", table_name="tenant_model_configs")
    op.drop_table("tenant_model_configs")

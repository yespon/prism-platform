from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel, select

from deerflow.database.models import UserConfig
from deerflow.database.secrets_crypto import (
    decrypt_app_payload,
    decrypt_extensions_payload,
    encrypt_app_payload,
    encrypt_extensions_payload,
)
from deerflow.database.user_config_service import (
    create_user_model,
    get_user_payloads,
    replace_user_mcp_servers,
)


@pytest.fixture()
async def tenant_first_db(monkeypatch, tmp_path: Path):
    db_file = tmp_path / "tenant-first-config.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_file}", future=True)

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)

    import deerflow.database.user_config_service as user_config_service

    monkeypatch.setattr(user_config_service, "get_session_factory", lambda: factory)
    try:
        yield factory
    finally:
        await engine.dispose()


@pytest.mark.anyio
async def test_tenant_scoped_model_is_tenant_first_and_keeps_legacy_clean(tenant_first_db, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DEERFLOW_TENANT_CONFIG_STRICT", "false")
    user_id = "user-tenant-first-model"

    async with tenant_first_db() as session:
        session.add(
            UserConfig(
                user_id=user_id,
                app_config=encrypt_app_payload(
                    {
                        "models": [
                            {
                                "name": "legacy-model",
                                "model": "gpt-legacy",
                                "use": "langchain_openai.ChatOpenAI",
                            }
                        ]
                    }
                ),
                extensions_config=encrypt_extensions_payload({"mcpServers": {}, "skills": {}}),
            )
        )
        await session.commit()

    await create_user_model(
        user_id=user_id,
        model_payload={
            "name": "tenant-model",
            "model": "gpt-tenant",
            "use": "langchain_openai.ChatOpenAI",
        },
        tenant_id="tenant-a",
    )

    async with tenant_first_db() as session:
        row = await session.scalar(
            select(UserConfig).where(UserConfig.user_id == user_id, UserConfig.tenant_id.is_(None))
        )
        assert row is not None
        legacy_app = decrypt_app_payload(dict(row.app_config or {}))
        legacy_models = legacy_app.get("models") if isinstance(legacy_app.get("models"), list) else []
        assert len(legacy_models) == 1
        assert legacy_models[0].get("name") == "legacy-model"

    tenant_a_app, _ = await get_user_payloads(user_id, tenant_id="tenant-a")
    tenant_a_models = tenant_a_app.get("models") if isinstance(tenant_a_app.get("models"), list) else []
    assert [model.get("name") for model in tenant_a_models] == ["tenant-model"]

    tenant_b_app, _ = await get_user_payloads(user_id, tenant_id="tenant-b")
    tenant_b_models = tenant_b_app.get("models") if isinstance(tenant_b_app.get("models"), list) else []
    assert [model.get("name") for model in tenant_b_models] == ["legacy-model"]


@pytest.mark.anyio
async def test_tenant_scoped_mcp_is_tenant_first_and_keeps_legacy_clean(tenant_first_db, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DEERFLOW_TENANT_CONFIG_STRICT", "false")
    user_id = "user-tenant-first-mcp"

    async with tenant_first_db() as session:
        session.add(
            UserConfig(
                user_id=user_id,
                app_config=encrypt_app_payload({"models": []}),
                extensions_config=encrypt_extensions_payload(
                    {
                        "mcpServers": {
                            "legacy-mcp": {
                                "enabled": True,
                                "type": "stdio",
                                "command": "legacy-cmd",
                                "args": [],
                                "env": {},
                                "description": "legacy",
                            }
                        },
                        "skills": {},
                    }
                ),
            )
        )
        await session.commit()

    await replace_user_mcp_servers(
        user_id=user_id,
        mcp_servers={
            "tenant-mcp": {
                "enabled": True,
                "type": "stdio",
                "command": "tenant-cmd",
                "args": [],
                "env": {},
                "description": "tenant",
            }
        },
        tenant_id="tenant-a",
    )

    async with tenant_first_db() as session:
        row = await session.scalar(
            select(UserConfig).where(UserConfig.user_id == user_id, UserConfig.tenant_id.is_(None))
        )
        assert row is not None
        legacy_ext = decrypt_extensions_payload(dict(row.extensions_config or {}))
        legacy_mcp = legacy_ext.get("mcpServers") if isinstance(legacy_ext.get("mcpServers"), dict) else {}
        assert "legacy-mcp" in legacy_mcp
        assert "tenant-mcp" not in legacy_mcp

    _, tenant_a_ext = await get_user_payloads(user_id, tenant_id="tenant-a")
    tenant_a_mcp = tenant_a_ext.get("mcpServers") if isinstance(tenant_a_ext.get("mcpServers"), dict) else {}
    assert set(tenant_a_mcp.keys()) == {"tenant-mcp"}

    _, tenant_b_ext = await get_user_payloads(user_id, tenant_id="tenant-b")
    tenant_b_mcp = tenant_b_ext.get("mcpServers") if isinstance(tenant_b_ext.get("mcpServers"), dict) else {}
    assert "legacy-mcp" in tenant_b_mcp


@pytest.mark.anyio
async def test_tenant_config_strict_mode_disables_cross_tenant_fallback(
    tenant_first_db,
    monkeypatch: pytest.MonkeyPatch,
):
    user_id = "user-tenant-first-strict"

    async with tenant_first_db() as session:
        session.add(
            UserConfig(
                user_id=user_id,
                app_config=encrypt_app_payload(
                    {
                        "models": [
                            {
                                "name": "legacy-model",
                                "model": "gpt-legacy",
                                "use": "langchain_openai.ChatOpenAI",
                            }
                        ]
                    }
                ),
                extensions_config=encrypt_extensions_payload(
                    {
                        "mcpServers": {
                            "legacy-mcp": {
                                "enabled": True,
                                "type": "stdio",
                                "command": "legacy-cmd",
                                "args": [],
                                "env": {},
                            }
                        },
                        "skills": {},
                    }
                ),
            )
        )
        await session.commit()

    monkeypatch.setenv("DEERFLOW_TENANT_CONFIG_STRICT", "true")

    tenant_b_app, tenant_b_ext = await get_user_payloads(user_id, tenant_id="tenant-b")
    tenant_b_models = tenant_b_app.get("models") if isinstance(tenant_b_app.get("models"), list) else []
    tenant_b_mcp = tenant_b_ext.get("mcpServers") if isinstance(tenant_b_ext.get("mcpServers"), dict) else {}

    assert all(model.get("name") != "legacy-model" for model in tenant_b_models)
    assert "legacy-mcp" not in tenant_b_mcp

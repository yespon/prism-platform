from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from deerflow.database.models import Tenant, TenantMembership
from deerflow.database.tenant_service import (
    backfill_default_tenants_for_users,
    ensure_default_tenant_for_user,
    get_membership,
    list_user_tenants,
)


@pytest.fixture()
async def tenant_db(monkeypatch, tmp_path: Path):
    db_file = tmp_path / "tenant-service-test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_file}", future=True)

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)

    import deerflow.database.tenant_service as tenant_service

    monkeypatch.setattr(tenant_service, "get_session_factory", lambda: factory)
    try:
        yield factory
    finally:
        await engine.dispose()


@pytest.mark.anyio
async def test_ensure_default_tenant_for_user_creates_membership(tenant_db):
    membership = await ensure_default_tenant_for_user("user-a")

    assert membership.user_id == "user-a"
    assert membership.role == "member"
    assert membership.status == "active"


@pytest.mark.anyio
async def test_ensure_default_tenant_for_user_is_idempotent(tenant_db):
    first = await ensure_default_tenant_for_user("user-a")
    second = await ensure_default_tenant_for_user("user-a")

    assert first.id == second.id
    assert first.tenant_id == second.tenant_id


@pytest.mark.anyio
async def test_list_user_tenants_and_get_membership(tenant_db):
    membership = await ensure_default_tenant_for_user("user-b", role="admin")

    rows = await list_user_tenants("user-b")
    assert len(rows) == 1
    tenant, resolved_membership = rows[0]
    assert isinstance(tenant, Tenant)
    assert isinstance(resolved_membership, TenantMembership)
    assert resolved_membership.role == "admin"

    loaded = await get_membership("user-b", membership.tenant_id)
    assert loaded is not None
    assert loaded.user_id == "user-b"
    assert loaded.role == "admin"


@pytest.mark.anyio
async def test_backfill_default_tenants_for_users(tenant_db):
    processed = await backfill_default_tenants_for_users(["user-c", "", "user-d"])
    assert processed == 2

    seeded_c = await ensure_default_tenant_for_user("user-c")
    seeded_d = await ensure_default_tenant_for_user("user-d")
    membership_c = await get_membership("user-c", seeded_c.tenant_id)
    membership_d = await get_membership("user-d", seeded_d.tenant_id)
    assert membership_c is not None
    assert membership_d is not None

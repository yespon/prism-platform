from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.gateway.routers.announcements import _is_user_visible, _validate_common_fields
from deerflow.database.models import PlatformAnnouncement


def _build_announcement(
    *,
    scope: str,
    target_roles: list[str] | None = None,
    target_tenants: list[str] | None = None,
    status: str = "published",
    publish_at: datetime | None = None,
    expire_at: datetime | None = None,
) -> PlatformAnnouncement:
    now = datetime.now(UTC)
    publish = publish_at or (now - timedelta(hours=1))
    expire = expire_at or (now + timedelta(hours=1))

    return PlatformAnnouncement(
        id=1,
        title="Notice",
        content="Body",
        type="general",
        severity="info",
        scope=scope,
        target_roles_json=target_roles or [],
        target_tenant_ids_json=target_tenants or [],
        publish_at=publish,
        expire_at=expire,
        status=status,
        created_by="admin",
        created_at=now,
        updated_at=now,
    )


def test_is_user_visible_platform_all() -> None:
    now = datetime.now(UTC)
    item = _build_announcement(scope="platform_all")

    assert _is_user_visible(item, tenant_id="t-1", current_roles={"member"}, now=now, include_expired=False)


def test_is_user_visible_tenant_role_scoped_requires_both() -> None:
    now = datetime.now(UTC)
    item = _build_announcement(
        scope="tenant_role_scoped",
        target_roles=["owner"],
        target_tenants=["tenant-a"],
    )

    assert _is_user_visible(item, tenant_id="tenant-a", current_roles={"owner"}, now=now, include_expired=False)
    assert not _is_user_visible(item, tenant_id="tenant-b", current_roles={"owner"}, now=now, include_expired=False)
    assert not _is_user_visible(item, tenant_id="tenant-a", current_roles={"member"}, now=now, include_expired=False)


def test_is_user_visible_supports_legacy_role_aliases() -> None:
    now = datetime.now(UTC)
    item = _build_announcement(
        scope="tenant_role_scoped",
        target_roles=["owner"],
        target_tenants=["tenant-a"],
    )

    assert _is_user_visible(item, tenant_id="tenant-a", current_roles={"tenant_admin"}, now=now, include_expired=False)
    assert not _is_user_visible(item, tenant_id="tenant-a", current_roles={"tenant_member"}, now=now, include_expired=False)


def test_is_user_visible_respects_expiration_window() -> None:
    now = datetime.now(UTC)
    item = _build_announcement(
        scope="platform_all",
        expire_at=now - timedelta(minutes=5),
    )

    assert not _is_user_visible(item, tenant_id="t-1", current_roles={"member"}, now=now, include_expired=False)
    assert _is_user_visible(item, tenant_id="t-1", current_roles={"member"}, now=now, include_expired=True)


def test_validate_common_fields_requires_role_for_role_scoped() -> None:
    now = datetime.now(UTC)

    with pytest.raises(HTTPException, match="target_roles is required"):
        _validate_common_fields(
            title="x",
            type_value="general",
            severity="info",
            scope="role_scoped",
            status="draft",
            publish_at=now,
            expire_at=now + timedelta(hours=1),
            target_roles=[],
            target_tenant_ids=[],
        )


def test_validate_common_fields_rejects_invalid_schedule() -> None:
    now = datetime.now(UTC)

    with pytest.raises(HTTPException, match="publish_at must be earlier than expire_at"):
        _validate_common_fields(
            title="x",
            type_value="general",
            severity="info",
            scope="platform_all",
            status="draft",
            publish_at=now,
            expire_at=now,
            target_roles=[],
            target_tenant_ids=[],
        )

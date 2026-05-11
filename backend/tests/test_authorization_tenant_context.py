from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.gateway.authorization import (
    require_admin,
    require_admin_base,
    require_tenant_admin,
    require_tenant_context,
)


def test_require_tenant_context_returns_tenant_id() -> None:
    request = SimpleNamespace(state=SimpleNamespace(tenant_id="tenant-a"))
    assert require_tenant_context(request) == "tenant-a"


def test_require_tenant_context_raises_when_missing() -> None:
    request = SimpleNamespace(state=SimpleNamespace())
    with pytest.raises(HTTPException) as exc:
        require_tenant_context(request)
    assert exc.value.status_code == 400
    assert exc.value.detail == "Tenant context is required"


def test_require_tenant_context_raises_when_blank() -> None:
    request = SimpleNamespace(state=SimpleNamespace(tenant_id="   "))
    with pytest.raises(HTTPException) as exc:
        require_tenant_context(request)
    assert exc.value.status_code == 400


def test_require_admin_allows_tenant_admin_role() -> None:
    request = SimpleNamespace(
        state=SimpleNamespace(
            user_role="user",
            tenant_role="admin",
            must_change_password=False,
        )
    )
    require_admin(request)


def test_require_admin_allows_global_admin_fallback_when_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEERFLOW_ADMIN_REQUIRE_TENANT_ROLE", "false")
    request = SimpleNamespace(
        state=SimpleNamespace(
            user_role="admin",
            tenant_role="member",
            must_change_password=False,
        )
    )
    require_admin(request)


def test_require_admin_rejects_non_admin_roles() -> None:
    request = SimpleNamespace(
        state=SimpleNamespace(
            user_role="user",
            tenant_role="member",
            must_change_password=False,
        )
    )
    with pytest.raises(HTTPException) as exc:
        require_admin(request)
    assert exc.value.status_code == 403


def test_require_admin_default_mode_rejects_global_admin_without_tenant_admin() -> None:
    request = SimpleNamespace(
        state=SimpleNamespace(
            user_role="admin",
            tenant_role="member",
            must_change_password=False,
        )
    )
    with pytest.raises(HTTPException) as exc:
        require_admin(request)
    assert exc.value.status_code == 403


def test_require_admin_strict_mode_rejects_global_admin_without_tenant_admin(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEERFLOW_ADMIN_REQUIRE_TENANT_ROLE", "true")
    request = SimpleNamespace(
        state=SimpleNamespace(
            user_role="admin",
            tenant_role="member",
            must_change_password=False,
        )
    )
    with pytest.raises(HTTPException) as exc:
        require_admin(request)
    assert exc.value.status_code == 403


def test_require_admin_strict_mode_allows_tenant_admin(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEERFLOW_ADMIN_REQUIRE_TENANT_ROLE", "true")
    request = SimpleNamespace(
        state=SimpleNamespace(
            user_role="user",
            tenant_role="admin",
            must_change_password=False,
        )
    )
    require_admin(request)


def test_require_admin_base_strict_mode_rejects_global_admin_without_tenant_admin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEERFLOW_ADMIN_REQUIRE_TENANT_ROLE", "true")
    request = SimpleNamespace(
        state=SimpleNamespace(
            user_role="admin",
            tenant_role="member",
            must_change_password=False,
        )
    )
    with pytest.raises(HTTPException) as exc:
        require_admin_base(request)
    assert exc.value.status_code == 403


def test_require_admin_base_strict_mode_allows_bootstrap_password_change(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEERFLOW_ADMIN_REQUIRE_TENANT_ROLE", "true")
    request = SimpleNamespace(
        state=SimpleNamespace(
            user_role="admin",
            tenant_role="member",
            must_change_password=True,
        )
    )
    require_admin_base(request)


def test_require_tenant_admin_allows_tenant_admin() -> None:
    request = SimpleNamespace(
        state=SimpleNamespace(
            tenant_id="tenant-a",
            user_role="user",
            tenant_role="admin",
        )
    )
    assert require_tenant_admin(request) == "tenant-a"


def test_require_tenant_admin_rejects_global_admin_without_tenant_admin() -> None:
    request = SimpleNamespace(
        state=SimpleNamespace(
            tenant_id="tenant-a",
            user_role="admin",
            tenant_role="member",
        )
    )
    with pytest.raises(HTTPException) as exc:
        require_tenant_admin(request)
    assert exc.value.status_code == 403


def test_require_tenant_admin_requires_tenant_context() -> None:
    request = SimpleNamespace(state=SimpleNamespace(user_role="user", tenant_role="admin"))
    with pytest.raises(HTTPException) as exc:
        require_tenant_admin(request)
    assert exc.value.status_code == 400

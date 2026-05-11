from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.gateway.routers import mcp


def _create_app() -> FastAPI:
    app = FastAPI()

    @app.middleware("http")
    async def inject_context(request: Request, call_next):
        request.state.user_id = request.headers.get("x-user-id", "u-1")
        request.state.user_role = request.headers.get("x-user-role", "user")
        tenant_role = request.headers.get("x-tenant-role", "tenant_member")
        if tenant_role in {"admin", "owner"}:
            tenant_role = "tenant_admin"
        elif tenant_role == "member":
            tenant_role = "tenant_member"
        request.state.tenant_role = tenant_role
        tenant_id = request.headers.get("x-tenant-id")
        if tenant_id is not None:
            request.state.tenant_id = tenant_id
        return await call_next(request)

    app.include_router(mcp.router)
    return app


def test_available_mcp_requires_tenant_context() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.get("/api/mcp/available")

    assert response.status_code == 400
    assert response.json()["detail"] == "Tenant context is required"


def test_available_mcp_returns_merged_scopes(monkeypatch) -> None:
    app = _create_app()

    async def _fake_get_available_mcp_servers(
        user_id: str,
        tenant_id: str,
        *,
        is_tenant_admin: bool,
        is_platform_admin: bool,
    ):
        assert user_id == "u-1"
        assert tenant_id == "tenant-a"
        assert is_tenant_admin is True
        assert is_platform_admin is False
        return [
            {
                "name": "global-mcp",
                "enabled": True,
                "type": "stdio",
                "command": "npx",
                "args": ["-y"],
                "env": {},
                "url": None,
                "headers": {},
                "oauth": None,
                "description": "g",
                "is_builtin": True,
                "scope": "global",
                "source": "platform_builtin",
                "managed_by_current_user": False,
                "effective_permissions": ["read", "use"],
            },
            {
                "name": "tenant-mcp",
                "enabled": True,
                "type": "http",
                "command": None,
                "args": [],
                "env": {},
                "url": "https://example.com",
                "headers": {},
                "oauth": None,
                "description": "t",
                "is_builtin": False,
                "scope": "tenant",
                "source": "tenant_shared",
                "managed_by_current_user": True,
                "effective_permissions": ["read", "use", "manage"],
            },
            {
                "name": "user-mcp",
                "enabled": True,
                "type": "stdio",
                "command": "node",
                "args": [],
                "env": {},
                "url": None,
                "headers": {},
                "oauth": None,
                "description": "u",
                "is_builtin": False,
                "scope": "user",
                "source": "user_private",
                "managed_by_current_user": True,
                "effective_permissions": ["read", "use", "manage"],
            },
        ]

    monkeypatch.setattr(mcp, "get_available_mcp_servers", _fake_get_available_mcp_servers)

    with TestClient(app) as client:
        response = client.get(
            "/api/mcp/available",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_admin"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert [item["scope"] for item in payload["mcp_servers"]] == ["global", "tenant", "user"]


def test_tenant_mcp_reject_non_tenant_admin() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.get(
            "/api/tenants/mcp/config",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member"},
        )

    assert response.status_code == 403


def test_tenant_mcp_reject_platform_admin_without_membership() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.get(
            "/api/tenants/mcp/config",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member", "x-user-role": "admin"},
        )

    assert response.status_code == 403


def test_tenant_mcp_update_succeeds_for_tenant_admin(monkeypatch) -> None:
    app = _create_app()

    calls = {}

    async def _fake_replace_tenant_shared_mcp_servers(tenant_id: str, payload: dict):
        calls["tenant_id"] = tenant_id
        calls["payload"] = payload

    monkeypatch.setattr(mcp, "replace_tenant_shared_mcp_servers", _fake_replace_tenant_shared_mcp_servers)

    with TestClient(app) as client:
        response = client.put(
            "/api/tenants/mcp/config",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_admin"},
            json={
                "mcp_servers": {
                    "tenant-mcp": {
                        "enabled": True,
                        "type": "stdio",
                        "command": "npx",
                        "args": ["-y", "pkg"],
                        "env": {},
                        "url": None,
                        "headers": {},
                        "oauth": None,
                        "description": "tenant",
                        "is_builtin": False,
                    }
                }
            },
        )

    assert response.status_code == 200
    assert calls["tenant_id"] == "tenant-a"
    assert "tenant-mcp" in calls["payload"]


def test_tenant_mcp_toggle_enabled_succeeds_for_tenant_admin(monkeypatch) -> None:
    app = _create_app()

    class _Row:
        name = "jira"
        enabled = False

    calls = {}

    async def _fake_set_tenant_mcp_server_enabled(tenant_id: str, server_name: str, *, enabled: bool):
        calls["tenant_id"] = tenant_id
        calls["server_name"] = server_name
        calls["enabled"] = enabled
        row = _Row()
        row.enabled = enabled
        return row, "platform_builtin"

    monkeypatch.setattr(mcp, "set_tenant_mcp_server_enabled", _fake_set_tenant_mcp_server_enabled)

    with TestClient(app) as client:
        response = client.patch(
            "/api/tenants/mcp/jira/enabled",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_admin"},
            json={"enabled": False},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload == {"name": "jira", "enabled": False, "source": "platform_builtin"}
    assert calls == {"tenant_id": "tenant-a", "server_name": "jira", "enabled": False}


def test_tenant_mcp_toggle_enabled_rejects_non_tenant_admin() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.patch(
            "/api/tenants/mcp/jira/enabled",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member"},
            json={"enabled": True},
        )

    assert response.status_code == 403


def test_available_mcp_passes_platform_admin_flag(monkeypatch) -> None:
    app = _create_app()

    async def _fake_get_available_mcp_servers(
        user_id: str,
        tenant_id: str,
        *,
        is_tenant_admin: bool,
        is_platform_admin: bool,
    ):
        assert user_id == "u-1"
        assert tenant_id == "tenant-a"
        assert is_tenant_admin is False
        assert is_platform_admin is True
        return []

    monkeypatch.setattr(mcp, "get_available_mcp_servers", _fake_get_available_mcp_servers)

    with TestClient(app) as client:
        response = client.get(
            "/api/mcp/available",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member", "x-user-role": "admin"},
        )

    assert response.status_code == 200
    assert response.json() == {"mcp_servers": []}


def test_user_private_mcp_update_forbidden_for_tenant_member(monkeypatch) -> None:
    app = _create_app()

    calls = {}

    async def _fake_replace_user_mcp_servers(user_id: str, payload: dict, *, tenant_id: str | None = None):
        calls["user_id"] = user_id
        calls["tenant_id"] = tenant_id
        calls["payload"] = payload

    monkeypatch.setattr(mcp, "replace_user_mcp_servers", _fake_replace_user_mcp_servers)

    with TestClient(app) as client:
        response = client.put(
            "/api/mcp/config",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member"},
            json={
                "mcp_servers": {
                    "mine": {
                        "enabled": True,
                        "type": "stdio",
                        "command": "npx",
                        "args": ["-y", "pkg"],
                        "env": {},
                        "url": None,
                        "headers": {},
                        "oauth": None,
                        "description": "mine",
                        "is_builtin": False,
                    }
                }
            },
        )

    assert response.status_code == 403
    assert calls == {}


def test_user_private_mcp_update_forbidden_for_platform_admin_without_tenant_admin(monkeypatch) -> None:
    app = _create_app()

    calls = {}

    async def _fake_replace_user_mcp_servers(user_id: str, payload: dict, *, tenant_id: str | None = None):
        calls["user_id"] = user_id
        calls["tenant_id"] = tenant_id
        calls["payload"] = payload

    monkeypatch.setattr(mcp, "replace_user_mcp_servers", _fake_replace_user_mcp_servers)

    with TestClient(app) as client:
        response = client.put(
            "/api/mcp/config",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member", "x-user-role": "admin"},
            json={
                "mcp_servers": {
                    "mine": {
                        "enabled": True,
                        "type": "stdio",
                        "command": "npx",
                        "args": ["-y", "pkg"],
                        "env": {},
                        "url": None,
                        "headers": {},
                        "oauth": None,
                        "description": "mine",
                        "is_builtin": False,
                    }
                }
            },
        )

    assert response.status_code == 403
    assert calls == {}

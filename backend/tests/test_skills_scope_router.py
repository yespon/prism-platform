from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.gateway.routers import skills


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

    app.include_router(skills.router)
    return app


def test_available_skills_requires_tenant_context() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.get("/api/skills/available")

    assert response.status_code == 400
    assert response.json()["detail"] == "Tenant context is required"


def test_available_skills_returns_merged_scopes(monkeypatch) -> None:
    app = _create_app()

    async def _fake_get_available_skills(
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
                "name": "global-skill",
                "description": "g",
                "license": None,
                "category": "public",
                "enabled": True,
                "scope": "global",
                "source": "platform_builtin",
                "managed_by_current_user": False,
                "effective_permissions": ["read", "use"],
            },
            {
                "name": "tenant-skill",
                "description": "t",
                "license": None,
                "category": "custom",
                "enabled": True,
                "scope": "tenant",
                "source": "tenant_shared",
                "managed_by_current_user": True,
                "effective_permissions": ["read", "use", "manage"],
            },
        ]

    monkeypatch.setattr(skills, "get_available_skills", _fake_get_available_skills)

    with TestClient(app) as client:
        response = client.get(
            "/api/skills/available",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_admin"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert [item["scope"] for item in payload["skills"]] == ["global", "tenant"]


def test_tenant_shared_skills_reject_non_tenant_admin() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.get(
            "/api/tenants/skills",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member"},
        )

    assert response.status_code == 403


def test_tenant_shared_skills_reject_platform_admin_without_membership() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.get(
            "/api/tenants/skills",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member", "x-user-role": "admin"},
        )

    assert response.status_code == 403


def test_tenant_shared_skill_update_succeeds_for_tenant_admin(monkeypatch) -> None:
    app = _create_app()

    class _Row:
        name = "tenant-skill"
        category = "custom"
        enabled = False

    class _Skill:
        name = "tenant-skill"
        description = "tenant skill"
        license = None

    async def _fake_set_tenant_shared_skill_enabled(tenant_id: str, skill_name: str, enabled: bool):
        assert tenant_id == "tenant-a"
        assert skill_name == "tenant-skill"
        assert enabled is False
        return _Row()

    monkeypatch.setattr(skills, "set_tenant_shared_skill_enabled", _fake_set_tenant_shared_skill_enabled)
    monkeypatch.setattr(skills, "load_skills", lambda enabled_only=False: [_Skill()])

    with TestClient(app) as client:
        response = client.put(
            "/api/tenants/skills/tenant-skill",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_admin"},
            json={"enabled": False},
        )

    assert response.status_code == 200
    assert response.json()["name"] == "tenant-skill"
    assert response.json()["enabled"] is False


def test_available_skills_passes_platform_admin_flag(monkeypatch) -> None:
    app = _create_app()

    async def _fake_get_available_skills(
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

    monkeypatch.setattr(skills, "get_available_skills", _fake_get_available_skills)

    with TestClient(app) as client:
        response = client.get(
            "/api/skills/available",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member", "x-user-role": "admin"},
        )

    assert response.status_code == 200
    assert response.json() == {"skills": []}


def test_tenant_shared_skill_delete_rejects_non_tenant_admin() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.delete(
            "/api/tenants/skills/tenant-skill",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member"},
        )

    assert response.status_code == 403


def test_tenant_shared_skill_delete_returns_404_when_missing(monkeypatch) -> None:
    app = _create_app()

    async def _fake_delete_tenant_shared_skill(tenant_id: str, skill_name: str) -> None:
        assert tenant_id == "tenant-a"
        assert skill_name == "missing-skill"
        raise ValueError("Skill 'missing-skill' not found")

    monkeypatch.setattr(skills, "delete_tenant_shared_skill", _fake_delete_tenant_shared_skill)

    with TestClient(app) as client:
        response = client.delete(
            "/api/tenants/skills/missing-skill",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_admin"},
        )

    assert response.status_code == 404


def test_user_skill_update_route_is_removed() -> None:
    app = _create_app()

    with TestClient(app) as client:
        response = client.put(
            "/api/skills/tenant-skill",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_member", "x-user-role": "admin"},
            json={"enabled": True},
        )

    assert response.status_code == 405


def test_install_skill_registers_tenant_scoped_path(monkeypatch) -> None:
    app = _create_app()
    calls: dict[str, object] = {}

    monkeypatch.setattr(skills, "resolve_thread_virtual_path", lambda *args, **kwargs: __import__("pathlib").Path("/tmp/demo.skill"))

    def _fake_install_skill_from_archive(path, *, skills_root=None, target_relative_path=None):
        calls["install_path"] = str(path)
        calls["target_relative_path"] = target_relative_path
        return {
            "success": True,
            "skill_name": "tenant-skill",
            "category": "custom",
            "relative_path": "tenant-a/tenant-skill",
            "install_dir": "/tmp/skills/custom/tenant-a/tenant-skill",
            "message": "ok",
        }

    async def _fake_create_tenant_shared_skill(tenant_id: str, **kwargs):
        calls["tenant_id"] = tenant_id
        calls["payload"] = kwargs
        return None

    monkeypatch.setattr(skills, "install_skill_from_archive", _fake_install_skill_from_archive)
    monkeypatch.setattr(skills, "create_tenant_shared_skill", _fake_create_tenant_shared_skill)

    with TestClient(app) as client:
        response = client.post(
            "/api/skills/install",
            headers={"x-tenant-id": "tenant-a", "x-tenant-role": "tenant_admin"},
            json={"thread_id": "t-1", "path": "artifacts/demo.skill"},
        )

    assert response.status_code == 200
    assert calls["target_relative_path"] == "tenant-a"
    assert calls["tenant_id"] == "tenant-a"
    assert calls["payload"] == {
        "enabled": True,
        "skill_name": "tenant-skill",
        "category": "custom",
        "relative_path": "tenant-a/tenant-skill",
        "install_dir": "/tmp/skills/custom/tenant-a/tenant-skill",
    }

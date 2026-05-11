import sqlite3

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

import deerflow.config.paths
from app.gateway import auth_db
from app.gateway.routers import admin, memory


def _create_auth_db(path):
    with sqlite3.connect(path) as conn:
        conn.execute(
            """
            CREATE TABLE user (
                id TEXT PRIMARY KEY,
                email TEXT,
                name TEXT,
                role TEXT,
                status TEXT,
                createdAt TEXT,
                updatedAt TEXT
            )
            """
        )
        conn.execute(
            """
            INSERT INTO user(id, email, name, role, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("u-admin", "admin@example.com", "admin", "admin", "active", "2026-03-30T00:00:00Z", "2026-03-30T00:00:00Z"),
        )

@pytest.fixture
def test_app(tmp_path, monkeypatch):
    db_path = tmp_path / "auth.db"
    _create_auth_db(db_path)
    monkeypatch.setenv("AUTH_DB_URL", f"sqlite+pysqlite:///{db_path}")
    auth_db.reset_auth_engine()
    monkeypatch.setattr(deerflow.config.paths, "get_paths", lambda: deerflow.config.paths.Paths(tmp_path))

    test_app_instance = FastAPI()

    @test_app_instance.middleware("http")
    async def inject_user_context(request: Request, call_next):
        request.state.user_id = request.headers.get("x-user-id", "u-user")
        request.state.user_role = request.headers.get("x-user-role", "user")
        request.state.tenant_id = request.headers.get("x-tenant-id", "tenant-a")
        return await call_next(request)

    test_app_instance.include_router(admin.router)
    test_app_instance.include_router(memory.router)
    return test_app_instance

def test_tenant_guard_protects_admin_boundary(test_app):
    with TestClient(test_app) as client:
        # User trying admin
        resp = client.get("/api/admin/users", headers={"x-user-id": "u-user", "x-user-role": "user"})
        assert resp.status_code == 403

        # Admin trying admin
        resp = client.get("/api/admin/users", headers={"x-user-id": "u-admin", "x-user-role": "admin"})
        assert resp.status_code == 200

        # Admin memory isolated
        resp = client.get("/api/memory/", headers={"x-user-id": "u-admin", "x-user-role": "admin"})
        assert resp.status_code == 200
        # memory response should be a dictionary like {"facts": [...]}
        assert isinstance(resp.json(), dict)


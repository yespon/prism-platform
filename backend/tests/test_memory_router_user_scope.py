from unittest.mock import patch

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.gateway.routers import memory


def _create_app() -> FastAPI:
    app = FastAPI()

    @app.middleware("http")
    async def inject_user_context(request: Request, call_next):
        user_id = request.headers.get("x-user-id")
        tenant_id = request.headers.get("x-tenant-id")
        if user_id:
            request.state.user_id = user_id
        if tenant_id:
            request.state.tenant_id = tenant_id
        return await call_next(request)

    app.include_router(memory.router)
    return app


def test_get_memory_uses_request_user_id():
    app = _create_app()

    with patch("app.gateway.routers.memory.get_memory_data", return_value={"version": "1.0", "facts": []}) as mock_get:
        with TestClient(app) as client:
            response = client.get("/api/memory", headers={"x-user-id": "u1", "x-tenant-id": "tenant-a"})

    assert response.status_code == 200
    mock_get.assert_called_once_with(user_id="u1", tenant_id="tenant-a")


def test_get_memory_without_user_context_returns_401():
    app = _create_app()

    with TestClient(app) as client:
        response = client.get("/api/memory")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing user context"


def test_reload_memory_uses_request_user_id():
    app = _create_app()

    with patch("app.gateway.routers.memory.reload_memory_data", return_value={"version": "1.0", "facts": []}) as mock_reload:
        with TestClient(app) as client:
            response = client.post("/api/memory/reload", headers={"x-user-id": "u2", "x-tenant-id": "tenant-a"})

    assert response.status_code == 200
    mock_reload.assert_called_once_with(user_id="u2", tenant_id="tenant-a")


def test_get_memory_without_tenant_context_returns_400():
    app = _create_app()

    with TestClient(app) as client:
        response = client.get("/api/memory", headers={"x-user-id": "u1"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Tenant context is required"

import asyncio
from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.routers import suggestions


def test_strip_markdown_code_fence_removes_wrapping():
    text = '```json\n["a"]\n```'
    assert suggestions._strip_markdown_code_fence(text) == '["a"]'


def test_strip_markdown_code_fence_no_fence_keeps_content():
    text = '  ["a"]  '
    assert suggestions._strip_markdown_code_fence(text) == '["a"]'


def test_parse_json_string_list_filters_invalid_items():
    text = '```json\n["a", " ", 1, "b"]\n```'
    assert suggestions._parse_json_string_list(text) == ["a", "b"]


def test_parse_json_string_list_rejects_non_list():
    text = '{"a": 1}'
    assert suggestions._parse_json_string_list(text) is None


def test_format_conversation_formats_roles():
    messages = [
        suggestions.SuggestionMessage(role="User", content="Hi"),
        suggestions.SuggestionMessage(role="assistant", content="Hello"),
        suggestions.SuggestionMessage(role="system", content="note"),
    ]
    assert suggestions._format_conversation(messages) == "User: Hi\nAssistant: Hello\nsystem: note"


def test_generate_suggestions_parses_and_limits(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[
            suggestions.SuggestionMessage(role="user", content="Hi"),
            suggestions.SuggestionMessage(role="assistant", content="Hello"),
        ],
        n=3,
        model_name=None,
    )
    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content='```json\n["Q1", "Q2", "Q3", "Q4"]\n```')
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == ["Q1", "Q2", "Q3"]


def test_generate_suggestions_parses_list_block_content(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[
            suggestions.SuggestionMessage(role="user", content="Hi"),
            suggestions.SuggestionMessage(role="assistant", content="Hello"),
        ],
        n=2,
        model_name=None,
    )
    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content=[{"type": "text", "text": '```json\n["Q1", "Q2"]\n```'}])
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == ["Q1", "Q2"]


def test_generate_suggestions_parses_output_text_block_content(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[
            suggestions.SuggestionMessage(role="user", content="Hi"),
            suggestions.SuggestionMessage(role="assistant", content="Hello"),
        ],
        n=2,
        model_name=None,
    )
    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content=[{"type": "output_text", "text": '```json\n["Q1", "Q2"]\n```'}])
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == ["Q1", "Q2"]


def test_generate_suggestions_returns_empty_on_model_error(monkeypatch):
    req = suggestions.SuggestionsRequest(
        messages=[suggestions.SuggestionMessage(role="user", content="Hi")],
        n=2,
        model_name=None,
    )
    fake_model = MagicMock()
    fake_model.invoke.side_effect = RuntimeError("boom")
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)

    result = asyncio.run(suggestions.generate_suggestions("t1", req))

    assert result.suggestions == []


def _build_client() -> TestClient:
    app = FastAPI()

    @app.middleware("http")
    async def _inject_state(request, call_next):
        user_id = request.headers.get("x-user-id")
        tenant_id = request.headers.get("x-tenant-id")
        if user_id is not None:
            request.state.user_id = user_id
        if tenant_id is not None:
            request.state.tenant_id = tenant_id
        return await call_next(request)

    app.include_router(suggestions.router)
    return TestClient(app)


def test_suggestions_rejects_without_tenant_context(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {"owner_user_id": "u-1", "owner_tenant_id": "tenant-a"}}

    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content='["Q1"]')

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        response = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [{"role": "user", "content": "hello"}], "n": 3},
            headers={"x-user-id": "u-1"},
        )

    assert response.status_code == 400


def test_suggestions_rejects_owner_mismatch(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {"owner_user_id": "u-owner", "owner_tenant_id": "tenant-a"}}

    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content='["Q1"]')

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        response = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [{"role": "user", "content": "hello"}], "n": 3},
            headers={"x-user-id": "u-2", "x-tenant-id": "tenant-a"},
        )

    assert response.status_code == 403


def test_suggestions_rejects_tenant_mismatch(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {"owner_user_id": "u-1", "owner_tenant_id": "tenant-a"}}

    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content='["Q1"]')

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        response = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [{"role": "user", "content": "hello"}], "n": 3},
            headers={"x-user-id": "u-1", "x-tenant-id": "tenant-b"},
        )

    assert response.status_code == 403


def test_suggestions_returns_empty_for_empty_messages_with_valid_access(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {"owner_user_id": "u-1", "owner_tenant_id": "tenant-a"}}

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        response = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [], "n": 3},
            headers={"x-user-id": "u-1", "x-tenant-id": "tenant-a"},
        )

    assert response.status_code == 200
    assert response.json() == {"suggestions": []}


def test_suggestions_rate_limit(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {"owner_user_id": "u-1", "owner_tenant_id": "tenant-a"}}

    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content='["Q1"]')

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)
    monkeypatch.setattr(suggestions, "load_enabled_tenant_model_names", lambda tenant_id: ["tenant-model"])
    monkeypatch.setattr(suggestions, "_RATE_LIMIT_MAX_REQUESTS", 1)
    monkeypatch.setattr(suggestions, "_RATE_LIMIT_WINDOW_SECONDS", 999)
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        first = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [{"role": "user", "content": "hello"}], "n": 3},
            headers={"x-user-id": "u-1", "x-tenant-id": "tenant-a"},
        )
        second = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [{"role": "user", "content": "hello"}], "n": 3},
            headers={"x-user-id": "u-1", "x-tenant-id": "tenant-a"},
        )

    assert first.status_code == 200
    assert second.status_code == 429


def test_suggestions_allows_legacy_thread_without_owner_metadata(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {}}

    fake_model = MagicMock()
    fake_model.invoke.return_value = MagicMock(content='["Q1"]')

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    monkeypatch.setattr(suggestions, "create_chat_model", lambda **kwargs: fake_model)
    monkeypatch.setattr(suggestions, "load_enabled_tenant_model_names", lambda tenant_id: ["tenant-model"])
    monkeypatch.setattr(suggestions, "_ALLOW_LEGACY_THREADS_WITHOUT_OWNER_METADATA", True)
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        response = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [{"role": "user", "content": "hello"}], "n": 3},
            headers={"x-user-id": "u-1", "x-tenant-id": "tenant-a"},
        )

    assert response.status_code == 200
    assert response.json() == {"suggestions": ["Q1"]}


def test_suggestions_rejects_missing_owner_metadata_when_compat_disabled(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {}}

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    monkeypatch.setattr(suggestions, "_ALLOW_LEGACY_THREADS_WITHOUT_OWNER_METADATA", False)
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        response = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [{"role": "user", "content": "hello"}], "n": 3},
            headers={"x-user-id": "u-1", "x-tenant-id": "tenant-a"},
        )

    assert response.status_code == 403


def test_suggestions_rejects_when_tenant_has_no_enabled_models(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {"owner_user_id": "u-1", "owner_tenant_id": "tenant-a"}}

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    monkeypatch.setattr(suggestions, "load_enabled_tenant_model_names", lambda tenant_id: [])
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        response = client.post(
            "/api/threads/t1/suggestions",
            json={"messages": [{"role": "user", "content": "hello"}], "n": 3},
            headers={"x-user-id": "u-1", "x-tenant-id": "tenant-a"},
        )

    assert response.status_code == 403


def test_suggestions_rejects_model_not_in_tenant_allowlist(monkeypatch):
    async def _fake_fetch_thread(thread_id: str):
        return {"metadata": {"owner_user_id": "u-1", "owner_tenant_id": "tenant-a"}}

    monkeypatch.setattr(suggestions, "_fetch_thread", _fake_fetch_thread)
    monkeypatch.setattr(suggestions, "load_enabled_tenant_model_names", lambda tenant_id: ["tenant-model"])
    suggestions._RATE_LIMIT_BUCKETS.clear()

    with _build_client() as client:
        response = client.post(
            "/api/threads/t1/suggestions",
            json={
                "messages": [{"role": "user", "content": "hello"}],
                "n": 3,
                "model_name": "forbidden-model",
            },
            headers={"x-user-id": "u-1", "x-tenant-id": "tenant-a"},
        )

    assert response.status_code == 403

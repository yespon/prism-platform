from types import SimpleNamespace

import pytest

from deerflow.sandbox.local.local_sandbox_provider import LocalSandboxProvider
from deerflow.sandbox.sandbox_provider import get_sandbox_provider, reset_sandbox_provider


def test_local_provider_isolated_by_user_and_thread() -> None:
    provider = LocalSandboxProvider()

    sandbox_a = provider.acquire(thread_id="thread-1", user_id="user-a")
    sandbox_b = provider.acquire(thread_id="thread-1", user_id="user-b")

    assert sandbox_a != sandbox_b
    assert provider.get(sandbox_a) is not None
    assert provider.get(sandbox_b) is not None


def test_local_provider_requires_user_id_for_thread_bound_sandbox() -> None:
    provider = LocalSandboxProvider()

    with pytest.raises(ValueError, match="user_id is required"):
        provider.acquire(thread_id="thread-1", user_id=None)


def test_local_provider_blocked_in_production_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    reset_sandbox_provider()
    monkeypatch.setenv("DEERFLOW_ENV", "production")
    monkeypatch.delenv("DEERFLOW_ALLOW_LOCAL_SANDBOX_IN_PROD", raising=False)

    monkeypatch.setattr(
        "deerflow.sandbox.sandbox_provider.get_app_config",
        lambda: SimpleNamespace(sandbox=SimpleNamespace(use="deerflow.sandbox.local:LocalSandboxProvider")),
    )

    with pytest.raises(RuntimeError, match="LocalSandboxProvider is disabled in production"):
        get_sandbox_provider()

    reset_sandbox_provider()

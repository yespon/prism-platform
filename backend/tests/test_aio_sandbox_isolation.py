from deerflow.community.aio_sandbox.aio_sandbox_provider import AioSandboxProvider


def test_deterministic_sandbox_id_isolated_by_user() -> None:
    same_thread = "thread-1"

    sandbox_a = AioSandboxProvider._deterministic_sandbox_id(same_thread, "user-a")
    sandbox_b = AioSandboxProvider._deterministic_sandbox_id(same_thread, "user-b")

    assert sandbox_a != sandbox_b


def test_acquire_requires_user_id_for_thread_bound_sandbox() -> None:
    provider = AioSandboxProvider.__new__(AioSandboxProvider)

    try:
        provider.acquire(thread_id="thread-1", user_id=None)
    except ValueError as exc:
        assert "user_id is required" in str(exc)
    else:
        raise AssertionError("Expected ValueError for missing user_id")

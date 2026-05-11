import contextvars
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass


@dataclass
class TenantContext:
    user_id: str | None = None
    user_role: str | None = None
    tenant_id: str | None = None


_tenant_context_var: contextvars.ContextVar[TenantContext] = contextvars.ContextVar("tenant_context", default=TenantContext())


def get_tenant_context() -> TenantContext:
    """Return tenant context bound to the current execution flow."""
    return _tenant_context_var.get()


def get_current_user_id() -> str | None:
    """Get current user id from contextvars, if available."""
    return get_tenant_context().user_id


def get_current_user_role() -> str | None:
    """Get current user role from contextvars, if available."""
    return get_tenant_context().user_role


def get_current_tenant_id() -> str | None:
    """Get current tenant id from contextvars, if available."""
    return get_tenant_context().tenant_id


def set_tenant_context(
    user_id: str | None,
    user_role: str | None = None,
    tenant_id: str | None = None,
) -> contextvars.Token[TenantContext]:
    """Bind tenant context to current flow and return token for reset."""
    return _tenant_context_var.set(TenantContext(user_id=user_id, user_role=user_role, tenant_id=tenant_id))


def reset_tenant_context(token: contextvars.Token[TenantContext]) -> None:
    """Reset tenant context to previous state using contextvar token."""
    _tenant_context_var.reset(token)


@contextmanager
def tenant_context(
    user_id: str | None,
    user_role: str | None = None,
    tenant_id: str | None = None,
) -> Iterator[None]:
    """Context manager helper for temporary tenant binding."""
    token = set_tenant_context(user_id=user_id, user_role=user_role, tenant_id=tenant_id)
    try:
        yield
    finally:
        reset_tenant_context(token)

import os

from fastapi import HTTPException, Request

from deerflow.database.tenant_service import tenant_role_has_admin_capability

PLATFORM_ADMIN_ROLES = {"platform_admin", "admin"}


def _is_tenant_admin(request: Request) -> bool:
    tenant_role = getattr(request.state, "tenant_role", None)
    return tenant_role_has_admin_capability(tenant_role)


def _is_global_admin(request: Request) -> bool:
    role = getattr(request.state, "user_role", None)
    if not isinstance(role, str):
        return False
    return role.lower() in PLATFORM_ADMIN_ROLES


def _is_tenant_admin_enforced() -> bool:
    """Whether admin routes must rely on tenant membership roles."""
    value = os.getenv("DEERFLOW_ADMIN_REQUIRE_TENANT_ROLE", "true").strip().lower()
    return value in {"1", "true", "yes"}


def _is_admin_allowed(request: Request) -> bool:
    if _is_tenant_admin_enforced():
        return _is_tenant_admin(request)
    return _is_tenant_admin(request) or _is_global_admin(request)

def require_platform_admin(request: Request) -> None:
    allowed = _is_global_admin(request)
    if not allowed:
        raise HTTPException(status_code=403, detail="Platform admin access required")
    if getattr(request.state, "must_change_password", False):
        raise HTTPException(
            status_code=403, 
            detail="Must change initial password before accessing admin routes",
            headers={"X-Must-Change-Password": "true"}
        )

def require_admin(request: Request) -> None:
    allowed = _is_admin_allowed(request)

    if not allowed:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if getattr(request.state, "must_change_password", False):
        raise HTTPException(
            status_code=403, 
            detail="Must change initial password before accessing admin routes",
            headers={"X-Must-Change-Password": "true"}
        )

def require_admin_base(request: Request) -> None:
    # Bootstrap flow needs a global-admin escape hatch to change the initial password
    # before tenant membership is guaranteed to exist.
    bootstrap_password_change = bool(getattr(request.state, "must_change_password", False)) and _is_global_admin(request)

    if not (_is_admin_allowed(request) or bootstrap_password_change):
        raise HTTPException(status_code=403, detail="Admin access required")


def require_tenant_context(request: Request) -> str:
    """Require tenant context for tenant-scoped endpoints."""
    tenant_id = getattr(request.state, "tenant_id", None)
    if not isinstance(tenant_id, str) or not tenant_id.strip():
        raise HTTPException(status_code=400, detail="Tenant context is required")
    return tenant_id

def require_tenant_admin(request: Request) -> str:
    """Require tenant-admin membership for tenant-governance endpoints."""
    tenant_id = getattr(request.state, "tenant_id", None)
    if not isinstance(tenant_id, str) or not tenant_id.strip():
        raise HTTPException(status_code=400, detail="Tenant context is required")
    if not _is_tenant_admin(request):
        raise HTTPException(status_code=403, detail="Tenant admin access required")
    return tenant_id


def require_config_write_access(request: Request) -> None:
    """Allow configuration writes only for tenant admins in tenant context."""
    if _is_tenant_admin(request):
        return
    raise HTTPException(status_code=403, detail="Configuration write access denied")

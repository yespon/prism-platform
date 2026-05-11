import logging
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.gateway.authorization import require_config_write_access, require_tenant_admin, require_tenant_context
from deerflow.database.user_config_service import (
    _build_default_payloads,
    get_available_mcp_servers,
    get_user_mcp_servers,
    list_tenant_shared_mcp_servers,
    replace_tenant_shared_mcp_servers,
    replace_user_mcp_servers,
    set_tenant_mcp_server_enabled,
    update_mcp_server_health,
)
from deerflow.mcp.cache import reset_mcp_tools_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["mcp"])


class McpOAuthConfigResponse(BaseModel):
    """OAuth configuration for an MCP server."""

    enabled: bool = Field(default=True, description="Whether OAuth token injection is enabled")
    token_url: str = Field(default="", description="OAuth token endpoint URL")
    grant_type: Literal["client_credentials", "refresh_token"] = Field(default="client_credentials", description="OAuth grant type")
    client_id: str | None = Field(default=None, description="OAuth client ID")
    client_secret: str | None = Field(default=None, description="OAuth client secret")
    refresh_token: str | None = Field(default=None, description="OAuth refresh token")
    scope: str | None = Field(default=None, description="OAuth scope")
    audience: str | None = Field(default=None, description="OAuth audience")
    token_field: str = Field(default="access_token", description="Token response field containing access token")
    token_type_field: str = Field(default="token_type", description="Token response field containing token type")
    expires_in_field: str = Field(default="expires_in", description="Token response field containing expires-in seconds")
    default_token_type: str = Field(default="Bearer", description="Default token type when response omits token_type")
    refresh_skew_seconds: int = Field(default=60, description="Refresh this many seconds before expiry")
    extra_token_params: dict[str, str] = Field(default_factory=dict, description="Additional form params sent to token endpoint")


class McpServerConfigResponse(BaseModel):
    """Response model for MCP server configuration."""

    enabled: bool = Field(default=True, description="Whether this MCP server is enabled")
    type: str = Field(default="stdio", description="Transport type: 'stdio', 'sse', or 'http'")
    command: str | None = Field(default=None, description="Command to execute to start the MCP server (for stdio type)")
    args: list[str] = Field(default_factory=list, description="Arguments to pass to the command (for stdio type)")
    env: dict[str, str] = Field(default_factory=dict, description="Environment variables for the MCP server")
    url: str | None = Field(default=None, description="URL of the MCP server (for sse or http type)")
    headers: dict[str, str] = Field(default_factory=dict, description="HTTP headers to send (for sse or http type)")
    oauth: McpOAuthConfigResponse | None = Field(default=None, description="OAuth configuration for MCP HTTP/SSE servers")
    description: str = Field(default="", description="Human-readable description of what this MCP server provides")
    is_builtin: bool = Field(default=False, description="Whether this is a system built-in MCP server")
    health_status: str = Field(default="unknown", description="Last known health status: connected, disconnected, or unknown")
    last_checked_at: str | None = Field(default=None, description="ISO timestamp of last health check")


class McpConfigResponse(BaseModel):
    """Response model for MCP configuration."""

    mcp_servers: dict[str, McpServerConfigResponse] = Field(
        default_factory=dict,
        description="Map of MCP server name to configuration",
    )


class McpConfigUpdateRequest(BaseModel):
    """Request model for updating MCP configuration."""

    mcp_servers: dict[str, McpServerConfigResponse] = Field(
        ...,
        description="Map of MCP server name to configuration",
    )


class AvailableMcpServerResponse(McpServerConfigResponse):
    name: str = Field(..., description="MCP server name")
    scope: str = Field(..., description="Resource scope: global, tenant, user")
    source: str = Field(..., description="Server source classification")
    managed_by_current_user: bool = Field(..., description="Whether current user can manage this server")
    effective_permissions: list[str] = Field(default_factory=list, description="Effective permissions for current user")


class AvailableMcpConfigResponse(BaseModel):
    mcp_servers: list[AvailableMcpServerResponse] = Field(default_factory=list)


class TenantMcpEnabledUpdateRequest(BaseModel):
    enabled: bool = Field(..., description="Whether tenant-scope MCP server should be enabled")


class TenantMcpEnabledUpdateResponse(BaseModel):
    name: str = Field(..., description="MCP server name")
    enabled: bool = Field(..., description="Current enabled status")
    source: str = Field(..., description="Server source: tenant_shared or platform_builtin")


def _is_platform_admin(request: Request) -> bool:
    role = getattr(request.state, "user_role", None)
    return isinstance(role, str) and role.lower() in {"platform_admin", "admin"}


def _is_tenant_admin(request: Request) -> bool:
    role = getattr(request.state, "tenant_role", None)
    return isinstance(role, str) and role.lower() == "tenant_admin"


@router.get(
    "/mcp/config",
    response_model=McpConfigResponse,
    summary="Get MCP Configuration",
    description="Retrieve the current Model Context Protocol (MCP) server configurations.",
)
async def get_mcp_configuration(request: Request) -> McpConfigResponse:
    """Get the current MCP configuration.

    Returns:
        The current MCP configuration with all servers.

    Example:
        ```json
        {
            "mcp_servers": {
                "github": {
                    "enabled": true,
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-github"],
                    "env": {"GITHUB_TOKEN": "ghp_xxx"},
                    "description": "GitHub MCP server for repository operations"
                }
            }
        }
        ```
    """
    require_tenant_context(request)
    rows = await get_user_mcp_servers(request.state.user_id, tenant_id=getattr(request.state, "tenant_id", None))
    
    _, default_ext = _build_default_payloads()
    default_mcp_servers = default_ext.get("mcp_servers") or default_ext.get("mcpServers", {})
    default_names = set(default_mcp_servers.keys())

    return McpConfigResponse(
        mcp_servers={
            row.name: McpServerConfigResponse(
                enabled=row.enabled,
                type=row.transport_type,
                command=row.command,
                args=row.args or [],
                env=row.env or {},
                url=row.url,
                headers=row.headers or {},
                oauth=row.oauth,
                description=row.description,
                is_builtin=(row.name in default_names),
                health_status=row.health_status,
                last_checked_at=row.last_checked_at.isoformat() if row.last_checked_at else None,
            )
            for row in rows
        }
    )


@router.get(
    "/mcp/available",
    response_model=AvailableMcpConfigResponse,
    summary="List Available MCP Servers",
    description="Return merged global, tenant-shared and user-private MCP server list.",
)
async def get_available_mcp_configuration(request: Request) -> AvailableMcpConfigResponse:
    tenant_id = require_tenant_context(request)
    rows = await get_available_mcp_servers(
        request.state.user_id,
        tenant_id,
        is_tenant_admin=_is_tenant_admin(request),
        is_platform_admin=_is_platform_admin(request),
    )
    return AvailableMcpConfigResponse(mcp_servers=[AvailableMcpServerResponse.model_validate(row) for row in rows])


@router.get(
    "/tenants/mcp/config",
    response_model=McpConfigResponse,
    summary="Get Tenant Shared MCP Configuration",
    dependencies=[Depends(require_tenant_admin)],
)
async def get_tenant_mcp_configuration(request: Request) -> McpConfigResponse:
    tenant_id = require_tenant_context(request)
    rows = await list_tenant_shared_mcp_servers(tenant_id)
    return McpConfigResponse(
        mcp_servers={
            row.name: McpServerConfigResponse(
                enabled=row.enabled,
                type=row.transport_type,
                command=row.command,
                args=row.args or [],
                env=row.env or {},
                url=row.url,
                headers=row.headers or {},
                oauth=row.oauth,
                description=row.description,
                is_builtin=False,
                health_status=row.health_status,
                last_checked_at=row.last_checked_at.isoformat() if row.last_checked_at else None,
            )
            for row in rows
        }
    )


@router.put(
    "/tenants/mcp/config",
    response_model=McpConfigResponse,
    summary="Replace Tenant Shared MCP Configuration",
    dependencies=[Depends(require_tenant_admin)],
)
async def update_tenant_mcp_configuration(request: Request, body: McpConfigUpdateRequest) -> McpConfigResponse:
    tenant_id = require_tenant_context(request)
    payload = {name: server.model_dump() for name, server in body.mcp_servers.items()}
    await replace_tenant_shared_mcp_servers(tenant_id, payload)
    reset_mcp_tools_cache()
    return McpConfigResponse(mcp_servers=body.mcp_servers)


@router.patch(
    "/tenants/mcp/{server_name}/enabled",
    response_model=TenantMcpEnabledUpdateResponse,
    summary="Enable or Disable Tenant-Visible MCP Server",
    dependencies=[Depends(require_tenant_admin)],
)
async def toggle_tenant_mcp_server_enabled(
    request: Request,
    server_name: str,
    body: TenantMcpEnabledUpdateRequest,
) -> TenantMcpEnabledUpdateResponse:
    tenant_id = require_tenant_context(request)
    try:
        row, source = await set_tenant_mcp_server_enabled(
            tenant_id,
            server_name,
            enabled=body.enabled,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    reset_mcp_tools_cache()
    return TenantMcpEnabledUpdateResponse(name=row.name, enabled=bool(row.enabled), source=source)


@router.put(
    "/mcp/config",
    response_model=McpConfigResponse,
    summary="Update MCP Configuration",
    description="Update Model Context Protocol (MCP) server configurations and save to file.",
)
async def update_mcp_configuration(request: Request, body: McpConfigUpdateRequest) -> McpConfigResponse:
    """Update the MCP configuration.

    This will:
    1. Save the new configuration to the mcp_config.json file
    2. Reload the configuration cache
    3. Reset MCP tools cache to trigger reinitialization

    Args:
        request: The new MCP configuration to save.

    Returns:
        The updated MCP configuration.

    Raises:
        HTTPException: 500 if the configuration file cannot be written.

    Example Request:
        ```json
        {
            "mcp_servers": {
                "github": {
                    "enabled": true,
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-github"],
                    "env": {"GITHUB_TOKEN": "$GITHUB_TOKEN"},
                    "description": "GitHub MCP server for repository operations"
                }
            }
        }
        ```
    """
    require_tenant_context(request)
    require_config_write_access(request)
    try:
        payload = {name: server.model_dump() for name, server in body.mcp_servers.items()}
        await replace_user_mcp_servers(
            request.state.user_id,
            payload,
            tenant_id=getattr(request.state, "tenant_id", None),
        )
        reset_mcp_tools_cache()
        return McpConfigResponse(mcp_servers=body.mcp_servers)

    except Exception as e:
        logger.error(f"Failed to update MCP configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update MCP configuration: {str(e)}")


@router.post(
    "/mcp/ping",
    summary="Test an MCP Server Connection"
)
async def ping_mcp_server(request: Request, server: McpServerConfigResponse):
    require_tenant_context(request)
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
        params = {"transport": server.type}
        if server.type == "stdio":
            if not server.command:
                raise HTTPException(status_code=400, detail="Command required for stdio transport")
            params.update({"command": server.command, "args": server.args, "env": server.env})
        else:
            if not server.url:
                raise HTTPException(status_code=400, detail="URL required for sse/http transport")
            params.update({"url": server.url, "headers": server.headers})
            
        servers_config = {"test_ping": params}
        client = MultiServerMCPClient(servers_config)
        tools = await client.get_tools()

        tool_list = [
            {
                "name": t.name,
                "description": t.description or "",
                "input_schema": getattr(t, "args_schema", {}) or {},
            }
            for t in tools
        ]
        return {"success": True, "tools_count": len(tools), "tools": tool_list}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


@router.post(
    "/mcp/check-health/{server_name}",
    summary="Check MCP Server Health",
    dependencies=[Depends(require_tenant_admin)],
)
async def check_mcp_server_health(request: Request, server_name: str):
    """Test connectivity to a stored MCP server and persist health status."""
    tenant_id = require_tenant_context(request)
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient

        rows = await list_tenant_shared_mcp_servers(tenant_id)
        server_rows = [r for r in rows if r.name == server_name]
        if not server_rows:
            # Check built-in / available servers
            all_rows = await get_available_mcp_servers(
                request.state.user_id,
                tenant_id,
                is_tenant_admin=True,
                is_platform_admin=_is_platform_admin(request),
            )
            server_rows = [r for r in all_rows if r.get("name") == server_name]
            if not server_rows:
                raise HTTPException(status_code=404, detail=f"MCP server '{server_name}' not found")

        row = server_rows[0]
        if isinstance(row, dict):
            params = {"transport": row.get("type", row.get("transport_type", "stdio"))}
            if params["transport"] == "stdio":
                params.update({
                    "command": row.get("command"),
                    "args": row.get("args", []),
                    "env": row.get("env", {}),
                })
            else:
                params.update({
                    "url": row.get("url"),
                    "headers": row.get("headers", {}),
                })
        else:
            params = {"transport": row.transport_type}
            if row.transport_type == "stdio":
                params.update({"command": row.command, "args": row.args, "env": row.env})
            else:
                params.update({"url": row.url, "headers": row.headers})

        servers_config = {server_name: params}
        client = MultiServerMCPClient(servers_config)
        tools = await client.get_tools()
        now = datetime.now(UTC)
        await update_mcp_server_health(tenant_id, server_name, "connected", now)

        tool_list = [
            {
                "name": t.name,
                "description": t.description or "",
                "input_schema": getattr(t, "args_schema", {}) or {},
            }
            for t in tools
        ]
        return {
            "success": True,
            "tools_count": len(tools),
            "tools": tool_list,
            "health_status": "connected",
            "last_checked_at": now.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        now = datetime.now(UTC)
        try:
            await update_mcp_server_health(tenant_id, server_name, "disconnected", now)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Health check failed: {str(e)}")


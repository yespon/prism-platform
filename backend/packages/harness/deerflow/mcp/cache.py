"""Cache for MCP tools to avoid repeated loading."""

import asyncio
import logging

from langchain_core.tools import BaseTool

from deerflow.config.tenant_context import get_current_tenant_id, get_current_user_id

logger = logging.getLogger(__name__)

# Per-tenant + per-user MCP tool cache, keyed by "tenant_id:user_id"
_mcp_tools_cache: dict[str, list[BaseTool]] = {}
_cache_initialized: set[str] = set()
_initialization_lock = asyncio.Lock()


def _make_cache_key(tenant_id: str | None, user_id: str | None) -> str:
    return f"{tenant_id or '__no_tenant__'}:{user_id or '__no_user__'}"


async def initialize_mcp_tools(tenant_id: str | None = None, user_id: str | None = None) -> list[BaseTool]:
    """Initialize and cache MCP tools for a specific tenant+user.

    Returns:
        List of LangChain tools from all enabled MCP servers.
    """
    cache_key = _make_cache_key(tenant_id, user_id)

    async with _initialization_lock:
        if cache_key in _cache_initialized:
            return _mcp_tools_cache.get(cache_key, [])

        from deerflow.mcp.tools import get_mcp_tools

        logger.info(f"Initializing MCP tools for cache key: {cache_key}")
        tools = await get_mcp_tools(user_id=user_id, tenant_id=tenant_id)
        _mcp_tools_cache[cache_key] = tools
        _cache_initialized.add(cache_key)
        logger.info(f"MCP tools initialized for {cache_key}: {len(tools)} tool(s) loaded")

        return tools


def get_cached_mcp_tools() -> list[BaseTool]:
    """Get cached MCP tools with lazy initialization, scoped to current tenant+user.

    If tools are not initialized for the current tenant+user, automatically initializes them.
    Callers must explicitly invoke reset_mcp_tools_cache() when MCP configuration changes
    (e.g. via API write operations).
    """
    tenant_id = get_current_tenant_id()
    user_id = get_current_user_id()
    cache_key = _make_cache_key(tenant_id, user_id)

    if cache_key not in _cache_initialized:
        logger.info(f"MCP tools not initialized for {cache_key}, performing lazy initialization...")
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run, initialize_mcp_tools(tenant_id, user_id)
                    )
                    future.result()
            else:
                loop.run_until_complete(initialize_mcp_tools(tenant_id, user_id))
        except RuntimeError:
            asyncio.run(initialize_mcp_tools(tenant_id, user_id))
        except Exception as e:
            logger.error(f"Failed to lazy-initialize MCP tools for {cache_key}: {e}")
            return []

    return _mcp_tools_cache.get(cache_key, [])


def reset_mcp_tools_cache() -> None:
    """Reset the MCP tools cache for ALL tenants.

    Must be called after MCP configuration is modified (e.g. by API write operations),
    so the next get_cached_mcp_tools() call triggers a fresh load from the database.
    """
    _mcp_tools_cache.clear()
    _cache_initialized.clear()
    logger.info("MCP tools cache reset (all tenants)")

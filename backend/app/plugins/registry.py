"""Plugin registry — load, enable, disable plugins from config."""

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PluginDefinition:
    """Static metadata for a plugin."""

    key: str
    name: str
    description: str
    default_enabled: bool = True
    router_import: str | None = None       # e.g. "app.gateway.routers.alerts"
    router_attr: str | None = None         # e.g. "router"
    router_prefix: str | None = None       # e.g. "/api"
    frontend_nav_ids: list[str] = field(default_factory=list)  # e.g. ["incidents", "/tenant-admin/alerts"]


# ---------------------------------------------------------------------------
# Built-in plugin definitions
# ---------------------------------------------------------------------------

PLUGIN_DEFINITIONS: dict[str, PluginDefinition] = {
    "ops-alerting": PluginDefinition(
        key="ops-alerting",
        name="Alerting & Incident Management",
        description="Webhook/Alertmanager ingestion, signal dedup, incident lifecycle, AI diagnosis, escalation rules",
        router_import="app.gateway.routers.alerts",
        router_attr="router",
        router_prefix=None,
        frontend_nav_ids=["incidents", "/tenant-admin/alerts", "/tenant-admin/im"],
    ),
    "ops-terminal": PluginDefinition(
        key="ops-terminal",
        name="Terminal Agent",
        description="AI-assisted terminal with security governance, multi-host asset management, command approval",
        router_import="app.gateway.routers.terminal",
        router_attr="router",
        router_prefix="/api/v1/terminal",
        frontend_nav_ids=["terminal"],
    ),
    "ops-assets": PluginDefinition(
        key="ops-assets",
        name="Asset & Credential Management",
        description="Host inventory, SSH keychain, asset groups",
        router_import="app.gateway.routers.assets",
        router_attr="router",
        router_prefix=None,
        frontend_nav_ids=[],
    ),
}


def load_plugin_config(raw_config: dict[str, Any] | None) -> dict[str, bool]:
    """Parse plugin toggles from config.yaml `plugins` section.

    Args:
        raw_config: The ``plugins`` dict from config.yaml, e.g.
            {"ops-alerting": {"enabled": true}, "ops-terminal": {"enabled": false}}

    Returns:
        Dict mapping plugin key → enabled (bool).  Plugins not listed default to True.
    """
    if not raw_config:
        return {key: True for key in PLUGIN_DEFINITIONS}

    result: dict[str, bool] = {}
    for key, defn in PLUGIN_DEFINITIONS.items():
        entry = raw_config.get(key, {})
        if isinstance(entry, dict):
            result[key] = entry.get("enabled", defn.default_enabled)
        else:
            result[key] = defn.default_enabled
    return result

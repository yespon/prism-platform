"""Tests for the plugin system — SPI protocols and registry."""

from __future__ import annotations

from typing import assert_type

import pytest

from app.plugins import EventSource, Executor, Notifier
from app.plugins.registry import (
    PLUGIN_DEFINITIONS,
    PluginDefinition,
    enabled_plugins,
    load_plugin_config,
)


# ---------------------------------------------------------------------------
# SPI Protocol conformance
# ---------------------------------------------------------------------------


class FakeEventSource:
    """Minimal conforming implementation of EventSource."""

    async def subscribe(self, handler: object) -> None:
        pass

    async def health_check(self) -> dict:
        return {"status": "ok"}


class FakeExecutor:
    """Minimal conforming implementation of Executor."""

    async def execute(self, ctx: dict) -> dict:
        return {"result": "done"}

    def capabilities(self) -> list[str]:
        return ["fake"]


class FakeNotifier:
    """Minimal conforming implementation of Notifier."""

    async def send(self, target: str, content: dict) -> None:
        pass


class TestSPIProtocols:
    def test_event_source_is_runtime_checkable(self):
        """EventSource protocol should be runtime_checkable."""
        instance = FakeEventSource()
        assert isinstance(instance, EventSource)

    def test_executor_is_runtime_checkable(self):
        """Executor protocol should be runtime_checkable."""
        instance = FakeExecutor()
        assert isinstance(instance, Executor)

    def test_notifier_is_runtime_checkable(self):
        """Notifier protocol should be runtime_checkable."""
        instance = FakeNotifier()
        assert isinstance(instance, Notifier)

    def test_non_conforming_class_not_event_source(self):
        """A class without subscribe/health_check should not pass isinstance check."""

        class NotEventSource:
            pass

        assert not isinstance(NotEventSource(), EventSource)

    @pytest.mark.anyio
    async def test_event_source_health_check_returns_dict(self):
        """health_check() should return a dict."""
        es = FakeEventSource()
        result = await es.health_check()
        assert isinstance(result, dict)


# ---------------------------------------------------------------------------
# PluginDefinition dataclass
# ---------------------------------------------------------------------------


class TestPluginDefinition:
    def test_minimal_definition(self):
        """PluginDefinition can be created with only required fields."""
        p = PluginDefinition(key="test", name="Test", description="A test plugin")
        assert p.key == "test"
        assert p.name == "Test"
        assert p.description == "A test plugin"
        assert p.default_enabled is True
        assert p.router_import is None
        assert p.router_attr is None
        assert p.router_prefix is None
        assert p.lifespan_hooks is False
        assert p.frontend_nav_ids == []

    def test_full_definition(self):
        """PluginDefinition can be created with all fields."""
        p = PluginDefinition(
            key="ops-test",
            name="Test Plugin",
            description="A full test plugin",
            default_enabled=False,
            router_import="app.gateway.routers.test",
            router_attr="router",
            router_prefix="/api/v1/test",
            lifespan_hooks=True,
            frontend_nav_ids=["test-nav"],
        )
        assert p.default_enabled is False
        assert p.router_import == "app.gateway.routers.test"
        assert p.router_attr == "router"
        assert p.router_prefix == "/api/v1/test"
        assert p.lifespan_hooks is True
        assert p.frontend_nav_ids == ["test-nav"]


# ---------------------------------------------------------------------------
# PLUGIN_DEFINITIONS dict
# ---------------------------------------------------------------------------


class TestPluginDefinitions:
    def test_has_expected_keys(self):
        """PLUGIN_DEFINITIONS should contain the three built-in plugins."""
        assert set(PLUGIN_DEFINITIONS) == {"ops-alerting", "ops-terminal", "ops-assets"}

    def test_ops_alerting_definition(self):
        """ops-alerting plugin should have correct metadata."""
        p = PLUGIN_DEFINITIONS["ops-alerting"]
        assert p.key == "ops-alerting"
        assert p.name == "Alerting & Incident Management"
        assert p.router_import == "app.gateway.routers.alerts"
        assert p.router_attr == "router"
        assert p.lifespan_hooks is True
        assert "incidents" in p.frontend_nav_ids
        assert "tenant-alerts" in p.frontend_nav_ids
        assert "tenant-im" in p.frontend_nav_ids

    def test_ops_terminal_definition(self):
        """ops-terminal plugin should have correct metadata."""
        p = PLUGIN_DEFINITIONS["ops-terminal"]
        assert p.key == "ops-terminal"
        assert p.name == "Terminal Agent"
        assert p.router_import == "app.gateway.routers.terminal"
        assert p.router_attr == "router"
        assert p.router_prefix == "/api/v1/terminal"
        assert p.lifespan_hooks is False
        assert p.frontend_nav_ids == ["terminal"]

    def test_ops_assets_definition(self):
        """ops-assets plugin should have correct metadata."""
        p = PLUGIN_DEFINITIONS["ops-assets"]
        assert p.key == "ops-assets"
        assert p.name == "Asset & Credential Management"
        assert p.router_import == "app.gateway.routers.assets"
        assert p.router_attr == "router"
        assert p.router_prefix is None
        assert p.lifespan_hooks is False
        assert p.frontend_nav_ids == []


# ---------------------------------------------------------------------------
# load_plugin_config()
# ---------------------------------------------------------------------------


class TestLoadPluginConfig:
    def test_returns_all_enabled_when_config_is_none(self):
        """When raw_config is None, all plugins should default to enabled."""
        result = load_plugin_config(None)
        assert result == {"ops-alerting": True, "ops-terminal": True, "ops-assets": True}

    def test_returns_all_enabled_when_config_is_empty(self):
        """When raw_config is empty dict, all plugins should default to enabled."""
        result = load_plugin_config({})
        assert result == {"ops-alerting": True, "ops-terminal": True, "ops-assets": True}

    def test_override_individual_plugin(self):
        """A specific plugin should be overridable."""
        result = load_plugin_config({"ops-terminal": {"enabled": False}})
        assert result["ops-terminal"] is False
        assert result["ops-alerting"] is True
        assert result["ops-assets"] is True

    def test_override_all_plugins(self):
        """All plugins should be overridable."""
        result = load_plugin_config({
            "ops-alerting": {"enabled": False},
            "ops-terminal": {"enabled": False},
            "ops-assets": {"enabled": True},
        })
        assert result["ops-alerting"] is False
        assert result["ops-terminal"] is False
        assert result["ops-assets"] is True

    def test_invalid_entry_falls_back_to_default(self):
        """When config entry is not a dict, fall back to default_enabled."""
        result = load_plugin_config({"ops-terminal": "invalid"})
        assert result["ops-terminal"] is True  # ops-terminal default_enabled is True

    def test_ops_alerting_default_enabled_is_true(self):
        """ops-alerting has default_enabled=True, so it should be enabled by default."""
        result = load_plugin_config({})
        assert result["ops-alerting"] is True


# ---------------------------------------------------------------------------
# enabled_plugins()
# ---------------------------------------------------------------------------


class TestEnabledPlugins:
    def test_returns_all_plugin_definitions_when_all_enabled(self):
        """When all plugins are enabled, all definitions should be returned."""
        states = {"ops-alerting": True, "ops-terminal": True, "ops-assets": True}
        result = enabled_plugins(states)
        assert len(result) == 3
        assert all(isinstance(p, PluginDefinition) for p in result)
        assert {p.key for p in result} == {"ops-alerting", "ops-terminal", "ops-assets"}

    def test_filters_disabled_plugins(self):
        """Disabled plugins should not be in the result."""
        states = {"ops-alerting": True, "ops-terminal": False, "ops-assets": True}
        result = enabled_plugins(states)
        assert len(result) == 2
        assert {p.key for p in result} == {"ops-alerting", "ops-assets"}

    def test_returns_empty_list_when_all_disabled(self):
        """When all plugins are disabled, an empty list should be returned."""
        states = {"ops-alerting": False, "ops-terminal": False, "ops-assets": False}
        result = enabled_plugins(states)
        assert result == []

    def test_unknown_key_in_states_is_ignored(self):
        """Unknown keys in plugin_states should be ignored."""
        states = {"ops-alerting": True, "ops-terminal": True, "ops-assets": True, "unknown": True}
        result = enabled_plugins(states)
        assert len(result) == 3
        assert {p.key for p in result} == {"ops-alerting", "ops-terminal", "ops-assets"}
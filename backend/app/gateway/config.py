import os
from typing import Any

from pydantic import BaseModel, Field


class GatewayConfig(BaseModel):
    """Configuration for the API Gateway."""

    host: str = Field(default="0.0.0.0", description="Host to bind the gateway server")
    port: int = Field(default=8001, description="Port to bind the gateway server")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"], description="Allowed CORS origins")
    plugins: dict[str, dict[str, Any]] = Field(default_factory=dict, description="Plugin enable/disable toggles")


_gateway_config: GatewayConfig | None = None
_plugin_states: dict[str, bool] | None = None


def get_gateway_config() -> GatewayConfig:
    """Get gateway config, loading from environment if available."""
    global _gateway_config
    if _gateway_config is None:
        cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
        _gateway_config = GatewayConfig(
            host=os.getenv("GATEWAY_HOST", "0.0.0.0"),
            port=int(os.getenv("GATEWAY_PORT", "8001")),
            cors_origins=cors_origins_str.split(","),
        )
    return _gateway_config


def set_gateway_config(config: GatewayConfig) -> None:
    """Set gateway config (called from app.py lifespan after loading config.yaml)."""
    global _gateway_config, _plugin_states
    _gateway_config = config
    _plugin_states = None  # invalidate cache


def get_plugin_states() -> dict[str, bool]:
    """Return cached plugin enabled states.  Lazy-loaded from app config."""
    global _plugin_states
    if _plugin_states is None:
        from app.plugins.registry import load_plugin_config
        cfg = get_gateway_config()
        _plugin_states = load_plugin_config(cfg.plugins)
    return _plugin_states

"""Plugin system — SPI definitions and registry.

Plugins are optional capability modules that can be enabled/disabled
per deployment via config.yaml.  Each plugin may register:
  - FastAPI routers (mounted on the gateway)
  - Lifespan hooks (startup/shutdown)
  - Frontend nav items (exposed via /api/plugins)
"""

from typing import Protocol, runtime_checkable

# ---------------------------------------------------------------------------
# SPI — Service Provider Interfaces
# ---------------------------------------------------------------------------


@runtime_checkable
class EventSource(Protocol):
    """Produces workflow trigger signals (webhook, cron, message queue, etc.)."""

    async def subscribe(self, handler: object) -> None: ...
    async def health_check(self) -> dict: ...


@runtime_checkable
class Executor(Protocol):
    """Performs a concrete action inside a workflow step."""

    async def execute(self, ctx: dict) -> dict: ...
    def capabilities(self) -> list[str]: ...


@runtime_checkable
class Notifier(Protocol):
    """Pushes results to external channels (IM, email, webhook, etc.)."""

    async def send(self, target: str, content: dict) -> None: ...
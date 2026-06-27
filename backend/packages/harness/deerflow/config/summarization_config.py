"""Configuration for conversation summarization.

Summarization config is managed via tenant-admin settings (stored in DB),
NOT in config.yaml. Default values are defined here as code constants.
"""

import logging
from typing import Literal

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

ContextSizeType = Literal["fraction", "tokens", "messages"]

# ── Default values (used when no DB config exists) ──────────────────────────
DEFAULT_ENABLED = True
DEFAULT_TRIGGER_TOKENS = 12000
DEFAULT_TRIGGER_MESSAGES = 30
DEFAULT_KEEP_MESSAGES = 15
DEFAULT_TRIM_TOKENS_TO_SUMMARIZE = 12000


class ContextSize(BaseModel):
    """Context size specification for trigger or keep parameters."""

    type: ContextSizeType = Field(description="Type of context size specification")
    value: int | float = Field(description="Value for the context size specification")

    def to_tuple(self) -> tuple[ContextSizeType, int | float]:
        """Convert to tuple format expected by SummarizationMiddleware."""
        return (self.type, self.value)


class SummarizationConfig(BaseModel):
    """Configuration for automatic conversation summarization."""

    enabled: bool = Field(
        default=DEFAULT_ENABLED,
        description="Whether to enable automatic conversation summarization",
    )
    model_name: str | None = Field(
        default=None,
        description="Model name to use for summarization (None = use conversation model)",
    )
    trigger: ContextSize | list[ContextSize] | None = Field(
        default=None,
        description="One or more thresholds that trigger summarization.",
    )
    keep: ContextSize = Field(
        default_factory=lambda: ContextSize(type="messages", value=DEFAULT_KEEP_MESSAGES),
        description="Context retention policy after summarization.",
    )
    trim_tokens_to_summarize: int | None = Field(
        default=DEFAULT_TRIM_TOKENS_TO_SUMMARIZE,
        description="Maximum tokens when preparing messages for summarization.",
    )
    summary_prompt: str | None = Field(
        default=None,
        description="Custom prompt template for generating summaries.",
    )

    @classmethod
    def default_config(cls) -> "SummarizationConfig":
        """Return a config with sensible defaults (no DB config needed)."""
        return cls(
            enabled=DEFAULT_ENABLED,
            trigger=[
                ContextSize(type="tokens", value=DEFAULT_TRIGGER_TOKENS),
                ContextSize(type="messages", value=DEFAULT_TRIGGER_MESSAGES),
            ],
            keep=ContextSize(type="messages", value=DEFAULT_KEEP_MESSAGES),
            trim_tokens_to_summarize=DEFAULT_TRIM_TOKENS_TO_SUMMARIZE,
        )


# Global configuration instance — starts with code defaults
_summarization_config: SummarizationConfig = SummarizationConfig.default_config()


def get_summarization_config() -> SummarizationConfig:
    """Get the current summarization configuration."""
    return _summarization_config


def set_summarization_config(config: SummarizationConfig) -> None:
    """Set the summarization configuration."""
    global _summarization_config
    _summarization_config = config


def load_summarization_config_from_payload(app_payload: dict) -> None:
    """Load summarization config from a DB app_payload dict.

    Only updates if the payload contains a 'summarization' key.
    Falls back to code defaults otherwise.
    """
    global _summarization_config

    summarization_dict = app_payload.get("summarization")
    if not summarization_dict or not isinstance(summarization_dict, dict):
        # No DB config — keep code defaults
        return

    try:
        _summarization_config = SummarizationConfig(**summarization_dict)
        logger.info("Loaded summarization config from DB payload")
    except Exception:
        logger.warning(
            "Failed to parse summarization config from DB payload, keeping defaults",
            exc_info=True,
        )


# Legacy alias — kept for backward compatibility with any callers that still
# pass a flat dict (e.g. old config.yaml loading path, now unused).
load_summarization_config_from_dict = load_summarization_config_from_payload

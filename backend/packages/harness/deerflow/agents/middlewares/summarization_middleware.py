"""Middleware for automatic conversation summarization with marked summary messages.

This middleware wraps LangChain's SummarizationMiddleware to add frontend-compatible
marking for summary messages.
"""

import logging
from typing import NotRequired, override

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain.agents.middleware.summarization import SummarizationMiddleware
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from deerflow.config.summarization_config import get_summarization_config
from deerflow.models.factory import create_chat_model

logger = logging.getLogger(__name__)


class MarkedSummaryHumanMessage(HumanMessage):
    """A HumanMessage that is marked as a conversation summary for frontend display."""

    def __init__(self, content: str, **kwargs):
        # Ensure additional_kwargs exists and mark it as summary
        additional_kwargs = kwargs.get("additional_kwargs", {})
        additional_kwargs["is_summary"] = True
        kwargs["additional_kwargs"] = additional_kwargs
        super().__init__(content=content, **kwargs)


class DeerflowSummarizationMiddleware(AgentMiddleware):
    """Custom summarization middleware that marks summary messages for frontend display.

    This middleware wraps LangChain's SummarizationMiddleware to ensure that summary
    messages are marked with additional_kwargs.is_summary = True, allowing the
    frontend to render them with special styling (collapsed card instead of user bubble).
    """

    state_schema = AgentState

    def __init__(self, conversation_model_name: str) -> None:
        config = get_summarization_config()

        if not config.enabled:
            logger.warning(
                "DeerflowSummarizationMiddleware initialized but summarization is disabled in config"
            )
            self._middleware = None
            return

        # Use the config-specified model if set, otherwise fall back to the conversation's model
        summarization_model_name = config.model_name or conversation_model_name

        # Resolve via factory so provider-specific settings (api_key, base_url, etc.) are applied
        try:
            summarization_model = create_chat_model(name=summarization_model_name)
        except ValueError:
            logger.warning(
                "Model '%s' not found for summarization; skipping summarization.",
                summarization_model_name,
            )
            self._middleware = None
            return

        # Build trigger config (LangChain expects tuples, not dicts or Pydantic objects)
        trigger = config.trigger
        if trigger is None:
            trigger = ("tokens", 4000)
        elif isinstance(trigger, list):
            trigger = [t.to_tuple() for t in trigger]
        else:
            trigger = trigger.to_tuple()

        # Convert keep to tuple format
        keep_tuple = config.keep.to_tuple()

        # Initialize the base SummarizationMiddleware with custom message class
        self._middleware = SummarizationMiddleware(
            model=summarization_model,
            trigger=trigger,
            keep=keep_tuple,
            trim_tokens_to_summarize=config.trim_tokens_to_summarize,
            prompt_template=config.summary_prompt,
            message_class=MarkedSummaryHumanMessage,
        )

    @override
    def __call__(
        self,
        state: AgentState,
        runtime: Runtime[AgentState],
    ):
        """Delegate to the underlying SummarizationMiddleware."""
        if self._middleware is None:
            return None
        return self._middleware(state, runtime)

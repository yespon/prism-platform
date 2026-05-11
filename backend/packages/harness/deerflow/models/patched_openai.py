"""Compatibility adapter for OpenAI-compatible ChatOpenAI providers.

Some providers occasionally return payloads with ``choices: null`` in either
streaming chunks or final responses. Upstream parsers may raise hard errors on
that shape. This adapter normalizes those fields to empty lists before handing
off to langchain_openai internals.

Additionally, when a streaming chunk has empty choices, we log a warning to
help diagnose "No generations found in stream" errors.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)


class PatchedChatOpenAI(ChatOpenAI):
    """ChatOpenAI adapter that tolerates ``choices=null`` payloads."""

    @staticmethod
    def _normalize_choices(payload: Any) -> Any:
        if not isinstance(payload, Mapping):
            return payload

        normalized = dict(payload)

        if normalized.get("choices") is None:
            normalized["choices"] = []

        chunk = normalized.get("chunk")
        if isinstance(chunk, Mapping):
            normalized_chunk = dict(chunk)
            if normalized_chunk.get("choices") is None:
                normalized_chunk["choices"] = []
            normalized["chunk"] = normalized_chunk

        return normalized

    def _convert_chunk_to_generation_chunk(
        self,
        chunk: dict,
        default_chunk_class: type,
        base_generation_info: dict | None,
    ):
        normalized_chunk = self._normalize_choices(chunk)
        result = super()._convert_chunk_to_generation_chunk(
            normalized_chunk,
            default_chunk_class,
            base_generation_info,
        )
        if result is None:
            logger.warning(
                "Stream chunk produced no generation: choices=%s, delta=%s, full_chunk=%s",
                normalized_chunk.get("choices"),
                normalized_chunk.get("choices", [{}])[0].get("delta") if normalized_chunk.get("choices") else "N/A",
                normalized_chunk,
            )
        return result

    def _create_chat_result(
        self,
        response: dict | Any,
        generation_info: dict | None = None,
    ):
        normalized_response = self._normalize_choices(response)
        return super()._create_chat_result(normalized_response, generation_info)

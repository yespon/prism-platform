from langchain_core.messages import AIMessageChunk
from langchain_openai import ChatOpenAI

from deerflow.models.patched_openai import PatchedChatOpenAI


def _make_model(**kwargs) -> PatchedChatOpenAI:
    return PatchedChatOpenAI(
        model="gpt-4o-mini",
        api_key="test-key",
        base_url="https://example.com/v1",
        **kwargs,
    )


def test_convert_chunk_normalizes_null_choices(monkeypatch):
    model = _make_model()
    captured: dict[str, object] = {}

    def _fake_convert(self, chunk, default_chunk_class, base_generation_info):
        captured["chunk"] = chunk
        return None

    monkeypatch.setattr(ChatOpenAI, "_convert_chunk_to_generation_chunk", _fake_convert)

    model._convert_chunk_to_generation_chunk(
        {"choices": None, "chunk": {"choices": None}},
        AIMessageChunk,
        {},
    )

    assert captured["chunk"] == {"choices": [], "chunk": {"choices": []}}


def test_create_chat_result_normalizes_null_choices(monkeypatch):
    model = _make_model()
    captured: dict[str, object] = {}

    def _fake_create(self, response, generation_info=None):
        captured["response"] = response
        captured["generation_info"] = generation_info
        return "ok"

    monkeypatch.setattr(ChatOpenAI, "_create_chat_result", _fake_create)

    result = model._create_chat_result({"choices": None, "model": "test-model"}, generation_info={"a": 1})

    assert result == "ok"
    assert captured["response"] == {"choices": [], "model": "test-model"}
    assert captured["generation_info"] == {"a": 1}

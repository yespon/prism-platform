import json
from pathlib import Path
from unittest.mock import patch

from deerflow.agents.memory import updater as updater_mod
from deerflow.config.memory_config import MemoryConfig
from deerflow.config.paths import Paths
from deerflow.config.tenant_context import tenant_context


def _make_paths(tmp_path: Path) -> Paths:
    return Paths(tmp_path)


def _memory_json(summary: str, last_updated: str) -> str:
    payload = {
        "version": "1.0",
        "lastUpdated": last_updated,
        "user": {
            "workContext": {"summary": summary, "updatedAt": ""},
            "personalContext": {"summary": "", "updatedAt": ""},
            "topOfMind": {"summary": "", "updatedAt": ""},
        },
        "history": {
            "recentMonths": {"summary": "", "updatedAt": ""},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": [],
    }
    return json.dumps(payload, ensure_ascii=False)


def test_memory_file_path_is_tenant_and_user_scoped(tmp_path: Path) -> None:
    with (
        patch("deerflow.agents.memory.updater.get_paths", return_value=_make_paths(tmp_path)),
        patch("deerflow.agents.memory.updater.get_memory_config", return_value=MemoryConfig(storage_path="")),
    ):
        path = updater_mod._get_memory_file_path(None, user_id="user-1", tenant_id="tenant-a")

    assert path == tmp_path / "tenants" / "tenant-a" / "users" / "user-1" / "memory.json"


def test_memory_cache_is_isolated_by_tenant(tmp_path: Path) -> None:
    updater_mod._memory_cache.clear()

    tenant_a_file = tmp_path / "tenants" / "tenant-a" / "users" / "user-1" / "memory.json"
    tenant_b_file = tmp_path / "tenants" / "tenant-b" / "users" / "user-1" / "memory.json"
    tenant_a_file.parent.mkdir(parents=True, exist_ok=True)
    tenant_b_file.parent.mkdir(parents=True, exist_ok=True)

    tenant_a_file.write_text(_memory_json(summary="tenant-a", last_updated="a"), encoding="utf-8")
    tenant_b_file.write_text(_memory_json(summary="tenant-b", last_updated="b"), encoding="utf-8")

    with (
        patch("deerflow.agents.memory.updater.get_paths", return_value=_make_paths(tmp_path)),
        patch("deerflow.agents.memory.updater.get_memory_config", return_value=MemoryConfig(storage_path="")),
    ):
        with tenant_context(user_id="user-1", tenant_id="tenant-a"):
            mem_a = updater_mod.get_memory_data(user_id="user-1", tenant_id="tenant-a")
        with tenant_context(user_id="user-1", tenant_id="tenant-b"):
            mem_b = updater_mod.get_memory_data(user_id="user-1", tenant_id="tenant-b")

    assert mem_a["user"]["workContext"]["summary"] == "tenant-a"
    assert mem_b["user"]["workContext"]["summary"] == "tenant-b"
    assert len(updater_mod._memory_cache) == 2


def test_memory_cache_is_isolated_by_tenant_and_user(tmp_path: Path) -> None:
    updater_mod._memory_cache.clear()

    user_a_file = tmp_path / "tenants" / "tenant-a" / "users" / "user-1" / "memory.json"
    user_b_file = tmp_path / "tenants" / "tenant-a" / "users" / "user-2" / "memory.json"
    user_a_file.parent.mkdir(parents=True, exist_ok=True)
    user_b_file.parent.mkdir(parents=True, exist_ok=True)

    user_a_file.write_text(_memory_json(summary="user-1", last_updated="a"), encoding="utf-8")
    user_b_file.write_text(_memory_json(summary="user-2", last_updated="b"), encoding="utf-8")

    with (
        patch("deerflow.agents.memory.updater.get_paths", return_value=_make_paths(tmp_path)),
        patch("deerflow.agents.memory.updater.get_memory_config", return_value=MemoryConfig(storage_path="")),
    ):
        with tenant_context(user_id="user-1", tenant_id="tenant-a"):
            mem_user_1 = updater_mod.get_memory_data(user_id="user-1", tenant_id="tenant-a")
        with tenant_context(user_id="user-2", tenant_id="tenant-a"):
            mem_user_2 = updater_mod.get_memory_data(user_id="user-2", tenant_id="tenant-a")

    assert mem_user_1["user"]["workContext"]["summary"] == "user-1"
    assert mem_user_2["user"]["workContext"]["summary"] == "user-2"
    assert (None, "user-1", "tenant-a") in updater_mod._memory_cache
    assert (None, "user-2", "tenant-a") in updater_mod._memory_cache

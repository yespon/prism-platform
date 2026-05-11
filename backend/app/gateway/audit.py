import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from deerflow.config.paths import get_paths


def _audit_file() -> Path:
    path = get_paths().base_dir / "audit" / "events.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def record_audit_event(
    event_type: str,
    *,
    actor_id: str | None = None,
    target_user_id: str | None = None,
    tenant_id: str | None = None,
    scope: str | None = None,
    severity: str = "info",
    metadata: dict[str, Any] | None = None,
) -> None:
    event = {
        "ts": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "event_type": event_type,
        "severity": severity,
        "actor_id": actor_id,
        "target_user_id": target_user_id,
        "tenant_id": tenant_id,
        "scope": scope,
        "metadata": metadata or {},
    }
    with _audit_file().open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=True) + "\n")


def read_audit_events(
    *,
    limit: int = 100,
    tenant_id: str | None = None,
    scope: str | None = None,
) -> list[dict[str, Any]]:
    path = _audit_file()
    if not path.exists():
        return []

    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    if tenant_id is not None:
        rows = [row for row in rows if row.get("tenant_id") == tenant_id]
    if scope is not None:
        rows = [row for row in rows if row.get("scope") == scope]

    if limit <= 0:
        return []
    return rows[-limit:][::-1]

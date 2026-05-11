"""Backfill default tenants for users from Better Auth database.

Supports both SQLite and PostgreSQL.

Usage:
  cd backend
  PYTHONPATH=. uv run python scripts/backfill_default_tenants.py
"""

from __future__ import annotations

import asyncio
import sys

sys.path.append(str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, text

from app.gateway.auth_db import _resolve_auth_db_url
from deerflow.database.tenant_service import backfill_default_tenants_for_users


def _load_user_ids_from_auth_db() -> list[str]:
    engine = create_engine(_resolve_auth_db_url())
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id FROM \"user\"")).fetchall()
    return [str(row[0]) for row in rows if row[0] is not None]


async def _run() -> None:
    user_ids = _load_user_ids_from_auth_db()
    processed = await backfill_default_tenants_for_users(user_ids)
    print(f"users_total={len(user_ids)}")
    print(f"users_processed={processed}")


if __name__ == "__main__":
    asyncio.run(_run())

import logging
import secrets
from datetime import UTC, datetime

from sqlalchemy import text

from app.gateway.auth_db import auth_connection

logger = logging.getLogger(__name__)


_admin_created = False

def bootstrap_admin():
    """Create the initial bootstrap admin user if one does not exist.
    Safe to call multiple times — only creates the admin once.
    On PostgreSQL, tables are created by Better Auth on frontend startup;
    retries a few times when the tables are not yet ready.
    """
    global _admin_created
    if _admin_created:
        return
    try:
        with auth_connection() as conn, conn.begin():
            if conn.dialect.name == "sqlite":
                _ensure_sqlite_tables(conn)

            result = conn.execute(
                text("SELECT id FROM \"user\" WHERE role = 'admin' LIMIT 1")
            )
            if result.fetchone():
                _admin_created = True
                return

            user_id = f"usr_{secrets.token_hex(8)}"
            now = datetime.now(UTC).isoformat().replace("+00:00", "Z")

            conn.execute(
                text(
                    "INSERT INTO \"user\" ("
                    "id, name, email, \"emailVerified\", image, \"createdAt\", \"updatedAt\", "
                    "role, status, \"mustChangePassword\", \"isBootstrapAdmin\""
                    ") VALUES (:id, :name, :email, :ev, :img, :ca, :ua, :role, :status, :mcp, :iba)"
                ),
                {
                    "id": user_id,
                    "name": "admin",
                    "email": "",
                    "ev": 0,
                    "img": None,
                    "ca": now,
                    "ua": now,
                    "role": "admin",
                    "status": "active",
                    "mcp": 0,
                    "iba": 1,
                },
            )

            _admin_created = True
            logger.info("=" * 72)
            logger.info("  Bootstrap admin user created (uninitialized)")
            logger.info("  Username: admin")
            logger.info("  No password has been set.")
            logger.info("  Visit the web UI to complete the initial setup wizard,")
            logger.info("  where you will set your email and password.")
            logger.info("=" * 72)

    except Exception as exc:
        logger.warning("Failed to bootstrap admin account (will retry): %s", exc)


def _ensure_sqlite_tables(conn):
    """Create Better Auth identity tables — SQLite only.
    On PostgreSQL, Better Auth creates these via Kysely on first frontend startup."""
    tables = [
        ("\"user\"", (
            "id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, "
            "\"emailVerified\" INTEGER NOT NULL, image TEXT, "
            "\"createdAt\" TEXT NOT NULL, \"updatedAt\" TEXT NOT NULL, "
            "role TEXT DEFAULT 'user', status TEXT DEFAULT 'active', "
            "\"mustChangePassword\" INTEGER DEFAULT 0, \"isBootstrapAdmin\" INTEGER DEFAULT 0"
        )),
        ("account", (
            "id TEXT NOT NULL PRIMARY KEY, \"accountId\" TEXT NOT NULL, "
            "\"providerId\" TEXT NOT NULL, \"userId\" TEXT NOT NULL, "
            "password TEXT, \"createdAt\" TEXT NOT NULL, \"updatedAt\" TEXT NOT NULL"
        )),
        ("session", (
            "id TEXT NOT NULL PRIMARY KEY, \"expiresAt\" TEXT NOT NULL, "
            "token TEXT NOT NULL, \"createdAt\" TEXT NOT NULL, "
            "\"updatedAt\" TEXT NOT NULL, \"ipAddress\" TEXT, "
            "\"userAgent\" TEXT, \"userId\" TEXT NOT NULL"
        )),
        ("verification", (
            "id TEXT NOT NULL PRIMARY KEY, identifier TEXT NOT NULL, "
            "value TEXT NOT NULL, \"expiresAt\" TEXT NOT NULL, "
            "\"createdAt\" TEXT, \"updatedAt\" TEXT"
        )),
        ("jwks", (
            "id TEXT NOT NULL PRIMARY KEY, \"publicKey\" TEXT NOT NULL, "
            "\"privateKey\" TEXT NOT NULL, \"createdAt\" TEXT NOT NULL, \"expiresAt\" TEXT"
        )),
    ]
    for tbl_name, columns in tables:
        conn.execute(text(f"CREATE TABLE IF NOT EXISTS {tbl_name} ({columns})"))

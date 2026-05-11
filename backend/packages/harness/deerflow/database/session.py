from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from deerflow.config import get_app_config

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _resolve_database_url() -> str:
    """Resolve database URL with fallback from legacy ./data/ to .opsintech/."""
    db_url = get_app_config().database.url

    if db_url.startswith("sqlite"):
        raw_path = db_url.split(":///", maxsplit=1)[-1]
        normalized_path = raw_path[1:] if raw_path.startswith("/") else raw_path
        candidate = Path(normalized_path).resolve()
        if not candidate.exists() or candidate.stat().st_size == 0:
            if "data/" in normalized_path:
                backend_root = Path(__file__).resolve().parents[4]
                opsintech_db = backend_root / ".opsintech" / "tenant.db"
                if opsintech_db.exists() and opsintech_db.stat().st_size > 0:
                    return f"sqlite+aiosqlite:///{opsintech_db}"

    return db_url


def get_database_url() -> str:
    """Read database URL from AppConfig."""
    return _resolve_database_url()


def get_database_echo() -> bool:
    """Read SQL echo setting from AppConfig."""
    return get_app_config().database.echo


def get_engine() -> AsyncEngine:
    """Create or return cached async DB engine."""
    global _engine
    if _engine is None:
        db_url = get_database_url()
        if db_url.startswith("sqlite"):
            raw_path = db_url.split(":///", maxsplit=1)[-1]
            normalized_path = raw_path[1:] if raw_path.startswith("/") else raw_path
            Path(normalized_path).parent.mkdir(parents=True, exist_ok=True)
        connect_args: dict[str, Any] = {}
        if db_url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        else:
            connect_args["statement_cache_size"] = 0

        _engine = create_async_engine(
            db_url,
            echo=get_database_echo(),
            connect_args=connect_args,
            pool_pre_ping=not db_url.startswith("sqlite"),
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create or return cached async session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
    return _session_factory


async def get_session() -> AsyncSession:
    """FastAPI dependency for obtaining async DB session."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session

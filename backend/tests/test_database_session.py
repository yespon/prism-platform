import asyncio

from deerflow.database.session import get_session_factory


def test_session_factory_returns_sqlmodel_async_session() -> None:
    async def _run() -> None:
        session_factory = get_session_factory()
        async with session_factory() as session:
            assert hasattr(session, "exec")

    asyncio.run(_run())
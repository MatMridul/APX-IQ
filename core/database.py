"""
APX IQ Database Layer
=====================

Async PostgreSQL connection pool via asyncpg.
All database access goes through this module.

Configuration comes from core.config.settings (audit E4: this module
previously read os.getenv directly, bypassing central config).

Usage:
    from core.database import db

    # In app startup:
    await db.connect()

    # Services receive the raw pool (see api/main.py lifespan):
    create_lap_service(pool=db._pool)
"""

from typing import Optional

import asyncpg
from core.config import settings
from core.logging_config import get_logger

log = get_logger("APXIQ.Database")

# ─── Connection pool singleton ────────────────────────────────────────────────

class Database:
    """Wraps an asyncpg connection pool with connect/close lifecycle."""

    def __init__(self) -> None:
        self._pool: Optional[asyncpg.Pool] = None

    @property
    def is_connected(self) -> bool:
        return self._pool is not None

    async def connect(self) -> None:
        """Open connection pool. Called at app startup."""
        dsn = settings.database_url
        if not dsn:
            log.warning(
                "database_url_not_set",
                consequence="running without database — in-memory storage, data lost on restart",
            )
            return

        try:
            self._pool = await asyncpg.create_pool(
                dsn,
                min_size=2,
                max_size=10,
                command_timeout=30,
            )
            log.info("database_pool_connected")
        except Exception as exc:
            log.error("database_connection_failed", error=str(exc))
            log.warning("degraded_to_in_memory_storage")
            self._pool = None

    async def close(self) -> None:
        """Close pool. Called at app shutdown."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            log.info("database_pool_closed")

    @property
    def pool(self) -> Optional[asyncpg.Pool]:
        """Direct pool access for service factories (None if unconnected)."""
        return self._pool


# Module-level singleton
db = Database()

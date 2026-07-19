"""
APX IQ Database Layer
======================

Async PostgreSQL connection pool via asyncpg.
All database access goes through this module.

Usage:
    from core.database import db, get_db

    # In FastAPI endpoint:
    async with get_db() as conn:
        row = await conn.fetchrow("SELECT * FROM laps WHERE lap_id=$1", lap_id)

    # In app startup:
    await db.connect()

    # In app shutdown:
    await db.close()
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import asyncpg

log = logging.getLogger("APXIQ.Database")

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
        dsn = os.getenv("DATABASE_URL")
        if not dsn:
            log.warning(
                "DATABASE_URL not set — running without database. "
                "Data will not persist across restarts."
            )
            return

        try:
            self._pool = await asyncpg.create_pool(
                dsn,
                min_size=2,
                max_size=10,
                command_timeout=30,
            )
            log.info("Database pool connected ✓")
        except Exception as exc:
            log.error(f"Database connection failed: {exc}")
            log.warning("Continuing without database — using in-memory storage")
            self._pool = None

    async def close(self) -> None:
        """Close pool. Called at app shutdown."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            log.info("Database pool closed")

    @asynccontextmanager
    async def acquire(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Acquire a connection from the pool."""
        if not self._pool:
            raise RuntimeError("Database not connected")
        async with self._pool.acquire() as conn:
            yield conn


# Module-level singleton
db = Database()


# ─── FastAPI dependency ───────────────────────────────────────────────────────

@asynccontextmanager
async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    FastAPI dependency — yields a database connection.

    Usage in endpoint:
        async def my_endpoint(conn=Depends(get_db)):
            ...

    Raises RuntimeError if database is not connected (dev without Postgres).
    """
    async with db.acquire() as conn:
        yield conn

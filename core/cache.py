"""
APX IQ Cache Layer
===================

Async caching backed by Redis (if configured) or an in-memory fallback.

Used to cache expensive operations:
    - Telemetry alignment / analysis pipeline results
    - FastF1 ghost lap fetches
    - Track layout geometry

Audit repairs applied here:
    - E4: backend selection reads core.config.settings (was os.getenv)
    - A3: the in-memory backend previously IGNORED ttl entirely — entries
          lived forever and stale results were served indefinitely.
          It now enforces expiry lazily on access with a size cap.

Note (deferred to security pass): the Redis backend serialises with
pickle — acceptable for a local single-user deployment, flagged as D4.
"""

from typing import Any, Optional

from core.config import settings
from core.logging_config import get_logger

log = get_logger("APXIQ.Cache")

# ─── Cache backends ───────────────────────────────────────────────────────────

_MAX_MEMORY_ENTRIES = 2_000


class _InMemoryCache:
    """TTL-aware in-memory dict cache (lazy eviction + size cap)."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float | None]] = {}  # key -> (value, expires_at)

    @staticmethod
    def _now() -> float:
        import time
        return time.monotonic()

    def _expired(self, expires_at: float | None) -> bool:
        return expires_at is not None and self._now() >= expires_at

    async def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if self._expired(expires_at):
            self._store.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        if len(self._store) >= _MAX_MEMORY_ENTRIES:
            # Drop the oldest ~10% — crude but prevents unbounded growth
            drop = max(1, _MAX_MEMORY_ENTRIES // 10)
            for k in list(self._store.keys())[:drop]:
                self._store.pop(k, None)
        self._store[key] = (value, self._now() + ttl)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def clear(self) -> None:
        self._store.clear()

    async def exists(self, key: str) -> bool:
        return await self.get(key) is not None


class _RedisCache:
    """Redis-backed cache with pickle serialisation."""

    def __init__(self, url: str) -> None:
        import redis.asyncio as aioredis
        self._redis = aioredis.from_url(url, encoding="utf-8", decode_responses=False)

    async def get(self, key: str) -> Optional[Any]:
        try:
            raw = await self._redis.get(key)
            return pickle_loads(raw) if raw else None
        except Exception as exc:
            log.debug("cache_get_failed", error=str(exc))
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        try:
            await self._redis.set(key, pickle_dumps(value), ex=ttl)
        except Exception as exc:
            log.debug("cache_set_failed", error=str(exc))

    async def delete(self, key: str) -> None:
        try:
            await self._redis.delete(key)
        except Exception as exc:
            log.debug("cache_delete_failed", error=str(exc))

    async def clear(self) -> None:
        try:
            await self._redis.flushdb()
        except Exception as exc:
            log.debug("cache_clear_failed", error=str(exc))

    async def exists(self, key: str) -> bool:
        try:
            return bool(await self._redis.exists(key))
        except Exception:
            return False


def pickle_loads(raw: bytes) -> Any:
    import pickle
    return pickle.loads(raw)


def pickle_dumps(value: Any) -> bytes:
    import pickle
    return pickle.dumps(value)


# ─── Cache factory ────────────────────────────────────────────────────────────

def _build_cache():
    redis_url = settings.redis_url
    if redis_url:
        try:
            c = _RedisCache(redis_url)
            log.info("cache_backend_redis", url=redis_url)
            return c
        except Exception as exc:
            log.warning("redis_unavailable_falling_back", error=str(exc))
    log.info("cache_backend_memory")
    return _InMemoryCache()


# Module-level singleton — initialised lazily so settings are loaded first
_cache_instance: Optional[Any] = None


def get_cache():
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = _build_cache()
    return _cache_instance


def reset_cache_singleton() -> None:
    """Test helper — forces backend re-selection on next get_cache()."""
    global _cache_instance
    _cache_instance = None

"""
APX IQ Cache Layer
===================

Async caching backed by Redis (if available) or in-memory fallback.
Used to cache expensive operations:
    - Telemetry alignment results
    - FastF1 ghost lap fetches
    - Hardware profile classifications

Usage:
    from core.cache import cache

    @cache.cached(ttl=300, key="align:{lap_id_1}:{lap_id_2}")
    async def align_laps(lap_id_1, lap_id_2):
        ...

    # Manual set/get:
    await cache.set("key", value, ttl=60)
    value = await cache.get("key")
"""

import logging
import os
import pickle
from typing import Any, Optional

log = logging.getLogger("APXIQ.Cache")

# ─── Cache backend ────────────────────────────────────────────────────────────

class _InMemoryCache:
    """Simple in-memory dict cache — no TTL enforcement (good enough for dev)."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    async def get(self, key: str) -> Optional[Any]:
        return self._store.get(key)

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        self._store[key] = value

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def clear(self) -> None:
        self._store.clear()

    async def exists(self, key: str) -> bool:
        return key in self._store


class _RedisCache:
    """Redis-backed cache with pickle serialisation."""

    def __init__(self, url: str) -> None:
        import redis.asyncio as aioredis  # type: ignore
        self._redis = aioredis.from_url(url, encoding="utf-8", decode_responses=False)

    async def get(self, key: str) -> Optional[Any]:
        try:
            raw = await self._redis.get(key)
            return pickle.loads(raw) if raw else None
        except Exception as exc:
            log.debug(f"Cache get failed: {exc}")
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        try:
            await self._redis.set(key, pickle.dumps(value), ex=ttl)
        except Exception as exc:
            log.debug(f"Cache set failed: {exc}")

    async def delete(self, key: str) -> None:
        try:
            await self._redis.delete(key)
        except Exception as exc:
            log.debug(f"Cache delete failed: {exc}")

    async def clear(self) -> None:
        try:
            await self._redis.flushdb()
        except Exception as exc:
            log.debug(f"Cache clear failed: {exc}")

    async def exists(self, key: str) -> bool:
        try:
            return bool(await self._redis.exists(key))
        except Exception:
            return False


# ─── Cache factory ────────────────────────────────────────────────────────────

def _build_cache():
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            c = _RedisCache(redis_url)
            log.info(f"Cache: Redis @ {redis_url}")
            return c
        except Exception as exc:
            log.warning(f"Redis unavailable ({exc}), falling back to in-memory cache")
    log.info("Cache: in-memory (set REDIS_URL for persistent cache)")
    return _InMemoryCache()


# Module-level singleton — initialised lazily so env vars are loaded first
_cache_instance: Optional[Any] = None


def get_cache():
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = _build_cache()
    return _cache_instance


# ─── Helper decorator ─────────────────────────────────────────────────────────

def cached(ttl: int = 300):
    """
    Async function decorator. Caches return value keyed by function name + args.

    Usage:
        @cached(ttl=300)
        async def expensive_fn(a, b):
            ...
    """
    import functools

    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            c = get_cache()
            key = f"{fn.__module__}.{fn.__qualname__}:{args}:{sorted(kwargs.items())}"
            cached_val = await c.get(key)
            if cached_val is not None:
                log.debug(f"Cache HIT: {key[:60]}")
                return cached_val
            result = await fn(*args, **kwargs)
            await c.set(key, result, ttl=ttl)
            log.debug(f"Cache SET: {key[:60]}")
            return result
        return wrapper
    return decorator

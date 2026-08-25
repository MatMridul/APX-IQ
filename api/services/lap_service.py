"""
APX IQ — Lap Service
=====================

Provides storage and retrieval of completed lap telemetry data.
Two implementations are available:

    InMemoryLapService  — used when DATABASE_URL is not configured.
                          All data is lost on restart. For development only.

    DatabaseLapService  — used when DATABASE_URL is set.
                          Persists data to PostgreSQL via asyncpg.

The correct implementation is selected in api/main.py lifespan and
attached to app.state.lap_service. Routers access it via request.app.state.

Public Interface (LapServiceProtocol):
    save_lap(data)              → int (lap_id)
    get_lap(lap_id)             → LapTelemetryResponse | None
    list_laps(session_uid, min_telemetry_points) → list[LapInfo]
    clear()                     → int (count cleared)
"""

from datetime import datetime
from typing import Optional, Protocol

from core.logging_config import get_logger

log = get_logger("APXIQ.Services.LapService")


# ─── Import shared types ──────────────────────────────────────────────────────
# Imported lazily to avoid circular imports when this module is loaded early.

def _lap_info_from_dict(d: dict):
    from api.telemetry_router import LapInfo
    return LapInfo(
        lap_id=d["lap_id"],
        session_uid=d["session_uid"],
        lap_number=d["lap_number"],
        lap_time_ms=d.get("lap_time_ms"),
        sector_1_time_ms=d.get("sector_1_time_ms"),
        sector_2_time_ms=d.get("sector_2_time_ms"),
        sector_3_time_ms=d.get("sector_3_time_ms"),
        is_valid=d.get("is_valid", True),
        telemetry_points=d["telemetry_points"],
        max_distance_m=d["max_distance_m"],
        created_at=d["created_at"],
    )


def _telemetry_response_from_dict(d: dict):
    from api.telemetry_router import LapTelemetryResponse
    from api.models.shared import TelemetryPoint
    return LapTelemetryResponse(
        lap_info=_lap_info_from_dict(d),
        telemetry=[TelemetryPoint(**t) for t in d["telemetry"]],
    )


# ─── Protocol (interface) ─────────────────────────────────────────────────────

class LapServiceProtocol(Protocol):
    """Public interface all LapService implementations must satisfy."""

    async def save_lap(self, data) -> int:
        """Persist a lap and return its assigned lap_id."""
        ...

    async def get_lap(self, lap_id: int):
        """Return a LapTelemetryResponse for the given lap_id, or None."""
        ...

    async def list_laps(self, session_uid: Optional[int], min_telemetry_points: int) -> list:
        """Return a list of LapInfo objects matching the given filters."""
        ...

    async def clear(self) -> int:
        """Delete all stored laps. Returns the count of laps removed."""
        ...


# ─── In-Memory Implementation ─────────────────────────────────────────────────

class InMemoryLapService:
    """
    Ephemeral lap storage backed by a Python dict.

    Suitable only for development and testing — all data is lost on restart.
    Selected automatically when DATABASE_URL is not set.
    """

    def __init__(self) -> None:
        self._laps: dict[int, dict] = {}
        self._next_id: int = 1

    async def save_lap(self, data) -> int:
        lap_id = self._next_id
        self._next_id += 1

        self._laps[lap_id] = {
            "lap_id":           lap_id,
            "session_uid":      data.session_uid,
            "lap_number":       data.lap_number,
            "lap_time_ms":      data.lap_time_ms,
            "sector_1_time_ms": data.sector_1_time_ms,
            "sector_2_time_ms": data.sector_2_time_ms,
            "sector_3_time_ms": data.sector_3_time_ms,
            "is_valid":         data.is_valid,
            "telemetry":        [t.model_dump() for t in data.telemetry],
            "telemetry_points": len(data.telemetry),
            "max_distance_m":   max((t.distance_m for t in data.telemetry), default=0.0),
            "created_at":       datetime.now(),
        }
        log.debug("lap_stored_in_memory", lap_id=lap_id, lap_number=data.lap_number)
        return lap_id

    async def get_lap(self, lap_id: int):
        d = self._laps.get(lap_id)
        if d is None:
            return None
        return _telemetry_response_from_dict(d)

    async def list_laps(self, session_uid: Optional[int], min_telemetry_points: int) -> list:
        laps = list(self._laps.values())
        if session_uid is not None:
            laps = [l for l in laps if l["session_uid"] == session_uid]
        laps = [l for l in laps if l["telemetry_points"] >= min_telemetry_points]
        laps.sort(key=lambda l: (l["session_uid"], l["lap_number"]))
        return [_lap_info_from_dict(l) for l in laps]

    async def clear(self) -> int:
        count = len(self._laps)
        self._laps.clear()
        self._next_id = 1
        return count


# ─── Database Implementation ──────────────────────────────────────────────────

class DatabaseLapService:
    """
    Persistent lap storage backed by PostgreSQL via asyncpg.

    Selected automatically when DATABASE_URL is configured.
    Uses the asyncpg pool from core.database.
    """

    def __init__(self, pool) -> None:
        self._pool = pool

    async def save_lap(self, data) -> int:
        """
        Inserts lap metadata and all telemetry rows in a single transaction.
        Returns the assigned lap_id.
        """

        async with self._pool.acquire() as conn:
            async with conn.transaction():
                # Insert lap header
                lap_id = await conn.fetchval(
                    """
                    INSERT INTO laps (
                        session_uid, lap_number,
                        lap_time_ms, sector_1_time_ms, sector_2_time_ms, sector_3_time_ms,
                        is_valid
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING lap_id
                    """,
                    data.session_uid,
                    data.lap_number,
                    data.lap_time_ms,
                    data.sector_1_time_ms,
                    data.sector_2_time_ms,
                    data.sector_3_time_ms,
                    data.is_valid,
                )

                # Bulk-insert telemetry rows
                rows = [
                    (
                        lap_id,
                        t.distance_m, t.speed_kph,
                        t.throttle, t.brake, t.steer,
                        t.gear, t.rpm, t.drs,
                        t.x, t.y, t.z,
                    )
                    for t in data.telemetry
                ]
                await conn.executemany(
                    """
                    INSERT INTO user_lap_telemetry (
                        user_lap_id, distance_m, speed_kph,
                        throttle, brake, steer,
                        gear, rpm, drs,
                        x, y, z
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """,
                    rows,
                )

        log.info("lap_saved_to_db", lap_id=lap_id, lap_number=data.lap_number, points=len(data.telemetry))
        return lap_id

    async def get_lap(self, lap_id: int):
        from api.telemetry_router import LapInfo, LapTelemetryResponse
        from api.models.shared import TelemetryPoint

        async with self._pool.acquire() as conn:
            lap_row = await conn.fetchrow(
                """
                SELECT l.lap_id, l.session_uid, l.lap_number,
                       l.lap_time_ms, l.sector_1_time_ms, l.sector_2_time_ms, l.sector_3_time_ms,
                       l.is_valid, l.created_at,
                       COUNT(t.distance_m) AS telemetry_points,
                       MAX(t.distance_m)   AS max_distance_m
                FROM laps l
                LEFT JOIN user_lap_telemetry t ON t.user_lap_id = l.lap_id
                WHERE l.lap_id = $1
                GROUP BY l.lap_id
                """,
                lap_id,
            )
            if lap_row is None:
                return None

            telem_rows = await conn.fetch(
                """
                SELECT distance_m, speed_kph, throttle, brake, steer,
                       gear, rpm, drs, x, y, z
                FROM user_lap_telemetry
                WHERE user_lap_id = $1
                ORDER BY distance_m
                """,
                lap_id,
            )

        lap_info = LapInfo(
            lap_id=lap_row["lap_id"],
            session_uid=lap_row["session_uid"],
            lap_number=lap_row["lap_number"],
            lap_time_ms=lap_row["lap_time_ms"],
            sector_1_time_ms=lap_row["sector_1_time_ms"],
            sector_2_time_ms=lap_row["sector_2_time_ms"],
            sector_3_time_ms=lap_row["sector_3_time_ms"],
            is_valid=lap_row["is_valid"],
            telemetry_points=lap_row["telemetry_points"],
            max_distance_m=float(lap_row["max_distance_m"] or 0.0),
            created_at=lap_row["created_at"],
        )
        telemetry = [TelemetryPoint(**dict(r)) for r in telem_rows]
        return LapTelemetryResponse(lap_info=lap_info, telemetry=telemetry)

    async def list_laps(self, session_uid: Optional[int], min_telemetry_points: int) -> list:
        from api.telemetry_router import LapInfo

        query = """
            SELECT l.lap_id, l.session_uid, l.lap_number,
                   l.lap_time_ms, l.sector_1_time_ms, l.sector_2_time_ms, l.sector_3_time_ms,
                   l.is_valid, l.created_at,
                   COUNT(t.distance_m) AS telemetry_points,
                   MAX(t.distance_m)   AS max_distance_m
            FROM laps l
            LEFT JOIN user_lap_telemetry t ON t.user_lap_id = l.lap_id
            {where}
            GROUP BY l.lap_id
            HAVING COUNT(t.distance_m) >= $1
            ORDER BY l.session_uid, l.lap_number
        """
        async with self._pool.acquire() as conn:
            if session_uid is not None:
                rows = await conn.fetch(
                    query.format(where="WHERE l.session_uid = $2"),
                    min_telemetry_points,
                    session_uid,
                )
            else:
                rows = await conn.fetch(
                    query.format(where=""),
                    min_telemetry_points,
                )

        return [
            LapInfo(
                lap_id=r["lap_id"],
                session_uid=r["session_uid"],
                lap_number=r["lap_number"],
                lap_time_ms=r["lap_time_ms"],
                sector_1_time_ms=r["sector_1_time_ms"],
                sector_2_time_ms=r["sector_2_time_ms"],
                sector_3_time_ms=r["sector_3_time_ms"],
                is_valid=r["is_valid"],
                telemetry_points=r["telemetry_points"],
                max_distance_m=float(r["max_distance_m"] or 0.0),
                created_at=r["created_at"],
            )
            for r in rows
        ]

    async def clear(self) -> int:
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("DELETE FROM user_lap_telemetry")
                result = await conn.execute("DELETE FROM laps")
        count = int(result.split()[-1])
        log.info("laps_cleared_from_db", count=count)
        return count


# ─── Factory ──────────────────────────────────────────────────────────────────

def create_lap_service(pool=None) -> LapServiceProtocol:
    """
    Return the appropriate LapService implementation.

    If a pool is provided and connected, returns DatabaseLapService.
    Otherwise returns InMemoryLapService with a warning.
    """
    if pool is not None:
        log.info("lap_service_using_database")
        return DatabaseLapService(pool)

    log.warning(
        "lap_service_using_in_memory",
        reason="DATABASE_URL not set or DB connection failed",
    )
    return InMemoryLapService()

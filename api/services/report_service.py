"""
APX IQ — Report Service
========================

Provides storage and retrieval of AI-generated coaching reports.
Follows the same Protocol+InMemory+Database pattern as LapService.

Two implementations:
    InMemoryReportService — for development (data lost on restart)
    DatabaseReportService — for production (persists to PostgreSQL)
"""

from datetime import datetime
from typing import Optional, Protocol

from core.logging_config import get_logger

log = get_logger("APXIQ.Services.ReportService")


# ─── Protocol ─────────────────────────────────────────────────────────────────

class ReportServiceProtocol(Protocol):
    async def save_report(self, data: dict) -> int: ...
    async def get_report(self, report_id: int) -> Optional[dict]: ...
    async def list_reports(self, limit: int, report_type: Optional[str]) -> list[dict]: ...
    async def clear(self) -> int: ...


# ─── In-Memory Implementation ─────────────────────────────────────────────────

class InMemoryReportService:
    """Ephemeral report storage. For development only."""

    def __init__(self) -> None:
        self._reports: dict[int, dict] = {}
        self._next_id: int = 1

    async def save_report(self, data: dict) -> int:
        report_id = self._next_id
        self._next_id += 1
        self._reports[report_id] = {
            **data,
            "report_id": report_id,
            "created_at": datetime.now().isoformat(),
        }
        return report_id

    async def get_report(self, report_id: int) -> Optional[dict]:
        return self._reports.get(report_id)

    async def list_reports(self, limit: int = 20, report_type: Optional[str] = None) -> list[dict]:
        reports = list(self._reports.values())
        if report_type:
            reports = [r for r in reports if r.get("report_type") == report_type]
        # Most recent first
        reports.sort(key=lambda r: r["created_at"], reverse=True)
        return reports[:limit]

    async def clear(self) -> int:
        count = len(self._reports)
        self._reports.clear()
        self._next_id = 1
        return count


# ─── Database Implementation ──────────────────────────────────────────────────

class DatabaseReportService:
    """Persistent report storage backed by PostgreSQL."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def save_report(self, data: dict) -> int:
        """
        Persist a report with ALL available fields.
        (audit B2: previous version silently dropped deltas, corner stats,
         hardware profile and generation metadata.)
        """
        import json
        async with self._pool.acquire() as conn:
            report_id = await conn.fetchval(
                """
                INSERT INTO intelligence_reports (
                    user_lap_id, ghost_lap_id, session_uid, lap_number,
                    report_type, title, markdown,
                    summary, key_findings, generated_by,
                    generation_time_ms, total_time_delta_ms,
                    avg_speed_delta_kph, corner_count,
                    worst_corner_index, best_corner_index,
                    hardware_profile
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                RETURNING report_id
                """,
                data.get("user_lap_id"),
                data.get("ghost_lap_id"),
                data.get("session_uid"),
                data.get("lap_number"),
                data.get("report_type", "lap_debrief"),
                data.get("title"),
                data.get("markdown"),
                data.get("summary"),
                json.dumps(data.get("key_findings", [])),
                data.get("generated_by"),
                data.get("generation_time_ms"),
                data.get("total_time_delta_ms"),
                data.get("avg_speed_delta_kph"),
                data.get("corner_count"),
                data.get("worst_corner_index"),
                data.get("best_corner_index"),
                json.dumps(data["hardware_profile"]) if data.get("hardware_profile") else None,
            )
        log.info("report_saved_to_db", report_id=report_id)
        return report_id

    async def get_report(self, report_id: int) -> Optional[dict]:
        import json
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM intelligence_reports WHERE report_id = $1",
                report_id,
            )
        if row is None:
            return None
        d = dict(row)
        if isinstance(d.get("key_findings"), str):
            d["key_findings"] = json.loads(d["key_findings"])
        return d

    async def list_reports(self, limit: int = 20, report_type: Optional[str] = None) -> list[dict]:
        async with self._pool.acquire() as conn:
            if report_type:
                rows = await conn.fetch(
                    """
                    SELECT report_id, report_type, title, summary, generated_by,
                           lap_number, total_time_delta_ms, created_at
                    FROM intelligence_reports
                    WHERE report_type = $1
                    ORDER BY created_at DESC LIMIT $2
                    """,
                    report_type,
                    limit,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT report_id, report_type, title, summary, generated_by,
                           lap_number, total_time_delta_ms, created_at
                    FROM intelligence_reports
                    ORDER BY created_at DESC LIMIT $1
                    """,
                    limit,
                )
        return [dict(r) for r in rows]

    async def clear(self) -> int:
        async with self._pool.acquire() as conn:
            result = await conn.execute("DELETE FROM intelligence_reports")
        count = int(result.split()[-1])
        log.info("reports_cleared_from_db", count=count)
        return count


# ─── Factory ──────────────────────────────────────────────────────────────────

def create_report_service(pool=None) -> ReportServiceProtocol:
    if pool is not None:
        log.info("report_service_using_database")
        return DatabaseReportService(pool)
    log.warning("report_service_using_in_memory", reason="DATABASE_URL not set or DB connection failed")
    return InMemoryReportService()

"""
Contract tests for the storage service layer (Protocol pattern).

Uses in-memory implementations so no PostgreSQL is required — these verify
the public interface contract (save → get → list → clear) that both the
InMemory and Database implementations must satisfy.
"""

import pytest

from api.models.shared import SaveLapRequest, TelemetryPoint
from api.services.lap_service import InMemoryLapService, create_lap_service
from api.services.report_service import InMemoryReportService, create_report_service


def _lap_request(points: int = 12) -> SaveLapRequest:
    telemetry = [
        TelemetryPoint(distance_m=float(i * 10), speed_kph=100.0 + i)
        for i in range(points)
    ]
    return SaveLapRequest(
        session_uid=99,
        lap_number=1,
        lap_time_ms=91_234,
        sector_1_time_ms=30_000,
        sector_2_time_ms=31_000,
        sector_3_time_ms=30_234,
        is_valid=True,
        telemetry=telemetry,
    )


# ─── LapService ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_lap_service_save_get_list_clear_roundtrip():
    svc = InMemoryLapService()

    lap_id = await svc.save_lap(_lap_request())
    assert lap_id >= 1

    lap = await svc.get_lap(lap_id)
    assert lap is not None
    assert lap.lap_info.lap_number == 1
    assert lap.lap_info.session_uid == 99
    assert lap.lap_info.lap_time_ms == 91_234
    assert len(lap.telemetry) == 12

    laps = await svc.list_laps(session_uid=None, min_telemetry_points=10)
    assert len(laps) == 1
    # Filter by a foreign session uid returns nothing
    assert await svc.list_laps(session_uid=12_345, min_telemetry_points=10) == []
    # Min-points filter excludes laps below threshold
    assert await svc.list_laps(session_uid=None, min_telemetry_points=13) == []

    cleared = await svc.clear()
    assert cleared == 1
    assert await svc.get_lap(lap_id) is None


@pytest.mark.asyncio
async def test_lap_service_get_missing_returns_none():
    svc = InMemoryLapService()
    assert await svc.get_lap(9999) is None


@pytest.mark.asyncio
async def test_create_lap_service_factory_falls_back_to_memory_without_pool():
    svc = create_lap_service(pool=None)
    assert isinstance(svc, InMemoryLapService)


# ─── ReportService ────────────────────────────────────────────────────────────


def _report_dict(title: str = "Lap Debrief", report_type: str = "lap_debrief") -> dict:
    return {
        "report_type": report_type,
        "title": title,
        "markdown": f"# {title}",
        "summary": "ok",
        "key_findings": ["brake earlier into T1"],
        "generated_by": "local_template",
    }


@pytest.mark.asyncio
async def test_report_service_save_get_list_clear_roundtrip():
    svc = InMemoryReportService()

    report_id = await svc.save_report(_report_dict())
    assert report_id >= 1

    got = await svc.get_report(report_id)
    assert got is not None
    assert got["title"] == "Lap Debrief"
    assert got["key_findings"] == ["brake earlier into T1"]
    assert "created_at" in got

    reports = await svc.list_reports()
    assert len(reports) == 1
    assert await svc.list_reports(report_type="race_summary") == []

    cleared = await svc.clear()
    assert cleared == 1
    assert await svc.list_reports() == []


@pytest.mark.asyncio
async def test_report_service_list_most_recent_first():
    svc = InMemoryReportService()
    first_id = await svc.save_report(_report_dict("First"))
    second_id = await svc.save_report(_report_dict("Second"))

    reports = await svc.list_reports(limit=2)
    assert [r["title"] for r in reports] == ["Second", "First"]

    limited = await svc.list_reports(limit=1)
    assert len(limited) == 1 and limited[0]["report_id"] == second_id
    assert first_id != second_id


@pytest.mark.asyncio
async def test_create_report_service_factory_falls_back_to_memory_without_pool():
    svc = create_report_service(pool=None)
    assert isinstance(svc, InMemoryReportService)

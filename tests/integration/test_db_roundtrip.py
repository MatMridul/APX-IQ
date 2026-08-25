"""
End-to-end database round-trips — the audit's Category A/B killers.

Each test targets a specific finding:
    A1  lap save previously crashed on laps->sessions FK
    B4  duplicate/retried saves previously created duplicates (now idempotent)
    B1  laps previously persisted with NULL times / is_valid=True always
    A2  report save previously crashed (markdown_content vs markdown column)
    B2  report save previously dropped ~10 fields
    B3  career progression previously fabricated numbers from a nonexistent
        metadata field; must now reflect real stored deltas
"""

import random

import pytest

from tests.integration.conftest import DATABASE_URL, requires_db

pytestmark = [pytest.mark.integration, requires_db]


def _unique_session_uid() -> int:
    return random.randint(10_000_000, 99_999_999)


def _lap_payload(session_uid: int, lap_number: int = 1, points: int = 20) -> dict:
    telemetry = [
        {
            "distance_m": float(i * 100),
            "speed_kph": 150.0 + i,
            "throttle": 0.8,
            "brake": 0.1,
            "steer": -0.1,
            "gear": 5,
            "rpm": 11_000,
            "drs": True,
            "x": float(i),
            "y": 0.0,
            "z": float(i * 2),
        }
        for i in range(points)
    ]
    return {
        "session_uid": session_uid,
        "lap_number": lap_number,
        # B1: these fields MUST survive the round trip now
        "lap_time_ms": 91_234,
        "sector_1_time_ms": 30_000,
        "sector_2_time_ms": 31_000,
        "sector_3_time_ms": 30_234,
        "is_valid": False,  # dirty lap — must persist as False, not coerced
        "telemetry": telemetry,
    }


# ─── Laps ─────────────────────────────────────────────────────────────────────


def test_session_start_then_lap_save_no_fk_crash(client, wiped):
    """A1: saving a lap after registering its session must not hit FK violation."""
    uid = _unique_session_uid()

    r = client.post("/telemetry/session/start", json={"session_uid": uid, "track_id": 12})
    assert r.status_code == 200
    assert r.json()["status"] == "session_registered"

    r = client.post("/telemetry/lap/save", json=_lap_payload(uid))
    assert r.status_code == 200, r.text
    assert r.json()["lap_id"] > 0


def test_lap_save_without_prior_session_still_succeeds(client, wiped):
    """A1 defence-in-depth: save_lap upserts the parent session itself."""
    r = client.post("/telemetry/lap/save", json=_lap_payload(_unique_session_uid()))
    assert r.status_code == 200, r.text


def test_duplicate_lap_save_is_idempotent(client, wiped):
    """B4: ingestion retries must return the SAME lap_id, not create duplicates."""
    uid = _unique_session_uid()
    payload = _lap_payload(uid)

    first = client.post("/telemetry/lap/save", json=payload).json()["lap_id"]
    second = client.post("/telemetry/lap/save", json=payload).json()["lap_id"]
    assert first == second

    laps = client.get("/telemetry/laps/completed", params={"min_telemetry_points": 0}).json()
    matching = [l for l in laps if l["session_uid"] == uid]
    assert len(matching) == 1


def test_lap_times_and_validity_survive_roundtrip(client, wiped):
    """B1: timing metadata and dirtiness must persist exactly."""
    uid = _unique_session_uid()
    payload = _lap_payload(uid)

    lap_id = client.post("/telemetry/lap/save", json=payload).json()["lap_id"]
    lap = client.get(f"/telemetry/lap/{lap_id}").json()

    info = lap["lap_info"]
    assert info["lap_time_ms"] == 91_234
    assert info["sector_1_time_ms"] == 30_000
    assert info["sector_2_time_ms"] == 31_000
    assert info["sector_3_time_ms"] == 30_234
    assert info["is_valid"] is False
    assert len(lap["telemetry"]) == 20
    assert lap["telemetry"][0]["distance_m"] == 0.0


def test_clear_laps_cascades_telemetry(client, wiped):
    """FK CASCADE: clearing laps leaves zero orphaned telemetry rows."""
    import asyncio
    import os

    import asyncpg

    uid = _unique_session_uid()
    lap_id = client.post("/telemetry/lap/save", json=_lap_payload(uid)).json()["lap_id"]

    r = client.delete("/telemetry/laps/clear")
    assert r.status_code == 200

    # Use a STANDALONE connection: the app's asyncpg pool is bound to the
    # TestClient event loop and cannot be driven from asyncio.run() here.
    async def count_rows():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        try:
            orphans = await conn.fetchval(
                "SELECT COUNT(*) FROM user_lap_telemetry WHERE user_lap_id = $1", lap_id
            )
            return orphans
        finally:
            await conn.close()

    assert asyncio.run(count_rows()) == 0, "CASCADE failed — orphaned telemetry rows remain"


# ─── Reports ──────────────────────────────────────────────────────────────────


def _report_payload(session_uid: int) -> dict:
    return {
        "user_lap_id": None,
        "ghost_lap_id": None,
        "session_uid": session_uid,
        "lap_number": 3,
        "report_type": "lap_debrief",
        "title": "Audit Repair Verification",
        "markdown": "# Debrief\nBrake earlier.",
        "summary": "ok",
        "key_findings": ["brake earlier into T1", "less wheelspin T4"],
        "generated_by": "local_template",
        "generation_time_ms": 421,
        "total_time_delta_ms": 1830.5,
        "avg_speed_delta_kph": -4.2,
        "corner_count": 12,
        "worst_corner_index": 6,
        "best_corner_index": 2,
        "hardware_profile": {"tier_label": "gamepad", "confidence": 0.87},
    }


def test_report_full_field_roundtrip(client, wiped):
    """A2 + B2: save must succeed and EVERY field must come back intact."""
    uid = _unique_session_uid()
    payload = _report_payload(uid)

    r = client.post("/intelligence/reports/save", json=payload)
    assert r.status_code == 200, r.text
    report_id = r.json()["report_id"]

    got = client.get(f"/intelligence/reports/{report_id}").json()
    assert got["title"] == payload["title"]

    # Full-fidelity check against raw storage (API detail view may trim).
    # Standalone connection — app pool belongs to TestClient's loop.
    import asyncio
    import json as _json

    import asyncpg

    async def fetch_row():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            row = await conn.fetchrow(
                "SELECT * FROM intelligence_reports WHERE report_id = $1", report_id
            )
            return dict(row)
        finally:
            await conn.close()

    row = asyncio.run(fetch_row())
    assert row["markdown"] == payload["markdown"], "A2: wrong/missing markdown column"
    assert row["total_time_delta_ms"] == pytest.approx(1830.5), "B2: delta dropped"
    assert row["avg_speed_delta_kph"] == pytest.approx(-4.2)
    assert row["corner_count"] == 12
    assert row["worst_corner_index"] == 6
    assert row["best_corner_index"] == 2
    assert row["generation_time_ms"] == 421
    assert _json.loads(row["key_findings"]) == payload["key_findings"]
    assert _json.loads(row["hardware_profile"]) == payload["hardware_profile"]
    assert row["session_uid"] == uid
    assert row["lap_number"] == 3


def test_career_progression_reflects_real_deltas(client, wiped):
    """B3: pace trend must be built from stored deltas, not fabricated values."""
    uid = _unique_session_uid()
    for delta in (2500.0, 2100.0, 1700.0):  # improving over time
        body = _report_payload(uid)
        body["total_time_delta_ms"] = delta
        client.post("/intelligence/reports/save", json=body)

    data = client.get("/intelligence/career/progression").json()

    assert data["total_sessions"] >= 3
    trend = [p["total_time_delta_ms"] for p in data["pace_progression"]]
    assert trend == [2500.0, 2100.0, 1700.0]
    assert data["improvement_trend_ms"] is not None and data["improvement_trend_ms"] > 0
    assert data["data_sufficiency"]["sufficient"] is True

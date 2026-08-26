"""
APX IQ — Intelligence API Router
==================================

Thin controller layer: validates input, delegates computation to the
intelligence pipeline, returns structured responses.

Business logic lives in intelligence/* modules.
State lives in app.state (injected by api/main.py lifespan).

Endpoints:
    GET    /intelligence/health
    POST   /intelligence/delta            — Lap delta + coaching tips
    POST   /intelligence/hardware         — Input device classification
    POST   /intelligence/battle           — Race position projection
    POST   /intelligence/report/lap       — AI lap debrief (rate-limited)
    GET    /intelligence/ghost/{track_id} — FastF1 ghost lap
    POST   /intelligence/reports/save     — Persist a report
    GET    /intelligence/reports/history  — List saved reports
    GET    /intelligence/reports/{id}     — Get a single report
    DELETE /intelligence/reports/clear    — Clear all reports (admin-guarded)
"""

import asyncio
from typing import Optional

import numpy as np
from fastapi import APIRouter, HTTPException, Request, Header
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.models.shared import (
    DeltaRequest,
    HardwareRequest,
    BattleRequest,
    SaveReportRequest,
)
from core.logging_config import get_logger
from core.cache import get_cache
from core.config import settings
from intelligence.hardware_profiler import HardwareProfile, HardwareProfiler
from intelligence.battle_predictor import BattlePredictor
from intelligence.report_generator import ReportGenerator
from api.services.analysis_service import AnalysisServiceProtocol

log = get_logger("APXIQ.API.Intelligence")

router = APIRouter(prefix="/intelligence", tags=["Intelligence Layer"])
limiter = Limiter(key_func=get_remote_address)


# ─── Service Dependencies ─────────────────────────────────────────────────────

def _get_analysis_service(request: Request) -> AnalysisServiceProtocol:
    return request.app.state.analysis_service

def _get_report_service(request: Request):
    return request.app.state.report_service

def _get_report_generator(request: Request) -> ReportGenerator:
    return request.app.state.report_generator

def _get_battle_predictor(request: Request) -> BattlePredictor:
    return request.app.state.battle_predictor

def _get_hardware_profile(request: Request) -> Optional[HardwareProfile]:
    """Retrieve the session-level hardware profile (may be None)."""
    return getattr(request.app.state, "hardware_profile", None)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/health")
async def intelligence_health(request: Request):
    """Return status of all intelligence modules and the active LLM backend."""
    report_generator = _get_report_generator(request)
    hardware_profile = _get_hardware_profile(request)
    return {
        "status": "online",
        "modules": {
            "aligner":           "ready",
            "corner_detector":   "ready",
            "delta_engine":      "ready",
            "hardware_profiler": "ready",
            "coach_engine":      "ready",
            "battle_predictor":  "ready",
            "report_generator":  report_generator.active_backend,
        },
        "llm_backend":       report_generator.backend_info,
        "hardware_detected": hardware_profile.tier_label if hardware_profile else None,
    }


@router.post("/delta")
async def compute_delta(req: DeltaRequest, request: Request):
    """
    Compute lap delta between user and ghost telemetry.

    Returns speed delta, cumulative time delta, brake-point comparison,
    and coaching tips across all detected corners.
    """
    analysis_service = _get_analysis_service(request)
    hardware_profile = _get_hardware_profile(request)
    try:
        _, _, user_corners, _, delta, tips = await analysis_service.run_pipeline(
            req.user_telemetry, req.ghost_telemetry, req.grid_points, hardware_profile
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "total_time_delta_ms":      delta.total_time_delta_ms,
        "avg_speed_delta_kph":      delta.avg_speed_delta_kph,
        "worst_corner_index":       delta.worst_corner_index,
        "best_corner_index":        delta.best_corner_index,
        "corner_count":             user_corners.total_corners,
        "distance_grid":            delta.distance_grid.tolist(),
        "speed_delta_kph":          delta.speed_delta_kph.tolist(),
        "cumulative_time_delta_ms": delta.cumulative_time_delta_ms.tolist(),
        "brake_point_deltas": [
            {
                "corner_index":           bp.corner_index,
                "delta_m":                bp.delta_m,
                "user_brake_distance_m":  bp.user_brake_distance_m,
                "ghost_brake_distance_m": bp.ghost_brake_distance_m,
            }
            for bp in delta.brake_point_deltas
        ],
        "coaching_tips": [
            {
                "category":       t.category.value,
                "severity":       t.severity.value,
                "message":        t.message,
                "corner_index":   t.corner_index,
                "time_impact_ms": t.time_impact_ms,
            }
            for t in tips
        ],
    }


@router.post("/hardware")
async def classify_hardware(req: HardwareRequest, request: Request):
    """
    Classify the player's input device from steering trace statistics.
    """
    profiler = HardwareProfiler()
    profile = await asyncio.to_thread(
        profiler.classify, np.array(req.steer_trace, dtype=np.float32)
    )
    if profile is None:
        raise HTTPException(status_code=400, detail="Could not classify hardware")

    # Store profile in app.state
    request.app.state.hardware_profile = profile
    log.info("hardware_classified", tier=profile.tier_label, confidence=profile.confidence)

    return {
        "detected_type":     profile.detected_type,
        "tier_label":        profile.tier_label,
        "confidence":        profile.confidence,
        "steer_variance":    profile.steer_variance,
        "dominant_freq_hz":  profile.steer_dominant_freq_hz,
        "brake_threshold_m": profile.brake_threshold_m,
    }


@router.post("/battle")
async def predict_battle(req: BattleRequest, request: Request):
    """Project race position based on current gaps and remaining laps."""
    predictor  = _get_battle_predictor(request)
    projection = predictor.project_race(
        current_position=req.current_position,
        gap_ahead_s=req.gap_ahead_s,
        gap_behind_s=req.gap_behind_s,
        laps_remaining=req.laps_remaining,
        gap_to_leader_s=req.gap_to_leader_s,
    )
    return {
        "current_position":            projection.current_position,
        "predicted_finish":            projection.predicted_finish_position,
        "risk_level":                  projection.risk_level,
        "ahead_overtake_probability":  (
            projection.ahead_prediction.overtake_probability
            if projection.ahead_prediction else 0.0
        ),
        "ahead_laps_to_overtake": (
            projection.ahead_prediction.laps_to_overtake
            if projection.ahead_prediction else None
        ),
        "ahead_action": (
            projection.ahead_prediction.recommended_action
            if projection.ahead_prediction else "No data."
        ),
        "behind_overtake_probability": (
            projection.behind_prediction.overtake_probability
            if projection.behind_prediction else 0.0
        ),
        "behind_action": (
            projection.behind_prediction.recommended_action
            if projection.behind_prediction else "No data."
        ),
    }


@router.post("/report/lap")
@limiter.limit("10/minute")
async def generate_lap_report(request: Request, req: DeltaRequest):
    """
    Generate an AI coaching debrief for a lap comparison.
    """
    analysis_service  = _get_analysis_service(request)
    hardware_profile  = _get_hardware_profile(request)
    report_generator  = _get_report_generator(request)

    try:
        _, _, user_corners, ghost_corners, delta, tips = await analysis_service.run_pipeline(
            req.user_telemetry, req.ghost_telemetry, req.grid_points, hardware_profile
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        report = await report_generator.generate_lap_debrief(
            delta=delta,
            user_corners=user_corners,
            ghost_corners=ghost_corners,
            coaching_tips=tips,
            hardware=hardware_profile,
        )
        log.info("report_generated", backend=report.generated_by, title=report.title)
        return {
            "title":        report.title,
            "markdown":     report.markdown,
            "summary":      report.summary,
            "key_findings": report.key_findings,
            "generated_by": report.generated_by,
        }
    except Exception as exc:
        log.error("report_generation_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/report/lap/stream")
@limiter.limit("10/minute")
async def stream_lap_report(request: Request, req: DeltaRequest):
    """
    Stream an AI coaching debrief token-by-token (Server-Sent Events / SSE).
    """
    from fastapi.responses import StreamingResponse

    analysis_service = _get_analysis_service(request)
    hardware_profile = _get_hardware_profile(request)
    report_generator = _get_report_generator(request)

    try:
        _, _, user_corners, ghost_corners, delta, tips = await analysis_service.run_pipeline(
            req.user_telemetry, req.ghost_telemetry, req.grid_points, hardware_profile
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    async def _token_generator():
        async for token in report_generator.stream_lap_debrief(
            delta=delta,
            user_corners=user_corners,
            ghost_corners=ghost_corners,
            coaching_tips=tips,
            hardware=hardware_profile,
        ):
            yield token

    return StreamingResponse(_token_generator(), media_type="text/plain")


@router.get("/ghost/{track_id}")
async def get_ghost_lap(
    track_id:     int,
    year:         int = 2024,
    driver:       str = "VER",
    session_type: str = "R",
):
    """
    Fetch ghost lap telemetry from FastF1.
    """
    from intelligence.fastf1_client import FastF1Client, resolve_track_name

    track_name = resolve_track_name(track_id)
    if not track_name:
        raise HTTPException(status_code=404, detail=f"Unknown track ID: {track_id}")

    cache     = get_cache()
    cache_key = f"ghost:{track_id}:{year}:{driver}:{session_type}"
    cached    = await cache.get(cache_key)
    if cached:
        log.debug("ghost_lap_cache_hit", track=track_name, driver=driver)
        return cached

    log.info("ghost_lap_fetching", track=track_name, year=year, driver=driver)

    def _fetch():
        client = FastF1Client()
        return client.fetch_ghost_lap(
            year=year, gp=track_name, session_type=session_type,
            driver=driver, lap="fastest",
        )

    try:
        result = await asyncio.to_thread(_fetch)
    except Exception as exc:
        log.error("ghost_lap_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No ghost lap for {driver} at {track_name} {year}",
        )

    meta      = result["metadata"]
    telemetry = result["telemetry"]
    payload   = {
        "track_name":       track_name,
        "driver":           meta["driver_code"],
        "year":             meta["year"],
        "lap_time_s":       (meta["lap_time_ms"] / 1000.0) if meta.get("lap_time_ms") else None,
        "telemetry_points": len(telemetry),
        "telemetry":        telemetry.to_dict(orient="records"),
    }

    await cache.set(cache_key, payload, ttl=3600)
    log.info("ghost_lap_loaded", track=track_name, driver=driver, points=len(telemetry))
    return payload


@router.get("/track/{track_id}/layout")
async def get_track_layout(
    track_id:     int,
    year:         int = 2024,
    driver:       str = "VER",
    session_type: str = "Q",
):
    """
    Circuit geometry for the map — library-first (docs/architecture/
    era_profiles.md §4): serve the persisted circuit when seeded,
    otherwise fetch from FastF1 and promote it into the library.
    """
    from intelligence.fastf1_client import FastF1Client, resolve_track_name

    track_name = resolve_track_name(track_id)
    if not track_name:
        raise HTTPException(status_code=404, detail=f"Unknown track ID: {track_id}")

    # 1. Library hit
    from core.database import db
    if db.pool is not None:
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT name, layout, sectors, aero_zones
                FROM circuits WHERE track_id = $1
                """,
                track_id,
            )
        if row and row["layout"]:
            cached = {
                "source": "library",
                "track_name": row["name"],
                **row["layout"],
                "sectors": row["sectors"],
                "aero_zones": row["aero_zones"],
            }
            await cache.set(f"track_layout:{track_id}:{year}", cached, ttl=86400)
            return cached

    # 2. FastF1 fetch
    cache   = get_cache()
    cache_key = f"track_layout:{track_id}:{year}:{driver}:{session_type}"
    hit = await cache.get(cache_key)
    if hit:
        return hit

    def _fetch():
        client = FastF1Client()
        return client.get_track_layout(year=year, gp=track_name, session_type=session_type, driver=driver)

    result = await asyncio.to_thread(_fetch)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Could not load track layout for track {track_id}")

    payload = {**result, "source": "fastf1", "track_name": track_name}
    await cache.set(cache_key, payload, ttl=86400)

    # 3. Promote into the library
    if db.pool is not None:
        import json
        async with db.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO circuits (track_id, name, game_years, layout)
                VALUES ($1, $2, ARRAY[$3::int], $4::jsonb)
                ON CONFLICT (track_id) DO UPDATE
                    SET layout = EXCLUDED.layout,
                        game_years = array_append(DISTINCT circuits.game_years || EXCLUDED.game_years, $3::int),
                        updated_at = NOW()
                """,
                track_id,
                track_name,
                year,
                json.dumps(result),
            )

    return payload


@router.post("/reports/save")
async def save_report(req: SaveReportRequest, request: Request):
    """Persist an AI-generated report to storage."""
    service   = _get_report_service(request)
    report_id = await service.save_report(req.model_dump())
    log.info("report_saved", report_id=report_id, title=req.title)
    return {"report_id": report_id, "message": "Report saved"}


@router.get("/reports/history")
async def get_report_history(
    request:     Request,
    limit:       int             = 20,
    report_type: Optional[str]  = None,
):
    """List saved reports, most recent first."""
    service = _get_report_service(request)
    reports = await service.list_reports(limit=limit, report_type=report_type)
    return [
        {
            "report_id":   r.get("report_id"),
            "title":       r.get("title"),
            "summary":     r.get("summary"),
            "report_type": r.get("report_type"),
            "generated_by":r.get("generated_by"),
            "lap_number":  r.get("lap_number"),
            "created_at":  r.get("created_at"),
        }
        for r in reports
    ]


@router.get("/reports/{report_id}")
async def get_report(report_id: int, request: Request):
    """Retrieve a single report by ID."""
    service = _get_report_service(request)
    report  = await service.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return {
        "title":        report.get("title"),
        "markdown":     report.get("markdown"),
        "summary":      report.get("summary"),
        "key_findings": report.get("key_findings", []),
        "generated_by": report.get("generated_by"),
    }


@router.get("/career/progression")
async def get_career_progression(request: Request, limit: int = 50):
    """
    Compute driver pace trends from REAL persisted data.

    Honesty policy (audit B3): metrics that cannot be computed from
    stored fields are returned as null with an explicit sufficiency
    marker — never fabricated placeholders.
    """
    report_service = _get_report_service(request)
    lap_service = request.app.state.lap_service

    reports = await report_service.list_reports(limit=limit)
    laps = await lap_service.list_laps(session_uid=None, min_telemetry_points=0)

    # Newest-first from storage; reverse so trend reads chronologically
    chronological = list(reversed(reports))
    pace_trend = [
        {
            "report_id":           r.get("report_id"),
            "date":                str(r.get("created_at")),
            "lap_number":          r.get("lap_number"),
            "total_time_delta_ms": r.get("total_time_delta_ms"),
        }
        for r in chronological
        if r.get("total_time_delta_ms") is not None
    ]

    deltas = [p["total_time_delta_ms"] for p in pace_trend]
    sufficient = len(deltas) >= 3

    improvement_trend_ms = None
    if sufficient:
        half = len(deltas) // 2
        older_half, recent_half = deltas[:half], deltas[half:]
        # Delta is user-vs-ghost time loss; falling delta = improving.
        improvement_trend_ms = round(
            (sum(older_half) / len(older_half)) - (sum(recent_half) / len(recent_half)), 1
        )

    return {
        "total_sessions":        len(reports),
        "total_laps_recorded":   len(laps),
        "pace_progression":      pace_trend,
        "avg_delta_recent_ms": (
            round(sum(deltas[-5:]) / len(deltas[-5:]), 1) if deltas else None
        ),
        "improvement_trend_ms":  improvement_trend_ms,
        "data_sufficiency": {
            "sufficient":          sufficient,
            "reports_with_delta":  len(deltas),
            "required":            3,
        },
    }


@router.delete("/reports/clear")
async def clear_reports(
    request: Request,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
):
    """Clear all stored reports. Guarded by admin key in non-development environments."""
    admin_key = getattr(settings, "admin_api_key", None)
    if admin_key and x_admin_key != admin_key:
        raise HTTPException(status_code=403, detail="Unauthorized: Invalid X-Admin-Key header")

    service = _get_report_service(request)
    count   = await service.clear()
    log.info("reports_cleared", count=count)
    return {"reports_cleared": count}

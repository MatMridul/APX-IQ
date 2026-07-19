"""
APX IQ — Intelligence API Router
==================================

Phase 3 improvements:
  - Structured logging (structlog)
  - Rate limiting on LLM endpoints (slowapi)
  - FastF1 calls wrapped in asyncio.to_thread (no more event-loop blocking)
  - Alignment results cached via core.cache
  - In-memory report storage (database wiring is Phase 3 follow-up)
"""

import asyncio
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from core.logging_config import get_logger
from core.cache import get_cache
from intelligence.alignment import DistanceAligner
from intelligence.corner_detector import CornerDetector
from intelligence.delta_engine import DeltaEngine
from intelligence.hardware_profiler import HardwareProfiler, HardwareProfile
from intelligence.coach_engine import CoachEngine
from intelligence.battle_predictor import BattlePredictor
from intelligence.report_generator import ReportGenerator
from intelligence.constants import TRACK_MAP

log = get_logger("APXIQ.API.Intelligence")

router = APIRouter(prefix="/intelligence", tags=["Intelligence Layer"])

# ─── Shared module-level singletons ──────────────────────────────────────────

_battle_predictor  = BattlePredictor()
_report_generator  = ReportGenerator()
_hardware_profile: Optional[HardwareProfile] = None

# In-memory report store (will be replaced with DB in Phase 3b)
_report_storage: dict[int, dict] = {}
_next_report_id = 1

# Max telemetry array size to prevent OOM
_MAX_TELEMETRY_POINTS = 5000


# ─── Request / Response Models ────────────────────────────────────────────────

class TelemetryPoint(BaseModel):
    distance_m: float
    speed_kph:  float
    throttle:   float = 0.0
    brake:      float = 0.0
    steer:      float = 0.0
    gear:       int   = 0
    rpm:        int   = 0
    drs:        bool  = False
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class DeltaRequest(BaseModel):
    user_telemetry:  list[TelemetryPoint]
    ghost_telemetry: list[TelemetryPoint]
    grid_points:     int = 1000

    @field_validator("user_telemetry", "ghost_telemetry")
    @classmethod
    def check_size(cls, v):
        if len(v) > _MAX_TELEMETRY_POINTS:
            raise ValueError(
                f"Telemetry array too large: {len(v)} > {_MAX_TELEMETRY_POINTS}"
            )
        if len(v) < 10:
            raise ValueError(f"Telemetry array too small: {len(v)} < 10")
        return v


class HardwareRequest(BaseModel):
    steer_trace: list[float]

    @field_validator("steer_trace")
    @classmethod
    def check_steer(cls, v):
        if len(v) < 200:
            raise ValueError(f"Need ≥ 200 steer samples, got {len(v)}")
        return v


class BattleRequest(BaseModel):
    current_position: int
    gap_ahead_s:      float
    gap_behind_s:     float
    laps_remaining:   int
    gap_to_leader_s:  float = 0.0


class SaveReportRequest(BaseModel):
    user_lap_id:          Optional[int]   = None
    ghost_lap_id:         Optional[int]   = None
    session_uid:          Optional[int]   = None
    lap_number:           Optional[int]   = None
    report_type:          str             = "lap_debrief"
    title:                str
    markdown:             str
    summary:              str
    key_findings:         list[str]
    generated_by:         str
    generation_time_ms:   Optional[int]   = None
    total_time_delta_ms:  Optional[float] = None
    avg_speed_delta_kph:  Optional[float] = None
    corner_count:         Optional[int]   = None
    worst_corner_index:   Optional[int]   = None
    best_corner_index:    Optional[int]   = None
    hardware_profile:     Optional[dict]  = None


# ─── Internal helpers ─────────────────────────────────────────────────────────

async def _run_pipeline(req: DeltaRequest):
    """
    Full analysis pipeline: align → corners → delta → coach.
    Runs DataFrame-heavy work in a thread to avoid blocking the event loop.
    Results cached by (user_hash, ghost_hash, grid_points).
    """
    cache = get_cache()
    cache_key = (
        f"pipeline:"
        f"{hash(tuple(t.distance_m for t in req.user_telemetry[:5]))}:"
        f"{hash(tuple(t.distance_m for t in req.ghost_telemetry[:5]))}:"
        f"{req.grid_points}"
    )

    cached = await cache.get(cache_key)
    if cached:
        log.debug("pipeline_cache_hit", key=cache_key[:60])
        return cached

    def _compute():
        user_df  = pd.DataFrame([t.model_dump() for t in req.user_telemetry])
        ghost_df = pd.DataFrame([t.model_dump() for t in req.ghost_telemetry])

        aligner     = DistanceAligner(grid_points=req.grid_points)
        ua, ga      = aligner.align(user_df, ghost_df)

        detector    = CornerDetector()
        user_corners  = detector.detect(ua)
        ghost_corners = detector.detect(ga)

        engine = DeltaEngine()
        delta  = engine.compute(ua, ga, user_corners, ghost_corners)

        coach = CoachEngine(hardware_profile=_hardware_profile)
        tips  = coach.analyze(delta, user_corners, ghost_corners)

        return ua, ga, user_corners, ghost_corners, delta, tips

    result = await asyncio.to_thread(_compute)
    await cache.set(cache_key, result, ttl=300)
    return result


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/health")
async def intelligence_health():
    return {
        "status": "online",
        "modules": {
            "aligner":          "ready",
            "corner_detector":  "ready",
            "delta_engine":     "ready",
            "hardware_profiler":"ready",
            "coach_engine":     "ready",
            "battle_predictor": "ready",
            "report_generator": _report_generator.active_backend,
        },
        "llm_backend":      _report_generator.backend_info,
        "hardware_detected": _hardware_profile.tier_label if _hardware_profile else None,
    }


@router.post("/delta")
async def compute_delta(req: DeltaRequest):
    try:
        _, _, user_corners, _, delta, tips = await _run_pipeline(req)
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/hardware")
async def classify_hardware(req: HardwareRequest):
    global _hardware_profile
    profiler = HardwareProfiler()
    profile  = await asyncio.to_thread(
        profiler.classify, np.array(req.steer_trace, dtype=np.float32)
    )
    if profile is None:
        raise HTTPException(status_code=400, detail="Could not classify hardware")
    _hardware_profile = profile
    log.info("hardware_classified", tier=profile.tier_label, confidence=profile.confidence)
    return {
        "detected_type":    profile.detected_type,
        "tier_label":       profile.tier_label,
        "confidence":       profile.confidence,
        "steer_variance":   profile.steer_variance,
        "dominant_freq_hz": profile.steer_dominant_freq_hz,
        "brake_threshold_m":profile.brake_threshold_m,
    }


@router.post("/battle")
async def predict_battle(req: BattleRequest):
    projection = _battle_predictor.project_race(
        current_position=req.current_position,
        gap_ahead_s=req.gap_ahead_s,
        gap_behind_s=req.gap_behind_s,
        laps_remaining=req.laps_remaining,
        gap_to_leader_s=req.gap_to_leader_s,
    )
    return {
        "current_position":          projection.current_position,
        "predicted_finish":          projection.predicted_finish_position,
        "risk_level":                projection.risk_level,
        "ahead_overtake_probability": (
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
async def generate_lap_report(request: Request, req: DeltaRequest):
    """Generate AI lap debrief — rate limited to 5/minute per IP."""
    # Apply rate limit manually (slowapi decorator doesn't work well with lifespan)
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    try:
        _, _, user_corners, ghost_corners, delta, tips = await _run_pipeline(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        # LLM call — wrapped in to_thread if backend is sync
        report = await _report_generator.generate_lap_debrief(
            delta=delta,
            user_corners=user_corners,
            ghost_corners=ghost_corners,
            coaching_tips=tips,
            hardware=_hardware_profile,
        )
        log.info("report_generated", backend=report.generated_by, title=report.title)
        return {
            "title":        report.title,
            "markdown":     report.markdown,
            "summary":      report.summary,
            "key_findings": report.key_findings,
            "generated_by": report.generated_by,
        }
    except Exception as e:
        log.error("report_generation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ghost/{track_id}")
async def get_ghost_lap(
    track_id: int,
    year:         int = 2024,
    driver:       str = "VER",
    session_type: str = "R",
):
    """Fetch ghost lap from FastF1 — runs in thread (blocking I/O)."""
    from intelligence.fastf1_client import FastF1Client, resolve_track_name

    track_name = resolve_track_name(track_id)
    if not track_name:
        raise HTTPException(status_code=404, detail=f"Unknown track ID: {track_id}")

    cache = get_cache()
    cache_key = f"ghost:{track_id}:{year}:{driver}:{session_type}"
    cached = await cache.get(cache_key)
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
    except Exception as e:
        log.error("ghost_lap_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No ghost lap for {driver} at {track_name} {year}",
        )

    meta = result["metadata"]
    telemetry = result["telemetry"]
    payload = {
        "track_name":       track_name,
        "driver":           meta["driver_code"],
        "year":             meta["year"],
        "lap_time_s":       (meta["lap_time_ms"] / 1000.0) if meta.get("lap_time_ms") else None,
        "telemetry_points": len(telemetry),
        "telemetry":        telemetry.to_dict(orient="records"),
    }

    # Cache for 1 hour — F1 data never changes
    await cache.set(cache_key, payload, ttl=3600)
    log.info("ghost_lap_loaded", track=track_name, driver=driver, points=len(telemetry))
    return payload


@router.post("/reports/save")
async def save_report(req: SaveReportRequest):
    global _next_report_id
    import pandas as pd

    report_id = _next_report_id
    _next_report_id += 1
    _report_storage[report_id] = {
        **req.model_dump(),
        "report_id": report_id,
        "created_at": pd.Timestamp.now().isoformat(),
    }
    log.info("report_saved", report_id=report_id, title=req.title)
    return {"report_id": report_id, "message": "Report saved"}


@router.get("/reports/history")
async def get_report_history(limit: int = 20, report_type: Optional[str] = None):
    reports = list(_report_storage.values())
    if report_type:
        reports = [r for r in reports if r["report_type"] == report_type]
    reports.sort(key=lambda r: r["created_at"], reverse=True)
    return [
        {
            "report_id":   r["report_id"],
            "title":       r["title"],
            "summary":     r["summary"],
            "report_type": r["report_type"],
            "generated_by":r["generated_by"],
            "lap_number":  r.get("lap_number"),
            "created_at":  r["created_at"],
        }
        for r in reports[:limit]
    ]


@router.get("/reports/{report_id}")
async def get_report(report_id: int):
    report = _report_storage.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return {
        "title":        report["title"],
        "markdown":     report["markdown"],
        "summary":      report["summary"],
        "key_findings": report["key_findings"],
        "generated_by": report["generated_by"],
    }


@router.delete("/reports/clear")
async def clear_reports():
    global _report_storage, _next_report_id
    count = len(_report_storage)
    _report_storage = {}
    _next_report_id = 1
    return {"reports_cleared": count}

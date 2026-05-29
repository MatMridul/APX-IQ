"""
Intelligence API Router
========================

FastAPI router exposing all Intelligence Layer endpoints:
    - GET  /intelligence/health          — Module health check
    - POST /intelligence/align           — Align user + ghost telemetry
    - POST /intelligence/corners         — Detect corners from aligned data
    - POST /intelligence/delta           — Compute full delta analysis
    - POST /intelligence/coach           — Get coaching tips
    - POST /intelligence/hardware        — Classify input hardware
    - POST /intelligence/battle          — Predict overtake opportunity
    - POST /intelligence/report/lap      — Generate lap debrief report
    - POST /intelligence/report/race     — Generate race summary report
    - GET  /intelligence/ghost/{track}   — Fetch ghost lap for a track

All endpoints accept/return JSON. The heavy lifting is done by the
intelligence modules — this router is just the HTTP interface.
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from intelligence.alignment import DistanceAligner
from intelligence.corner_detector import CornerDetector, CornerMap
from intelligence.delta_engine import DeltaEngine, DeltaResult
from intelligence.hardware_profiler import HardwareProfiler, HardwareProfile
from intelligence.coach_engine import CoachEngine
from intelligence.battle_predictor import BattlePredictor
from intelligence.report_generator import ReportGenerator
from intelligence.constants import TRACK_MAP

logger = logging.getLogger("APXIQ.API.Intelligence")

router = APIRouter(prefix="/intelligence", tags=["Intelligence Layer"])

# =========================================================================
# Shared State (lives for the lifetime of the API process)
# =========================================================================
_battle_predictor = BattlePredictor()
_hardware_profile: Optional[HardwareProfile] = None
_report_generator = ReportGenerator()  # Will try to pick up GEMINI_API_KEY

# In-memory report storage (temporary until database is connected)
_report_storage: dict[int, dict] = {}
_next_report_id = 1


# =========================================================================
# Request / Response Models
# =========================================================================

class TelemetryPoint(BaseModel):
    """Single telemetry sample."""
    distance_m: float
    speed_kph: float
    throttle: float = 0.0
    brake: float = 0.0
    steer: float = 0.0
    gear: int = 0
    rpm: int = 0
    drs: bool = False
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class AlignRequest(BaseModel):
    """Request to align two telemetry traces."""
    user_telemetry: list[TelemetryPoint]
    ghost_telemetry: list[TelemetryPoint]
    grid_points: int = 1000


class AlignResponse(BaseModel):
    """Aligned telemetry grids."""
    grid_points: int
    user_distance: list[float]
    user_speed: list[float]
    ghost_distance: list[float]
    ghost_speed: list[float]


class DeltaRequest(BaseModel):
    """Request to compute delta analysis."""
    user_telemetry: list[TelemetryPoint]
    ghost_telemetry: list[TelemetryPoint]
    grid_points: int = 1000


class DeltaResponse(BaseModel):
    """Delta analysis result."""
    total_time_delta_ms: float
    avg_speed_delta_kph: float
    worst_corner_index: Optional[int]
    best_corner_index: Optional[int]
    corner_count: int
    distance_grid: list[float]
    speed_delta_kph: list[float]
    cumulative_time_delta_ms: list[float]
    brake_point_deltas: list[dict]
    coaching_tips: list[dict]


class HardwareRequest(BaseModel):
    """Request to classify hardware."""
    steer_trace: list[float]


class HardwareResponse(BaseModel):
    """Hardware classification result."""
    detected_type: str
    tier_label: str
    confidence: float
    steer_variance: float
    dominant_freq_hz: float
    brake_threshold_m: float


class BattleRequest(BaseModel):
    """Request for battle prediction."""
    current_position: int
    gap_ahead_s: float
    gap_behind_s: float
    laps_remaining: int
    gap_to_leader_s: float = 0.0


class BattleResponse(BaseModel):
    """Battle prediction result."""
    current_position: int
    predicted_finish: int
    risk_level: str
    ahead_overtake_probability: float
    ahead_laps_to_overtake: Optional[int]
    ahead_action: str
    behind_overtake_probability: float
    behind_action: str


class GhostRequest(BaseModel):
    """Request for ghost lap data."""
    year: int = 2024
    driver: str = "VER"
    session_type: str = "R"


class ReportResponse(BaseModel):
    """Generated debrief report."""
    title: str
    markdown: str
    summary: str
    key_findings: list[str]
    generated_by: str


class SaveReportRequest(BaseModel):
    """Request to save a generated report."""
    user_lap_id: Optional[int] = None
    ghost_lap_id: Optional[int] = None
    session_uid: Optional[int] = None
    lap_number: Optional[int] = None
    report_type: str = "lap_debrief"
    title: str
    markdown: str
    summary: str
    key_findings: list[str]
    generated_by: str
    generation_time_ms: Optional[int] = None
    total_time_delta_ms: Optional[float] = None
    avg_speed_delta_kph: Optional[float] = None
    corner_count: Optional[int] = None
    worst_corner_index: Optional[int] = None
    best_corner_index: Optional[int] = None
    hardware_profile: Optional[dict] = None


class SavedReportInfo(BaseModel):
    """Saved report metadata."""
    report_id: int
    title: str
    summary: str
    report_type: str
    generated_by: str
    lap_number: Optional[int]
    created_at: str


# =========================================================================
# Endpoints
# =========================================================================

@router.get("/health")
async def intelligence_health():
    """Health check for the intelligence layer."""
    return {
        "status": "online",
        "modules": {
            "aligner": "ready",
            "corner_detector": "ready",
            "delta_engine": "ready",
            "hardware_profiler": "ready",
            "coach_engine": "ready",
            "battle_predictor": "ready",
            "report_generator": _report_generator.active_backend,
        },
        "llm_backend": _report_generator.backend_info,
        "hardware_detected": (
            _hardware_profile.tier_label if _hardware_profile else None
        ),
    }


@router.post("/align", response_model=AlignResponse)
async def align_telemetry(req: AlignRequest):
    """Align user and ghost telemetry to a common distance grid."""
    try:
        user_df = pd.DataFrame([t.model_dump() for t in req.user_telemetry])
        ghost_df = pd.DataFrame([t.model_dump() for t in req.ghost_telemetry])

        aligner = DistanceAligner(grid_points=req.grid_points)
        user_aligned, ghost_aligned = aligner.align(user_df, ghost_df)

        return AlignResponse(
            grid_points=req.grid_points,
            user_distance=user_aligned["distance_m"].tolist(),
            user_speed=user_aligned["speed_kph"].tolist(),
            ghost_distance=ghost_aligned["distance_m"].tolist(),
            ghost_speed=ghost_aligned["speed_kph"].tolist(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/corners")
async def detect_corners(telemetry: list[TelemetryPoint]):
    """Detect corners from a telemetry trace."""
    df = pd.DataFrame([t.model_dump() for t in telemetry])
    detector = CornerDetector()
    corner_map = detector.detect(df)

    return {
        "total_corners": corner_map.total_corners,
        "corners": [
            {
                "index": c.index,
                "apex_distance_m": c.apex_distance_m,
                "apex_speed_kph": c.apex_speed_kph,
                "entry_distance_m": c.entry_distance_m,
                "exit_distance_m": c.exit_distance_m,
                "classification": c.classification,
            }
            for c in corner_map.corners
        ],
    }


@router.post("/delta", response_model=DeltaResponse)
async def compute_delta(req: DeltaRequest):
    """
    Full delta pipeline: Align → Corners → Delta → Coach.
    This is the primary endpoint for lap analysis.
    """
    global _hardware_profile

    try:
        # Convert to DataFrames
        user_df = pd.DataFrame([t.model_dump() for t in req.user_telemetry])
        ghost_df = pd.DataFrame([t.model_dump() for t in req.ghost_telemetry])

        # Step 1: Align
        aligner = DistanceAligner(grid_points=req.grid_points)
        user_aligned, ghost_aligned = aligner.align(user_df, ghost_df)

        # Step 2: Detect corners
        detector = CornerDetector()
        user_corners = detector.detect(user_aligned)
        ghost_corners = detector.detect(ghost_aligned)

        # Step 3: Compute delta
        engine = DeltaEngine()
        delta = engine.compute(
            user_aligned, ghost_aligned, user_corners, ghost_corners
        )

        # Step 4: Generate coaching tips
        coach = CoachEngine(hardware_profile=_hardware_profile)
        tips = coach.analyze(delta, user_corners, ghost_corners)

        return DeltaResponse(
            total_time_delta_ms=delta.total_time_delta_ms,
            avg_speed_delta_kph=delta.avg_speed_delta_kph,
            worst_corner_index=delta.worst_corner_index,
            best_corner_index=delta.best_corner_index,
            corner_count=user_corners.total_corners,
            distance_grid=delta.distance_grid.tolist(),
            speed_delta_kph=delta.speed_delta_kph.tolist(),
            cumulative_time_delta_ms=delta.cumulative_time_delta_ms.tolist(),
            brake_point_deltas=[
                {
                    "corner_index": bp.corner_index,
                    "delta_m": bp.delta_m,
                    "user_brake_distance_m": bp.user_brake_distance_m,
                    "ghost_brake_distance_m": bp.ghost_brake_distance_m,
                }
                for bp in delta.brake_point_deltas
            ],
            coaching_tips=[
                {
                    "category": t.category.value,
                    "severity": t.severity.value,
                    "message": t.message,
                    "corner_index": t.corner_index,
                    "time_impact_ms": t.time_impact_ms,
                }
                for t in tips
            ],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/hardware", response_model=HardwareResponse)
async def classify_hardware(req: HardwareRequest):
    """Classify input hardware from a steering trace."""
    global _hardware_profile

    if len(req.steer_trace) < 200:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 200 steer samples, got {len(req.steer_trace)}"
        )

    profiler = HardwareProfiler()
    profile = profiler.classify(np.array(req.steer_trace, dtype=np.float32))

    if profile is None:
        raise HTTPException(
            status_code=400,
            detail="Could not classify hardware from the given trace."
        )

    # Store globally for coaching threshold scaling
    _hardware_profile = profile

    return HardwareResponse(
        detected_type=profile.detected_type,
        tier_label=profile.tier_label,
        confidence=profile.confidence,
        steer_variance=profile.steer_variance,
        dominant_freq_hz=profile.steer_dominant_freq_hz,
        brake_threshold_m=profile.brake_threshold_m,
    )


@router.post("/battle", response_model=BattleResponse)
async def predict_battle(req: BattleRequest):
    """Predict overtaking opportunities and race position."""
    projection = _battle_predictor.project_race(
        current_position=req.current_position,
        gap_ahead_s=req.gap_ahead_s,
        gap_behind_s=req.gap_behind_s,
        laps_remaining=req.laps_remaining,
        gap_to_leader_s=req.gap_to_leader_s,
    )

    return BattleResponse(
        current_position=projection.current_position,
        predicted_finish=projection.predicted_finish_position,
        risk_level=projection.risk_level,
        ahead_overtake_probability=(
            projection.ahead_prediction.overtake_probability
            if projection.ahead_prediction else 0.0
        ),
        ahead_laps_to_overtake=(
            projection.ahead_prediction.laps_to_overtake
            if projection.ahead_prediction else None
        ),
        ahead_action=(
            projection.ahead_prediction.recommended_action
            if projection.ahead_prediction else "No data."
        ),
        behind_overtake_probability=(
            projection.behind_prediction.overtake_probability
            if projection.behind_prediction else 0.0
        ),
        behind_action=(
            projection.behind_prediction.recommended_action
            if projection.behind_prediction else "No data."
        ),
    )


@router.post("/report/lap", response_model=ReportResponse)
async def generate_lap_report(req: DeltaRequest):
    """Generate a full AI-powered lap debrief report."""
    try:
        # Run the full pipeline first
        user_df = pd.DataFrame([t.model_dump() for t in req.user_telemetry])
        ghost_df = pd.DataFrame([t.model_dump() for t in req.ghost_telemetry])

        aligner = DistanceAligner(grid_points=req.grid_points)
        user_aligned, ghost_aligned = aligner.align(user_df, ghost_df)

        detector = CornerDetector()
        user_corners = detector.detect(user_aligned)
        ghost_corners = detector.detect(ghost_aligned)

        engine = DeltaEngine()
        delta = engine.compute(
            user_aligned, ghost_aligned, user_corners, ghost_corners
        )

        coach = CoachEngine(hardware_profile=_hardware_profile)
        tips = coach.analyze(delta, user_corners, ghost_corners)

        # Generate report
        report = await _report_generator.generate_lap_debrief(
            delta=delta,
            user_corners=user_corners,
            ghost_corners=ghost_corners,
            coaching_tips=tips,
            hardware=_hardware_profile,
        )

        return ReportResponse(
            title=report.title,
            markdown=report.markdown,
            summary=report.summary,
            key_findings=report.key_findings,
            generated_by=report.generated_by,
        )
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ghost/{track_id}")
async def get_ghost_lap(
    track_id: int,
    year: int = 2024,
    driver: str = "VER",
    session_type: str = "R",
):
    """Fetch a ghost lap from real-world F1 data via FastF1."""
    from intelligence.fastf1_client import FastF1Client, resolve_track_name

    track_name = resolve_track_name(track_id)
    if not track_name:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown track ID: {track_id}"
        )

    try:
        client = FastF1Client()
        result = client.fetch_ghost_lap(
            year=year,
            gp=track_name,  # Use track name, not track_id
            session_type=session_type,
            driver=driver,
            lap="fastest"
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail=f"No ghost lap found for {driver} at {track_name} {year}"
            )

        metadata = result["metadata"]
        telemetry = result["telemetry"]

        # Convert lap_time_ms to seconds
        lap_time_s = metadata["lap_time_ms"] / 1000.0 if metadata.get("lap_time_ms") else None

        return {
            "track_name": track_name,
            "driver": metadata["driver_code"],
            "year": metadata["year"],
            "lap_time_s": lap_time_s,
            "telemetry_points": len(telemetry),
            "telemetry": telemetry.to_dict(orient="records"),
        }
    except Exception as e:
        logger.error(f"Ghost lap fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/save")
async def save_report(req: SaveReportRequest):
    """
    Save a generated report to storage.
    
    Args:
        req: Report data to save
    
    Returns:
        Saved report ID
    """
    global _next_report_id
    
    report_id = _next_report_id
    _next_report_id += 1
    
    _report_storage[report_id] = {
        "report_id": report_id,
        "user_lap_id": req.user_lap_id,
        "ghost_lap_id": req.ghost_lap_id,
        "session_uid": req.session_uid,
        "lap_number": req.lap_number,
        "report_type": req.report_type,
        "title": req.title,
        "markdown": req.markdown,
        "summary": req.summary,
        "key_findings": req.key_findings,
        "generated_by": req.generated_by,
        "generation_time_ms": req.generation_time_ms,
        "total_time_delta_ms": req.total_time_delta_ms,
        "avg_speed_delta_kph": req.avg_speed_delta_kph,
        "corner_count": req.corner_count,
        "worst_corner_index": req.worst_corner_index,
        "best_corner_index": req.best_corner_index,
        "hardware_profile": req.hardware_profile,
        "created_at": pd.Timestamp.now().isoformat(),
    }
    
    logger.info(f"Saved report {report_id}: {req.title}")
    
    return {
        "report_id": report_id,
        "message": "Report saved successfully",
    }


@router.get("/reports/history", response_model=list[SavedReportInfo])
async def get_report_history(
    limit: int = 20,
    report_type: Optional[str] = None,
):
    """
    Get report history.
    
    Args:
        limit: Maximum number of reports to return
        report_type: Filter by report type (optional)
    
    Returns:
        List of saved report metadata
    """
    reports = list(_report_storage.values())
    
    # Filter by type if specified
    if report_type:
        reports = [r for r in reports if r["report_type"] == report_type]
    
    # Sort by created_at descending (newest first)
    reports.sort(key=lambda r: r["created_at"], reverse=True)
    
    # Limit results
    reports = reports[:limit]
    
    # Convert to response model
    return [
        SavedReportInfo(
            report_id=r["report_id"],
            title=r["title"],
            summary=r["summary"],
            report_type=r["report_type"],
            generated_by=r["generated_by"],
            lap_number=r["lap_number"],
            created_at=r["created_at"],
        )
        for r in reports
    ]


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(report_id: int):
    """
    Get a specific report by ID.
    
    Args:
        report_id: Report ID
    
    Returns:
        Full report data
    """
    report = _report_storage.get(report_id)
    
    if report is None:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    
    return ReportResponse(
        title=report["title"],
        markdown=report["markdown"],
        summary=report["summary"],
        key_findings=report["key_findings"],
        generated_by=report["generated_by"],
    )


@router.delete("/reports/clear")
async def clear_reports():
    """
    Clear all stored reports (for testing/debugging).
    
    Returns:
        Number of reports cleared
    """
    global _report_storage, _next_report_id
    
    count = len(_report_storage)
    _report_storage = {}
    _next_report_id = 1
    
    logger.info(f"Cleared {count} reports from storage")
    
    return {
        "message": f"Cleared {count} reports",
        "reports_cleared": count,
    }

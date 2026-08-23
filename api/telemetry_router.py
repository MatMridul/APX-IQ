"""
Telemetry API Router
====================

Endpoints for accessing recorded lap telemetry and managing lap data.
Storage is handled by the LapService (injected via app.state).

Endpoints:
    GET    /telemetry/laps/completed           — List all completed laps
    GET    /telemetry/lap/{lap_id}             — Full telemetry for a specific lap
    GET    /telemetry/lap/{lap_id}/steering    — Steering trace for hardware profiling
    POST   /telemetry/lap/save                 — Save a completed lap
    GET    /telemetry/session/current          — Current session info
    DELETE /telemetry/laps/clear               — Clear all laps (guarded by admin key)
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, Header

from api.models.shared import (
    TelemetryPoint,
    LapInfo,
    LapTelemetryResponse,
    SaveLapRequest,
)
from core.logging_config import get_logger
from core.config import settings

log = get_logger("APXIQ.API.Telemetry")

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


def _get_lap_service(request: Request):
    """Retrieve the LapService injected by the API lifespan."""
    return request.app.state.lap_service


@router.get("/laps/completed", response_model=List[LapInfo])
async def get_completed_laps(
    request: Request,
    session_uid: Optional[int] = None,
    min_telemetry_points: int = 100,
):
    """
    Get all completed laps with telemetry data.
    """
    service = _get_lap_service(request)
    laps = await service.list_laps(
        session_uid=session_uid,
        min_telemetry_points=min_telemetry_points,
    )
    return laps


@router.get("/lap/{lap_id}", response_model=LapTelemetryResponse)
async def get_lap_telemetry(lap_id: int, request: Request):
    """
    Get full telemetry data for a specific lap.
    """
    service = _get_lap_service(request)
    result = await service.get_lap(lap_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Lap {lap_id} not found")
    return result


@router.get("/lap/{lap_id}/steering")
async def get_lap_steering_trace(lap_id: int, request: Request):
    """
    Get the steering trace for a lap — used by the hardware profiler.
    """
    service = _get_lap_service(request)
    result = await service.get_lap(lap_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Lap {lap_id} not found")

    steer_trace = [t.steer for t in result.telemetry]
    return {
        "lap_id": lap_id,
        "lap_number": result.lap_info.lap_number,
        "steer_trace": steer_trace,
        "sample_count": len(steer_trace),
    }


@router.post("/lap/save")
async def save_lap(lap_data: SaveLapRequest, request: Request):
    """
    Save a completed lap to storage.
    """
    service = _get_lap_service(request)
    lap_id = await service.save_lap(lap_data)
    log.info("lap_saved", lap_id=lap_id, lap_number=lap_data.lap_number, points=len(lap_data.telemetry))
    return {
        "lap_id": lap_id,
        "message": f"Lap {lap_data.lap_number} saved successfully",
        "telemetry_points": len(lap_data.telemetry),
    }


@router.get("/session/current")
async def get_current_session(request: Request):
    """
    Get current session information from the SessionManager.
    """
    session_manager = getattr(request.app.state, "session_manager", None)
    if session_manager is None:
        return {"session_uid": None, "track_id": None, "is_active": False}

    return {
        "session_uid": session_manager.active_session_uid,
        "track_id": session_manager.track_id,
        "session_type": session_manager.session_type,
        "is_active": session_manager.is_active,
    }


@router.delete("/laps/clear")
async def clear_all_laps(
    request: Request,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
):
    """
    Clear all stored laps. Guarded by admin key in non-development environments.
    """
    admin_key = getattr(settings, "admin_api_key", None)
    if admin_key and x_admin_key != admin_key:
        raise HTTPException(status_code=403, detail="Unauthorized: Invalid X-Admin-Key header")

    service = _get_lap_service(request)
    count = await service.clear()
    log.info("laps_cleared", count=count)
    return {"message": f"Cleared {count} laps", "laps_cleared": count}

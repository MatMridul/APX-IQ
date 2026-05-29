"""
Telemetry API Router
====================

Endpoints for accessing recorded lap telemetry and managing lap data.

Endpoints:
    - GET  /telemetry/laps/completed     — List all completed laps with telemetry
    - GET  /telemetry/lap/{lap_id}       — Get full telemetry for a specific lap
    - GET  /telemetry/lap/{lap_id}/steering — Get steering trace for hardware profiling
    - POST /telemetry/lap/save           — Save a completed lap to database
    - GET  /telemetry/session/current    — Get current session info
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
# import asyncpg  # Reserved for future database migration (Phase 5C)

logger = logging.getLogger("APXIQ.API.Telemetry")

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

# =========================================================================
# Database Connection (Placeholder - will be injected)
# =========================================================================

# TODO: Replace with proper database connection pool
# For now, we'll use a simple connection string
DATABASE_URL = "postgresql://localhost/apxiq"  # Update with actual connection

async def get_db_connection():
    """Get database connection (dependency injection)."""
    # TODO: Implement connection pooling
    # For now, return None and we'll implement in-memory storage
    return None


# =========================================================================
# Request / Response Models
# =========================================================================

class TelemetryPoint(BaseModel):
    """Single telemetry data point."""
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


class LapInfo(BaseModel):
    """Lap metadata."""
    lap_id: int
    session_uid: int
    lap_number: int
    lap_time_ms: Optional[int] = None
    sector_1_time_ms: Optional[int] = None
    sector_2_time_ms: Optional[int] = None
    sector_3_time_ms: Optional[int] = None
    is_valid: bool = True
    telemetry_points: int
    max_distance_m: float
    created_at: datetime


class LapTelemetryResponse(BaseModel):
    """Full lap telemetry response."""
    lap_info: LapInfo
    telemetry: List[TelemetryPoint]


class SaveLapRequest(BaseModel):
    """Request to save a completed lap."""
    session_uid: int
    lap_number: int
    lap_time_ms: Optional[int] = None
    sector_1_time_ms: Optional[int] = None
    sector_2_time_ms: Optional[int] = None
    sector_3_time_ms: Optional[int] = None
    is_valid: bool = True
    telemetry: List[TelemetryPoint]


# =========================================================================
# In-Memory Storage (Temporary - will be replaced with database)
# =========================================================================

class InMemoryLapStorage:
    """Temporary in-memory storage for laps until database is connected."""
    
    def __init__(self):
        self._laps: dict[int, dict] = {}
        self._next_id = 1
    
    def save_lap(self, lap_data: SaveLapRequest) -> int:
        """Save a lap and return its ID."""
        lap_id = self._next_id
        self._next_id += 1
        
        self._laps[lap_id] = {
            "lap_id": lap_id,
            "session_uid": lap_data.session_uid,
            "lap_number": lap_data.lap_number,
            "lap_time_ms": lap_data.lap_time_ms,
            "sector_1_time_ms": lap_data.sector_1_time_ms,
            "sector_2_time_ms": lap_data.sector_2_time_ms,
            "sector_3_time_ms": lap_data.sector_3_time_ms,
            "is_valid": lap_data.is_valid,
            "telemetry": [t.model_dump() for t in lap_data.telemetry],
            "telemetry_points": len(lap_data.telemetry),
            "max_distance_m": max(t.distance_m for t in lap_data.telemetry) if lap_data.telemetry else 0.0,
            "created_at": datetime.now(),
        }
        
        logger.info(f"Saved lap {lap_id}: Lap {lap_data.lap_number}, {len(lap_data.telemetry)} points")
        return lap_id
    
    def get_lap(self, lap_id: int) -> Optional[dict]:
        """Get a lap by ID."""
        return self._laps.get(lap_id)
    
    def get_all_laps(self) -> List[dict]:
        """Get all laps."""
        return list(self._laps.values())
    
    def get_laps_by_session(self, session_uid: int) -> List[dict]:
        """Get all laps for a session."""
        return [lap for lap in self._laps.values() if lap["session_uid"] == session_uid]


# Global storage instance
_lap_storage = InMemoryLapStorage()


# =========================================================================
# Endpoints
# =========================================================================

@router.get("/laps/completed", response_model=List[LapInfo])
async def get_completed_laps(
    session_uid: Optional[int] = None,
    min_telemetry_points: int = 100,
):
    """
    Get all completed laps with telemetry data.
    
    Args:
        session_uid: Filter by session (optional)
        min_telemetry_points: Minimum number of telemetry points required
    
    Returns:
        List of lap metadata
    """
    laps = _lap_storage.get_all_laps()
    
    # Filter by session if specified
    if session_uid is not None:
        laps = [lap for lap in laps if lap["session_uid"] == session_uid]
    
    # Filter by minimum telemetry points
    laps = [lap for lap in laps if lap["telemetry_points"] >= min_telemetry_points]
    
    # Sort by lap number
    laps.sort(key=lambda x: (x["session_uid"], x["lap_number"]))
    
    # Convert to response model
    return [
        LapInfo(
            lap_id=lap["lap_id"],
            session_uid=lap["session_uid"],
            lap_number=lap["lap_number"],
            lap_time_ms=lap["lap_time_ms"],
            sector_1_time_ms=lap["sector_1_time_ms"],
            sector_2_time_ms=lap["sector_2_time_ms"],
            sector_3_time_ms=lap["sector_3_time_ms"],
            is_valid=lap["is_valid"],
            telemetry_points=lap["telemetry_points"],
            max_distance_m=lap["max_distance_m"],
            created_at=lap["created_at"],
        )
        for lap in laps
    ]


@router.get("/lap/{lap_id}", response_model=LapTelemetryResponse)
async def get_lap_telemetry(lap_id: int):
    """
    Get full telemetry data for a specific lap.
    
    Args:
        lap_id: Lap ID
    
    Returns:
        Lap metadata and full telemetry array
    """
    lap = _lap_storage.get_lap(lap_id)
    
    if lap is None:
        raise HTTPException(status_code=404, detail=f"Lap {lap_id} not found")
    
    return LapTelemetryResponse(
        lap_info=LapInfo(
            lap_id=lap["lap_id"],
            session_uid=lap["session_uid"],
            lap_number=lap["lap_number"],
            lap_time_ms=lap["lap_time_ms"],
            sector_1_time_ms=lap["sector_1_time_ms"],
            sector_2_time_ms=lap["sector_2_time_ms"],
            sector_3_time_ms=lap["sector_3_time_ms"],
            is_valid=lap["is_valid"],
            telemetry_points=lap["telemetry_points"],
            max_distance_m=lap["max_distance_m"],
            created_at=lap["created_at"],
        ),
        telemetry=[TelemetryPoint(**t) for t in lap["telemetry"]],
    )


@router.get("/lap/{lap_id}/steering")
async def get_lap_steering_trace(lap_id: int):
    """
    Get steering trace for hardware profiling.
    
    Args:
        lap_id: Lap ID
    
    Returns:
        Array of steering values (-1.0 to 1.0)
    """
    lap = _lap_storage.get_lap(lap_id)
    
    if lap is None:
        raise HTTPException(status_code=404, detail=f"Lap {lap_id} not found")
    
    steer_trace = [t["steer"] for t in lap["telemetry"]]
    
    return {
        "lap_id": lap_id,
        "lap_number": lap["lap_number"],
        "steer_trace": steer_trace,
        "sample_count": len(steer_trace),
    }


@router.post("/lap/save")
async def save_lap(lap_data: SaveLapRequest):
    """
    Save a completed lap to storage.
    
    Args:
        lap_data: Lap metadata and telemetry
    
    Returns:
        Saved lap ID
    """
    if len(lap_data.telemetry) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient telemetry data: {len(lap_data.telemetry)} points (minimum 10)"
        )
    
    lap_id = _lap_storage.save_lap(lap_data)
    
    return {
        "lap_id": lap_id,
        "message": f"Lap {lap_data.lap_number} saved successfully",
        "telemetry_points": len(lap_data.telemetry),
    }


@router.get("/session/current")
async def get_current_session():
    """
    Get current session information.
    
    Returns:
        Current session metadata
    """
    # TODO: Get from session manager
    # For now, return placeholder
    return {
        "session_uid": None,
        "track_id": None,
        "session_type": None,
        "is_active": False,
        "message": "Session tracking not yet implemented",
    }


@router.delete("/laps/clear")
async def clear_all_laps():
    """
    Clear all stored laps (for testing/debugging).
    
    Returns:
        Number of laps cleared
    """
    global _lap_storage
    count = len(_lap_storage._laps)
    _lap_storage = InMemoryLapStorage()
    
    logger.info(f"Cleared {count} laps from storage")
    
    return {
        "message": f"Cleared {count} laps",
        "laps_cleared": count,
    }

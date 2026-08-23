"""
APX IQ — Canonical Shared Data Models
=====================================

Single source of truth for all API and Ingestion Pydantic models.
Used across telemetry_router, intelligence_router, services, and adapters.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

# Maximum telemetry array size to prevent memory exhaustion attacks
MAX_TELEMETRY_POINTS = 10000


class TelemetryPoint(BaseModel):
    """
    Canonical data point from a lap's telemetry trace.
    Physical values bounded to realistic Formula 1 ranges.
    """
    distance_m:          float = Field(ge=0.0, le=100_000.0, description="Distance from lap start in metres.")
    speed_kph:           float = Field(ge=0.0, le=450.0,     description="Speed in km/h.")
    throttle:            float = Field(ge=0.0, le=1.0, default=0.0, description="Throttle application (0.0–1.0).")
    brake:               float = Field(ge=0.0, le=1.0, default=0.0, description="Brake application (0.0–1.0).")
    steer:               float = Field(ge=-1.0, le=1.0, default=0.0, description="Steering input (-1.0 to 1.0).")
    gear:                int   = Field(ge=-1, le=8, default=0, description="Gear: -1=reverse, 0=neutral, 1–8=forward.")
    rpm:                 int   = Field(ge=0, le=20_000, default=0, description="Engine RPM.")
    drs:                 bool  = Field(default=False, description="DRS system status.")
    x:                   float = Field(default=0.0, description="World X position in metres.")
    y:                   float = Field(default=0.0, description="World Y position in metres.")
    z:                   float = Field(default=0.0, description="World Z position in metres.")
    
    # Thermal & Energy Enrichment (FL, FR, RL, RR)
    tyres_surface_temp:  List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0], description="Tyre surface temps in °C.")
    tyres_inner_temp:    List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0], description="Tyre inner carcass temps in °C.")
    brakes_temp:         List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0], description="Brake rotor temps in °C.")
    ers_store_energy:    float = Field(default=0.0, description="MGU-K energy buffer (Joules).")
    ers_deploy_mode:     int   = Field(default=0, description="0=None, 1=Medium, 2=Hotlap, 3=Overtake.")

    @field_validator("rpm", mode="before")
    @classmethod
    def coerce_rpm(cls, v: Any) -> int:
        if v is None:
            return 0
        return int(round(float(v)))

    @field_validator("gear", mode="before")
    @classmethod
    def coerce_gear(cls, v: Any) -> int:
        if v is None:
            return 0
        return int(round(float(v)))

    @field_validator("throttle", "brake", mode="before")
    @classmethod
    def clamp_pedals(cls, v: Any) -> float:
        if v is None:
            return 0.0
        return max(0.0, min(1.0, float(v)))

    @field_validator("steer", mode="before")
    @classmethod
    def clamp_steer(cls, v: Any) -> float:
        if v is None:
            return 0.0
        return max(-1.0, min(1.0, float(v)))


class LapInfo(BaseModel):
    """Metadata summary for a completed lap."""
    lap_id:              int
    session_uid:         int
    lap_number:          int
    lap_time_ms:         Optional[int] = None
    sector_1_time_ms:    Optional[int] = None
    sector_2_time_ms:    Optional[int] = None
    sector_3_time_ms:    Optional[int] = None
    is_valid:            bool = True
    telemetry_points:    int
    max_distance_m:      float
    created_at:          datetime


class LapTelemetryResponse(BaseModel):
    """Full lap payload including header metadata and point array."""
    lap_info:            LapInfo
    telemetry:           List[TelemetryPoint]


class SaveLapRequest(BaseModel):
    """Request payload sent by ingestion worker to persist a completed lap."""
    session_uid:         int
    lap_number:          int
    lap_time_ms:         Optional[int] = None
    sector_1_time_ms:    Optional[int] = None
    sector_2_time_ms:    Optional[int] = None
    sector_3_time_ms:    Optional[int] = None
    is_valid:            bool = True
    telemetry:           List[TelemetryPoint]

    @field_validator("telemetry")
    @classmethod
    def check_telemetry_size(cls, v: list) -> list:
        if len(v) < 10:
            raise ValueError(f"Insufficient telemetry: {len(v)} points (minimum 10 required).")
        if len(v) > MAX_TELEMETRY_POINTS:
            raise ValueError(f"Telemetry payload exceeds cap: {len(v)} > {MAX_TELEMETRY_POINTS}.")
        return v


class DeltaRequest(BaseModel):
    """Lap delta computation request comparing user vs ghost telemetry."""
    user_telemetry:      List[TelemetryPoint]
    ghost_telemetry:     List[TelemetryPoint]
    grid_points:         int = Field(1000, ge=100, le=5000)

    @field_validator("user_telemetry", "ghost_telemetry")
    @classmethod
    def check_size(cls, v: list) -> list:
        if len(v) > MAX_TELEMETRY_POINTS:
            raise ValueError(f"Telemetry array too large: {len(v)} > {MAX_TELEMETRY_POINTS}")
        if len(v) < 10:
            raise ValueError(f"Telemetry array too small: {len(v)} < 10")
        return v


class HardwareRequest(BaseModel):
    """Steering trace time-series for input hardware classification."""
    steer_trace:         List[float]

    @field_validator("steer_trace")
    @classmethod
    def check_steer_length(cls, v: list) -> list:
        if len(v) < 200:
            raise ValueError(f"Need ≥ 200 steer samples for FFT analysis, got {len(v)}")
        return v


class BattleRequest(BaseModel):
    """Live race battle and overtake projection parameters."""
    current_position:    int   = Field(ge=1, le=20)
    gap_ahead_s:         float = Field(ge=0.0)
    gap_behind_s:        float = Field(ge=0.0)
    laps_remaining:      int   = Field(ge=0)
    gap_to_leader_s:     float = 0.0


class SaveReportRequest(BaseModel):
    """Persistence payload for AI coaching and debrief reports."""
    user_lap_id:         Optional[int]   = None
    ghost_lap_id:        Optional[int]   = None
    session_uid:         Optional[int]   = None
    lap_number:          Optional[int]   = None
    report_type:         str             = "lap_debrief"
    title:               str
    markdown:            str
    summary:             str
    key_findings:        List[str]
    generated_by:        str
    generation_time_ms:  Optional[int]   = None
    total_time_delta_ms: Optional[float] = None
    avg_speed_delta_kph: Optional[float] = None
    corner_count:        Optional[int]   = None
    worst_corner_index:  Optional[int]   = None
    best_corner_index:   Optional[int]   = None
    hardware_profile:    Optional[Dict[str, Any]] = None


class CanonicalTelemetryFrame(BaseModel):
    """
    Standardized real-time telemetry frame decoded by any F1 UDP adapter (2020–2025).
    Guarantees version-agnostic broadcast to WebSockets and recorders.
    """
    packet_format:       int
    game_version_label:  str
    session_uid:         int
    frame_identifier:    int
    session_time:        float
    player_car_index:    int
    
    # Driver Metrics
    speed_kph:           float
    throttle:            float
    brake:               float
    steer:               float
    gear:                int
    rpm:                 int
    drs:                 bool
    
    # Lap Tracking
    lap_number:          int
    current_lap_time_ms: int
    last_lap_time_ms:    int
    lap_distance_m:      float
    total_distance_m:    float
    position:            int
    
    # Motion & World Geometry
    world_pos_x:         float
    world_pos_y:         float
    world_pos_z:         float
    
    # Thermals & Status
    tyre_surface_temps:  List[int] = Field(default_factory=lambda: [0, 0, 0, 0])
    tyre_inner_temps:    List[int] = Field(default_factory=lambda: [0, 0, 0, 0])
    brakes_temperature:  List[int] = Field(default_factory=lambda: [0, 0, 0, 0])
    fuel_in_tank:        float = 0.0
    fuel_remaining_laps: float = 0.0
    ers_store_energy:    float = 0.0
    drs_allowed:         bool = False
    tyre_compound:       str = "Unknown"

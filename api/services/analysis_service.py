"""
APX IQ — Analysis Service
==========================

Orchestrates the intelligence pipeline:
  1. Aligns user and ghost telemetry (DistanceAligner)
  2. Detects corners for both laps (CornerDetector)
  3. Computes the telemetry delta (DeltaEngine)
  4. Generates coaching tips (CoachEngine)

Runs heavy pandas/numpy work in a background thread to prevent
blocking the FastAPI event loop.

Results are cached using the full telemetry distance arrays to prevent
hash collisions.
"""

import asyncio
from typing import Optional, Protocol

import pandas as pd

from api.models.shared import TelemetryPoint
from core.cache import get_cache
from core.logging_config import get_logger
from intelligence.alignment import DistanceAligner
from intelligence.corner_detector import CornerDetector
from intelligence.delta_engine import DeltaEngine
from intelligence.coach_engine import CoachEngine
from intelligence.hardware_profiler import HardwareProfile

log = get_logger("APXIQ.Services.AnalysisService")


class AnalysisServiceProtocol(Protocol):
    async def run_pipeline(
        self,
        user_telemetry: list[TelemetryPoint],
        ghost_telemetry: list[TelemetryPoint],
        grid_points: int,
        hardware_profile: Optional[HardwareProfile],
    ) -> tuple: ...


class AnalysisService:
    def _build_cache_key(
        self,
        user_telemetry: list[TelemetryPoint],
        ghost_telemetry: list[TelemetryPoint],
        grid_points: int,
    ) -> str:
        user_distances = tuple(t.distance_m for t in user_telemetry)
        ghost_distances = tuple(t.distance_m for t in ghost_telemetry)
        return (
            f"pipeline:"
            f"{hash(user_distances)}-{len(user_telemetry)}:"
            f"{hash(ghost_distances)}-{len(ghost_telemetry)}:"
            f"{grid_points}"
        )

    async def run_pipeline(
        self,
        user_telemetry: list[TelemetryPoint],
        ghost_telemetry: list[TelemetryPoint],
        grid_points: int,
        hardware_profile: Optional[HardwareProfile],
    ) -> tuple:
        cache = get_cache()
        cache_key = self._build_cache_key(user_telemetry, ghost_telemetry, grid_points)

        cached = await cache.get(cache_key)
        if cached:
            log.debug("pipeline_cache_hit", key=cache_key[:80])
            return cached

        def _compute():
            user_df = pd.DataFrame([t.model_dump() for t in user_telemetry])
            ghost_df = pd.DataFrame([t.model_dump() for t in ghost_telemetry])

            aligner = DistanceAligner(grid_points=grid_points)
            ua, ga = aligner.align(user_df, ghost_df)

            detector = CornerDetector()
            user_corners = detector.detect(ua)
            ghost_corners = detector.detect(ga)

            engine = DeltaEngine()
            delta = engine.compute(ua, ga, user_corners, ghost_corners)

            coach = CoachEngine(hardware_profile=hardware_profile)
            tips = coach.analyze(delta, user_corners, ghost_corners)

            return ua, ga, user_corners, ghost_corners, delta, tips

        result = await asyncio.to_thread(_compute)
        await cache.set(cache_key, result, ttl=300)
        return result


def create_analysis_service() -> AnalysisServiceProtocol:
    return AnalysisService()

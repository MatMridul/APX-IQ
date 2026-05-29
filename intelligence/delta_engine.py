"""
Delta Engine
=============

Computes per-distance performance deltas between a user's lap and a
ghost (reference) lap. This is the core comparison engine that quantifies
WHERE and HOW MUCH time is being lost or gained.

The engine produces three types of deltas:

1. **Speed Delta** — km/h difference at each distance point
   Positive = user is faster, Negative = user is slower

2. **Brake Point Delta** — meters difference in braking initiation
   Positive = user brakes later (aggressive), Negative = user brakes earlier

3. **Time Delta** — cumulative milliseconds lost/gained
   Integrated from the speed differential using v = ds/dt
   This is the "F1 TV-style" running delta shown on broadcasts

Usage:
    from intelligence.delta_engine import DeltaEngine

    engine = DeltaEngine()
    result = engine.compute(user_aligned, ghost_aligned, user_corners, ghost_corners)
    # result.cumulative_time_delta_ms[-1] = total time lost on this lap
"""

import logging
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .corner_detector import CornerMap

logger = logging.getLogger("APXIQ.Intelligence.DeltaEngine")


# =========================================================================
# Data Classes
# =========================================================================

@dataclass
class BrakePointDelta:
    """Delta analysis for a single braking zone."""
    corner_index: int
    user_brake_distance_m: float   # Where user starts braking
    ghost_brake_distance_m: float  # Where ghost starts braking
    delta_m: float                 # user - ghost (positive = later braking)
    user_brake_speed_kph: float
    ghost_brake_speed_kph: float


@dataclass
class DeltaResult:
    """Complete delta analysis result for a lap comparison."""

    # Per-distance arrays (same length as the aligned grid)
    distance_grid: np.ndarray = field(default_factory=lambda: np.array([]))
    speed_delta_kph: np.ndarray = field(default_factory=lambda: np.array([]))
    throttle_delta: np.ndarray = field(default_factory=lambda: np.array([]))
    brake_delta: np.ndarray = field(default_factory=lambda: np.array([]))
    cumulative_time_delta_ms: np.ndarray = field(default_factory=lambda: np.array([]))

    # Per-corner brake point deltas
    brake_point_deltas: list[BrakePointDelta] = field(default_factory=list)

    # Summary statistics
    total_time_delta_ms: float = 0.0         # Final cumulative delta
    max_time_gained_ms: float = 0.0          # Best single-point gain
    max_time_lost_ms: float = 0.0            # Worst single-point loss
    avg_speed_delta_kph: float = 0.0         # Overall speed difference
    worst_corner_index: int = 0              # Corner where most time is lost
    best_corner_index: int = 0               # Corner where most time is gained

    def get_segment_delta(self, start_m: float, end_m: float) -> float:
        """
        Get the time delta accumulated over a specific track segment.
        
        Args:
            start_m: Start distance in meters.
            end_m: End distance in meters.
            
        Returns:
            Time delta in ms accumulated between start_m and end_m.
        """
        if len(self.distance_grid) == 0:
            return 0.0

        start_idx = np.searchsorted(self.distance_grid, start_m)
        end_idx = np.searchsorted(self.distance_grid, end_m)

        start_idx = min(start_idx, len(self.cumulative_time_delta_ms) - 1)
        end_idx = min(end_idx, len(self.cumulative_time_delta_ms) - 1)

        return float(
            self.cumulative_time_delta_ms[end_idx]
            - self.cumulative_time_delta_ms[start_idx]
        )

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the per-distance arrays to a DataFrame for DB storage."""
        return pd.DataFrame({
            "distance_m": self.distance_grid,
            "speed_delta_kph": self.speed_delta_kph,
            "throttle_delta_abs": self.throttle_delta,
            "time_delta_ms": self.cumulative_time_delta_ms,
        })


# =========================================================================
# Delta Engine
# =========================================================================

class DeltaEngine:
    """
    Computes performance deltas between aligned user and ghost telemetry.
    
    The core computation is the cumulative time delta, derived by
    integrating the speed difference over distance:
    
        dt = ds * (1/v_user - 1/v_ghost)
    
    Where ds is the distance step between grid points. This gives us
    the time gained or lost at each point on the track, which accumulates
    into the total lap time difference.
    """

    # Minimum speed (km/h) to avoid division-by-zero in time integration
    MIN_SPEED_KPH = 5.0

    def compute(
        self,
        user_df: pd.DataFrame,
        ghost_df: pd.DataFrame,
        user_corners: CornerMap = None,
        ghost_corners: CornerMap = None,
    ) -> DeltaResult:
        """
        Compute the full delta analysis between user and ghost laps.

        Both DataFrames MUST be pre-aligned (same distance_m column)
        using the DistanceAligner. If they have different lengths,
        the shorter one is used.

        Args:
            user_df: Aligned user telemetry DataFrame.
            ghost_df: Aligned ghost telemetry DataFrame.
            user_corners: Optional corner map for brake point analysis.
            ghost_corners: Optional corner map for brake point analysis.

        Returns:
            DeltaResult with all computed deltas and summary statistics.
        """
        # Ensure same length
        min_len = min(len(user_df), len(ghost_df))
        user = user_df.iloc[:min_len].reset_index(drop=True)
        ghost = ghost_df.iloc[:min_len].reset_index(drop=True)

        distance = user["distance_m"].values

        # --- Speed Delta ---
        user_speed = user["speed_kph"].values.astype(float)
        ghost_speed = ghost["speed_kph"].values.astype(float)
        speed_delta = user_speed - ghost_speed

        # --- Throttle Delta ---
        throttle_delta = np.zeros(min_len)
        if "throttle" in user.columns and "throttle" in ghost.columns:
            throttle_delta = (
                user["throttle"].values.astype(float)
                - ghost["throttle"].values.astype(float)
            )

        # --- Brake Delta ---
        brake_delta = np.zeros(min_len)
        if "brake" in user.columns and "brake" in ghost.columns:
            brake_delta = (
                user["brake"].values.astype(float)
                - ghost["brake"].values.astype(float)
            )

        # --- Cumulative Time Delta ---
        # dt = ds * (1/v_user - 1/v_ghost), converted to milliseconds
        cumulative_time = self._integrate_time_delta(
            distance, user_speed, ghost_speed
        )

        # --- Brake Point Deltas (if corners provided) ---
        brake_deltas = []
        if user_corners and ghost_corners:
            brake_deltas = self._compute_brake_point_deltas(
                user_df, ghost_df, user_corners, ghost_corners
            )

        # --- Per-Corner Time Deltas ---
        worst_corner = 0
        best_corner = 0
        if user_corners and user_corners.corners:
            corner_deltas = self._compute_per_corner_time(
                user_corners, distance, cumulative_time
            )
            if corner_deltas:
                worst_idx = max(corner_deltas, key=lambda x: x[1])
                best_idx = min(corner_deltas, key=lambda x: x[1])
                worst_corner = worst_idx[0]
                best_corner = best_idx[0]

        # --- Summary Stats ---
        total_time = float(cumulative_time[-1]) if len(cumulative_time) > 0 else 0.0

        # Max gain = most negative cumulative delta segment
        # Max loss = most positive cumulative delta segment
        if len(cumulative_time) > 1:
            diff = np.diff(cumulative_time)
            max_gained = float(np.min(diff)) if len(diff) > 0 else 0.0
            max_lost = float(np.max(diff)) if len(diff) > 0 else 0.0
        else:
            max_gained = 0.0
            max_lost = 0.0

        result = DeltaResult(
            distance_grid=distance,
            speed_delta_kph=speed_delta,
            throttle_delta=throttle_delta,
            brake_delta=brake_delta,
            cumulative_time_delta_ms=cumulative_time,
            brake_point_deltas=brake_deltas,
            total_time_delta_ms=total_time,
            max_time_gained_ms=max_gained,
            max_time_lost_ms=max_lost,
            avg_speed_delta_kph=float(np.mean(speed_delta)),
            worst_corner_index=worst_corner,
            best_corner_index=best_corner,
        )

        logger.info(
            f"Delta computed: Total={total_time:+.0f}ms, "
            f"Avg speed delta={result.avg_speed_delta_kph:+.1f} km/h, "
            f"Brake points analyzed: {len(brake_deltas)}"
        )

        return result

    def _integrate_time_delta(
        self,
        distance: np.ndarray,
        user_speed: np.ndarray,
        ghost_speed: np.ndarray,
    ) -> np.ndarray:
        """
        Integrate the speed difference over distance to get cumulative time delta.
        
        Formula: dt = ds * (1/v_user - 1/v_ghost) * 3600 * 1000
        
        The factor of 3600 converts hours to seconds (since speed is in km/h
        and distance in meters → km), and 1000 converts seconds to milliseconds.
        
        Convention: POSITIVE delta = user is SLOWER (losing time).
                    NEGATIVE delta = user is FASTER (gaining time).
        """
        # Clamp speeds to avoid division by zero
        user_clamped = np.maximum(user_speed, self.MIN_SPEED_KPH)
        ghost_clamped = np.maximum(ghost_speed, self.MIN_SPEED_KPH)

        # Distance steps (meters)
        ds = np.diff(distance)

        # Time difference at each step:
        # dt = ds_m * (1/v_user_kph - 1/v_ghost_kph) * (3600s/1h) * (1000ms/1s) / 1000m/km
        # Simplifies to: dt_ms = ds * (1/v_user - 1/v_ghost) * 3600
        # But we need to convert km/h to m/s first: v_ms = v_kph / 3.6
        # So: dt_ms = ds_m / (v_user_kph / 3.6) - ds_m / (v_ghost_kph / 3.6)
        #           = ds_m * 3.6 * (1/v_user - 1/v_ghost) * 1000

        # More directly in seconds:
        # time_user = ds / (v_user * 1000/3600) = ds * 3.6 / v_user  (seconds)
        # time_ghost = ds / (v_ghost * 1000/3600) = ds * 3.6 / v_ghost  (seconds)
        # dt_seconds = time_user - time_ghost
        # dt_ms = dt_seconds * 1000

        user_segment_time = ds * 3.6 / user_clamped[:-1]     # seconds per segment
        ghost_segment_time = ds * 3.6 / ghost_clamped[:-1]   # seconds per segment

        dt_ms = (user_segment_time - ghost_segment_time) * 1000  # milliseconds

        # Cumulative sum with leading zero
        cumulative = np.concatenate([[0.0], np.cumsum(dt_ms)])

        return cumulative

    def _compute_brake_point_deltas(
        self,
        user_df: pd.DataFrame,
        ghost_df: pd.DataFrame,
        user_corners: CornerMap,
        ghost_corners: CornerMap,
    ) -> list[BrakePointDelta]:
        """
        Compare brake points between user and ghost at each corner.
        
        For each user corner, we find the matching ghost corner and
        compare where braking begins (the entry point distance).
        """
        deltas = []

        for user_corner in user_corners.corners:
            ghost_corner = ghost_corners.get_corner_at_distance(
                user_corner.apex_distance_m, tolerance_m=100.0
            )
            if ghost_corner is None:
                continue

            delta = BrakePointDelta(
                corner_index=user_corner.index,
                user_brake_distance_m=user_corner.entry_distance_m,
                ghost_brake_distance_m=ghost_corner.entry_distance_m,
                delta_m=user_corner.entry_distance_m - ghost_corner.entry_distance_m,
                user_brake_speed_kph=user_corner.entry_speed_kph,
                ghost_brake_speed_kph=ghost_corner.entry_speed_kph,
            )
            deltas.append(delta)

        return deltas

    def _compute_per_corner_time(
        self,
        corners: CornerMap,
        distance: np.ndarray,
        cumulative_time: np.ndarray,
    ) -> list[tuple[int, float]]:
        """
        Compute time delta per corner zone (entry → exit).
        
        Returns list of (corner_index, time_delta_ms) tuples.
        """
        results = []

        for corner in corners.corners:
            entry_idx = np.searchsorted(distance, corner.entry_distance_m)
            exit_idx = np.searchsorted(distance, corner.exit_distance_m)

            entry_idx = min(entry_idx, len(cumulative_time) - 1)
            exit_idx = min(exit_idx, len(cumulative_time) - 1)

            corner_delta = float(
                cumulative_time[exit_idx] - cumulative_time[entry_idx]
            )
            results.append((corner.index, corner_delta))

        return results

    def get_time_loss_regions(
        self, result: DeltaResult, threshold_ms: float = 50.0
    ) -> list[dict]:
        """
        Identify contiguous regions where the user is losing significant time.
        
        These are the "red zones" on the delta trace — where coaching
        attention should be focused.

        Args:
            result: DeltaResult from a compute() call.
            threshold_ms: Minimum time loss (ms) per region to be significant.

        Returns:
            List of dicts with keys:
                start_m, end_m, time_lost_ms, avg_speed_delta_kph
        """
        if len(result.cumulative_time_delta_ms) < 2:
            return []

        # Compute per-segment time changes
        dt = np.diff(result.cumulative_time_delta_ms)
        distances = result.distance_grid

        # Find segments where user is losing time (positive dt)
        losing = dt > 0
        regions = []
        in_region = False
        region_start = 0

        for i in range(len(losing)):
            if losing[i] and not in_region:
                in_region = True
                region_start = i
            elif not losing[i] and in_region:
                in_region = False
                # Calculate total time lost in this region
                time_lost = float(
                    result.cumulative_time_delta_ms[i]
                    - result.cumulative_time_delta_ms[region_start]
                )
                if time_lost >= threshold_ms:
                    avg_speed = float(
                        np.mean(result.speed_delta_kph[region_start:i])
                    )
                    regions.append({
                        "start_m": float(distances[region_start]),
                        "end_m": float(distances[i]),
                        "time_lost_ms": time_lost,
                        "avg_speed_delta_kph": avg_speed,
                    })

        # Handle region that extends to end of lap
        if in_region:
            i = len(losing)
            time_lost = float(
                result.cumulative_time_delta_ms[min(i, len(result.cumulative_time_delta_ms) - 1)]
                - result.cumulative_time_delta_ms[region_start]
            )
            if time_lost >= threshold_ms:
                regions.append({
                    "start_m": float(distances[region_start]),
                    "end_m": float(distances[min(i, len(distances) - 1)]),
                    "time_lost_ms": time_lost,
                    "avg_speed_delta_kph": float(
                        np.mean(result.speed_delta_kph[region_start:])
                    ),
                })

        logger.info(
            f"Found {len(regions)} significant time-loss regions "
            f"(threshold={threshold_ms}ms)"
        )

        return regions

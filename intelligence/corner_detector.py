"""
Corner Detector
===============

Identifies corner locations from a speed trace using signal processing.

The key insight: corners are local MINIMA in the speed trace. We detect
them by inverting the speed signal and using scipy's peak detection with
configurable prominence thresholds.

This module produces a list of "Corner" objects that describe:
- Entry point (where braking begins)
- Apex point (minimum speed)
- Exit point (where full throttle resumes)
- Corner classification (slow/medium/fast/flat-out)

These corners are the anchor points for the coaching engine —
brake point comparison, apex speed comparison, and throttle
application analysis all happen relative to detected corners.

Usage:
    from intelligence.corner_detector import CornerDetector

    detector = CornerDetector()
    corners = detector.detect(aligned_df)
    # Returns list of Corner objects with entry/apex/exit distances
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd
from scipy.signal import find_peaks

from .constants import (
    CORNER_APEX_SPEED_THRESHOLD,
    CORNER_DETECTION_PROMINENCE,
    CORNER_MIN_DISTANCE_BETWEEN,
)

logger = logging.getLogger("APXIQ.Intelligence.CornerDetector")


# =========================================================================
# Data Classes
# =========================================================================

@dataclass
class Corner:
    """Represents a single detected corner on the track."""

    index: int                    # Corner number (1-indexed)

    # Apex — the point of minimum speed
    apex_distance_m: float        # Distance from start line at apex
    apex_speed_kph: float         # Speed at the apex
    apex_idx: int                 # Index in the aligned DataFrame

    # Entry — where braking begins for this corner
    entry_distance_m: float = 0.0
    entry_speed_kph: float = 0.0
    entry_idx: int = 0

    # Exit — where full throttle resumes after this corner
    exit_distance_m: float = 0.0
    exit_speed_kph: float = 0.0
    exit_idx: int = 0

    # Classification
    classification: str = "medium"  # "slow", "medium", "fast", "flat_out"

    # Derived metrics
    braking_distance_m: float = 0.0   # entry → apex distance
    acceleration_distance_m: float = 0.0  # apex → exit distance
    speed_delta_kph: float = 0.0      # entry_speed - apex_speed


@dataclass
class CornerMap:
    """Complete corner map for a lap, with aggregate statistics."""

    corners: list[Corner] = field(default_factory=list)
    track_distance_m: float = 0.0
    total_corners: int = 0

    # Aggregate stats
    avg_apex_speed: float = 0.0
    slowest_corner_idx: int = 0
    fastest_corner_idx: int = 0

    def get_corner_at_distance(self, distance_m: float,
                                tolerance_m: float = 50.0
                                ) -> Optional[Corner]:
        """
        Find the corner closest to a given distance.
        Returns None if no corner is within the tolerance.
        """
        best = None
        best_dist = tolerance_m
        for corner in self.corners:
            d = abs(corner.apex_distance_m - distance_m)
            if d < best_dist:
                best = corner
                best_dist = d
        return best

    def get_braking_zones(self) -> list[tuple[float, float]]:
        """Return list of (entry_distance, apex_distance) tuples for all corners."""
        return [
            (c.entry_distance_m, c.apex_distance_m)
            for c in self.corners
        ]

    def get_straights(self) -> list[tuple[float, float]]:
        """Return list of (exit_distance_of_prev, entry_distance_of_next) tuples."""
        straights = []
        for i in range(len(self.corners) - 1):
            exit_d = self.corners[i].exit_distance_m
            entry_d = self.corners[i + 1].entry_distance_m
            if entry_d > exit_d:
                straights.append((exit_d, entry_d))
        return straights


# =========================================================================
# Corner Detector
# =========================================================================

class CornerDetector:
    """
    Detects corners from an aligned speed trace using scipy peak detection.
    
    Algorithm:
        1. Invert the speed trace (corners = peaks in the inverted signal)
        2. Apply find_peaks with prominence and distance thresholds
        3. For each detected apex, walk backwards to find the brake point
           (entry) and forwards to find the throttle-on point (exit)
        4. Classify each corner by apex speed
    """

    # Corner classification thresholds (km/h at apex)
    CLASSIFICATION_THRESHOLDS = {
        "slow":     (0,   100),   # Hairpins, chicanes
        "medium":   (100, 170),   # Standard corners
        "fast":     (170, 250),   # High-speed sweepers
        "flat_out": (250, 500),   # Flat-out kinks (e.g., Maggots at Silverstone)
    }

    def __init__(
        self,
        prominence: float = CORNER_DETECTION_PROMINENCE,
        min_distance_between: float = CORNER_MIN_DISTANCE_BETWEEN,
        apex_speed_threshold: float = CORNER_APEX_SPEED_THRESHOLD,
    ):
        """
        Args:
            prominence: Minimum speed drop (km/h) to qualify as a corner.
                        Higher = fewer corners detected (only significant ones).
            min_distance_between: Minimum meters between consecutive apexes.
                                  Prevents detecting chicane elements as separate corners.
            apex_speed_threshold: Maximum apex speed to consider a point a corner.
                                  Speeds above this are considered flat-out straights.
        """
        self.prominence = prominence
        self.min_distance_between = min_distance_between
        self.apex_speed_threshold = apex_speed_threshold

    def detect(self, df: pd.DataFrame) -> CornerMap:
        """
        Detect all corners in an aligned telemetry DataFrame.

        Args:
            df: Aligned DataFrame with 'distance_m' and 'speed_kph' columns.

        Returns:
            CornerMap with all detected corners and aggregate statistics.
        """
        if "speed_kph" not in df.columns or "distance_m" not in df.columns:
            raise ValueError(
                "DataFrame must have 'speed_kph' and 'distance_m' columns."
            )

        speeds = df["speed_kph"].values.astype(float)
        distances = df["distance_m"].values.astype(float)

        # Calculate minimum sample distance (meters per sample)
        avg_spacing = np.mean(np.diff(distances))
        min_samples = max(1, int(self.min_distance_between / avg_spacing))

        # Invert speed trace — corners become peaks
        inverted = -speeds

        # Detect peaks (= corners) in the inverted signal
        apex_indices, properties = find_peaks(
            inverted,
            prominence=self.prominence,
            distance=min_samples,
        )

        # Filter out "corners" that are actually flat-out kinks
        valid_mask = speeds[apex_indices] < self.apex_speed_threshold
        apex_indices = apex_indices[valid_mask]

        if len(apex_indices) == 0:
            logger.warning("No corners detected in speed trace.")
            return CornerMap(track_distance_m=distances[-1] if len(distances) > 0 else 0)

        # Build Corner objects with entry/exit detection
        corners = []
        for i, apex_idx in enumerate(apex_indices):
            corner = self._build_corner(
                index=i + 1,
                apex_idx=int(apex_idx),
                speeds=speeds,
                distances=distances,
                prev_apex_idx=int(apex_indices[i - 1]) if i > 0 else 0,
                next_apex_idx=int(apex_indices[i + 1]) if i < len(apex_indices) - 1 else len(speeds) - 1,
            )
            corners.append(corner)

        # Build aggregate stats
        apex_speeds = [c.apex_speed_kph for c in corners]
        corner_map = CornerMap(
            corners=corners,
            track_distance_m=float(distances[-1]),
            total_corners=len(corners),
            avg_apex_speed=float(np.mean(apex_speeds)),
            slowest_corner_idx=int(np.argmin(apex_speeds)) + 1,
            fastest_corner_idx=int(np.argmax(apex_speeds)) + 1,
        )

        logger.info(
            f"Detected {len(corners)} corners. "
            f"Slowest: T{corner_map.slowest_corner_idx} "
            f"({min(apex_speeds):.0f} km/h), "
            f"Avg apex: {corner_map.avg_apex_speed:.0f} km/h"
        )

        return corner_map

    def _build_corner(
        self,
        index: int,
        apex_idx: int,
        speeds: np.ndarray,
        distances: np.ndarray,
        prev_apex_idx: int,
        next_apex_idx: int,
    ) -> Corner:
        """
        Build a complete Corner object by detecting entry and exit points.
        
        Entry detection: Walk backwards from apex until speed starts
        DECREASING (= the start of the braking zone). We look for the
        point where the speed gradient changes from positive (accelerating
        on the straight) to negative (braking).
        
        Exit detection: Walk forwards from apex until throttle reaches
        near-maximum or speed plateaus (= end of the acceleration zone).
        """
        apex_speed = float(speeds[apex_idx])
        apex_distance = float(distances[apex_idx])

        # --- Entry Detection ---
        # Walk backwards from apex, find where braking begins
        # (the local maximum speed before the apex)
        search_start = max(prev_apex_idx, 0)
        entry_region = speeds[search_start:apex_idx + 1]

        if len(entry_region) > 0:
            # Entry point = highest speed between previous apex and this apex
            local_max_idx = np.argmax(entry_region)
            entry_idx = search_start + local_max_idx
        else:
            entry_idx = max(apex_idx - 1, 0)

        entry_speed = float(speeds[entry_idx])
        entry_distance = float(distances[entry_idx])

        # --- Exit Detection ---
        # Walk forwards from apex, find where acceleration ends
        # (the local maximum speed before the next apex)
        search_end = min(next_apex_idx, len(speeds) - 1)
        exit_region = speeds[apex_idx:search_end + 1]

        if len(exit_region) > 0:
            # Exit point = highest speed between this apex and next apex
            local_max_idx = np.argmax(exit_region)
            exit_idx = apex_idx + local_max_idx
        else:
            exit_idx = min(apex_idx + 1, len(speeds) - 1)

        exit_speed = float(speeds[exit_idx])
        exit_distance = float(distances[exit_idx])

        # --- Classification ---
        classification = self._classify(apex_speed)

        # --- Derived Metrics ---
        braking_distance = apex_distance - entry_distance
        acceleration_distance = exit_distance - apex_distance
        speed_delta = entry_speed - apex_speed

        return Corner(
            index=index,
            apex_distance_m=apex_distance,
            apex_speed_kph=apex_speed,
            apex_idx=apex_idx,
            entry_distance_m=entry_distance,
            entry_speed_kph=entry_speed,
            entry_idx=entry_idx,
            exit_distance_m=exit_distance,
            exit_speed_kph=exit_speed,
            exit_idx=exit_idx,
            classification=classification,
            braking_distance_m=braking_distance,
            acceleration_distance_m=acceleration_distance,
            speed_delta_kph=speed_delta,
        )

    def _classify(self, apex_speed: float) -> str:
        """Classify a corner by its apex speed."""
        for label, (low, high) in self.CLASSIFICATION_THRESHOLDS.items():
            if low <= apex_speed < high:
                return label
        return "medium"

    def compare_corner_maps(
        self, user_map: CornerMap, ghost_map: CornerMap,
        distance_tolerance_m: float = 80.0,
    ) -> list[dict]:
        """
        Compare two corner maps and produce per-corner deltas.
        
        Pairs corners between user and ghost by proximity (within tolerance)
        and computes the performance difference at each corner.

        Args:
            user_map: Corner map from user's lap.
            ghost_map: Corner map from ghost lap.
            distance_tolerance_m: Max distance (m) to consider two corners
                                   as the "same" corner.

        Returns:
            List of dicts with keys:
                corner_index, apex_speed_delta, entry_speed_delta,
                braking_distance_delta, apex_distance_delta
        """
        comparisons = []

        for user_corner in user_map.corners:
            ghost_corner = ghost_map.get_corner_at_distance(
                user_corner.apex_distance_m,
                tolerance_m=distance_tolerance_m,
            )

            if ghost_corner is None:
                # No matching ghost corner found — skip
                continue

            comparison = {
                "corner_index": user_corner.index,
                "user_apex_distance_m": user_corner.apex_distance_m,
                "ghost_apex_distance_m": ghost_corner.apex_distance_m,
                "apex_distance_delta_m": (
                    user_corner.apex_distance_m - ghost_corner.apex_distance_m
                ),
                "apex_speed_delta_kph": (
                    user_corner.apex_speed_kph - ghost_corner.apex_speed_kph
                ),
                "entry_speed_delta_kph": (
                    user_corner.entry_speed_kph - ghost_corner.entry_speed_kph
                ),
                "braking_distance_delta_m": (
                    user_corner.braking_distance_m - ghost_corner.braking_distance_m
                ),
                "classification": user_corner.classification,
                "ghost_classification": ghost_corner.classification,
            }
            comparisons.append(comparison)

        logger.info(
            f"Corner comparison: {len(comparisons)} matched out of "
            f"{len(user_map.corners)} user / {len(ghost_map.corners)} ghost"
        )

        return comparisons

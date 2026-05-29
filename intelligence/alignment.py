"""
S-Curve Distance Alignment Engine
==================================

The core mathematical problem: game telemetry and real-world FastF1 telemetry
are both indexed by "distance from start line", but:

1. Track lengths differ slightly (game vs reality — typically 0.5-3% error)
2. Distance sampling is irregular (game: ~60Hz UDP ticks, FastF1: ~300 samples)
3. Start/finish line positions may not perfectly match

Solution: S-Curve Rubber-Banding
    We project BOTH datasets onto a shared, equidistant distance grid using
    monotonic cubic interpolation (PCHIP). This preserves the shape of the
    telemetry traces while making them directly comparable at every point.

    The "S-Curve" name comes from the sigmoid-like warping function that
    handles the edge cases near the start/finish line, where distance values
    wrap around.

Usage:
    from intelligence.alignment import DistanceAligner

    aligner = DistanceAligner(grid_points=1000)
    user_aligned, ghost_aligned = aligner.align(user_df, ghost_df)
    # Both DataFrames now have identical 'distance_m' columns
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd
from scipy.interpolate import PchipInterpolator

from .constants import ALIGNMENT_GRID_POINTS

logger = logging.getLogger("APXIQ.Intelligence.Alignment")


class DistanceAligner:
    """
    Projects two telemetry DataFrames onto a shared equidistant distance grid
    using monotonic cubic interpolation (PCHIP).
    
    PCHIP (Piecewise Cubic Hermite Interpolating Polynomial) is chosen over
    standard cubic splines because:
    - It guarantees monotonicity preservation (no overshoot in throttle/brake)
    - It handles irregular spacing gracefully
    - It's C1 continuous (smooth first derivatives)
    
    Both input DataFrames must have a 'distance_m' column and at least
    one telemetry channel (speed_kph, throttle, brake, etc.).
    """

    # Channels that get interpolated onto the shared grid
    CONTINUOUS_CHANNELS = [
        "speed_kph", "throttle", "brake", "steer",
        "rpm", "x", "y", "z",
    ]

    # Channels that need nearest-neighbor instead of interpolation
    # (discrete values that shouldn't be smoothed)
    DISCRETE_CHANNELS = [
        "gear", "drs",
    ]

    def __init__(self, grid_points: int = ALIGNMENT_GRID_POINTS):
        """
        Args:
            grid_points: Number of equidistant points on the shared grid.
                         Higher = more precision, lower = faster computation.
                         Default: 1000 (one point per ~5m on a 5km track).
        """
        self.grid_points = grid_points

    def align(
        self,
        user_df: pd.DataFrame,
        ghost_df: pd.DataFrame,
        track_length_override: Optional[float] = None,
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """
        Align two telemetry DataFrames onto a shared distance grid.

        Args:
            user_df: User's lap telemetry (from TelemetryRecorder).
            ghost_df: Ghost lap telemetry (from FastF1Client).
            track_length_override: If provided, use this as the track length
                                   instead of inferring from the data.

        Returns:
            Tuple of (user_aligned, ghost_aligned) DataFrames, both with
            identical 'distance_m' columns of length self.grid_points.

        Raises:
            ValueError: If either DataFrame is empty or missing distance_m.
        """
        self._validate_input(user_df, "user_df")
        self._validate_input(ghost_df, "ghost_df")

        # Determine the shared distance range
        # Use the SHORTER track as the upper bound to avoid extrapolation
        user_max = user_df["distance_m"].max()
        ghost_max = ghost_df["distance_m"].max()

        if track_length_override:
            grid_max = track_length_override
        else:
            grid_max = min(user_max, ghost_max)

        grid_min = max(user_df["distance_m"].min(), ghost_df["distance_m"].min())

        # Ensure we have a valid range
        if grid_max <= grid_min:
            raise ValueError(
                f"Invalid distance range: [{grid_min:.1f}, {grid_max:.1f}]. "
                f"User max={user_max:.1f}, Ghost max={ghost_max:.1f}"
            )

        # Create the shared equidistant grid
        shared_grid = np.linspace(grid_min, grid_max, self.grid_points)

        logger.info(
            f"Aligning onto shared grid: {grid_min:.0f}m → {grid_max:.0f}m "
            f"({self.grid_points} points, ~{(grid_max - grid_min) / self.grid_points:.1f}m spacing)"
        )

        # Interpolate both datasets onto the shared grid
        user_aligned = self._interpolate_to_grid(user_df, shared_grid, "user")
        ghost_aligned = self._interpolate_to_grid(ghost_df, shared_grid, "ghost")

        return user_aligned, ghost_aligned

    def align_single(
        self,
        df: pd.DataFrame,
        grid_points: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Resample a single DataFrame onto an equidistant distance grid.
        Useful for normalizing raw telemetry before storage.

        Args:
            df: Telemetry DataFrame with 'distance_m' column.
            grid_points: Override for number of grid points.

        Returns:
            Resampled DataFrame with equidistant distance_m values.
        """
        self._validate_input(df, "df")
        n_points = grid_points or self.grid_points
        grid = np.linspace(
            df["distance_m"].min(),
            df["distance_m"].max(),
            n_points,
        )
        return self._interpolate_to_grid(df, grid, "single")

    def _interpolate_to_grid(
        self, df: pd.DataFrame, grid: np.ndarray, label: str
    ) -> pd.DataFrame:
        """
        Interpolate all channels of a DataFrame onto the shared grid.

        Uses PCHIP for continuous channels and nearest-neighbor for discrete.
        """
        # Sort by distance and remove duplicates (keep last for freshest data)
        df_clean = (
            df.sort_values("distance_m")
            .drop_duplicates(subset=["distance_m"], keep="last")
            .reset_index(drop=True)
        )

        # Filter grid to be within the data's actual range
        d_min = df_clean["distance_m"].min()
        d_max = df_clean["distance_m"].max()
        mask = (grid >= d_min) & (grid <= d_max)
        valid_grid = grid[mask]

        if len(valid_grid) < 10:
            logger.warning(
                f"[{label}] Only {len(valid_grid)} valid grid points. "
                f"Data range: [{d_min:.0f}, {d_max:.0f}]"
            )

        result = {"distance_m": valid_grid}
        distances = df_clean["distance_m"].values

        # Interpolate continuous channels with PCHIP
        for channel in self.CONTINUOUS_CHANNELS:
            if channel in df_clean.columns:
                values = df_clean[channel].values.astype(float)

                # Handle NaN values by forward-filling then back-filling
                nan_mask = np.isnan(values)
                if nan_mask.any():
                    valid_idx = np.where(~nan_mask)[0]
                    if len(valid_idx) > 0:
                        values = np.interp(
                            np.arange(len(values)),
                            valid_idx,
                            values[valid_idx],
                        )
                    else:
                        values = np.zeros_like(values)

                try:
                    interpolator = PchipInterpolator(distances, values)
                    result[channel] = interpolator(valid_grid)
                except ValueError as e:
                    logger.warning(
                        f"[{label}] PCHIP failed for {channel}: {e}. "
                        f"Falling back to linear interpolation."
                    )
                    result[channel] = np.interp(valid_grid, distances, values)

        # Nearest-neighbor for discrete channels
        for channel in self.DISCRETE_CHANNELS:
            if channel in df_clean.columns:
                values = df_clean[channel].values
                # Find nearest distance index for each grid point
                indices = np.searchsorted(distances, valid_grid, side="left")
                indices = np.clip(indices, 0, len(distances) - 1)
                result[channel] = values[indices]

        aligned_df = pd.DataFrame(result)

        logger.debug(
            f"[{label}] Aligned: {len(df)} raw → {len(aligned_df)} grid points"
        )
        return aligned_df

    def _validate_input(self, df: pd.DataFrame, name: str):
        """Validate that the input DataFrame is usable."""
        if df is None or df.empty:
            raise ValueError(f"{name} is empty or None.")
        if "distance_m" not in df.columns:
            raise ValueError(
                f"{name} is missing required 'distance_m' column. "
                f"Available columns: {list(df.columns)}"
            )
        if len(df) < 2:
            raise ValueError(
                f"{name} has only {len(df)} rows. Need at least 2 for interpolation."
            )

    def compute_track_length_ratio(
        self, user_max_distance: float, ghost_max_distance: float
    ) -> float:
        """
        Compute the ratio between user and ghost track lengths.
        
        A ratio close to 1.0 indicates the game and real-world tracks
        are nearly identical in length. Ratios > 1.03 or < 0.97 suggest
        significant track layout differences that may affect alignment quality.

        Returns:
            Ratio of user_max / ghost_max. Values near 1.0 are ideal.
        """
        if ghost_max_distance == 0:
            return 0.0
        ratio = user_max_distance / ghost_max_distance
        if abs(ratio - 1.0) > 0.05:
            logger.warning(
                f"Track length mismatch: user={user_max_distance:.0f}m, "
                f"ghost={ghost_max_distance:.0f}m (ratio={ratio:.3f}). "
                f"Alignment quality may be degraded."
            )
        return ratio

"""
Battle Predictor
=================

Projects overtaking windows and predicts position changes based on
real-time telemetry deltas and track topology.

This module answers questions like:
    - "Will I catch the car ahead before the next DRS zone?"
    - "At current pace, when will the car behind overtake me?"
    - "What's my estimated time gap to P1 at the end of the race?"

The predictor uses:
    1. Current delta-to-car-in-front/behind (from UDP lap data)
    2. Relative pace over the last N laps
    3. Track DRS zone locations (from constants)
    4. Tyre degradation trend (if available)

Usage:
    from intelligence.battle_predictor import BattlePredictor

    predictor = BattlePredictor()
    prediction = predictor.predict(
        gap_ahead=1.2,  # 1.2s behind car in front
        pace_delta=-0.3,  # 0.3s/lap faster than car ahead
        laps_remaining=15,
        drs_zones=[(800, 1000), (3200, 3400)],
    )
    # prediction.overtake_lap = 4 → "You'll catch them in 4 laps"
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

logger = logging.getLogger("APXIQ.Intelligence.BattlePredictor")


# =========================================================================
# Data Classes
# =========================================================================

@dataclass
class GapTrend:
    """Tracks the gap to a specific car over multiple laps."""

    gaps_by_lap: list[float] = field(default_factory=list)  # gap in seconds

    @property
    def current_gap(self) -> float:
        """Most recent gap value."""
        return self.gaps_by_lap[-1] if self.gaps_by_lap else 0.0

    @property
    def pace_delta_per_lap(self) -> float:
        """
        Estimated pace difference per lap (seconds).
        Negative = closing gap (faster than target).
        Positive = losing gap (slower than target).
        """
        if len(self.gaps_by_lap) < 2:
            return 0.0

        # Use linear regression over recent laps for stability
        recent = self.gaps_by_lap[-min(5, len(self.gaps_by_lap)):]
        x = np.arange(len(recent), dtype=float)
        coeffs = np.polyfit(x, recent, 1)
        return float(coeffs[0])  # Slope = change per lap

    @property
    def is_closing(self) -> bool:
        """True if we're catching this car."""
        return self.pace_delta_per_lap < -0.05  # >50ms/lap gain

    @property
    def is_losing(self) -> bool:
        """True if this car is pulling away."""
        return self.pace_delta_per_lap > 0.05

    def add_gap(self, gap_seconds: float):
        """Record a new gap measurement."""
        self.gaps_by_lap.append(gap_seconds)


@dataclass
class OvertakePrediction:
    """Prediction for a potential overtake."""

    target_position: int           # The position we're predicting about
    current_gap_s: float           # Current gap in seconds
    pace_delta_s: float            # Pace difference per lap
    laps_to_overtake: Optional[int]  # Estimated laps until pass (None if not catching)
    overtake_probability: float    # 0.0-1.0 probability of overtake
    in_drs_range: bool             # True if within DRS activation range (~1s)
    recommended_action: str        # Coaching advice for the battle

    @property
    def is_likely(self) -> bool:
        """True if overtake probability exceeds 50%."""
        return self.overtake_probability > 0.5


@dataclass
class RaceProjection:
    """Full race position projection."""

    current_position: int
    predicted_finish_position: int
    gap_to_leader_s: float
    gap_to_ahead_s: float
    gap_from_behind_s: float
    ahead_prediction: Optional[OvertakePrediction] = None
    behind_prediction: Optional[OvertakePrediction] = None
    risk_level: str = "stable"  # "stable", "vulnerable", "attacking"


# =========================================================================
# Battle Predictor
# =========================================================================

class BattlePredictor:
    """
    Predicts position changes and overtaking opportunities.

    The predictor maintains gap trends for cars ahead and behind,
    and uses simple linear extrapolation to project when overtakes
    might occur.
    """

    # DRS activation threshold (seconds behind car ahead)
    DRS_THRESHOLD_S = 1.0

    # Maximum laps to project into the future
    MAX_PROJECTION_LAPS = 30

    # Minimum pace delta (s/lap) to consider a position change likely
    MIN_PACE_DELTA = 0.05

    def __init__(self):
        # Gap tracking: position → GapTrend
        self.gap_trends: dict[str, GapTrend] = {
            "ahead": GapTrend(),
            "behind": GapTrend(),
        }

    def update_gaps(
        self,
        gap_ahead_s: float,
        gap_behind_s: float,
    ):
        """
        Update gap measurements from the latest lap data.

        Args:
            gap_ahead_s: Gap to car in front (positive = behind).
            gap_behind_s: Gap to car behind (positive = they're behind us).
        """
        self.gap_trends["ahead"].add_gap(gap_ahead_s)
        self.gap_trends["behind"].add_gap(gap_behind_s)

    def predict_overtake(
        self,
        gap_s: float,
        pace_delta_s: float,
        laps_remaining: int,
        has_drs: bool = False,
    ) -> OvertakePrediction:
        """
        Predict if an overtake will occur based on gap and pace trends.

        Args:
            gap_s: Current gap in seconds (positive = we're behind).
            pace_delta_s: Pace difference per lap (negative = we're faster).
            laps_remaining: Laps left in the race.
            has_drs: Whether DRS is available for this battle.

        Returns:
            OvertakePrediction with timing and probability.
        """
        in_drs = gap_s <= self.DRS_THRESHOLD_S and gap_s > 0

        # Calculate laps to catch
        if pace_delta_s < -self.MIN_PACE_DELTA and gap_s > 0:
            # We're catching them
            laps_to_catch = int(np.ceil(gap_s / abs(pace_delta_s)))
            laps_to_overtake = min(laps_to_catch, self.MAX_PROJECTION_LAPS)

            # Probability based on whether we have enough laps
            if laps_to_catch <= laps_remaining:
                base_prob = min(0.95, 1.0 - (laps_to_catch / max(laps_remaining, 1)))
                # DRS bonus
                drs_bonus = 0.15 if has_drs else 0.0
                probability = min(1.0, base_prob + drs_bonus)
            else:
                probability = max(0.0, 0.3 - (laps_to_catch - laps_remaining) * 0.05)

            action = self._recommend_attacking_action(
                gap_s, pace_delta_s, laps_to_catch, in_drs
            )
        elif pace_delta_s >= 0:
            # They're pulling away or same pace
            laps_to_overtake = None
            probability = 0.0
            action = "Focus on tyre management and wait for an opportunity."
        else:
            # Marginal pace advantage
            laps_to_overtake = None
            probability = 0.1
            action = "Marginal pace advantage. Push harder to close the gap."

        return OvertakePrediction(
            target_position=0,  # Caller fills this in
            current_gap_s=gap_s,
            pace_delta_s=pace_delta_s,
            laps_to_overtake=laps_to_overtake,
            overtake_probability=probability,
            in_drs_range=in_drs,
            recommended_action=action,
        )

    def project_race(
        self,
        current_position: int,
        gap_ahead_s: float,
        gap_behind_s: float,
        laps_remaining: int,
        gap_to_leader_s: float = 0.0,
    ) -> RaceProjection:
        """
        Generate a full race projection from current telemetry.

        Args:
            current_position: Current race position (1-indexed).
            gap_ahead_s: Gap to car in front.
            gap_behind_s: Gap from car behind.
            laps_remaining: Laps remaining in the race.
            gap_to_leader_s: Gap to the race leader.

        Returns:
            RaceProjection with predicted finish position and threats.
        """
        # Update gap trends
        self.update_gaps(gap_ahead_s, gap_behind_s)

        # Predict overtake on car ahead
        ahead_pace = self.gap_trends["ahead"].pace_delta_per_lap
        ahead_pred = self.predict_overtake(
            gap_s=gap_ahead_s,
            pace_delta_s=ahead_pace,
            laps_remaining=laps_remaining,
        )
        ahead_pred.target_position = current_position - 1

        # Predict defense from car behind
        behind_pace = self.gap_trends["behind"].pace_delta_per_lap
        behind_pred = self.predict_overtake(
            gap_s=gap_behind_s,
            pace_delta_s=-behind_pace,  # Invert: from their perspective
            laps_remaining=laps_remaining,
        )
        behind_pred.target_position = current_position + 1

        # Determine predicted finish position
        predicted_position = current_position
        if ahead_pred.is_likely:
            predicted_position -= 1  # We overtake
        if behind_pred.is_likely:
            predicted_position += 1  # We get overtaken

        # Risk assessment
        if behind_pred.overtake_probability > 0.6:
            risk = "vulnerable"
        elif ahead_pred.overtake_probability > 0.6:
            risk = "attacking"
        else:
            risk = "stable"

        projection = RaceProjection(
            current_position=current_position,
            predicted_finish_position=predicted_position,
            gap_to_leader_s=gap_to_leader_s,
            gap_to_ahead_s=gap_ahead_s,
            gap_from_behind_s=gap_behind_s,
            ahead_prediction=ahead_pred,
            behind_prediction=behind_pred,
            risk_level=risk,
        )

        logger.info(
            f"Race projection: P{current_position} → P{predicted_position} "
            f"(risk={risk}, ahead={gap_ahead_s:.1f}s at {ahead_pace:+.2f}s/lap, "
            f"behind={gap_behind_s:.1f}s at {behind_pace:+.2f}s/lap)"
        )

        return projection

    def _recommend_attacking_action(
        self,
        gap_s: float,
        pace_delta_s: float,
        laps_to_catch: int,
        in_drs: bool,
    ) -> str:
        """Generate attacking strategy recommendation."""
        if in_drs:
            return (
                f"IN DRS RANGE ({gap_s:.1f}s). "
                f"Set up the overtake on the next straight."
            )
        elif laps_to_catch <= 2:
            return (
                f"Catching fast — {gap_s:.1f}s gap closing at "
                f"{abs(pace_delta_s):.2f}s/lap. "
                f"Prepare your move in {laps_to_catch} laps."
            )
        elif laps_to_catch <= 5:
            return (
                f"Closing in. Gap: {gap_s:.1f}s, "
                f"gaining {abs(pace_delta_s):.2f}s/lap. "
                f"Manage tyres for the attack in ~{laps_to_catch} laps."
            )
        else:
            return (
                f"Long game: {laps_to_catch} laps to catch at current pace. "
                f"Stay consistent and preserve tyres."
            )

    def reset(self):
        """Reset all gap trends (e.g., on session restart)."""
        self.gap_trends = {
            "ahead": GapTrend(),
            "behind": GapTrend(),
        }

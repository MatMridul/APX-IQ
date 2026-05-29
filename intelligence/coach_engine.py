"""
Coach Engine
=============

Rule-based mid-race coaching engine that produces actionable driving
tips from DeltaResult + CornerMap data.

Design Philosophy:
    This is NOT a machine learning model — it's a deterministic rule
    engine. Each rule has:
        1. A TRIGGER condition (e.g., "user brakes 20m+ earlier than ghost")
        2. A SEVERITY level (info/warning/critical)
        3. A MESSAGE template with concrete numbers
        4. A HARDWARE SCALING factor (keyboard = wide tolerance, pro wheel = tight)

    Rules fire every N seconds to avoid spamming the driver. Each rule
    has a cooldown period and a priority level.

Output:
    CoachingTip objects are emitted and can be:
        - Pushed to the UI as real-time overlays
        - Queued for post-lap summary
        - Fed to the GenAI debrief engine (Phase 4)

Usage:
    from intelligence.coach_engine import CoachEngine

    coach = CoachEngine(hardware_profile=profile)
    tips = coach.analyze(delta_result, user_corners, ghost_corners)
    for tip in tips:
        print(f"[{tip.severity}] {tip.message}")
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .corner_detector import CornerMap
from .delta_engine import DeltaResult, BrakePointDelta
from .hardware_profiler import HardwareProfile
from .constants import BRAKE_THRESHOLD_SCALING, HARDWARE_CONTROLLER

logger = logging.getLogger("APXIQ.Intelligence.Coach")


# =========================================================================
# Enums & Data Classes
# =========================================================================

class Severity(Enum):
    """Coaching tip severity levels."""
    INFO = "info"           # Positive feedback or minor suggestion
    WARNING = "warning"     # Meaningful time loss, actionable
    CRITICAL = "critical"   # Major time loss, urgent correction needed


class CoachingCategory(Enum):
    """Categories of coaching advice."""
    BRAKING = "braking"
    APEX_SPEED = "apex_speed"
    THROTTLE = "throttle"
    LINE = "line"
    CONSISTENCY = "consistency"
    OVERALL = "overall"


@dataclass
class CoachingTip:
    """A single coaching tip produced by the engine."""

    category: CoachingCategory
    severity: Severity
    message: str
    corner_index: Optional[int] = None    # Which corner this applies to (if any)
    distance_m: Optional[float] = None    # Where on track this applies
    time_impact_ms: float = 0.0           # How much time this costs
    data: dict = field(default_factory=dict)  # Raw numbers for UI rendering

    @property
    def priority(self) -> int:
        """Higher priority = more important. For sorting."""
        severity_weights = {
            Severity.CRITICAL: 3,
            Severity.WARNING: 2,
            Severity.INFO: 1,
        }
        return severity_weights.get(self.severity, 0)


# =========================================================================
# Coach Engine
# =========================================================================

class CoachEngine:
    """
    Rule-based coaching engine that analyzes delta data and produces
    actionable driving tips.

    The engine is hardware-aware: all thresholds scale based on the
    detected input device. A keyboard player won't get tips about
    brake pressure modulation (impossible on keyboard).
    """

    # Cooldown between identical tips (seconds) — prevents spam
    TIP_COOLDOWN_S = 10.0

    # Maximum tips per analysis pass
    MAX_TIPS_PER_PASS = 8

    def __init__(self, hardware_profile: Optional[HardwareProfile] = None):
        """
        Args:
            hardware_profile: Detected hardware. If None, defaults to
                              controller thresholds (safe middle ground).
        """
        self.hardware_profile = hardware_profile

        # Resolve brake threshold from hardware tier
        if hardware_profile:
            self.brake_threshold_m = hardware_profile.brake_threshold_m
            self.hardware_type = hardware_profile.detected_type
        else:
            self.brake_threshold_m = BRAKE_THRESHOLD_SCALING[HARDWARE_CONTROLLER]
            self.hardware_type = HARDWARE_CONTROLLER

        # Cooldown tracking: {rule_key: last_fire_timestamp}
        self._cooldowns: dict[str, float] = {}

        logger.info(
            f"Coach initialized: hardware={self.hardware_type}, "
            f"brake_threshold={self.brake_threshold_m}m"
        )

    def analyze(
        self,
        delta: DeltaResult,
        user_corners: Optional[CornerMap] = None,
        ghost_corners: Optional[CornerMap] = None,
    ) -> list[CoachingTip]:
        """
        Run all coaching rules against the current delta data.

        Args:
            delta: DeltaResult from the DeltaEngine.
            user_corners: User's corner map.
            ghost_corners: Ghost's corner map.

        Returns:
            List of CoachingTip objects, sorted by priority (highest first).
        """
        tips: list[CoachingTip] = []

        # Rule 1: Brake point analysis
        if delta.brake_point_deltas:
            tips.extend(self._analyze_braking(delta.brake_point_deltas))

        # Rule 2: Apex speed analysis
        if user_corners and ghost_corners:
            tips.extend(self._analyze_apex_speed(user_corners, ghost_corners))

        # Rule 3: Throttle application
        tips.extend(self._analyze_throttle(delta, user_corners))

        # Rule 4: Time loss regions
        from .delta_engine import DeltaEngine
        engine = DeltaEngine()
        loss_regions = engine.get_time_loss_regions(delta, threshold_ms=30.0)
        tips.extend(self._analyze_time_loss_regions(loss_regions))

        # Rule 5: Overall lap summary
        tips.append(self._generate_lap_summary(delta))

        # Filter by cooldowns and sort by priority
        tips = self._apply_cooldowns(tips)
        tips.sort(key=lambda t: t.priority, reverse=True)

        # Cap at max tips
        tips = tips[:self.MAX_TIPS_PER_PASS]

        logger.info(f"Coach produced {len(tips)} tips this pass")
        return tips

    # -----------------------------------------------------------------
    # Rule Implementations
    # -----------------------------------------------------------------

    def _analyze_braking(
        self, brake_deltas: list[BrakePointDelta]
    ) -> list[CoachingTip]:
        """
        Rule: Compare brake points at each corner.

        Tip triggers:
            - User brakes significantly earlier than ghost → "Brake later"
            - User brakes significantly later than ghost  → "Brake earlier"
        """
        tips = []

        for bp in brake_deltas:
            delta_m = bp.delta_m  # positive = user brakes later

            # Only fire if delta exceeds hardware-scaled threshold
            if abs(delta_m) < self.brake_threshold_m:
                continue

            if delta_m < -self.brake_threshold_m:
                # User brakes too early
                severity = (
                    Severity.CRITICAL if abs(delta_m) > self.brake_threshold_m * 2
                    else Severity.WARNING
                )
                tips.append(CoachingTip(
                    category=CoachingCategory.BRAKING,
                    severity=severity,
                    message=(
                        f"Turn {bp.corner_index}: Brake {abs(delta_m):.0f}m later. "
                        f"You're braking at {bp.user_brake_speed_kph:.0f} km/h, "
                        f"ghost brakes at {bp.ghost_brake_speed_kph:.0f} km/h."
                    ),
                    corner_index=bp.corner_index,
                    distance_m=bp.user_brake_distance_m,
                    data={
                        "delta_m": delta_m,
                        "user_speed": bp.user_brake_speed_kph,
                        "ghost_speed": bp.ghost_brake_speed_kph,
                    },
                ))
            elif delta_m > self.brake_threshold_m:
                # User brakes too late (risky but sometimes faster)
                tips.append(CoachingTip(
                    category=CoachingCategory.BRAKING,
                    severity=Severity.INFO,
                    message=(
                        f"Turn {bp.corner_index}: Late braking by {delta_m:.0f}m. "
                        f"Aggressive — watch for lockups."
                    ),
                    corner_index=bp.corner_index,
                    distance_m=bp.user_brake_distance_m,
                    data={"delta_m": delta_m},
                ))

        return tips

    def _analyze_apex_speed(
        self, user_map: CornerMap, ghost_map: CornerMap
    ) -> list[CoachingTip]:
        """
        Rule: Compare apex speeds at each matched corner.

        Tip triggers:
            - User is > 5 km/h slower at apex → "Carry more speed"
            - User is > 10 km/h faster at apex → "Careful — overspeeding"
        """
        tips = []
        slow_threshold = 5.0    # km/h slower = coaching trigger
        fast_threshold = 10.0   # km/h faster = caution trigger

        for user_corner in user_map.corners:
            ghost_corner = ghost_map.get_corner_at_distance(
                user_corner.apex_distance_m, tolerance_m=100.0
            )
            if ghost_corner is None:
                continue

            speed_diff = user_corner.apex_speed_kph - ghost_corner.apex_speed_kph

            if speed_diff < -slow_threshold:
                severity = (
                    Severity.CRITICAL if abs(speed_diff) > 15
                    else Severity.WARNING
                )
                tips.append(CoachingTip(
                    category=CoachingCategory.APEX_SPEED,
                    severity=severity,
                    message=(
                        f"Turn {user_corner.index}: Carry {abs(speed_diff):.0f} km/h "
                        f"more speed through apex. "
                        f"You: {user_corner.apex_speed_kph:.0f}, "
                        f"Ghost: {ghost_corner.apex_speed_kph:.0f} km/h."
                    ),
                    corner_index=user_corner.index,
                    distance_m=user_corner.apex_distance_m,
                    time_impact_ms=abs(speed_diff) * 5,  # Rough estimate
                    data={
                        "speed_diff": speed_diff,
                        "user_apex": user_corner.apex_speed_kph,
                        "ghost_apex": ghost_corner.apex_speed_kph,
                        "classification": user_corner.classification,
                    },
                ))
            elif speed_diff > fast_threshold:
                tips.append(CoachingTip(
                    category=CoachingCategory.APEX_SPEED,
                    severity=Severity.INFO,
                    message=(
                        f"Turn {user_corner.index}: {speed_diff:.0f} km/h faster "
                        f"than ghost at apex. Great corner!"
                    ),
                    corner_index=user_corner.index,
                    distance_m=user_corner.apex_distance_m,
                    data={"speed_diff": speed_diff},
                ))

        return tips

    def _analyze_throttle(
        self, delta: DeltaResult, user_corners: Optional[CornerMap]
    ) -> list[CoachingTip]:
        """
        Rule: Analyze throttle application patterns.

        Tip triggers:
            - Low average throttle delta across whole lap → general issue
            - Particularly low throttle in exit zones → "Get on throttle earlier"
        """
        tips = []
        import numpy as np

        # Overall throttle comparison
        avg_throttle_delta = float(np.mean(delta.throttle_delta))

        if avg_throttle_delta < -0.05:  # User uses 5%+ less throttle overall
            tips.append(CoachingTip(
                category=CoachingCategory.THROTTLE,
                severity=Severity.WARNING,
                message=(
                    f"Overall throttle usage is {abs(avg_throttle_delta) * 100:.0f}% "
                    f"lower than ghost. Be more aggressive on acceleration."
                ),
                data={"avg_delta": avg_throttle_delta},
            ))

        # Corner exit throttle analysis
        if user_corners and len(delta.throttle_delta) > 0:
            for corner in user_corners.corners:
                # Check throttle in the exit zone (apex → exit)
                exit_start = np.searchsorted(
                    delta.distance_grid, corner.apex_distance_m
                )
                exit_end = np.searchsorted(
                    delta.distance_grid, corner.exit_distance_m
                )
                if exit_end > exit_start:
                    exit_throttle = float(
                        np.mean(delta.throttle_delta[exit_start:exit_end])
                    )
                    if exit_throttle < -0.10:  # 10%+ less throttle on exit
                        tips.append(CoachingTip(
                            category=CoachingCategory.THROTTLE,
                            severity=Severity.WARNING,
                            message=(
                                f"Turn {corner.index}: Get on throttle earlier. "
                                f"You're {abs(exit_throttle) * 100:.0f}% less "
                                f"throttle than ghost on exit."
                            ),
                            corner_index=corner.index,
                            distance_m=corner.apex_distance_m,
                            data={"exit_throttle_delta": exit_throttle},
                        ))

        return tips

    def _analyze_time_loss_regions(
        self, regions: list[dict]
    ) -> list[CoachingTip]:
        """
        Rule: Highlight the biggest time-loss zones on the track.

        These are the "red zones" where the driver is hemorrhaging time.
        """
        tips = []

        # Sort by time lost (worst first)
        sorted_regions = sorted(
            regions, key=lambda r: r["time_lost_ms"], reverse=True
        )

        for i, region in enumerate(sorted_regions[:3]):  # Top 3 worst zones
            severity = (
                Severity.CRITICAL if region["time_lost_ms"] > 200
                else Severity.WARNING
            )
            tips.append(CoachingTip(
                category=CoachingCategory.OVERALL,
                severity=severity,
                message=(
                    f"Time loss zone: {region['start_m']:.0f}m → "
                    f"{region['end_m']:.0f}m "
                    f"({region['time_lost_ms']:.0f}ms lost, "
                    f"avg {abs(region['avg_speed_delta_kph']):.0f} km/h slower)."
                ),
                distance_m=region["start_m"],
                time_impact_ms=region["time_lost_ms"],
                data=region,
            ))

        return tips

    def _generate_lap_summary(self, delta: DeltaResult) -> CoachingTip:
        """
        Generate an overall lap summary tip.
        """
        total_ms = delta.total_time_delta_ms

        if total_ms > 0:
            severity = (
                Severity.CRITICAL if total_ms > 2000
                else Severity.WARNING if total_ms > 500
                else Severity.INFO
            )
            message = (
                f"Lap delta: +{total_ms / 1000:.3f}s behind ghost. "
                f"Avg speed difference: {delta.avg_speed_delta_kph:.1f} km/h."
            )
        else:
            severity = Severity.INFO
            message = (
                f"Lap delta: {total_ms / 1000:.3f}s AHEAD of ghost! "
                f"Avg speed advantage: {abs(delta.avg_speed_delta_kph):.1f} km/h."
            )

        return CoachingTip(
            category=CoachingCategory.OVERALL,
            severity=severity,
            message=message,
            time_impact_ms=abs(total_ms),
            data={
                "total_delta_ms": total_ms,
                "avg_speed_delta": delta.avg_speed_delta_kph,
                "worst_corner": delta.worst_corner_index,
                "best_corner": delta.best_corner_index,
            },
        )

    # -----------------------------------------------------------------
    # Cooldown Management
    # -----------------------------------------------------------------

    def _apply_cooldowns(self, tips: list[CoachingTip]) -> list[CoachingTip]:
        """Filter tips that are still on cooldown."""
        now = time.time()
        filtered = []

        for tip in tips:
            # Generate a unique key for each rule+corner combination
            key = f"{tip.category.value}:{tip.corner_index}"

            last_fired = self._cooldowns.get(key, 0)
            if now - last_fired >= self.TIP_COOLDOWN_S:
                self._cooldowns[key] = now
                filtered.append(tip)

        return filtered

    def reset_cooldowns(self):
        """Reset all cooldowns (e.g., on new lap)."""
        self._cooldowns.clear()

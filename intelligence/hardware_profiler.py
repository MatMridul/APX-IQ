"""
Hardware Profiler
=================

Auto-detects the player's input device (keyboard, controller, wheel)
from the steering trace using signal analysis.

Why this matters:
    A keyboard player hammering left/right has fundamentally different
    input characteristics from a wheel user making smooth corrections.
    Coaching thresholds (brake-point tolerance, apex precision, etc.)
    MUST scale to the player's hardware or the advice is useless.

Detection method:
    1. Compute the first derivative of the normalized steer signal
    2. Calculate the variance of this derivative
    3. Classify into hardware tier based on calibrated thresholds
    4. Optionally run FFT for dominant frequency analysis (wheel vs gamepad
       shows distinct frequency fingerprints)

Usage:
    from intelligence.hardware_profiler import HardwareProfiler

    profiler = HardwareProfiler()
    result = profiler.classify(steer_trace)
    # result.detected_type = "controller"
    # result.brake_threshold_m = 25  (meters tolerance for this tier)
"""

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

from .constants import (
    HARDWARE_TIERS,
    HARDWARE_VARIANCE_THRESHOLDS,
    BRAKE_THRESHOLD_SCALING,
    HARDWARE_KEYBOARD,
    HARDWARE_CONTROLLER,
    HARDWARE_WHEEL_ENTRY,
    HARDWARE_WHEEL_MID,
    HARDWARE_WHEEL_PRO,
    HARDWARE_PROFILING_MIN_LAPS,
)

logger = logging.getLogger("APXIQ.Intelligence.HardwareProfiler")


# =========================================================================
# Data Classes
# =========================================================================

@dataclass
class HardwareProfile:
    """Result of hardware classification."""

    detected_type: str              # One of HARDWARE_TIERS
    confidence: float               # 0.0-1.0 confidence in the classification
    steer_variance: float           # Variance of steer derivative
    steer_dominant_freq_hz: float   # Dominant frequency from FFT
    brake_threshold_m: float        # Coaching tolerance for this tier (meters)
    sample_count: int               # Number of steer samples analyzed

    @property
    def is_high_confidence(self) -> bool:
        """True if confidence exceeds 0.7 (70%)."""
        return self.confidence >= 0.7

    @property
    def tier_label(self) -> str:
        """Human-readable label for the detected hardware."""
        labels = {
            HARDWARE_KEYBOARD:    "Keyboard",
            HARDWARE_CONTROLLER:  "Controller",
            HARDWARE_WHEEL_ENTRY: "Entry-Level Wheel (e.g. G29/G923)",
            HARDWARE_WHEEL_MID:   "Mid-Range Wheel (e.g. T300)",
            HARDWARE_WHEEL_PRO:   "Pro Wheel (e.g. Fanatec DD)",
        }
        return labels.get(self.detected_type, self.detected_type)


# =========================================================================
# Profiler
# =========================================================================

class HardwareProfiler:
    """
    Classifies the player's input device from steering trace analysis.

    Algorithm:
        1. Normalize steer signal to [-1, 1] (should already be from UDP)
        2. Compute first derivative (Δsteer between consecutive samples)
        3. Calculate variance of the derivative
        4. Match against calibrated thresholds per hardware tier
        5. Compute confidence based on how centered the variance is
           within the matched tier's range
        6. (Optional) FFT for dominant frequency fingerprint
    """

    # Minimum samples needed for reliable classification
    MIN_SAMPLES = 200

    def classify(self, steer_trace: np.ndarray) -> Optional[HardwareProfile]:
        """
        Classify hardware from a steering trace.

        Args:
            steer_trace: 1D array of steer values (-1.0 to 1.0),
                         typically accumulated across multiple laps.

        Returns:
            HardwareProfile with detected type and confidence,
            or None if insufficient data.
        """
        if len(steer_trace) < self.MIN_SAMPLES:
            logger.warning(
                f"Insufficient steer data for profiling: "
                f"{len(steer_trace)} samples (need {self.MIN_SAMPLES})"
            )
            return None

        # Step 1: Compute first derivative
        derivative = np.diff(steer_trace.astype(float))

        # Step 2: Compute variance of derivative
        variance = float(np.var(derivative))

        # Step 3: Classify by variance thresholds
        detected_type = self._classify_by_variance(variance)

        # Step 4: Compute confidence
        confidence = self._compute_confidence(variance, detected_type)

        # Step 5: FFT for dominant frequency
        dominant_freq = self._compute_dominant_frequency(steer_trace)

        # Step 6: Cross-validate with FFT if ambiguous
        if confidence < 0.5:
            fft_type = self._classify_by_frequency(dominant_freq)
            if fft_type and fft_type != detected_type:
                logger.info(
                    f"Variance says '{detected_type}' but FFT says "
                    f"'{fft_type}'. Using FFT (low variance confidence)."
                )
                detected_type = fft_type
                confidence = 0.5  # Split confidence

        # Look up brake threshold for this tier
        brake_threshold = BRAKE_THRESHOLD_SCALING.get(detected_type, 20)

        profile = HardwareProfile(
            detected_type=detected_type,
            confidence=confidence,
            steer_variance=variance,
            steer_dominant_freq_hz=dominant_freq,
            brake_threshold_m=brake_threshold,
            sample_count=len(steer_trace),
        )

        logger.info(
            f"Hardware classified: {profile.tier_label} "
            f"(confidence={confidence:.0%}, variance={variance:.4f}, "
            f"freq={dominant_freq:.1f}Hz, brake_tol={brake_threshold}m)"
        )

        return profile

    def _classify_by_variance(self, variance: float) -> str:
        """
        Match steer derivative variance against calibrated thresholds.

        Returns the hardware tier whose variance range contains the
        observed value. Falls back to controller if none match.
        """
        for tier in HARDWARE_TIERS:
            low, high = HARDWARE_VARIANCE_THRESHOLDS[tier]
            if low <= variance < high:
                return tier

        # Fallback: if variance is extremely high, assume pro wheel
        # (very smooth = small derivative changes, but high-res signal)
        if variance >= HARDWARE_VARIANCE_THRESHOLDS[HARDWARE_WHEEL_PRO][1]:
            return HARDWARE_WHEEL_PRO

        return HARDWARE_CONTROLLER  # Safe default

    def _compute_confidence(self, variance: float, tier: str) -> float:
        """
        Compute classification confidence based on how centered
        the variance is within the tier's range.

        A variance right at the midpoint of the range = 1.0 confidence.
        A variance at the edge of the range = lower confidence.
        """
        low, high = HARDWARE_VARIANCE_THRESHOLDS.get(
            tier, (0.005, 0.08)
        )
        range_width = high - low
        if range_width == 0:
            return 0.5

        midpoint = (low + high) / 2.0
        distance_from_mid = abs(variance - midpoint)
        half_range = range_width / 2.0

        # Confidence = 1.0 at midpoint, decreasing linearly to edges
        confidence = max(0.0, 1.0 - (distance_from_mid / half_range))

        return float(confidence)

    def _compute_dominant_frequency(
        self, steer_trace: np.ndarray, sample_rate_hz: float = 60.0
    ) -> float:
        """
        Compute the dominant frequency in the steer signal using FFT.

        Keyboard input: high-frequency spikes (binary switching)
        Controller:     medium-frequency noise
        Wheel:          low-frequency smooth arcs

        Args:
            steer_trace: Raw steer values.
            sample_rate_hz: Sampling rate (typically 60Hz from UDP).

        Returns:
            Dominant frequency in Hz.
        """
        if len(steer_trace) < 64:
            return 0.0

        # Remove DC component (mean)
        signal = steer_trace - np.mean(steer_trace)

        # Apply window function to reduce spectral leakage
        window = np.hanning(len(signal))
        windowed = signal * window

        # FFT
        fft_vals = np.fft.rfft(windowed)
        fft_magnitude = np.abs(fft_vals)
        fft_freqs = np.fft.rfftfreq(len(windowed), d=1.0 / sample_rate_hz)

        # Ignore DC (index 0) and very low frequencies
        min_freq_idx = max(1, int(0.5 / (sample_rate_hz / len(windowed))))
        if min_freq_idx >= len(fft_magnitude):
            return 0.0

        # Find the dominant frequency
        dominant_idx = min_freq_idx + np.argmax(fft_magnitude[min_freq_idx:])
        dominant_freq = float(fft_freqs[dominant_idx])

        return dominant_freq

    def _classify_by_frequency(self, freq_hz: float) -> Optional[str]:
        """
        Secondary classification using dominant frequency.

        Frequency fingerprints:
            Keyboard:   > 8 Hz (rapid binary switching)
            Controller: 3-8 Hz (thumbstick oscillation)
            Wheel:      < 3 Hz (smooth steering arcs)
        """
        if freq_hz > 8.0:
            return HARDWARE_KEYBOARD
        elif freq_hz > 3.0:
            return HARDWARE_CONTROLLER
        elif freq_hz > 0.5:
            return HARDWARE_WHEEL_ENTRY  # Generic wheel, can't distinguish tier
        return None  # Inconclusive
"""
    Module constants.py reference:

    HARDWARE_VARIANCE_THRESHOLDS = {
        keyboard:       (0.0,   0.005),
        controller:     (0.005, 0.08),
        wheel_entry:    (0.08,  0.20),
        wheel_mid:      (0.20,  0.45),
        wheel_pro:      (0.45,  1.0),
    }

    BRAKE_THRESHOLD_SCALING = {
        keyboard:     35m,
        controller:   25m,
        wheel_entry:  15m,
        wheel_mid:    10m,
        wheel_pro:    8m,
    }
"""

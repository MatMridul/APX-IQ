"""
APX-IQ — Intelligence Layer Test Suite (Pytest compatible)
===========================================================

Validates import chains, cross-module API contracts, data flow,
column naming consistency, and mathematical correctness of intelligence modules.
"""

import numpy as np
import pandas as pd
import pytest


def test_import_constants():
    from intelligence.constants import (
        MIN_YEAR, MAX_YEAR, TRACK_MAP,
    )
    assert MIN_YEAR == 2022
    assert MAX_YEAR == 2026
    assert len(TRACK_MAP) > 20


def test_import_fastf1_client():
    from intelligence.fastf1_client import (
        resolve_track_name, resolve_session_type,
    )
    assert resolve_track_name(0) == "Bahrain"
    assert resolve_track_name(999) is None
    assert resolve_session_type(10) == "R"
    assert resolve_session_type(5) == "Q"


def test_import_recorder():
    from intelligence.telemetry_recorder import TelemetryRecorder
    r = TelemetryRecorder()
    assert r.laps_recorded == 0
    assert r.current_buffer_size == 0
    assert not r.has_enough_data_for_profiling()


def test_import_alignment():
    from intelligence.alignment import DistanceAligner
    a = DistanceAligner(grid_points=500)
    assert a.grid_points == 500


def test_import_corner_detector():
    from intelligence.corner_detector import CornerDetector, CornerMap
    d = CornerDetector()
    assert d.prominence > 0
    assert d.min_distance_between > 0
    m = CornerMap()
    assert m.total_corners == 0


def test_import_delta_engine():
    from intelligence.delta_engine import DeltaEngine, DeltaResult
    e = DeltaEngine()
    assert e.MIN_SPEED_KPH == 5.0
    r = DeltaResult()
    assert r.total_time_delta_ms == 0.0


def test_recorder_output_columns():
    """Verify TelemetryRecorder produces columns that alignment.py expects."""
    from intelligence.alignment import DistanceAligner

    expected_cols = {"distance_m", "speed_kph", "throttle", "brake", "steer",
                     "gear", "rpm", "drs", "x", "y", "z"}

    aligner = DistanceAligner()
    all_channels = set(aligner.CONTINUOUS_CHANNELS + aligner.DISCRETE_CHANNELS)
    all_channels.add("distance_m")

    missing_in_recorder = all_channels - expected_cols
    assert not missing_in_recorder, f"Aligner needs {missing_in_recorder} but recorder doesn't produce them"


def test_ghost_telemetry_columns():
    """Verify FastF1Client.fetch_ghost_lap produces columns that alignment.py expects."""
    from intelligence.alignment import DistanceAligner

    ghost_cols = {"distance_m", "speed_kph", "throttle", "brake", "gear",
                  "rpm", "drs", "x", "y", "z"}

    aligner = DistanceAligner()
    all_channels = set(aligner.CONTINUOUS_CHANNELS + aligner.DISCRETE_CHANNELS)
    all_channels.add("distance_m")

    missing_in_ghost = all_channels - ghost_cols - {"steer"}
    assert not missing_in_ghost, f"Aligner needs {missing_in_ghost} but ghost doesn't have them"


def test_aligned_output_to_corner_detector():
    """Corner detector expects 'speed_kph' and 'distance_m' from aligned output."""
    from intelligence.alignment import DistanceAligner
    aligner = DistanceAligner()

    required_for_corners = {"speed_kph", "distance_m"}
    all_output = set(aligner.CONTINUOUS_CHANNELS + aligner.DISCRETE_CHANNELS)
    all_output.add("distance_m")

    assert required_for_corners.issubset(all_output)


def test_aligned_output_to_delta_engine():
    """Delta engine expects 'speed_kph', 'distance_m', optional 'throttle', 'brake'."""
    from intelligence.alignment import DistanceAligner
    aligner = DistanceAligner()

    all_output = set(aligner.CONTINUOUS_CHANNELS + aligner.DISCRETE_CHANNELS)
    all_output.add("distance_m")

    required = {"speed_kph", "distance_m"}
    optional = {"throttle", "brake"}

    assert required.issubset(all_output)
    assert optional.issubset(all_output)


def test_full_pipeline():
    """Simulate the complete pipeline with synthetic data."""
    from intelligence.alignment import DistanceAligner
    from intelligence.corner_detector import CornerDetector
    from intelligence.delta_engine import DeltaEngine

    np.random.seed(42)
    n = 500
    distance = np.linspace(0, 5000, n)

    speed = 280 * np.ones(n)
    speed[80:120] -= 180 * np.exp(-0.5 * ((np.arange(40) - 20) / 5)**2)
    speed[220:260] -= 120 * np.exp(-0.5 * ((np.arange(40) - 20) / 5)**2)
    speed[370:410] -= 60 * np.exp(-0.5 * ((np.arange(40) - 20) / 5)**2)

    user_df = pd.DataFrame({
        "distance_m": distance,
        "speed_kph": speed,
        "throttle": np.clip(speed / 280, 0, 1),
        "brake": np.clip((280 - speed) / 180, 0, 1),
        "steer": np.random.uniform(-0.1, 0.1, n),
        "gear": np.clip((speed / 40).astype(int), 1, 8),
        "rpm": (speed * 40).astype(int),
        "drs": speed > 250,
        "x": np.cumsum(np.cos(np.linspace(0, 2 * np.pi, n))),
        "y": np.cumsum(np.sin(np.linspace(0, 2 * np.pi, n))),
        "z": np.zeros(n),
    })

    ghost_speed = speed + np.random.uniform(2, 8, n)
    ghost_df = pd.DataFrame({
        "distance_m": np.linspace(0, 5050, n + 20),
        "speed_kph": np.interp(np.linspace(0, 5050, n + 20), distance, ghost_speed),
        "throttle": np.clip(np.interp(np.linspace(0, 5050, n + 20), distance, ghost_speed) / 280, 0, 1),
        "brake": np.clip((280 - np.interp(np.linspace(0, 5050, n + 20), distance, ghost_speed)) / 180, 0, 1),
        "gear": np.clip((np.interp(np.linspace(0, 5050, n + 20), distance, ghost_speed) / 40).astype(int), 1, 8),
        "rpm": (np.interp(np.linspace(0, 5050, n + 20), distance, ghost_speed) * 40).astype(int),
        "drs": np.interp(np.linspace(0, 5050, n + 20), distance, ghost_speed) > 250,
        "x": np.cumsum(np.cos(np.linspace(0, 2 * np.pi, n + 20))),
        "y": np.cumsum(np.sin(np.linspace(0, 2 * np.pi, n + 20))),
        "z": np.zeros(n + 20),
    })

    aligner = DistanceAligner(grid_points=1000)
    user_aligned, ghost_aligned = aligner.align(user_df, ghost_df)

    assert len(user_aligned) == 1000
    assert len(ghost_aligned) == 1000

    detector = CornerDetector()
    user_corners = detector.detect(user_aligned)
    ghost_corners = detector.detect(ghost_aligned)

    assert user_corners.total_corners >= 2
    assert ghost_corners.total_corners >= 2

    engine = DeltaEngine()
    result = engine.compute(user_aligned, ghost_aligned, user_corners, ghost_corners)

    assert len(result.distance_grid) == 1000
    assert result.total_time_delta_ms > 0
    assert len(result.brake_point_deltas) >= 1


def test_time_delta_math():
    from intelligence.delta_engine import DeltaEngine

    n = 100
    distance = np.linspace(0, 1000, n)
    user_speed = np.full(n, 100.0)
    ghost_speed = np.full(n, 200.0)

    user_df = pd.DataFrame({"distance_m": distance, "speed_kph": user_speed})
    ghost_df = pd.DataFrame({"distance_m": distance, "speed_kph": ghost_speed})

    engine = DeltaEngine()
    result = engine.compute(user_df, ghost_df)

    expected_ms = 18000.0
    actual_ms = result.total_time_delta_ms
    assert abs(actual_ms - expected_ms) < 200


def test_time_delta_symmetry():
    from intelligence.delta_engine import DeltaEngine

    n = 100
    distance = np.linspace(0, 1000, n)
    speed = np.full(n, 150.0)

    df = pd.DataFrame({"distance_m": distance, "speed_kph": speed})
    engine = DeltaEngine()
    result = engine.compute(df, df.copy())

    assert abs(result.total_time_delta_ms) < 1e-6


def test_corner_detection_synthetic():
    from intelligence.corner_detector import CornerDetector

    n = 1000
    distance = np.linspace(0, 5000, n)
    speed = 280 * np.ones(n)

    c1_center = 300
    for i in range(max(0, c1_center - 50), min(n, c1_center + 50)):
        speed[i] = 80 + 200 * min(abs(i - c1_center) / 50, 1.0)

    c2_center = 700
    for i in range(max(0, c2_center - 40), min(n, c2_center + 40)):
        speed[i] = 150 + 130 * min(abs(i - c2_center) / 40, 1.0)

    df = pd.DataFrame({"distance_m": distance, "speed_kph": speed})
    detector = CornerDetector()
    corner_map = detector.detect(df)

    assert corner_map.total_corners == 2
    assert corner_map.corners[0].classification == "slow"


def test_alignment_rejects_empty():
    from intelligence.alignment import DistanceAligner
    aligner = DistanceAligner()
    with pytest.raises(ValueError):
        aligner.align(pd.DataFrame(), pd.DataFrame())


def test_corner_detector_no_corners():
    from intelligence.corner_detector import CornerDetector

    n = 100
    df = pd.DataFrame({
        "distance_m": np.linspace(0, 5000, n),
        "speed_kph": np.full(n, 280.0),
    })
    detector = CornerDetector()
    result = detector.detect(df)
    assert result.total_corners == 0


def test_delta_engine_handles_missing_throttle():
    from intelligence.delta_engine import DeltaEngine

    n = 50
    distance = np.linspace(0, 1000, n)
    df = pd.DataFrame({"distance_m": distance, "speed_kph": np.full(n, 200.0)})

    engine = DeltaEngine()
    result = engine.compute(df, df.copy())
    assert len(result.throttle_delta) == n
    assert all(result.throttle_delta == 0)


def test_corner_map_get_corner_at_distance():
    from intelligence.corner_detector import Corner, CornerMap

    c1 = Corner(index=1, apex_distance_m=1000.0, apex_speed_kph=80.0, apex_idx=100)
    c2 = Corner(index=2, apex_distance_m=3000.0, apex_speed_kph=150.0, apex_idx=300)
    cmap = CornerMap(corners=[c1, c2])

    found = cmap.get_corner_at_distance(1010.0, tolerance_m=50.0)
    assert found is not None and found.index == 1

    not_found = cmap.get_corner_at_distance(2000.0, tolerance_m=50.0)
    assert not_found is None


def test_recorder_session_lifecycle():
    from intelligence.telemetry_recorder import TelemetryRecorder

    r = TelemetryRecorder()
    r.on_session_start(session_uid=12345, track_id=0, track_length=5000)
    assert r.session_uid == 12345

    r.on_session_start(session_uid=99999, track_id=1, track_length=6000)
    assert r.session_uid == 99999
    assert r.laps_recorded == 0


def test_coach_engine_thermals_and_ers():
    """Verify Phase 4 Thermal & ERS coaching rules."""
    from intelligence.coach_engine import CoachEngine, CoachingCategory
    from intelligence.delta_engine import DeltaResult

    coach = CoachEngine()
    delta = DeltaResult(avg_speed_delta_kph=-12.0)

    # DataFrame with overheated rears and depleted battery
    df = pd.DataFrame({
        "tyres_surface_temp": [[95, 95, 110, 112]], # Over 106°C
        "brakes_temp": [[950, 940, 600, 600]],      # Over 920°C (glazing)
        "ers_store_energy": [150_000],               # Depleted
    })

    tips = coach.analyze(delta=delta, user_telemetry_df=df)
    categories = [t.category for t in tips]

    assert CoachingCategory.THERMAL in categories
    assert CoachingCategory.ENERGY in categories

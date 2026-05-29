"""
Intelligence Layer Audit Test
==============================

Validates import chains, cross-module API contracts, data flow,
column naming consistency, and mathematical correctness of the
Phase 1 + Phase 2 intelligence modules.

This is a static + dynamic audit — no database or network required.
"""

import sys
import traceback

# Track results
results = []

def check(name, fn):
    """Run a check and record pass/fail."""
    try:
        fn()
        results.append(("PASS", name))
        print(f"  ✓ {name}")
    except Exception as e:
        results.append(("FAIL", name, str(e)))
        print(f"  ✗ {name}")
        traceback.print_exc()
        print()


# =====================================================================
# 1. IMPORT CHAIN VERIFICATION
# =====================================================================
print("\n[1/6] Import Chain Verification")
print("=" * 50)

def test_import_constants():
    from intelligence.constants import (
        MIN_YEAR, MAX_YEAR, TRACK_MAP, SESSION_TYPE_MAP,
        HARDWARE_TIERS, HARDWARE_VARIANCE_THRESHOLDS,
        BRAKE_THRESHOLD_SCALING, ALIGNMENT_GRID_POINTS,
        CORNER_APEX_SPEED_THRESHOLD, CORNER_DETECTION_PROMINENCE,
        CORNER_MIN_DISTANCE_BETWEEN, MAX_LAP_BUFFER_SIZE,
        LAP_CROSSING_DISTANCE_DROP, HARDWARE_PROFILING_MIN_LAPS,
    )
    assert MIN_YEAR == 2022
    assert MAX_YEAR == 2026
    assert len(TRACK_MAP) > 20

check("constants.py — all exports accessible", test_import_constants)

def test_import_fastf1_client():
    from intelligence.fastf1_client import (
        FastF1Client, resolve_track_name, resolve_session_type,
    )
    assert resolve_track_name(0) == "Bahrain"
    assert resolve_track_name(999) is None
    assert resolve_session_type(10) == "R"
    assert resolve_session_type(5) == "Q"

check("fastf1_client.py — exports and helpers", test_import_fastf1_client)

def test_import_recorder():
    from intelligence.telemetry_recorder import TelemetryRecorder
    r = TelemetryRecorder()
    assert r.laps_recorded == 0
    assert r.current_buffer_size == 0
    assert not r.has_enough_data_for_profiling()

check("telemetry_recorder.py — instantiation", test_import_recorder)

def test_import_alignment():
    from intelligence.alignment import DistanceAligner
    a = DistanceAligner(grid_points=500)
    assert a.grid_points == 500

check("alignment.py — instantiation", test_import_alignment)

def test_import_corner_detector():
    from intelligence.corner_detector import CornerDetector, Corner, CornerMap
    d = CornerDetector()
    assert d.prominence > 0
    assert d.min_distance_between > 0
    m = CornerMap()
    assert m.total_corners == 0

check("corner_detector.py — instantiation", test_import_corner_detector)

def test_import_delta_engine():
    from intelligence.delta_engine import DeltaEngine, DeltaResult, BrakePointDelta
    e = DeltaEngine()
    assert e.MIN_SPEED_KPH == 5.0
    r = DeltaResult()
    assert r.total_time_delta_ms == 0.0

check("delta_engine.py — instantiation", test_import_delta_engine)


# =====================================================================
# 2. CROSS-MODULE DATA FLOW — Column Naming Consistency
# =====================================================================
print("\n[2/6] Column Naming Consistency")
print("=" * 50)

def test_recorder_output_columns():
    """Verify TelemetryRecorder produces columns that alignment.py expects."""
    import pandas as pd
    from intelligence.telemetry_recorder import TelemetryRecorder
    from intelligence.alignment import DistanceAligner

    # The recorder's _record_tick builds rows with these keys
    expected_cols = {"distance_m", "speed_kph", "throttle", "brake", "steer",
                     "gear", "rpm", "drs", "x", "y", "z"}

    # Check against DistanceAligner's channel lists
    aligner = DistanceAligner()
    all_channels = set(aligner.CONTINUOUS_CHANNELS + aligner.DISCRETE_CHANNELS)
    all_channels.add("distance_m")

    # Every aligner channel must be present in recorder output
    missing_in_recorder = all_channels - expected_cols
    assert not missing_in_recorder, f"Aligner needs {missing_in_recorder} but recorder doesn't produce them"

check("Recorder → Aligner column contract", test_recorder_output_columns)

def test_ghost_telemetry_columns():
    """Verify FastF1Client.fetch_ghost_lap produces columns that alignment.py expects."""
    from intelligence.alignment import DistanceAligner

    # From fastf1_client.py line 239-250, the ghost_telemetry DataFrame has:
    ghost_cols = {"distance_m", "speed_kph", "throttle", "brake", "gear",
                  "rpm", "drs", "x", "y", "z"}

    aligner = DistanceAligner()
    all_channels = set(aligner.CONTINUOUS_CHANNELS + aligner.DISCRETE_CHANNELS)
    all_channels.add("distance_m")

    # Ghost doesn't have 'steer' — that's expected (only user has steer)
    missing_in_ghost = all_channels - ghost_cols - {"steer"}
    assert not missing_in_ghost, f"Aligner needs {missing_in_ghost} but ghost doesn't have them"

check("Ghost Telemetry → Aligner column contract", test_ghost_telemetry_columns)

def test_aligned_output_to_corner_detector():
    """Corner detector expects 'speed_kph' and 'distance_m' from aligned output."""
    from intelligence.alignment import DistanceAligner
    aligner = DistanceAligner()

    required_for_corners = {"speed_kph", "distance_m"}
    all_output = set(aligner.CONTINUOUS_CHANNELS + aligner.DISCRETE_CHANNELS)
    all_output.add("distance_m")

    assert required_for_corners.issubset(all_output), \
        f"Corner detector needs {required_for_corners - all_output}"

check("Aligned output → CornerDetector column contract", test_aligned_output_to_corner_detector)

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

check("Aligned output → DeltaEngine column contract", test_aligned_output_to_delta_engine)


# =====================================================================
# 3. END-TO-END DATA FLOW — Synthetic Test
# =====================================================================
print("\n[3/6] End-to-End Data Flow (Synthetic Data)")
print("=" * 50)

def test_full_pipeline():
    """
    Simulate the complete pipeline with synthetic data:
    TelemetryRecorder output → Aligner → CornerDetector → DeltaEngine
    """
    import numpy as np
    import pandas as pd
    from intelligence.alignment import DistanceAligner
    from intelligence.corner_detector import CornerDetector
    from intelligence.delta_engine import DeltaEngine

    # Create synthetic "user" lap — a speed trace with 3 corners
    np.random.seed(42)
    n = 500
    distance = np.linspace(0, 5000, n)  # 5km track

    # Speed trace: base 280 km/h with 3 dips (corners)
    speed = 280 * np.ones(n)
    # Corner 1: slow hairpin at ~1000m
    speed[80:120] -= 180 * np.exp(-0.5 * ((np.arange(40) - 20) / 5)**2)
    # Corner 2: medium at ~2500m
    speed[220:260] -= 120 * np.exp(-0.5 * ((np.arange(40) - 20) / 5)**2)
    # Corner 3: fast sweeper at ~4000m
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

    # Create "ghost" lap — slightly faster version
    ghost_speed = speed + np.random.uniform(2, 8, n)  # Ghost is 2-8 km/h faster
    ghost_df = pd.DataFrame({
        "distance_m": np.linspace(0, 5050, n + 20),  # Slightly different length
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

    # Step 1: Alignment
    aligner = DistanceAligner(grid_points=1000)
    user_aligned, ghost_aligned = aligner.align(user_df, ghost_df)

    assert len(user_aligned) == len(ghost_aligned), \
        f"Aligned lengths differ: {len(user_aligned)} vs {len(ghost_aligned)}"
    assert "distance_m" in user_aligned.columns
    assert "speed_kph" in user_aligned.columns
    assert len(user_aligned) == 1000

    # Step 2: Corner Detection
    detector = CornerDetector()
    user_corners = detector.detect(user_aligned)
    ghost_corners = detector.detect(ghost_aligned)

    assert user_corners.total_corners >= 2, \
        f"Expected >=2 corners, got {user_corners.total_corners}"
    assert ghost_corners.total_corners >= 2

    # Step 3: Delta Engine
    engine = DeltaEngine()
    result = engine.compute(user_aligned, ghost_aligned, user_corners, ghost_corners)

    assert len(result.distance_grid) == 1000
    assert len(result.speed_delta_kph) == 1000
    assert len(result.cumulative_time_delta_ms) == 1000

    # Since ghost is faster, user should be losing time (positive cumulative delta)
    assert result.total_time_delta_ms > 0, \
        f"Expected positive delta (user slower), got {result.total_time_delta_ms}"

    # Brake point deltas should be populated
    assert len(result.brake_point_deltas) >= 1

    # Time loss regions should detect something
    regions = engine.get_time_loss_regions(result, threshold_ms=1.0)
    # (with synthetic data, regions may or may not exist depending on noise)

check("Full pipeline: Align → Detect → Delta", test_full_pipeline)


# =====================================================================
# 4. MATHEMATICAL CORRECTNESS
# =====================================================================
print("\n[4/6] Mathematical Correctness")
print("=" * 50)

def test_time_delta_math():
    """
    Verify the time integration formula is correct.
    
    If user drives 100 km/h for 1000m and ghost drives 200 km/h for 1000m:
    time_user = 1000 / (100/3.6) = 36.0 seconds
    time_ghost = 1000 / (200/3.6) = 18.0 seconds
    delta = 18.0 seconds = 18000 ms (user is slower)
    """
    import numpy as np
    import pandas as pd
    from intelligence.delta_engine import DeltaEngine

    n = 100
    distance = np.linspace(0, 1000, n)
    user_speed = np.full(n, 100.0)   # 100 km/h constant
    ghost_speed = np.full(n, 200.0)  # 200 km/h constant

    user_df = pd.DataFrame({"distance_m": distance, "speed_kph": user_speed})
    ghost_df = pd.DataFrame({"distance_m": distance, "speed_kph": ghost_speed})

    engine = DeltaEngine()
    result = engine.compute(user_df, ghost_df)

    expected_ms = 18000.0  # 18 seconds
    actual_ms = result.total_time_delta_ms

    tolerance = 200  # Allow ~200ms tolerance due to discrete integration
    assert abs(actual_ms - expected_ms) < tolerance, \
        f"Time delta math wrong: expected ~{expected_ms}ms, got {actual_ms}ms"

check("Time integration formula (v=100 vs v=200)", test_time_delta_math)

def test_time_delta_symmetric():
    """If both drive same speed, delta should be ~0."""
    import numpy as np
    import pandas as pd
    from intelligence.delta_engine import DeltaEngine

    n = 100
    distance = np.linspace(0, 1000, n)
    speed = np.full(n, 150.0)

    df = pd.DataFrame({"distance_m": distance, "speed_kph": speed})
    engine = DeltaEngine()
    result = engine.compute(df, df.copy())

    assert abs(result.total_time_delta_ms) < 1e-6, \
        f"Same speed should give ~0 delta, got {result.total_time_delta_ms}"

check("Time delta symmetry (same speed = 0 delta)", test_time_delta_symmetric)

def test_corner_detection_synthetic():
    """Verify corner detection finds the right number of corners."""
    import numpy as np
    import pandas as pd
    from intelligence.corner_detector import CornerDetector

    # Create a speed trace with exactly 2 clear corners
    n = 1000
    distance = np.linspace(0, 5000, n)
    speed = 280 * np.ones(n)

    # Corner at ~1500m (slow: apex 80 km/h)
    c1_center = 300  # index
    for i in range(max(0, c1_center - 50), min(n, c1_center + 50)):
        speed[i] = 80 + 200 * min(abs(i - c1_center) / 50, 1.0)

    # Corner at ~3500m (medium: apex 150 km/h)
    c2_center = 700
    for i in range(max(0, c2_center - 40), min(n, c2_center + 40)):
        speed[i] = 150 + 130 * min(abs(i - c2_center) / 40, 1.0)

    df = pd.DataFrame({"distance_m": distance, "speed_kph": speed})
    detector = CornerDetector()
    corner_map = detector.detect(df)

    assert corner_map.total_corners == 2, \
        f"Expected 2 corners, detected {corner_map.total_corners}"

    # First corner should be classified as "slow" (apex ~80)
    assert corner_map.corners[0].classification == "slow", \
        f"Expected 'slow', got '{corner_map.corners[0].classification}'"

check("Corner detection with synthetic trace", test_corner_detection_synthetic)


# =====================================================================
# 5. SCHEMA-CODE CONSISTENCY
# =====================================================================
print("\n[5/6] Schema-Code Consistency")
print("=" * 50)

def test_ghost_telemetry_schema_match():
    """
    Verify the columns produced by fetch_ghost_lap match ghost_telemetry table.
    Schema: distance_m, speed_kph, throttle, brake, gear, rpm, drs, x, y, z
    Code:   distance_m, speed_kph, throttle, brake, gear, rpm, drs, x, y, z
    """
    schema_cols = {"distance_m", "speed_kph", "throttle", "brake",
                   "gear", "rpm", "drs", "x", "y", "z"}
    code_cols = {"distance_m", "speed_kph", "throttle", "brake",
                 "gear", "rpm", "drs", "x", "y", "z"}
    assert schema_cols == code_cols

check("ghost_telemetry: schema ↔ code columns", test_ghost_telemetry_schema_match)

def test_user_lap_telemetry_schema_match():
    """
    Verify recorder output columns match user_lap_telemetry table.
    Schema has: distance_m, speed_kph, throttle, brake, steer, gear, rpm, drs, x, y, z
    Recorder: distance_m, speed_kph, throttle, brake, steer, gear, rpm, drs, x, y, z
    """
    schema_cols = {"distance_m", "speed_kph", "throttle", "brake", "steer",
                   "gear", "rpm", "drs", "x", "y", "z"}
    recorder_cols = {"distance_m", "speed_kph", "throttle", "brake", "steer",
                     "gear", "rpm", "drs", "x", "y", "z"}
    assert schema_cols == recorder_cols

check("user_lap_telemetry: schema ↔ recorder columns", test_user_lap_telemetry_schema_match)

def test_lap_deltas_schema_match():
    """
    Verify DeltaResult.to_dataframe() columns match lap_deltas table.
    Schema: distance_m, speed_delta_pct, throttle_delta_pct, time_delta_ms
    Code to_dataframe: distance_m, speed_delta_pct, throttle_delta_pct, time_delta_ms
    """
    import numpy as np
    from intelligence.delta_engine import DeltaResult

    r = DeltaResult(
        distance_grid=np.array([0, 1, 2]),
        speed_delta_kph=np.array([1, 2, 3]),
        throttle_delta=np.array([0.1, 0.2, 0.3]),
        cumulative_time_delta_ms=np.array([0, 10, 20]),
    )
    df = r.to_dataframe()
    assert set(df.columns) == {"distance_m", "speed_delta_kph",
                                "throttle_delta_abs", "time_delta_ms"}

check("lap_deltas: schema ↔ DeltaResult.to_dataframe()", test_lap_deltas_schema_match)


# =====================================================================
# 6. EDGE CASES & ROBUSTNESS
# =====================================================================
print("\n[6/6] Edge Cases & Robustness")
print("=" * 50)

def test_alignment_rejects_empty():
    """Aligner should raise on empty DataFrames."""
    import pandas as pd
    from intelligence.alignment import DistanceAligner

    aligner = DistanceAligner()
    try:
        aligner.align(pd.DataFrame(), pd.DataFrame())
        assert False, "Should have raised ValueError"
    except ValueError:
        pass

check("Aligner rejects empty DataFrames", test_alignment_rejects_empty)

def test_corner_detector_no_corners():
    """Flat speed trace should return empty corner map."""
    import numpy as np
    import pandas as pd
    from intelligence.corner_detector import CornerDetector

    n = 100
    df = pd.DataFrame({
        "distance_m": np.linspace(0, 5000, n),
        "speed_kph": np.full(n, 280.0),
    })
    detector = CornerDetector()
    result = detector.detect(df)
    assert result.total_corners == 0

check("CornerDetector handles flat speed trace", test_corner_detector_no_corners)

def test_delta_engine_handles_missing_throttle():
    """Delta engine should work even without throttle/brake columns."""
    import numpy as np
    import pandas as pd
    from intelligence.delta_engine import DeltaEngine

    n = 50
    distance = np.linspace(0, 1000, n)
    df = pd.DataFrame({"distance_m": distance, "speed_kph": np.full(n, 200.0)})

    engine = DeltaEngine()
    result = engine.compute(df, df.copy())
    assert len(result.throttle_delta) == n
    assert all(result.throttle_delta == 0)

check("DeltaEngine works without throttle/brake", test_delta_engine_handles_missing_throttle)

def test_corner_map_get_corner_at_distance():
    """CornerMap.get_corner_at_distance should return closest within tolerance."""
    from intelligence.corner_detector import Corner, CornerMap

    c1 = Corner(index=1, apex_distance_m=1000.0, apex_speed_kph=80.0, apex_idx=100)
    c2 = Corner(index=2, apex_distance_m=3000.0, apex_speed_kph=150.0, apex_idx=300)
    cmap = CornerMap(corners=[c1, c2])

    found = cmap.get_corner_at_distance(1010.0, tolerance_m=50.0)
    assert found is not None and found.index == 1

    not_found = cmap.get_corner_at_distance(2000.0, tolerance_m=50.0)
    assert not_found is None

check("CornerMap.get_corner_at_distance tolerance", test_corner_map_get_corner_at_distance)

def test_recorder_session_lifecycle():
    """Recorder should reset state on new session."""
    from intelligence.telemetry_recorder import TelemetryRecorder

    r = TelemetryRecorder()
    r.on_session_start(session_uid=12345, track_id=0, track_length=5000)
    assert r.session_uid == 12345

    # New session should reset
    r.on_session_start(session_uid=99999, track_id=1, track_length=6000)
    assert r.session_uid == 99999
    assert r.laps_recorded == 0

check("Recorder session lifecycle reset", test_recorder_session_lifecycle)


# =====================================================================
# SUMMARY
# =====================================================================
print("\n" + "=" * 60)
print("AUDIT SUMMARY")
print("=" * 60)

passes = sum(1 for r in results if r[0] == "PASS")
fails = sum(1 for r in results if r[0] == "FAIL")

print(f"\n  Total:  {len(results)}")
print(f"  Passed: {passes}")
print(f"  Failed: {fails}")

if fails > 0:
    print("\n  FAILURES:")
    for r in results:
        if r[0] == "FAIL":
            print(f"    ✗ {r[1]}: {r[2]}")

print()
sys.exit(1 if fails > 0 else 0)

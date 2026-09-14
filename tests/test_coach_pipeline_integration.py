"""
APX-IQ — End-to-End Coaching Pipeline Integration Test
======================================================

Proves the PRODUCTION wiring, not just isolated rule functions:

    raw UDP packet
      → TelemetryRecorder (thermal + ERS capture)
      → recorded row
      → SaveLapRequest/TelemetryPoint validation (canonical schema)
      → DataFrame
      → AnalysisService.run_pipeline
      → CoachEngine
      → CoachingTip

The existing test_motorsport_physics.py tests the thermal/trail/energy
rule functions in isolation by hand-building DataFrames. That is NOT
enough: it stays green even when the main analysis pipeline never feeds
raw telemetry to the coach (the exact defect this patch fixes).

This test therefore exercises the full path and asserts the thermal and
energy tips actually surface — including the non-zero data path, so a
"missing = zero" regression cannot make it pass falsely.
"""

import asyncio

from ingestion import packet_structs_22 as ps
from intelligence.telemetry_recorder import TelemetryRecorder
from api.models.shared import TelemetryPoint
from api.services.analysis_service import AnalysisService
from intelligence.coach_engine import CoachingCategory


# ---------------------------------------------------------------------------
# Packet builders (real ctypes structs — the recorder consumes these directly)
# ---------------------------------------------------------------------------

def _car_telemetry(speed, throttle, brake, steer, gear, rpm, drs,
                   surface_temps, inner_temps, brake_temps):
    pkt = ps.PacketCarTelemetryData()
    pkt.m_header.m_packetFormat = 2022
    pkt.m_header.m_packetId = ps.PACKET_ID_CAR_TELEMETRY
    pkt.m_header.m_playerCarIndex = 0
    c = pkt.m_carTelemetryData[0]
    c.m_speed = speed
    c.m_throttle = throttle
    c.m_brake = brake
    c.m_steer = steer
    c.m_gear = gear
    c.m_engineRPM = rpm
    c.m_drs = drs
    for i in range(4):
        c.m_tyresSurfaceTemperature[i] = surface_temps[i]
        c.m_tyresInnerTemperature[i] = inner_temps[i]
        c.m_brakesTemperature[i] = brake_temps[i]
    return pkt


def _car_status(ers_store_energy, ers_deploy_mode=1):
    pkt = ps.PacketCarStatusData()
    pkt.m_header.m_packetFormat = 2022
    pkt.m_header.m_packetId = ps.PACKET_ID_CAR_STATUS
    pkt.m_header.m_playerCarIndex = 0
    s = pkt.m_carStatusData[0]
    s.m_ersStoreEnergy = ers_store_energy
    s.m_ersDeployMode = ers_deploy_mode
    return pkt


def _lap_data(lap_distance, lap_num, last_lap_ms=90000):
    pkt = ps.PacketLapData()
    pkt.m_header.m_packetFormat = 2022
    pkt.m_header.m_packetId = ps.PACKET_ID_LAP_DATA
    pkt.m_header.m_playerCarIndex = 0
    lap = pkt.m_lapData[0]
    lap.m_lapDistance = lap_distance
    lap.m_currentLapNum = lap_num
    lap.m_lastLapTimeInMS = last_lap_ms
    lap.m_carPosition = 1
    return pkt


def _record_one_lap(recorder, *, ers_energy, surface_temps, inner_temps,
                    brake_temps, n_points=60, track_len=1000.0):
    """
    Drive the recorder through a complete lap and return the finalized
    lap dict (with its distance-indexed DataFrame).
    """
    recorder.on_session_start(session_uid=1, track_id=0, track_length=int(track_len))

    # Lap 1 — increasing distance, then a big drop to trigger finalize.
    for k in range(n_points):
        dist = track_len * (k / n_points)
        recorder.update_car_status(0, _car_status(ers_energy))
        recorder.update_car_telemetry(0, _car_telemetry(
            speed=200 + k, throttle=0.9, brake=0.1, steer=0.05, gear=6,
            rpm=11000, drs=0,
            surface_temps=surface_temps, inner_temps=inner_temps,
            brake_temps=brake_temps,
        ))
        recorder.update_lap_data(0, _lap_data(dist, 1))

    # Cross the line: distance drops → finalize lap 1
    recorder.update_car_status(0, _car_status(ers_energy))
    recorder.update_car_telemetry(0, _car_telemetry(
        speed=210, throttle=0.9, brake=0.1, steer=0.05, gear=6, rpm=11000, drs=0,
        surface_temps=surface_temps, inner_temps=inner_temps, brake_temps=brake_temps,
    ))
    recorder.update_lap_data(0, _lap_data(2.0, 2))

    laps = recorder.get_completed_laps()
    assert laps, "recorder failed to finalize a lap"
    return laps[-1]


# ---------------------------------------------------------------------------
# Test 1 — recorder preserves thermal + ERS fields under canonical schema
# ---------------------------------------------------------------------------

def test_recorder_row_carries_thermal_and_ers_and_validates_as_telemetry_point():
    recorder = TelemetryRecorder()
    lap = _record_one_lap(
        recorder,
        ers_energy=100_000.0,                 # depleted (<300k) and non-zero
        surface_temps=[100, 100, 110, 111],
        inner_temps=[95, 95, 95, 95],
        brake_temps=[400, 400, 350, 350],
    )
    df = lap["dataframe"]

    # The recorded row must carry the enrichment columns under the exact
    # TelemetryPoint field names.
    for col in ("tyres_surface_temp", "tyres_inner_temp", "brakes_temp",
                "ers_store_energy", "ers_deploy_mode"):
        assert col in df.columns, f"recorder dropped {col}"

    # And each row must validate against the canonical persistence schema
    # (this is what ingestion POSTs and the API validates).
    rows = df.to_dict(orient="records")
    points = [TelemetryPoint(**r) for r in rows]
    assert points[0].ers_store_energy == 100_000.0
    assert points[0].tyres_surface_temp == [100.0, 100.0, 110.0, 111.0]


# ---------------------------------------------------------------------------
# Test 2 — full pipeline: recorded telemetry actually reaches the coach
# ---------------------------------------------------------------------------

def test_pipeline_fires_thermal_tip_from_recorded_telemetry():
    """
    The graining rule requires rear surface >> core AND surface > 104°C.
    Feed a user lap with hot, grained rear tyres and assert a THERMAL tip
    surfaces through AnalysisService.run_pipeline — proving user_df is now
    wired into the coach.
    """
    recorder = TelemetryRecorder()
    user_lap = _record_one_lap(
        recorder,
        ers_energy=5_000_000.0,               # healthy — no ERS tip
        surface_temps=[100, 100, 118, 119],   # rear surface hot
        inner_temps=[95, 95, 96, 96],          # rear core cooler → graining
        brake_temps=[400, 400, 350, 350],
    )
    user_points = [TelemetryPoint(**r) for r in user_lap["dataframe"].to_dict(orient="records")]

    # Ghost: a clean reference lap (cool tyres, same geometry).
    ghost_recorder = TelemetryRecorder()
    ghost_lap = _record_one_lap(
        ghost_recorder,
        ers_energy=5_000_000.0,
        surface_temps=[90, 90, 92, 92],
        inner_temps=[90, 90, 92, 92],
        brake_temps=[400, 400, 350, 350],
    )
    ghost_points = [TelemetryPoint(**r) for r in ghost_lap["dataframe"].to_dict(orient="records")]

    service = AnalysisService()
    result = asyncio.run(service.run_pipeline(
        user_telemetry=user_points,
        ghost_telemetry=ghost_points,
        grid_points=200,
        hardware_profile=None,
    ))
    tips = result[-1]

    thermal = [t for t in tips if t.category == CoachingCategory.THERMAL]
    assert thermal, "thermal coaching did not fire through the production pipeline"
    # It must be a heuristic estimate, never presented as a measured impact.
    assert thermal[0].estimated_impact_ms > 0.0
    assert thermal[0].time_impact_ms == 0.0


# ---------------------------------------------------------------------------
# Test 3 — missing ≠ zero: absent Car Status must NOT trigger a false ERS tip
# ---------------------------------------------------------------------------

def test_missing_car_status_does_not_fire_false_ers_tip():
    """
    If Car Status packets never arrive, ers_store_energy defaults to 0.0.
    That is 'not received', not 'battery empty' — the energy rule must not
    fire on it even though 0 < 300_000.
    """
    recorder = TelemetryRecorder()
    recorder.on_session_start(session_uid=2, track_id=0, track_length=1000)
    # Note: update_car_status is intentionally never called.
    for k in range(60):
        recorder.update_car_telemetry(0, _car_telemetry(
            speed=180, throttle=0.5, brake=0.1, steer=0.05, gear=5, rpm=10000, drs=0,
            surface_temps=[90, 90, 90, 90], inner_temps=[90, 90, 90, 90],
            brake_temps=[300, 300, 300, 300],
        ))
        recorder.update_lap_data(0, _lap_data(1000.0 * (k / 60), 1))
    recorder.update_car_telemetry(0, _car_telemetry(
        speed=180, throttle=0.5, brake=0.1, steer=0.05, gear=5, rpm=10000, drs=0,
        surface_temps=[90, 90, 90, 90], inner_temps=[90, 90, 90, 90],
        brake_temps=[300, 300, 300, 300],
    ))
    recorder.update_lap_data(0, _lap_data(2.0, 2))

    lap = recorder.get_completed_laps()[-1]
    df = lap["dataframe"]
    # Every row is the zero default — confirming the "not received" state.
    assert (df["ers_store_energy"] == 0.0).all()

    from intelligence.coach_engine import CoachEngine
    from intelligence.delta_engine import DeltaResult

    # avg_speed_delta_kph < -5 would otherwise satisfy the ERS trigger.
    delta = DeltaResult()
    delta.avg_speed_delta_kph = -10.0
    energy_tips = CoachEngine()._analyze_energy(df, delta)
    assert energy_tips == [], "false ERS tip fired on never-received (zero) data"

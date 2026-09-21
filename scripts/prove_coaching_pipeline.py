"""
APX-IQ — Coaching Pipeline Live-Equivalent Proof (in-process)
=============================================================

Purpose
-------
Prove `a87d280` (the coaching data-integrity fix) with REAL packet
structures driven through the REAL production objects, printing evidence
at the persistence boundary — WITHOUT needing the EA F1 game running.

It exercises the exact path the live UDP flow uses:

    real ctypes packet structs (F1 25)
      -> TelemetryRecorder.update_car_telemetry / update_car_status / update_lap_data
      -> finalized lap DataFrame
      -> api.models.shared.TelemetryPoint  (the persistence schema)
      -> AnalysisService.run_pipeline
      -> CoachEngine
      -> THERMAL / TRAIL_BRAKE / ENERGY coaching tips

The only leg this does NOT cover vs a full live run is the UDP socket
transport itself (scripts/simulate_udp_proof.py covers that separately).

Run:
    python scripts/prove_coaching_pipeline.py

Exit code 0 = evidence captured and at least one enrichment-driven tip
fired from non-zero recorded telemetry.
"""

import asyncio
import sys
from pathlib import Path

# Windows consoles default to cp1252; the app logs unicode (e.g. "->" arrows
# and degree signs) via structlog. Force UTF-8 so this proof harness reflects
# the pipeline result rather than dying on a console-encoding error.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ingestion import packet_structs_25 as ps  # noqa: E402
from intelligence.telemetry_recorder import TelemetryRecorder  # noqa: E402
from api.models.shared import TelemetryPoint  # noqa: E402
from api.services.analysis_service import AnalysisService  # noqa: E402
from intelligence.coach_engine import CoachingCategory  # noqa: E402


def _header(packet_id):
    h = ps.PacketHeader()
    h.m_packetFormat = 2025
    h.m_packetId = packet_id
    h.m_sessionUID = 123456789
    h.m_playerCarIndex = 0
    return h


def _telemetry(speed, throttle, brake, steer, surf, inner, brakes):
    pkt = ps.PacketCarTelemetryData()
    pkt.m_header = _header(ps.PACKET_ID_CAR_TELEMETRY)
    c = pkt.m_carTelemetryData[0]
    c.m_speed = int(speed)
    c.m_throttle = throttle
    c.m_brake = brake
    c.m_steer = steer
    c.m_gear = 6
    c.m_engineRPM = 11000
    c.m_drs = 0
    for i in range(4):
        c.m_tyresSurfaceTemperature[i] = surf[i]
        c.m_tyresInnerTemperature[i] = inner[i]
        c.m_brakesTemperature[i] = brakes[i]
    return pkt


def _status(ers_joules, deploy_mode=2):
    pkt = ps.PacketCarStatusData()
    pkt.m_header = _header(ps.PACKET_ID_CAR_STATUS)
    s = pkt.m_carStatusData[0]
    s.m_ersStoreEnergy = float(ers_joules)
    s.m_ersDeployMode = deploy_mode
    return pkt


def _lap(distance_m, lap_num, last_ms=85000):
    pkt = ps.PacketLapData()
    pkt.m_header = _header(ps.PACKET_ID_LAP_DATA)
    lap = pkt.m_lapData[0]
    lap.m_lapDistance = distance_m
    lap.m_currentLapNum = lap_num
    lap.m_lastLapTimeInMS = last_ms
    lap.m_position = 1
    return pkt


def record_representative_lap(recorder, *, track_len=3000.0, points=180):
    """
    Drive a physically-plausible lap. The final third has hot, grained
    rear tyres (surface >> core, >104C) so the THERMAL rule should fire,
    and a low ERS reserve so the ENERGY rule can fire.
    """
    recorder.on_session_start(session_uid=123456789, track_id=1, track_length=int(track_len))
    for k in range(points):
        frac = k / points
        dist = track_len * frac
        # Rear tyres heat up and grain in the last third of the lap.
        if frac > 0.66:
            surf = [98, 98, 116, 118]     # rear surface hot
            inner = [96, 96, 99, 100]      # rear core cooler -> graining delta
            ers = 90_000.0                 # depleted reserve (<300k)
        else:
            surf = [95, 95, 100, 101]
            inner = [95, 95, 99, 99]
            ers = 3_500_000.0
        brakes = [420, 420, 360, 360]
        speed = 120 + 180 * abs(0.5 - frac) * 2   # dip mid-lap (a corner)
        recorder.update_car_status(0, _status(ers))
        recorder.update_car_telemetry(
            0, _telemetry(speed, throttle=0.8, brake=0.15, steer=0.1,
                          surf=surf, inner=inner, brakes=brakes))
        recorder.update_lap_data(0, _lap(dist, 1))
    # Cross the line -> finalize.
    recorder.update_car_status(0, _status(90_000.0))
    recorder.update_car_telemetry(
        0, _telemetry(150, 0.8, 0.15, 0.1, [98, 98, 116, 118], [96, 96, 99, 100], [420, 420, 360, 360]))
    recorder.update_lap_data(0, _lap(2.0, 2))
    laps = recorder.get_completed_laps()
    assert laps, "recorder did not finalize a lap"
    return laps[-1]


def main():
    print("=" * 68)
    print("APX-IQ COACHING PIPELINE — LIVE-EQUIVALENT PROOF")
    print("=" * 68)

    # 1. USER lap — hot grained rears + depleted ERS.
    recorder = TelemetryRecorder()
    user_lap = record_representative_lap(recorder)
    df = user_lap["dataframe"]

    print("\n[1] PERSISTENCE-BOUNDARY EVIDENCE — last recorded row")
    print("-" * 68)
    last = df.iloc[-1]
    for col in ("distance_m", "speed_kph", "throttle", "brake", "steer",
                "tyres_surface_temp", "tyres_inner_temp", "brakes_temp",
                "ers_store_energy", "ers_deploy_mode"):
        print(f"    {col:22} = {last[col]}")

    # Assert the repaired fields carry REAL non-zero gameplay values.
    assert any(t > 0 for t in last["tyres_surface_temp"]), "surface temps all zero"
    assert any(t > 0 for t in last["tyres_inner_temp"]), "inner temps all zero"
    assert any(t > 0 for t in last["brakes_temp"]), "brake temps all zero"
    assert last["ers_store_energy"] > 0, "ERS energy zero"
    print("\n    [OK] tyre surface / inner / brake temps and ERS all NON-ZERO")

    # 2. Persistence schema round-trip (what ingestion POSTs, API validates).
    rows = df.to_dict(orient="records")
    user_points = [TelemetryPoint(**r) for r in rows]
    print(f"\n[2] SCHEMA — {len(user_points)} rows validated as TelemetryPoint [OK]")

    # 3. Ghost = clean reference lap (cool tyres, healthy ERS).
    ghost_rec = TelemetryRecorder()
    ghost_rec.on_session_start(session_uid=999, track_id=1, track_length=3000)
    for k in range(180):
        ghost_rec.update_car_status(0, _status(3_500_000.0))
        ghost_rec.update_car_telemetry(
            0, _telemetry(120 + 180 * abs(0.5 - k / 180) * 2, 0.85, 0.1, 0.08,
                          [92, 92, 94, 94], [92, 92, 94, 94], [400, 400, 350, 350]))
        ghost_rec.update_lap_data(0, _lap(3000.0 * (k / 180), 1))
    ghost_rec.update_car_telemetry(
        0, _telemetry(150, 0.85, 0.1, 0.08, [92, 92, 94, 94], [92, 92, 94, 94], [400, 400, 350, 350]))
    ghost_rec.update_lap_data(0, _lap(2.0, 2))
    ghost_points = [TelemetryPoint(**r) for r in ghost_rec.get_completed_laps()[-1]["dataframe"].to_dict(orient="records")]

    # 4. Full analysis pipeline.
    service = AnalysisService()
    result = asyncio.run(service.run_pipeline(
        user_telemetry=user_points, ghost_telemetry=ghost_points,
        grid_points=400, hardware_profile=None))
    tips = result[-1]

    print("\n[3] COACHING TIPS PRODUCED BY THE PIPELINE")
    print("-" * 68)
    for t in tips:
        impact = (f"measured={t.time_impact_ms:.0f}ms"
                  if t.time_impact_ms else f"est={t.estimated_impact_ms:.0f}ms")
        print(f"    [{t.severity.value:8}] {t.category.value:12} {impact}")
        print(f"               {t.message}")

    enrichment_cats = {CoachingCategory.THERMAL, CoachingCategory.TRAIL_BRAKE,
                       CoachingCategory.ENERGY}
    fired = [t for t in tips if t.category in enrichment_cats]

    print("\n" + "=" * 68)
    if fired:
        print(f"PROOF PASSED [OK] — {len(fired)} enrichment tip(s) fired from live-shaped "
              "non-zero telemetry.")
        print("The repaired thermal/ERS data path reaches the coach end-to-end.")
        return 0
    print("PROOF FAILED [FAIL] — no thermal/trail/energy tip fired despite non-zero data.")
    return 1


if __name__ == "__main__":
    sys.exit(main())

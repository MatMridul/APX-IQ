"""
APX IQ — Ingestion Server
==========================

Receives raw F1 game telemetry over UDP, decodes packets, and:
  - Streams live telemetry to the UI over Socket.IO
  - Records per-lap data in TelemetryRecorder
  - POSTs completed laps to the API for persistence

Architecture:
    TelemetryListener (UDP) → asyncio.Queue → packet_processor()
    TelemetryRecorder watches lap boundaries → finalized DataFrames
    lap_saver_worker() polls recorder → POST /telemetry/lap/save

Configuration:
    API_BASE_URL   — URL of the FastAPI server (default: http://localhost:8000)
    INGESTION_PORT — Socket.IO server port (default: 3001)
    UDP_PORT       — Game UDP listen port (default: 20777)
"""

import asyncio
import sys
from pathlib import Path

# Project root on sys.path for absolute imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
import socketio
from aiohttp import web

from core.config import settings
from core.logging_config import configure_logging, get_logger
from ingestion.adapters import get_adapter_for_format
from ingestion.listener import TelemetryListener
from ingestion.decoder import PacketDecoder
from intelligence.telemetry_recorder import TelemetryRecorder

# Structured logging configured once at process startup
configure_logging()
log = get_logger("APXIQ.Ingestion")

# ─── Socket.IO server ─────────────────────────────────────────────────────────

sio = socketio.AsyncServer(async_mode="aiohttp", cors_allowed_origins="*")
app = web.Application()
sio.attach(app)

# ─── Intelligence state ───────────────────────────────────────────────────────

recorder = TelemetryRecorder()
_saved_lap_keys: set = set()           # (session_uid, lap_num) acknowledged
_last_session_bridged: int | None = None


# ─── Lap persistence ──────────────────────────────────────────────────────────

async def save_lap_to_api(lap_info: dict) -> bool:
    """
    POST a completed lap DataFrame to the API for persistence.

    Uses settings.api_base_url to avoid hardcoding the API address.
    Returns True only on confirmed success so the saver worker can
    retry failures instead of skipping laps forever.  (audit B4)
    """
    telemetry = lap_info["dataframe"].to_dict(orient="records")
    payload = {
        "session_uid":      lap_info["session_uid"],
        "lap_number":       lap_info["lap_num"],
        "lap_time_ms":      lap_info.get("lap_time_ms"),
        # Field names MUST match api.models.shared.SaveLapRequest, or Pydantic
        # silently drops them and every persisted lap gets NULL sectors.
        "sector_1_time_ms": lap_info.get("sector_1_ms"),
        "sector_2_time_ms": lap_info.get("sector_2_ms"),
        "telemetry":        telemetry,
        "is_valid":         lap_info.get("is_valid", True),
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.api_base_url}/telemetry/lap/save",
                json=payload,
            )
        if response.status_code == 200:
            result = response.json()
            log.info(
                "lap_saved_to_api",
                lap_id=result["lap_id"],
                lap_number=lap_info["lap_num"],
                lap_time_ms=payload["lap_time_ms"],
                points=lap_info["data_points"],
            )
            return True
        log.error(
            "lap_save_failed",
            status=response.status_code,
            body=response.text[:200],
        )
    except Exception as exc:
        log.error("lap_save_error", lap_number=lap_info["lap_num"], error=str(exc))
    return False


async def bridge_session_to_api(session_uid: int, track_id: int, track_length: int) -> None:
    """Forward session context to the API (feeds SessionManager + sessions table)."""
    global _last_session_bridged
    if session_uid == _last_session_bridged:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{settings.api_base_url}/telemetry/session/start",
                json={
                    "session_uid":  int(session_uid),
                    "track_id":     int(track_id),
                    "track_length": int(track_length),
                },
            )
        _last_session_bridged = session_uid
        log.info("session_bridged_to_api", session_uid=int(session_uid))
    except Exception as exc:
        log.warning("session_bridge_failed", error=str(exc))


# ─── Socket.IO events ─────────────────────────────────────────────────────────

@sio.event
async def connect(sid, environ):
    log.info("client_connected", sid=sid)
    game_version = app.get("game_version")
    if game_version:
        version_str = f"F1 {str(game_version)[-2:]}"
        await sio.emit("game_version", {"version": version_str}, room=sid)


@sio.event
async def disconnect(sid):
    log.info("client_disconnected", sid=sid)


# ─── Packet processor ─────────────────────────────────────────────────────────

async def packet_processor(listener: TelemetryListener) -> None:
    """
    Consumes decoded packets from the UDP queue and:
      - Feeds data into the TelemetryRecorder
      - Emits live events to connected Socket.IO clients

    Rate-limits Socket.IO telemetry emissions to ~60Hz to avoid
    overwhelming the UI with more events than it can render.
    """
    log.info("packet_processor_started")

    last_telemetry_emit = 0.0
    last_version_emit   = 0.0
    _TELEMETRY_INTERVAL = 0.016   # ~16ms → 60Hz
    _VERSION_INTERVAL   = 5.0     # re-emit game version every 5s
    packet_count        = 0

    loop = asyncio.get_running_loop()

    while True:
        try:
            # Drain up to 100 queued packets per iteration to catch up
            # after short bursts without stalling the event loop.
            for _ in range(100):
                if listener.queue.empty():
                    break
                try:
                    data, _addr = listener.queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

                packet = PacketDecoder.decode(data)
                if not packet:
                    continue

                packet_count += 1
                now = loop.time()

                header         = packet.m_header if hasattr(packet, "m_header") else packet
                packet_format  = header.m_packetFormat
                packet_type_id = header.m_packetId
                player_idx     = header.m_playerCarIndex

                # ── Game version broadcast (throttled) ────────────────────────
                adapter = get_adapter_for_format(packet_format)
                if not settings.stealth_mode and (now - last_version_emit > _VERSION_INTERVAL):
                    game_version = adapter.label
                    if app.get("game_version") != packet_format:
                        app["game_version"] = packet_format
                        log.info("game_version_detected", version=game_version)
                    await sio.emit("game_version", {"version": game_version})
                    last_version_emit = now

                # ── Motion (ID=0) ─────────────────────────────────────────────
                if packet_type_id == 0:
                    recorder.update_motion(player_idx, packet)
                    if not settings.stealth_mode:
                        motion_dict = adapter.extract_motion(packet, player_idx)
                        await sio.emit("motion_update", {
                            "worldPosX": motion_dict["world_pos_x"],
                            "worldPosY": motion_dict["world_pos_y"],
                            "worldPosZ": motion_dict["world_pos_z"],
                            "worldVelX": motion_dict["world_vel_x"],
                            "worldVelY": motion_dict["world_vel_y"],
                            "worldVelZ": motion_dict["world_vel_z"],
                            "gForceLat": motion_dict["g_force_lat"],
                            "gForceLon": motion_dict["g_force_lon"],
                            "gForceVert": motion_dict["g_force_vert"],
                            "yaw": motion_dict["yaw"],
                            "pitch": motion_dict["pitch"],
                            "roll": motion_dict["roll"],
                        })

                # ── Participants (ID=4) ───────────────────────────────────────
                elif packet_type_id == 4:
                    if not settings.stealth_mode:
                        part_dict = adapter.extract_participants(packet)
                        await sio.emit("participants_update", {
                            "numActiveCars": part_dict.get("num_active_cars", 0),
                            "participants": [
                                {
                                    "carIndex": p.get("car_index", i),
                                    "aiControlled": p.get("ai_controlled", False),
                                    "driverId": p.get("driver_id", 0),
                                    "networkId": p.get("network_id", 0),
                                    "teamId": p.get("team_id", 0),
                                    "myTeam": p.get("my_team", False),
                                    "raceNumber": p.get("race_number", 0),
                                    "nationality": p.get("nationality", 0),
                                    "name": p.get("name", ""),
                                    "yourTelemetry": p.get("your_telemetry", 0),
                                }
                                for i, p in enumerate(part_dict.get("participants", []))
                            ],
                        })

                # ── Car Telemetry (ID=6) ──────────────────────────────────────
                elif packet_type_id == 6:
                    recorder.update_car_telemetry(player_idx, packet)

                    if not settings.stealth_mode and (now - last_telemetry_emit >= _TELEMETRY_INTERVAL):
                        telem_dict = adapter.extract_telemetry(packet, player_idx)
                        await sio.emit("telemetry_update", {
                            "speed": telem_dict["speed_kph"],
                            "throttle": telem_dict["throttle"],
                            "brake": telem_dict["brake"],
                            "steer": telem_dict["steer"],
                            "gear": telem_dict["gear"],
                            "rpm": telem_dict["rpm"],
                            "drs": telem_dict["drs"],
                            "tyreTemps": telem_dict["tyre_surface_temps"],
                            "tyreInnerTemps": telem_dict["tyre_inner_temps"],
                            "brakesTemp": telem_dict["brakes_temperature"],
                            "tyresPressure": telem_dict["tyres_pressure"],
                            "clutch": telem_dict["clutch"],
                            "engineTemp": telem_dict["engine_temperature"],
                            "revLightsPercent": telem_dict["rev_lights_percent"],
                            "surfaceType": telem_dict["surface_type"],
                            "suggestedGear": telem_dict["suggested_gear"],
                        })
                        last_telemetry_emit = now

                # ── Lap Data (ID=2) ───────────────────────────────────────────
                elif packet_type_id == 2:
                    if not settings.stealth_mode:
                        lap_dict = adapter.extract_lap_data(packet, player_idx)
                        await sio.emit("lap_update", {
                            "currentLapTime": lap_dict["current_lap_time_ms"],
                            "lastLapTime": lap_dict["last_lap_time_ms"],
                            "sector1": lap_dict["sector_1_ms"],
                            "sector2": lap_dict["sector_2_ms"],
                            "position": lap_dict["position"],
                            "lap": lap_dict["lap_number"],
                            "totalDistance": lap_dict["total_distance_m"],
                            "lapDistance": lap_dict["lap_distance_m"],
                            "deltaToFrontMs": lap_dict["delta_to_front_ms"],
                            "deltaToLeaderMs": lap_dict["delta_to_leader_ms"],
                            "safetyCarDelta": lap_dict["safety_car_delta"],
                            "sector": lap_dict["sector"],
                            "pitStatus": lap_dict["pit_status"],
                            "numPitStops": lap_dict["num_pit_stops"],
                        })
                    recorder.update_lap_data(player_idx, packet)

                # ── Car Status (ID=7) ─────────────────────────────────────────
                elif packet_type_id == 7:
                    recorder.update_car_status(player_idx, packet)
                    if not settings.stealth_mode:
                        status_dict = adapter.extract_car_status(packet, player_idx)
                        await sio.emit("car_status_update", {
                            "fuelInTank": status_dict["fuel_in_tank"],
                            "fuelRemainingLaps": status_dict["fuel_remaining_laps"],
                            "maxRPM": status_dict["max_rpm"],
                            "drsAllowed": status_dict["drs_allowed"],
                            "tyreCompound": status_dict["tyre_compound"],
                            "ersStoreEnergy": status_dict["ers_store_energy"],
                            "frontBrakeBias": status_dict["front_brake_bias"],
                            "fuelMix": status_dict["fuel_mix"],
                            "ersDeployMode": status_dict["ers_deploy_mode"],
                            "ersHarvestedMGUK": status_dict["ers_harvested_mguk"],
                            "ersHarvestedMGUH": status_dict["ers_harvested_mguh"],
                            "ersDeployedThisLap": status_dict["ers_deployed_this_lap"],
                            "tyresAgeLaps": status_dict["tyres_age_laps"],
                            "visualTyreCompound": status_dict["visual_tyre_compound"],
                            "vehicleFiaFlags": status_dict["vehicle_fia_flags"],
                            "drsActivationDist": status_dict["drs_activation_distance"],
                        })

                # ── Session (ID=1) ────────────────────────────────────────────
                elif packet_type_id == 1:
                    session_dict = adapter.extract_session(packet)
                    session_uid = getattr(header, "m_sessionUID", 0)
                    if not settings.stealth_mode:
                        await sio.emit("session_update", {
                            "trackId": session_dict["track_id"],
                            "weather": session_dict["weather"],
                            "totalLaps": session_dict["total_laps"],
                            "trackLength": session_dict["track_length"],
                            "uid": str(session_uid),
                            "trackTemp": session_dict["track_temperature"],
                            "airTemp": session_dict["air_temperature"],
                            "sessionType": session_dict["session_type"],
                            "sessionTimeLeft": session_dict["session_time_left"],
                            "sessionDuration": session_dict["session_duration"],
                            "safetyCarStatus": session_dict["safety_car_status"],
                            "networkGame": session_dict["network_game"],
                            "formula": session_dict["formula"],
                            "aiDifficulty": session_dict["ai_difficulty"],
                            "weatherForecastSamples": session_dict.get("weather_forecast_samples", []),
                        })
                    recorder.on_session_start(
                        session_uid=session_uid,
                        track_id=session_dict["track_id"],
                        track_length=session_dict["track_length"],
                    )
                    await bridge_session_to_api(
                        session_uid,
                        session_dict["track_id"],
                        session_dict["track_length"],
                    )

                # ── Car Damage (ID=10) ────────────────────────────────────────
                elif packet_type_id == 10:
                    if not settings.stealth_mode:
                        damage_dict = adapter.extract_car_damage(packet, player_idx)
                        await sio.emit("car_damage_update", {
                            "tyresWear": damage_dict["tyres_wear"],
                            "tyresDamage": damage_dict["tyres_damage"],
                            "brakesDamage": damage_dict["brakes_damage"],
                            "tyreBlisters": damage_dict["tyre_blisters"],
                            "frontLeftWingDamage": damage_dict["front_left_wing_damage"],
                            "frontRightWingDamage": damage_dict["front_right_wing_damage"],
                            "rearWingDamage": damage_dict["rear_wing_damage"],
                            "floorDamage": damage_dict["floor_damage"],
                            "diffuserDamage": damage_dict["diffuser_damage"],
                            "sidepodDamage": damage_dict["sidepod_damage"],
                            "drsFault": damage_dict["drs_fault"],
                            "ersFault": damage_dict["ers_fault"],
                            "gearboxDamage": damage_dict["gearbox_damage"],
                            "engineDamage": damage_dict["engine_damage"],
                            "engineMGUHWear": damage_dict["engine_mguh_wear"],
                            "engineESWear": damage_dict["engine_es_wear"],
                            "engineCEWear": damage_dict["engine_ce_wear"],
                            "engineICEWear": damage_dict["engine_ice_wear"],
                            "engineMGUKWear": damage_dict["engine_mguk_wear"],
                            "engineTCWear": damage_dict["engine_tc_wear"],
                            "engineBlown": damage_dict["engine_blown"],
                            "engineSeized": damage_dict["engine_seized"],
                        })

                # ── Session History (ID=11) ───────────────────────────────────
                elif packet_type_id == 11:
                    if not settings.stealth_mode:
                        history_dict = adapter.extract_session_history(packet)
                        # Only emit if it relates to player car or general session
                        await sio.emit("session_history_update", {
                            "carIdx": history_dict["car_idx"],
                            "numLaps": history_dict["num_laps"],
                            "numTyreStints": history_dict["num_tyre_stints"],
                            "bestLapTimeLapNum": history_dict["best_lap_time_lap_num"],
                            "bestSector1LapNum": history_dict["best_sector1_lap_num"],
                            "bestSector2LapNum": history_dict["best_sector2_lap_num"],
                            "bestSector3LapNum": history_dict["best_sector3_lap_num"],
                            "laps": [
                                {
                                    "lapNum": l["lap_num"],
                                    "lapTimeMs": l["lap_time_ms"],
                                    "sector1Ms": l["sector_1_ms"],
                                    "sector2Ms": l["sector_2_ms"],
                                    "sector3Ms": l["sector_3_ms"],
                                    "isValid": l["is_valid"],
                                }
                                for l in history_dict["laps"]
                            ],
                            "stints": [
                                {
                                    "stintIdx": s["stint_idx"],
                                    "endLap": s["end_lap"],
                                    "actualCompound": s["actual_compound"],
                                    "visualCompound": s["visual_compound"],
                                }
                                for s in history_dict["stints"]
                            ],
                        })

                # ── Car Setups (ID=5) ─────────────────────────────────────────
                elif packet_type_id == 5:
                    if not settings.stealth_mode:
                        setup_dict = adapter.extract_car_setups(packet, player_idx)
                        await sio.emit("car_setups_update", {
                            "frontWing": setup_dict["front_wing"],
                            "rearWing": setup_dict["rear_wing"],
                            "onThrottle": setup_dict["on_throttle"],
                            "offThrottle": setup_dict["off_throttle"],
                            "frontCamber": setup_dict["front_camber"],
                            "rearCamber": setup_dict["rear_camber"],
                            "frontToe": setup_dict["front_toe"],
                            "rearToe": setup_dict["rear_toe"],
                            "frontSuspension": setup_dict["front_suspension"],
                            "rearSuspension": setup_dict["rear_suspension"],
                            "frontAntiRollBar": setup_dict["front_anti_roll_bar"],
                            "rearAntiRollBar": setup_dict["rear_anti_roll_bar"],
                            "frontSuspensionHeight": setup_dict["front_suspension_height"],
                            "rearSuspensionHeight": setup_dict["rear_suspension_height"],
                            "brakePressure": setup_dict["brake_pressure"],
                            "brakeBias": setup_dict["brake_bias"],
                            "engineBraking": setup_dict["engine_braking"],
                            "rearLeftTyrePressure": setup_dict["rear_left_tyre_pressure"],
                            "rearRightTyrePressure": setup_dict["rear_right_tyre_pressure"],
                            "frontLeftTyrePressure": setup_dict["front_left_tyre_pressure"],
                            "frontRightTyrePressure": setup_dict["front_right_tyre_pressure"],
                            "ballast": setup_dict["ballast"],
                            "fuelLoad": setup_dict["fuel_load"],
                            "nextFrontWingValue": setup_dict["next_front_wing_value"],
                        })

                # ── Motion Ex (ID=13) ─────────────────────────────────────────
                elif packet_type_id == 13:
                    if not settings.stealth_mode:
                        motion_ex_dict = adapter.extract_motion_ex(packet)
                        await sio.emit("motion_ex_update", {
                            "suspensionPosition": motion_ex_dict["suspension_position"],
                            "suspensionVelocity": motion_ex_dict["suspension_velocity"],
                            "suspensionAcceleration": motion_ex_dict["suspension_acceleration"],
                            "wheelSpeed": motion_ex_dict["wheel_speed"],
                            "wheelSlipRatio": motion_ex_dict["wheel_slip_ratio"],
                            "wheelSlipAngle": motion_ex_dict["wheel_slip_angle"],
                            "wheelLatForce": motion_ex_dict["wheel_lat_force"],
                            "wheelLongForce": motion_ex_dict["wheel_long_force"],
                            "heightOfCOGAboveGround": motion_ex_dict["height_of_cog_above_ground"],
                            "localVelocityX": motion_ex_dict["local_velocity_x"],
                            "localVelocityY": motion_ex_dict["local_velocity_y"],
                            "localVelocityZ": motion_ex_dict["local_velocity_z"],
                            "angularVelocityX": motion_ex_dict["angular_velocity_x"],
                            "angularVelocityY": motion_ex_dict["angular_velocity_y"],
                            "angularVelocityZ": motion_ex_dict["angular_velocity_z"],
                            "angularAccelerationX": motion_ex_dict["angular_acceleration_x"],
                            "angularAccelerationY": motion_ex_dict["angular_acceleration_y"],
                            "angularAccelerationZ": motion_ex_dict["angular_acceleration_z"],
                            "frontWheelsAngle": motion_ex_dict["front_wheels_angle"],
                            "wheelVertForce": motion_ex_dict.get("wheel_vert_force", [0.0, 0.0, 0.0, 0.0]),
                            "frontAeroHeight": motion_ex_dict.get("front_aero_height", 0.0),
                            "rearAeroHeight": motion_ex_dict.get("rear_aero_height", 0.0),
                            "frontRollAngle": motion_ex_dict.get("front_roll_angle", 0.0),
                            "rearRollAngle": motion_ex_dict.get("rear_roll_angle", 0.0),
                            "chassisYaw": motion_ex_dict.get("chassis_yaw", 0.0),
                            "chassisPitch": motion_ex_dict.get("chassis_pitch", 0.0),
                            "wheelCamber": motion_ex_dict.get("wheel_camber", [0.0, 0.0, 0.0, 0.0]),
                        })

                # ── Event (ID=3) ──────────────────────────────────────────────
                elif packet_type_id == 3:
                    if not settings.stealth_mode:
                        event_dict = adapter.extract_event(packet)
                        await sio.emit("event_update", {
                            "eventCode": event_dict.get("event_code", ""),
                            "eventType": event_dict.get("event_type", "UNKNOWN"),
                            "vehicleIdx": event_dict.get("vehicle_idx"),
                            "lapTime": event_dict.get("lap_time"),
                            "penaltyType": event_dict.get("penalty_type"),
                            "infringementType": event_dict.get("infringement_type"),
                            "otherVehicleIdx": event_dict.get("other_vehicle_idx"),
                            "time": event_dict.get("time"),
                            "lapNum": event_dict.get("lap_num"),
                            "placesGained": event_dict.get("places_gained"),
                            "speed": event_dict.get("speed"),
                            "isOverallFastest": event_dict.get("is_overall_fastest"),
                            "isDriverFastest": event_dict.get("is_driver_fastest"),
                            "fastestVehicleIdx": event_dict.get("fastest_vehicle_idx"),
                            "fastestSpeed": event_dict.get("fastest_speed"),
                            "numLights": event_dict.get("num_lights"),
                            "frameIdentifier": event_dict.get("frame_identifier"),
                            "sessionTime": event_dict.get("session_time"),
                            "buttonStatus": event_dict.get("button_status"),
                            "overtakingVehicleIdx": event_dict.get("overtaking_vehicle_idx"),
                            "beingOvertakenVehicleIdx": event_dict.get("being_overtaken_vehicle_idx"),
                            "reason": event_dict.get("reason"),
                        })

                # ── Tyre Sets (ID=12) ─────────────────────────────────────────
                elif packet_type_id == 12:
                    if not settings.stealth_mode:
                        tyre_sets_dict = adapter.extract_tyre_sets(packet)
                        await sio.emit("tyre_sets_update", {
                            "carIdx": tyre_sets_dict["car_idx"],
                            "fittedIdx": tyre_sets_dict["fitted_idx"],
                            "tyreSets": [
                                {
                                    "actualCompound": s["actual_compound"],
                                    "visualCompound": s["visual_compound"],
                                    "wear": s["wear"],
                                    "available": s["available"],
                                    "recommendedSession": s["recommended_session"],
                                    "lifeSpan": s["life_span"],
                                    "usableLife": s["usable_life"],
                                    "lapDeltaTimeMs": s["lap_delta_time_ms"],
                                    "fitted": s["fitted"],
                                }
                                for s in tyre_sets_dict["tyre_sets"]
                            ],
                        })

                # ── Time Trial (ID=14) ────────────────────────────────────────
                elif packet_type_id == 14:
                    if not settings.stealth_mode:
                        tt_dict = adapter.extract_time_trial(packet)
                        await sio.emit("time_trial_update", {
                            "playerSessionBest": {
                                "carIdx": tt_dict["player_session_best"].get("car_idx"),
                                "teamId": tt_dict["player_session_best"].get("team_id"),
                                "lapTimeMs": tt_dict["player_session_best"].get("lap_time_ms"),
                                "sector1Ms": tt_dict["player_session_best"].get("sector_1_ms"),
                                "sector2Ms": tt_dict["player_session_best"].get("sector_2_ms"),
                                "sector3Ms": tt_dict["player_session_best"].get("sector_3_ms"),
                                "isValid": tt_dict["player_session_best"].get("is_valid"),
                            } if tt_dict.get("player_session_best") else None,
                            "personalBest": {
                                "carIdx": tt_dict["personal_best"].get("car_idx"),
                                "teamId": tt_dict["personal_best"].get("team_id"),
                                "lapTimeMs": tt_dict["personal_best"].get("lap_time_ms"),
                                "sector1Ms": tt_dict["personal_best"].get("sector_1_ms"),
                                "sector2Ms": tt_dict["personal_best"].get("sector_2_ms"),
                                "sector3Ms": tt_dict["personal_best"].get("sector_3_ms"),
                                "isValid": tt_dict["personal_best"].get("is_valid"),
                            } if tt_dict.get("personal_best") else None,
                            "rival": {
                                "carIdx": tt_dict["rival"].get("car_idx"),
                                "teamId": tt_dict["rival"].get("team_id"),
                                "lapTimeMs": tt_dict["rival"].get("lap_time_ms"),
                                "sector1Ms": tt_dict["rival"].get("sector_1_ms"),
                                "sector2Ms": tt_dict["rival"].get("sector_2_ms"),
                                "sector3Ms": tt_dict["rival"].get("sector_3_ms"),
                                "isValid": tt_dict["rival"].get("is_valid"),
                            } if tt_dict.get("rival") else None,
                        })

                # ── Final Classification (ID=8) ───────────────────────────────
                elif packet_type_id == 8:
                    if not settings.stealth_mode:
                        fc_dict = adapter.extract_final_classification(packet)
                        await sio.emit("final_classification_update", {
                            "numCars": fc_dict.get("num_cars", 0),
                            "classification": fc_dict.get("classification", []),
                        })


        except Exception as exc:
            log.error("packet_processor_error", error=str(exc))

        # Yield control briefly to allow other async tasks to run
        await asyncio.sleep(0.01)


# ─── Lap saver worker ─────────────────────────────────────────────────────────

async def lap_saver_worker() -> None:
    """
    Polls TelemetryRecorder for newly completed laps and ships them
    to the API. Runs every 2 seconds.

    Durability (audit B4): only laps confirmed saved by the API are
    marked done — failed POSTs are retried on the next poll instead of
    being skipped forever. Acknowledged laps are pruned from the
    recorder so long sessions stay memory-bounded.
    """
    log.info("lap_saver_worker_started")

    global _saved_lap_keys
    while True:
        try:
            completed_laps = recorder.get_completed_laps()
            for lap_info in completed_laps:
                key = (lap_info.get("session_uid"), lap_info["lap_num"])
                if key in _saved_lap_keys:
                    continue

                if await save_lap_to_api(lap_info):
                    _saved_lap_keys.add(key)

            if _saved_lap_keys:
                # Drop acknowledged laps from the recorder's memory, then
                # forget keys that no longer correspond to buffered laps.
                recorder.prune_saved(_saved_lap_keys)
                live_keys = {
                    (lap.get("session_uid"), lap["lap_num"])
                    for lap in recorder.get_completed_laps()
                }
                _saved_lap_keys &= live_keys
        except Exception as exc:
            log.error("lap_saver_error", error=str(exc))

        await asyncio.sleep(2.0)


# ─── aiohttp lifecycle ────────────────────────────────────────────────────────

async def start_background_tasks(application: web.Application) -> None:
    listener = TelemetryListener(host="0.0.0.0", port=settings.udp_port)
    await listener.start()
    application["listener"]  = listener
    application["processor"] = asyncio.create_task(packet_processor(listener))
    application["lap_saver"] = asyncio.create_task(lap_saver_worker())
    log.info("ingestion_started", udp_port=settings.udp_port, sio_port=settings.ingestion_port)


async def cleanup_background_tasks(application: web.Application) -> None:
    recorder.on_session_end()
    application["listener"].stop()
    for task_key in ("processor", "lap_saver"):
        task = application.get(task_key)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    log.info("ingestion_stopped")


app.on_startup.append(start_background_tasks)
app.on_cleanup.append(cleanup_background_tasks)

if __name__ == "__main__":
    web.run_app(app, port=settings.ingestion_port)

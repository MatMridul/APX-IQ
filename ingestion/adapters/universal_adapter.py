"""
APX IQ — Universal Packet Adapter
==================================

Translates decoded packets for any F1 version (2020–2025) into
canonical dictionaries and CanonicalTelemetryFrame instances.
"""

from typing import Dict, Any
from ingestion.adapters.base_adapter import BasePacketAdapter


class UniversalPacketAdapter(BasePacketAdapter):
    """
    Handles translation for F1 2020, 2021, 2022, 2023, 2024, and 2025 packets.
    """

    TYRE_COMPOUND_NAMES = {
        16: "C5 (Soft)",
        17: "C4 (Medium)",
        18: "C3 (Hard)",
        19: "C2",
        20: "C1",
        7:  "Intermediate",
        8:  "Wet",
        9:  "Dry (Classic)",
        10: "Wet (Classic)",
    }

    def __init__(self, format_year: int, label: str):
        super().__init__(format_year, label)

    def extract_motion(self, packet, player_idx: int) -> Dict[str, Any]:
        motion = packet.m_carMotionData[player_idx]
        return {
            "world_pos_x": float(motion.m_worldPositionX),
            "world_pos_y": float(motion.m_worldPositionY),
            "world_pos_z": float(motion.m_worldPositionZ),
            "world_vel_x": float(motion.m_worldVelocityX),
            "world_vel_y": float(motion.m_worldVelocityY),
            "world_vel_z": float(motion.m_worldVelocityZ),
            "g_force_lat": float(motion.m_gForceLateral),
            "g_force_lon": float(motion.m_gForceLongitudinal),
            "g_force_vert": float(getattr(motion, "m_gForceVertical", 0.0)),
            "yaw": float(getattr(motion, "m_yaw", 0.0)),
            "pitch": float(getattr(motion, "m_pitch", 0.0)),
            "roll": float(getattr(motion, "m_roll", 0.0)),
        }

    def extract_telemetry(self, packet, player_idx: int) -> Dict[str, Any]:
        telem = packet.m_carTelemetryData[player_idx]
        return {
            "speed_kph": float(telem.m_speed),
            "throttle": float(telem.m_throttle),
            "brake": float(telem.m_brake),
            "steer": float(telem.m_steer),
            "gear": int(telem.m_gear),
            "rpm": int(telem.m_engineRPM),
            "drs": bool(telem.m_drs),
            "tyre_surface_temps": list(telem.m_tyresSurfaceTemperature),
            "tyre_inner_temps": list(telem.m_tyresInnerTemperature),
            "brakes_temperature": list(telem.m_brakesTemperature),
            "tyres_pressure": [float(p) for p in getattr(telem, "m_tyresPressure", [0.0, 0.0, 0.0, 0.0])],
            "clutch": int(getattr(telem, "m_clutch", 0)),
            "engine_temperature": int(getattr(telem, "m_engineTemperature", 0)),
            "rev_lights_percent": int(getattr(telem, "m_revLightsPercent", 0)),
            "surface_type": [int(s) for s in getattr(telem, "m_surfaceType", [0, 0, 0, 0])],
            "suggested_gear": int(getattr(packet, "m_suggestedGear", 0)),
        }

    def extract_lap_data(self, packet, player_idx: int) -> Dict[str, Any]:
        lap = packet.m_lapData[player_idx]
        
        # F1 2020 used float seconds; 2021+ uses uint32 milliseconds
        if self.format_year == 2020:
            current_ms = int(round(getattr(lap, "m_currentLapTime", 0.0) * 1000))
            last_ms = int(round(getattr(lap, "m_lastLapTime", 0.0) * 1000))
        else:
            current_ms = int(getattr(lap, "m_currentLapTimeInMS", 0))
            last_ms = int(getattr(lap, "m_lastLapTimeInMS", 0))

        # Sector 1 time (F1 23+ uses split minute + ms parts; older years use single uint16 ms)
        if hasattr(lap, "m_sector1TimeMSPart"):
            s1_ms = int(getattr(lap, "m_sector1TimeMinutesPart", 0)) * 60000 + int(lap.m_sector1TimeMSPart)
        else:
            s1_ms = int(getattr(lap, "m_sector1TimeInMS", 0))

        # Sector 2 time
        if hasattr(lap, "m_sector2TimeMSPart"):
            s2_ms = int(getattr(lap, "m_sector2TimeMinutesPart", 0)) * 60000 + int(lap.m_sector2TimeMSPart)
        else:
            s2_ms = int(getattr(lap, "m_sector2TimeInMS", 0))

        # Delta to car in front / race leader (F1 23+ split fields; older years lack them -> None)
        if hasattr(lap, "m_deltaToCarInFrontMSPart"):
            delta_front = int(getattr(lap, "m_deltaToCarInFrontMinutesPart", 0)) * 60000 + int(lap.m_deltaToCarInFrontMSPart)
        elif hasattr(lap, "m_deltaToCarInFrontInMS"):
            delta_front = int(lap.m_deltaToCarInFrontInMS)
        else:
            delta_front = None

        if hasattr(lap, "m_deltaToRaceLeaderMSPart"):
            delta_leader = int(getattr(lap, "m_deltaToRaceLeaderMinutesPart", 0)) * 60000 + int(lap.m_deltaToRaceLeaderMSPart)
        elif hasattr(lap, "m_deltaToRaceLeaderInMS"):
            delta_leader = int(lap.m_deltaToRaceLeaderInMS)
        else:
            delta_leader = None

        return {
            "lap_number": int(lap.m_currentLapNum),
            "current_lap_time_ms": current_ms,
            "last_lap_time_ms": last_ms,
            "sector_1_ms": s1_ms,
            "sector_2_ms": s2_ms,
            "lap_distance_m": float(lap.m_lapDistance),
            "total_distance_m": float(lap.m_totalDistance),
            "position": int(lap.m_carPosition),
            "is_valid": not bool(getattr(lap, "m_currentLapInvalid", 0)),
            "delta_to_front_ms": delta_front,
            "delta_to_leader_ms": delta_leader,
            "safety_car_delta": float(getattr(lap, "m_safetyCarDelta", 0.0)),
            "sector": int(getattr(lap, "m_sector", 0)),
            "pit_status": int(getattr(lap, "m_pitStatus", 0)),
            "num_pit_stops": int(getattr(lap, "m_numPitStops", 0)),
            "speed_trap_fastest_speed": float(getattr(lap, "m_speedTrapFastestSpeed", 0.0)),
        }


    def extract_car_status(self, packet, player_idx: int) -> Dict[str, Any]:
        status = packet.m_carStatusData[player_idx]
        compound_id = getattr(status, "m_actualTyreCompound", getattr(status, "m_visualTyreCompound", 18))
        return {
            "fuel_in_tank": float(status.m_fuelInTank),
            "fuel_remaining_laps": float(status.m_fuelRemainingLaps),
            "max_rpm": int(status.m_maxRPM),
            "drs_allowed": bool(status.m_drsAllowed),
            "ers_store_energy": float(status.m_ersStoreEnergy),
            "ers_deploy_mode": int(getattr(status, "m_ersDeployMode", 0)),
            "tyre_compound": self.TYRE_COMPOUND_NAMES.get(compound_id, "Standard"),
            "front_brake_bias": int(getattr(status, "m_frontBrakeBias", 56)),
            "fuel_mix": int(getattr(status, "m_fuelMix", 1)),
            "ers_harvested_mguk": float(getattr(status, "m_ersHarvestedThisLapMGUK", 0.0)),
            "ers_harvested_mguh": float(getattr(status, "m_ersHarvestedThisLapMGUH", 0.0)),
            "ers_deployed_this_lap": float(getattr(status, "m_ersDeployedThisLap", 0.0)),
            "tyres_age_laps": int(getattr(status, "m_tyresAgeLaps", 0)),
            "visual_tyre_compound": int(getattr(status, "m_visualTyreCompound", compound_id)),
            "vehicle_fia_flags": int(getattr(status, "m_vehicleFiaFlags", 0)),
            "drs_activation_distance": int(getattr(status, "m_drsActivationDistance", 0)),
        }

    def extract_session(self, packet) -> Dict[str, Any]:
        return {
            "weather": int(getattr(packet, "m_weather", 0)),
            "track_temperature": int(getattr(packet, "m_trackTemperature", 0)),
            "air_temperature": int(getattr(packet, "m_airTemperature", 0)),
            "total_laps": int(getattr(packet, "m_totalLaps", 0)),
            "track_length": int(getattr(packet, "m_trackLength", 0)),
            "track_id": int(getattr(packet, "m_trackId", -1)),
            "session_type": int(getattr(packet, "m_sessionType", 0)),
            "session_time_left": int(getattr(packet, "m_sessionTimeLeft", 0)),
            "session_duration": int(getattr(packet, "m_sessionDuration", 0)),
            "safety_car_status": int(getattr(packet, "m_safetyCarStatus", 0)),
            "network_game": bool(getattr(packet, "m_networkGame", 0)),
            "formula": int(getattr(packet, "m_formula", 0)),
            "ai_difficulty": int(getattr(packet, "m_aiDifficulty", 0)),
        }

    def extract_participants(self, packet) -> Dict[str, Any]:
        active_cars = int(getattr(packet, "m_numActiveCars", 22))
        participants = []
        raw_list = getattr(packet, "m_participants", [])
        for i in range(min(active_cars, len(raw_list))):
            p = raw_list[i]
            raw_name = getattr(p, "m_name", b"")
            if isinstance(raw_name, bytes):
                name = raw_name.split(b"\x00")[0].decode("utf-8", errors="replace")
            elif isinstance(raw_name, str):
                name = raw_name.split("\x00")[0]
            else:
                name = bytes(raw_name).split(b"\x00")[0].decode("utf-8", errors="replace")

            participants.append({
                "car_index": i,
                "ai_controlled": bool(getattr(p, "m_aiControlled", 0)),
                "driver_id": int(getattr(p, "m_driverId", 0)),
                "network_id": int(getattr(p, "m_networkId", 0)),
                "team_id": int(getattr(p, "m_teamId", 0)),
                "my_team": bool(getattr(p, "m_myTeam", 0)),
                "race_number": int(getattr(p, "m_raceNumber", 0)),
                "nationality": int(getattr(p, "m_nationality", 0)),
                "name": name,
                "your_telemetry": int(getattr(p, "m_yourTelemetry", 0)),
            })

        return {"participants": participants, "num_active_cars": active_cars}

    def extract_car_damage(self, packet, player_idx: int) -> Dict[str, Any]:
        damage = packet.m_carDamageData[player_idx]
        return {
            "tyres_wear": [float(w) for w in damage.m_tyresWear],
            "tyres_damage": [int(d) for d in damage.m_tyresDamage],
            "brakes_damage": [int(d) for d in damage.m_brakesDamage],
            "tyre_blisters": [int(b) for b in getattr(damage, "m_tyreBlisters", [0, 0, 0, 0])],
            "front_left_wing_damage": int(damage.m_frontLeftWingDamage),
            "front_right_wing_damage": int(damage.m_frontRightWingDamage),
            "rear_wing_damage": int(damage.m_rearWingDamage),
            "floor_damage": int(damage.m_floorDamage),
            "diffuser_damage": int(damage.m_diffuserDamage),
            "sidepod_damage": int(damage.m_sidepodDamage),
            "drs_fault": bool(damage.m_drsFault),
            "ers_fault": bool(damage.m_ersFault),
            "gearbox_damage": int(damage.m_gearBoxDamage),
            "engine_damage": int(damage.m_engineDamage),
            "engine_mguh_wear": int(damage.m_engineMGUHWear),
            "engine_es_wear": int(damage.m_engineESWear),
            "engine_ce_wear": int(damage.m_engineCEWear),
            "engine_ice_wear": int(damage.m_engineICEWear),
            "engine_mguk_wear": int(damage.m_engineMGUKWear),
            "engine_tc_wear": int(damage.m_engineTCWear),
            "engine_blown": bool(damage.m_engineBlown),
            "engine_seized": bool(damage.m_engineSeized),
        }

    def extract_session_history(self, packet) -> Dict[str, Any]:
        num_laps = int(getattr(packet, "m_numLaps", 0))
        laps = []
        raw_laps = getattr(packet, "m_lapHistoryData", [])
        for i in range(min(num_laps, len(raw_laps))):
            lap = raw_laps[i]
            
            # S1
            if hasattr(lap, "m_sector1TimeMSPart"):
                s1_ms = int(getattr(lap, "m_sector1TimeMinutesPart", 0)) * 60000 + int(lap.m_sector1TimeMSPart)
            else:
                s1_ms = int(getattr(lap, "m_sector1TimeInMS", 0))

            # S2
            if hasattr(lap, "m_sector2TimeMSPart"):
                s2_ms = int(getattr(lap, "m_sector2TimeMinutesPart", 0)) * 60000 + int(lap.m_sector2TimeMSPart)
            else:
                s2_ms = int(getattr(lap, "m_sector2TimeInMS", 0))

            # S3
            if hasattr(lap, "m_sector3TimeMSPart"):
                s3_ms = int(getattr(lap, "m_sector3TimeMinutesPart", 0)) * 60000 + int(lap.m_sector3TimeMSPart)
            else:
                s3_ms = int(getattr(lap, "m_sector3TimeInMS", 0))

            flags = int(getattr(lap, "m_lapValidBitFlags", 0))
            is_valid = bool(flags & 0x01) if flags else True

            laps.append({
                "lap_num": i + 1,
                "lap_time_ms": int(lap.m_lapTimeInMS),
                "sector_1_ms": s1_ms,
                "sector_2_ms": s2_ms,
                "sector_3_ms": s3_ms,
                "is_valid": is_valid,
            })

        num_stints = int(getattr(packet, "m_numTyreStints", 0))
        stints = []
        raw_stints = getattr(packet, "m_tyreStintsHistoryData", [])
        for j in range(min(num_stints, len(raw_stints))):
            stint = raw_stints[j]
            stints.append({
                "stint_idx": j,
                "end_lap": int(stint.m_endLap),
                "actual_compound": int(stint.m_tyreActualCompound),
                "visual_compound": int(stint.m_tyreVisualCompound),
            })

        return {
            "car_idx": int(getattr(packet, "m_carIdx", 0)),
            "num_laps": num_laps,
            "num_tyre_stints": num_stints,
            "best_lap_time_lap_num": int(getattr(packet, "m_bestLapTimeLapNum", 0)),
            "best_sector1_lap_num": int(getattr(packet, "m_bestSector1LapNum", 0)),
            "best_sector2_lap_num": int(getattr(packet, "m_bestSector2LapNum", 0)),
            "best_sector3_lap_num": int(getattr(packet, "m_bestSector3LapNum", 0)),
            "laps": laps,
            "stints": stints,
        }

    def extract_car_setups(self, packet, player_idx: int) -> Dict[str, Any]:
        setup = packet.m_carSetups[player_idx]
        return {
            "front_wing": int(setup.m_frontWing),
            "rear_wing": int(setup.m_rearWing),
            "on_throttle": int(setup.m_onThrottle),
            "off_throttle": int(setup.m_offThrottle),
            "front_camber": float(setup.m_frontCamber),
            "rear_camber": float(setup.m_rearCamber),
            "front_toe": float(setup.m_frontToe),
            "rear_toe": float(setup.m_rearToe),
            "front_suspension": int(setup.m_frontSuspension),
            "rear_suspension": int(setup.m_rearSuspension),
            "front_anti_roll_bar": int(setup.m_frontAntiRollBar),
            "rear_anti_roll_bar": int(setup.m_rearAntiRollBar),
            "front_suspension_height": int(setup.m_frontSuspensionHeight),
            "rear_suspension_height": int(setup.m_rearSuspensionHeight),
            "brake_pressure": int(setup.m_brakePressure),
            "brake_bias": int(setup.m_brakeBias),
            "engine_braking": int(getattr(setup, "m_engineBraking", 0)),
            "rear_left_tyre_pressure": float(setup.m_rearLeftTyrePressure),
            "rear_right_tyre_pressure": float(setup.m_rearRightTyrePressure),
            "front_left_tyre_pressure": float(setup.m_frontLeftTyrePressure),
            "front_right_tyre_pressure": float(setup.m_frontRightTyrePressure),
            "ballast": int(setup.m_ballast),
            "fuel_load": float(setup.m_fuelLoad),
            "next_front_wing_value": float(getattr(packet, "m_nextFrontWingValue", 0.0)),
        }

    def extract_motion_ex(self, packet) -> Dict[str, Any]:
        return {
            "suspension_position": [float(p) for p in packet.m_suspensionPosition],
            "suspension_velocity": [float(v) for v in packet.m_suspensionVelocity],
            "suspension_acceleration": [float(a) for a in packet.m_suspensionAcceleration],
            "wheel_speed": [float(s) for s in packet.m_wheelSpeed],
            "wheel_slip_ratio": [float(r) for r in getattr(packet, "m_wheelSlipRatio", getattr(packet, "m_wheelSlip", [0, 0, 0, 0]))],
            "wheel_slip_angle": [float(a) for a in getattr(packet, "m_wheelSlipAngle", [0, 0, 0, 0])],
            "wheel_lat_force": [float(f) for f in getattr(packet, "m_wheelLatForce", [0, 0, 0, 0])],
            "wheel_long_force": [float(f) for f in getattr(packet, "m_wheelLongForce", [0, 0, 0, 0])],
            "height_of_cog_above_ground": float(getattr(packet, "m_heightOfCOGAboveGround", getattr(packet, "m_heightAboveGround", 0.0))),
            "local_velocity_x": float(getattr(packet, "m_localVelocityX", 0.0)),
            "local_velocity_y": float(getattr(packet, "m_localVelocityY", 0.0)),
            "local_velocity_z": float(getattr(packet, "m_localVelocityZ", 0.0)),
            "angular_velocity_x": float(getattr(packet, "m_angularVelocityX", 0.0)),
            "angular_velocity_y": float(getattr(packet, "m_angularVelocityY", 0.0)),
            "angular_velocity_z": float(getattr(packet, "m_angularVelocityZ", 0.0)),
            "angular_acceleration_x": float(getattr(packet, "m_angularAccelerationX", 0.0)),
            "angular_acceleration_y": float(getattr(packet, "m_angularAccelerationY", 0.0)),
            "angular_acceleration_z": float(getattr(packet, "m_angularAccelerationZ", 0.0)),
            "front_wheels_angle": float(getattr(packet, "m_frontWheelsAngle", 0.0)),
        }

    def extract_event(self, packet) -> Dict[str, Any]:
        code_bytes = bytes(packet.m_eventStringCode)
        try:
            code_str = code_bytes.decode("ascii", errors="replace").rstrip("\x00")
        except Exception:
            code_str = ""

        details = getattr(packet, "m_eventDetails", None)
        event_payload: Dict[str, Any] = {
            "event_code": code_str,
            "event_type": "UNKNOWN",
        }

        if code_str == "SSTA":
            event_payload["event_type"] = "SESSION_STARTED"
        elif code_str == "SEND":
            event_payload["event_type"] = "SESSION_ENDED"
        elif code_str == "FTLP" and details:
            event_payload["event_type"] = "FASTEST_LAP"
            event_payload["vehicle_idx"] = int(details.FastestLap.m_vehicleIdx)
            event_payload["lap_time"] = float(details.FastestLap.m_lapTime)
        elif code_str == "RTMT" and details:
            event_payload["event_type"] = "RETIREMENT"
            event_payload["vehicle_idx"] = int(details.Retirement.m_vehicleIdx)
            event_payload["reason"] = int(getattr(details.Retirement, "m_reason", 1))
        elif code_str == "DRSE":
            event_payload["event_type"] = "DRS_ENABLED"
        elif code_str == "DRSD":
            event_payload["event_type"] = "DRS_DISABLED"
        elif code_str == "TMPT" and details:
            event_payload["event_type"] = "TEAMMATE_IN_PITS"
            event_payload["vehicle_idx"] = int(details.TeamMateInPits.m_vehicleIdx)
        elif code_str == "CHQF":
            event_payload["event_type"] = "CHEQUERED_FLAG"
        elif code_str == "RCWN" and details:
            event_payload["event_type"] = "RACE_WINNER"
            event_payload["vehicle_idx"] = int(details.RaceWinner.m_vehicleIdx)
        elif code_str in ("PNTY", "PENA") and details:
            event_payload["event_type"] = "PENALTY"
            event_payload["penalty_type"] = int(details.Penalty.m_penaltyType)
            event_payload["infringement_type"] = int(details.Penalty.m_infringementType)
            event_payload["vehicle_idx"] = int(details.Penalty.m_vehicleIdx)
            event_payload["other_vehicle_idx"] = int(details.Penalty.m_otherVehicleIdx)
            event_payload["time"] = int(details.Penalty.m_time)
            event_payload["lap_num"] = int(details.Penalty.m_lapNum)
            event_payload["places_gained"] = int(details.Penalty.m_placesGained)
        elif code_str == "SPTP" and details:
            event_payload["event_type"] = "SPEED_TRAP"
            event_payload["vehicle_idx"] = int(details.SpeedTrap.m_vehicleIdx)
            event_payload["speed"] = float(details.SpeedTrap.m_speed)
            event_payload["is_overall_fastest"] = bool(details.SpeedTrap.m_isOverallFastestInSession)
            event_payload["is_driver_fastest"] = bool(details.SpeedTrap.m_isDriverFastestInSession)
            event_payload["fastest_vehicle_idx"] = int(details.SpeedTrap.m_fastestVehicleIdxInSession)
            event_payload["fastest_speed"] = float(details.SpeedTrap.m_fastestSpeedInSession)
        elif code_str == "STLG" and details:
            event_payload["event_type"] = "START_LIGHTS"
            event_payload["num_lights"] = int(details.StartLights.m_numLights)
        elif code_str == "LGOT":
            event_payload["event_type"] = "LIGHTS_OUT"
        elif code_str == "DTSV" and details:
            event_payload["event_type"] = "DRIVE_THROUGH_SERVED"
            event_payload["vehicle_idx"] = int(details.DriveThroughPenaltyServed.m_vehicleIdx)
        elif code_str == "SGSV" and details:
            event_payload["event_type"] = "STOP_GO_SERVED"
            event_payload["vehicle_idx"] = int(details.StopGoPenaltyServed.m_vehicleIdx)
        elif code_str == "FLBK" and details:
            event_payload["event_type"] = "FLASHBACK"
            event_payload["frame_identifier"] = int(details.Flashback.m_flashbackFrameIdentifier)
            event_payload["session_time"] = float(details.Flashback.m_flashbackSessionTime)
        elif code_str == "BUTN" and details:
            event_payload["event_type"] = "BUTTON_STATUS"
            event_payload["button_status"] = int(details.Buttons.m_buttonStatus)
        elif code_str == "OVTK" and details:
            event_payload["event_type"] = "OVERTAKE"
            event_payload["overtaking_vehicle_idx"] = int(details.Overtake.m_overtakingVehicleIdx)
            event_payload["being_overtaken_vehicle_idx"] = int(details.Overtake.m_beingOvertakenVehicleIdx)
        else:
            event_payload["event_type"] = code_str

        return event_payload

    def extract_tyre_sets(self, packet) -> Dict[str, Any]:
        tyre_sets = []
        raw_sets = getattr(packet, "m_tyreSetData", [])
        for s in raw_sets:
            tyre_sets.append({
                "actual_compound": int(s.m_actualTyreCompound),
                "visual_compound": int(s.m_visualTyreCompound),
                "wear": int(s.m_wear),
                "available": bool(s.m_available),
                "recommended_session": int(s.m_recommendedSession),
                "life_span": int(s.m_lifeSpan),
                "usable_life": int(s.m_usableLife),
                "lap_delta_time_ms": int(s.m_lapDeltaTime),
                "fitted": bool(s.m_fitted),
            })
        return {
            "car_idx": int(getattr(packet, "m_carIdx", 0)),
            "fitted_idx": int(getattr(packet, "m_fittedIdx", 0)),
            "tyre_sets": tyre_sets,
        }

    def extract_time_trial(self, packet) -> Dict[str, Any]:
        def _extract_tt_dataset(ds) -> Dict[str, Any]:
            if not ds:
                return {}
            return {
                "car_idx": int(ds.m_carIdx),
                "team_id": int(ds.m_teamId),
                "lap_time_ms": int(ds.m_lapTimeInMS),
                "sector_1_ms": int(ds.m_sector1TimeInMS),
                "sector_2_ms": int(ds.m_sector2TimeInMS),
                "sector_3_ms": int(ds.m_sector3TimeInMS),
                "traction_control": int(ds.m_tractionControl),
                "gearbox_assist": int(ds.m_gearboxAssist),
                "abs": int(ds.m_antiLockBrakes),
                "equal_performance": bool(ds.m_equalCarPerformance),
                "custom_setup": bool(ds.m_customSetup),
                "is_valid": bool(ds.m_valid),
            }

        return {
            "player_session_best": _extract_tt_dataset(getattr(packet, "m_playerSessionBestDataSet", None)),
            "personal_best": _extract_tt_dataset(getattr(packet, "m_personalBestDataSet", None)),
            "rival": _extract_tt_dataset(getattr(packet, "m_rivalDataSet", None)),
        }





def get_adapter_for_format(format_year: int) -> UniversalPacketAdapter:
    """Factory function returning the adapter configured for the game format."""
    labels = {
        2020: "F1 2020",
        2021: "F1 2021",
        2022: "F1 22",
        2023: "F1 23",
        2024: "F1 24",
        2025: "F1 25",
    }
    return UniversalPacketAdapter(format_year, labels.get(format_year, f"F1 {format_year}"))

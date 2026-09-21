"""
APX IQ — Packet-to-Pixel End-to-End Integration Test Suite
===========================================================
Validates the Wave 1 Full-Protocol Utilization mandate:
  1. Raw binary UDP packet bytes (F1 2020 through 2025)
  2. PacketDecoder.decode() into structured C-types
  3. UniversalPacketAdapter extractors (Motion, Session, Lap, Telemetry, Status, Participants)
  4. Non-zero/non-default verification for every live widget channel
  5. Cross-version honesty enforcement (None for unmeasured deltas in 2020-2022, combined split ms for 2023-2025)
  6. Socket.IO serialization verification for frontend store ingestion
"""

import ctypes
import pytest
from ingestion.decoder import PacketDecoder
from ingestion.adapters import get_adapter_for_format

from ingestion import (
    packet_structs_20,
    packet_structs_21,
    packet_structs_22,
    packet_structs_23,
    packet_structs_25,
)


class TestPacketToPixelIntegration:
    """
    Every assertion here proves that real non-zero binary packet bytes
    reach the adapted dictionary without being clobbered by defaults
    or silent zeros (closing the 'getattr-default hides a dead wire' gap).
    """

    # ── 1. Car Telemetry Packet (ID 6) ──> RaceCarTelemetry, BottomInstruments, ShiftLights
    def test_car_telemetry_packet_to_adapted_dict(self):
        packet = packet_structs_23.PacketCarTelemetryData()
        packet.m_header.m_packetFormat = 2023
        packet.m_header.m_packetId = packet_structs_23.PACKET_ID_CAR_TELEMETRY
        packet.m_header.m_playerCarIndex = 0
        packet.m_suggestedGear = 7

        car = packet.m_carTelemetryData[0]
        car.m_speed = 289
        car.m_throttle = 0.95
        car.m_brake = 0.0
        car.m_steer = 0.12
        car.m_clutch = 0
        car.m_gear = 7
        car.m_engineRPM = 11850
        car.m_drs = 1
        car.m_revLightsPercent = 88
        car.m_engineTemperature = 104

        # Pressures (FL, FR, RL, RR) in PSI
        car.m_tyresPressure[0] = 23.4
        car.m_tyresPressure[1] = 23.6
        car.m_tyresPressure[2] = 21.2
        car.m_tyresPressure[3] = 21.5

        # Surface temps (°C)
        car.m_tyresSurfaceTemperature[0] = 102
        car.m_tyresSurfaceTemperature[1] = 104
        car.m_tyresSurfaceTemperature[2] = 98
        car.m_tyresSurfaceTemperature[3] = 99

        # Inner carcass temps (°C)
        car.m_tyresInnerTemperature[0] = 106
        car.m_tyresInnerTemperature[1] = 108
        car.m_tyresInnerTemperature[2] = 101
        car.m_tyresInnerTemperature[3] = 102

        # Brake disc temps (°C)
        car.m_brakesTemperature[0] = 580
        car.m_brakesTemperature[1] = 590
        car.m_brakesTemperature[2] = 450
        car.m_brakesTemperature[3] = 460

        # Surface type enum
        car.m_surfaceType[0] = 0  # Tarmac
        car.m_surfaceType[1] = 0
        car.m_surfaceType[2] = 1  # Rumble strip
        car.m_surfaceType[3] = 0

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None
        assert isinstance(decoded, packet_structs_23.PacketCarTelemetryData)

        adapter = get_adapter_for_format(2023)
        res = adapter.extract_telemetry(decoded, player_idx=0)

        # Assert non-zero and exact values
        assert res["speed_kph"] == 289.0
        assert res["throttle"] == pytest.approx(0.95, abs=1e-3)
        assert res["gear"] == 7
        assert res["rpm"] == 11850
        assert res["drs"] is True
        assert res["rev_lights_percent"] == 88
        assert res["engine_temperature"] == 104
        assert res["suggested_gear"] == 7
        assert [pytest.approx(p, abs=0.05) for p in res["tyres_pressure"]] == [23.4, 23.6, 21.2, 21.5]
        assert res["tyre_surface_temps"] == [102, 104, 98, 99]
        assert res["tyre_inner_temps"] == [106, 108, 101, 102]
        assert res["brakes_temperature"] == [580, 590, 450, 460]
        assert res["surface_type"] == [0, 0, 1, 0]

    # ── 2. Car Status Packet (ID 7) ──> BottomInstruments, StatusBar, CentralTelemetry, RaceCarTelemetry
    def test_car_status_packet_to_adapted_dict(self):
        packet = packet_structs_23.PacketCarStatusData()
        packet.m_header.m_packetFormat = 2023
        packet.m_header.m_packetId = packet_structs_23.PACKET_ID_CAR_STATUS
        packet.m_header.m_playerCarIndex = 0

        status = packet.m_carStatusData[0]
        status.m_fuelInTank = 42.5
        status.m_fuelRemainingLaps = 21.3
        status.m_maxRPM = 15000
        status.m_idleRPM = 4000
        status.m_maxGears = 8
        status.m_drsAllowed = 1
        status.m_drsActivationDistance = 250
        status.m_actualTyreCompound = 16  # C5 Soft
        status.m_visualTyreCompound = 16  # Soft
        status.m_tyresAgeLaps = 7
        status.m_frontBrakeBias = 58
        status.m_fuelMix = 2  # Rich
        status.m_ersStoreEnergy = 2850000.0  # Joules
        status.m_ersDeployMode = 3  # Overtake
        status.m_ersHarvestedThisLapMGUK = 185000.0
        status.m_ersHarvestedThisLapMGUH = 45000.0
        status.m_ersDeployedThisLap = 920000.0
        status.m_vehicleFiaFlags = 3  # Yellow flag

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None

        adapter = get_adapter_for_format(2023)
        res = adapter.extract_car_status(decoded, player_idx=0)

        assert res["fuel_in_tank"] == pytest.approx(42.5, abs=0.1)
        assert res["fuel_remaining_laps"] == pytest.approx(21.3, abs=0.1)
        assert res["max_rpm"] == 15000
        assert res["drs_allowed"] is True
        assert res["drs_activation_distance"] == 250
        assert res["tyre_compound"] == "C5 (Soft)"
        assert res["visual_tyre_compound"] == 16
        assert res["tyres_age_laps"] == 7
        assert res["front_brake_bias"] == 58
        assert res["fuel_mix"] == 2
        assert res["ers_deploy_mode"] == 3
        assert res["ers_store_energy"] == pytest.approx(2850000.0, abs=1.0)
        assert res["ers_harvested_mguk"] == pytest.approx(185000.0, abs=1.0)
        assert res["ers_harvested_mguh"] == pytest.approx(45000.0, abs=1.0)
        assert res["ers_deployed_this_lap"] == pytest.approx(920000.0, abs=1.0)
        assert res["vehicle_fia_flags"] == 3

    # ── 3. Motion Packet (ID 0) ──> TrackMap GPS & Attitude
    def test_motion_packet_to_adapted_dict(self):
        packet = packet_structs_23.PacketMotionData()
        packet.m_header.m_packetFormat = 2023
        packet.m_header.m_packetId = packet_structs_23.PACKET_ID_MOTION
        packet.m_header.m_playerCarIndex = 0

        motion = packet.m_carMotionData[0]
        motion.m_worldPositionX = 350.5
        motion.m_worldPositionY = 18.2
        motion.m_worldPositionZ = -1204.8
        motion.m_worldVelocityX = 65.4
        motion.m_worldVelocityY = -0.2
        motion.m_worldVelocityZ = -45.8
        motion.m_gForceLateral = 3.2
        motion.m_gForceLongitudinal = -1.8
        motion.m_gForceVertical = 1.4
        motion.m_yaw = 2.15
        motion.m_pitch = -0.04
        motion.m_roll = 0.03

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None

        adapter = get_adapter_for_format(2023)
        res = adapter.extract_motion(decoded, player_idx=0)

        assert res["world_pos_x"] == pytest.approx(350.5, abs=0.1)
        assert res["world_pos_y"] == pytest.approx(18.2, abs=0.1)
        assert res["world_pos_z"] == pytest.approx(-1204.8, abs=0.1)
        assert res["g_force_lat"] == pytest.approx(3.2, abs=0.05)
        assert res["g_force_lon"] == pytest.approx(-1.8, abs=0.05)
        assert res["g_force_vert"] == pytest.approx(1.4, abs=0.05)
        assert res["yaw"] == pytest.approx(2.15, abs=0.01)
        assert res["pitch"] == pytest.approx(-0.04, abs=0.01)
        assert res["roll"] == pytest.approx(0.03, abs=0.01)

    # ── 4. Session Packet (ID 1) ──> StatusBar Weather & Timer, CentralTelemetry Laps
    @pytest.mark.parametrize("year,struct_cls", [
        (2020, packet_structs_20.PacketSessionData),
        (2021, packet_structs_21.PacketSessionData),
        (2022, packet_structs_22.PacketSessionData),
        (2023, packet_structs_23.PacketSessionData),
        (2025, packet_structs_25.PacketSessionData),
    ])
    def test_session_packet_cross_version(self, year, struct_cls):
        packet = struct_cls()
        packet.m_header.m_packetFormat = year
        packet.m_header.m_packetId = 1
        packet.m_header.m_playerCarIndex = 0
        packet.m_header.m_sessionUID = 0xDEADBEEF12345678

        packet.m_trackId = 14  # Monza / Spa
        packet.m_trackLength = 5793
        packet.m_totalLaps = 53
        packet.m_weather = 1  # Light cloud
        packet.m_trackTemperature = 41
        packet.m_airTemperature = 27
        packet.m_sessionType = 10  # Race
        packet.m_sessionDuration = 7200
        packet.m_sessionTimeLeft = 4500
        packet.m_safetyCarStatus = 2  # VSC

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None

        adapter = get_adapter_for_format(year)
        res = adapter.extract_session(decoded)

        assert res["track_id"] == 14
        assert res["track_length"] == 5793
        assert res["total_laps"] == 53
        assert res["weather"] == 1
        assert res["track_temperature"] == 41
        assert res["air_temperature"] == 27
        assert res["session_duration"] == 7200
        assert res["session_time_left"] == 4500
        assert res["safety_car_status"] == 2

    # ── 5. Lap Data Packet (ID 2) ──> BattlePanel Gaps & Sector Times
    def test_f1_23_lap_data_split_ms_and_minute_combination(self):
        packet = packet_structs_23.PacketLapData()
        packet.m_header.m_packetFormat = 2023
        packet.m_header.m_packetId = packet_structs_23.PACKET_ID_LAP_DATA
        packet.m_header.m_playerCarIndex = 0

        lap = packet.m_lapData[0]
        lap.m_currentLapNum = 19
        lap.m_carPosition = 2
        lap.m_currentLapTimeInMS = 78450
        lap.m_lastLapTimeInMS = 79120

        # Split Sector 1: 1 min + 4250 ms = 64250 ms
        lap.m_sector1TimeMinutesPart = 1
        lap.m_sector1TimeMSPart = 4250

        # Split Sector 2: 0 min + 28310 ms = 28310 ms
        lap.m_sector2TimeMinutesPart = 0
        lap.m_sector2TimeMSPart = 28310

        # Split Delta to Car in Front: 0 min + 1840 ms = 1840 ms (+1.84s)
        lap.m_deltaToCarInFrontMinutesPart = 0
        lap.m_deltaToCarInFrontMSPart = 1840

        # Split Delta to Leader: 1 min + 3500 ms = 63500 ms (+63.50s)
        lap.m_deltaToRaceLeaderMinutesPart = 1
        lap.m_deltaToRaceLeaderMSPart = 3500

        lap.m_safetyCarDelta = -0.45
        lap.m_sector = 1
        lap.m_pitStatus = 0
        lap.m_numPitStops = 1
        lap.m_lapDistance = 3450.0
        lap.m_totalDistance = 65400.0
        lap.m_speedTrapFastestSpeed = 338.5

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None

        adapter = get_adapter_for_format(2023)
        res = adapter.extract_lap_data(decoded, player_idx=0)

        # Verify correct combining of minute and ms fields
        assert res["sector_1_ms"] == 64250
        assert res["sector_2_ms"] == 28310
        assert res["delta_to_front_ms"] == 1840
        assert res["delta_to_leader_ms"] == 63500
        assert res["lap_number"] == 19
        assert res["position"] == 2
        assert res["safety_car_delta"] == pytest.approx(-0.45, abs=0.01)
        assert res["speed_trap_fastest_speed"] == pytest.approx(338.5, abs=0.1)

    def test_f1_20_to_22_lap_data_honesty_unmeasured_deltas_are_none(self):
        for year, struct_mod in [(2020, packet_structs_20), (2021, packet_structs_21), (2022, packet_structs_22)]:
            packet = struct_mod.PacketLapData()
            packet.m_header.m_packetFormat = year
            packet.m_header.m_packetId = struct_mod.PACKET_ID_LAP_DATA
            packet.m_header.m_playerCarIndex = 0

            lap = packet.m_lapData[0]
            lap.m_carPosition = 3
            lap.m_currentLapNum = 12

            raw_bytes = bytes(packet)
            decoded = PacketDecoder.decode(raw_bytes)
            assert decoded is not None

            adapter = get_adapter_for_format(year)
            res = adapter.extract_lap_data(decoded, player_idx=0)

            # HONESTY CONTRACT: 2020-2022 lack delta channels in LapData struct.
            # Must return None (so frontend renders NoSignal / SimBadge), never a fake 0.
            assert res["delta_to_front_ms"] is None
            assert res["delta_to_leader_ms"] is None

    # ── 6. Participants Packet (ID 4) ──> BattlePanel Driver Badges
    def test_participants_packet_to_driver_badges(self):
        packet = packet_structs_23.PacketParticipantsData()
        packet.m_header.m_packetFormat = 2023
        packet.m_header.m_packetId = packet_structs_23.PACKET_ID_PARTICIPANTS
        packet.m_numActiveCars = 3

        # P0: VER
        packet.m_participants[0].m_aiControlled = 0
        packet.m_participants[0].m_driverId = 1
        packet.m_participants[0].m_teamId = 0
        packet.m_participants[0].m_raceNumber = 1
        packet.m_participants[0].m_name = b"M. VERSTAPPEN\x00"

        # P1: NOR
        packet.m_participants[1].m_aiControlled = 1
        packet.m_participants[1].m_driverId = 2
        packet.m_participants[1].m_teamId = 3
        packet.m_participants[1].m_raceNumber = 4
        packet.m_participants[1].m_name = b"L. NORRIS\x00"

        # P2: LEC
        packet.m_participants[2].m_aiControlled = 1
        packet.m_participants[2].m_driverId = 3
        packet.m_participants[2].m_teamId = 1
        packet.m_participants[2].m_raceNumber = 16
        packet.m_participants[2].m_name = b"C. LECLERC\x00"

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None

        adapter = get_adapter_for_format(2023)
        res = adapter.extract_participants(decoded)

        assert res["num_active_cars"] == 3
        assert len(res["participants"]) == 3
        assert res["participants"][0]["name"] == "M. VERSTAPPEN"
        assert res["participants"][0]["race_number"] == 1
        assert res["participants"][1]["name"] == "L. NORRIS"
        assert res["participants"][2]["name"] == "C. LECLERC"

    # ── 7. Car Damage Packet (ID 10) ──> RaceCarTelemetry 4-Corner Wear & Damage
    @pytest.mark.parametrize("year,struct_cls", [
        (2021, packet_structs_21.PacketCarDamageData),
        (2022, packet_structs_22.PacketCarDamageData),
        (2023, packet_structs_23.PacketCarDamageData),
        (2025, packet_structs_25.PacketCarDamageData),
    ])
    def test_car_damage_packet_cross_version(self, year, struct_cls):
        packet = struct_cls()
        packet.m_header.m_packetFormat = year
        packet.m_header.m_packetId = 10
        packet.m_header.m_playerCarIndex = 0

        damage = packet.m_carDamageData[0]
        damage.m_tyresWear[0] = 14.5
        damage.m_tyresWear[1] = 16.2
        damage.m_tyresWear[2] = 22.8
        damage.m_tyresWear[3] = 24.1

        damage.m_tyresDamage[0] = 5
        damage.m_tyresDamage[1] = 0
        damage.m_tyresDamage[2] = 0
        damage.m_tyresDamage[3] = 10

        damage.m_brakesDamage[0] = 12
        damage.m_brakesDamage[1] = 15
        damage.m_brakesDamage[2] = 8
        damage.m_brakesDamage[3] = 9

        damage.m_frontLeftWingDamage = 18
        damage.m_frontRightWingDamage = 0
        damage.m_rearWingDamage = 5
        damage.m_floorDamage = 14
        damage.m_diffuserDamage = 8
        damage.m_sidepodDamage = 4
        damage.m_gearBoxDamage = 22
        damage.m_engineDamage = 15
        damage.m_engineMGUHWear = 30
        damage.m_engineESWear = 12
        damage.m_engineCEWear = 18
        damage.m_engineICEWear = 35
        damage.m_engineMGUKWear = 20
        damage.m_engineTCWear = 25

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None
        assert isinstance(decoded, struct_cls)

        adapter = get_adapter_for_format(year)
        res = adapter.extract_car_damage(decoded, player_idx=0)

        assert [pytest.approx(w, abs=0.1) for w in res["tyres_wear"]] == [14.5, 16.2, 22.8, 24.1]
        assert res["tyres_damage"] == [5, 0, 0, 10]
        assert res["brakes_damage"] == [12, 15, 8, 9]
        assert res["front_left_wing_damage"] == 18
        assert res["front_right_wing_damage"] == 0
        assert res["rear_wing_damage"] == 5
        assert res["floor_damage"] == 14
        assert res["diffuser_damage"] == 8
        assert res["sidepod_damage"] == 4
        assert res["gearbox_damage"] == 22
        assert res["engine_damage"] == 15
        assert res["engine_ice_wear"] == 35

    # ── 8. Session History Packet (ID 11) ──> DeltaBar Live Delta & BattlePanel Best Sectors
    @pytest.mark.parametrize("year,struct_cls", [
        (2021, packet_structs_21.PacketSessionHistoryData),
        (2022, packet_structs_22.PacketSessionHistoryData),
        (2023, packet_structs_23.PacketSessionHistoryData),
        (2025, packet_structs_25.PacketSessionHistoryData),
    ])
    def test_session_history_packet_cross_version(self, year, struct_cls):
        packet = struct_cls()
        packet.m_header.m_packetFormat = year
        packet.m_header.m_packetId = 11
        packet.m_carIdx = 0
        packet.m_numLaps = 2
        packet.m_numTyreStints = 1
        packet.m_bestLapTimeLapNum = 1
        packet.m_bestSector1LapNum = 1
        packet.m_bestSector2LapNum = 1
        packet.m_bestSector3LapNum = 1

        lap1 = packet.m_lapHistoryData[0]
        lap1.m_lapTimeInMS = 78450

        if year >= 2023:
            lap1.m_sector1TimeMinutesPart = 0
            lap1.m_sector1TimeMSPart = 24150
            lap1.m_sector2TimeMinutesPart = 0
            lap1.m_sector2TimeMSPart = 28300
            lap1.m_sector3TimeMinutesPart = 0
            lap1.m_sector3TimeMSPart = 26000
        else:
            lap1.m_sector1TimeInMS = 24150
            lap1.m_sector2TimeInMS = 28300
            lap1.m_sector3TimeInMS = 26000

        lap1.m_lapValidBitFlags = 0x0F  # Valid lap

        # Stint 1
        stint1 = packet.m_tyreStintsHistoryData[0]
        stint1.m_endLap = 255
        stint1.m_tyreActualCompound = 16  # Soft
        stint1.m_tyreVisualCompound = 16

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None
        assert isinstance(decoded, struct_cls)

        adapter = get_adapter_for_format(year)
        res = adapter.extract_session_history(decoded)

        assert res["car_idx"] == 0
        assert res["num_laps"] == 2
        assert res["num_tyre_stints"] == 1
        assert res["best_lap_time_lap_num"] == 1
        assert len(res["laps"]) == 2
        assert res["laps"][0]["lap_time_ms"] == 78450
        assert res["laps"][0]["sector_1_ms"] == 24150
        assert res["laps"][0]["sector_2_ms"] == 28300
        assert res["laps"][0]["sector_3_ms"] == 26000
        assert res["laps"][0]["is_valid"] is True
        assert len(res["stints"]) == 1
        assert res["stints"][0]["visual_compound"] == 16

    # ── 9. Car Setups Packet (ID 5) ──> SetupMatrixSliders Live Sync
    @pytest.mark.parametrize("year,struct_cls", [
        (2020, packet_structs_20.PacketCarSetupData),
        (2021, packet_structs_21.PacketCarSetupData),
        (2022, packet_structs_22.PacketCarSetupData),
        (2023, packet_structs_23.PacketCarSetupData),
        (2025, packet_structs_25.PacketCarSetupData),
    ])
    def test_car_setups_packet_cross_version(self, year, struct_cls):
        packet = struct_cls()
        packet.m_header.m_packetFormat = year
        packet.m_header.m_packetId = 5
        packet.m_header.m_playerCarIndex = 0

        setup = packet.m_carSetups[0]
        setup.m_frontWing = 28
        setup.m_rearWing = 24
        setup.m_onThrottle = 65
        setup.m_offThrottle = 55
        setup.m_frontCamber = -2.70
        setup.m_rearCamber = -1.50
        setup.m_frontToe = 0.05
        setup.m_rearToe = 0.20
        setup.m_frontSuspension = 8
        setup.m_rearSuspension = 4
        setup.m_frontAntiRollBar = 9
        setup.m_rearAntiRollBar = 3
        setup.m_frontSuspensionHeight = 35
        setup.m_rearSuspensionHeight = 42
        setup.m_brakePressure = 100
        setup.m_brakeBias = 56
        setup.m_rearLeftTyrePressure = 20.5
        setup.m_rearRightTyrePressure = 20.5
        setup.m_frontLeftTyrePressure = 22.5
        setup.m_frontRightTyrePressure = 22.5
        setup.m_ballast = 5
        setup.m_fuelLoad = 25.0

        if year >= 2024:
            setup.m_engineBraking = 60
            packet.m_nextFrontWingValue = 30.0

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None
        assert isinstance(decoded, struct_cls)

        adapter = get_adapter_for_format(year)
        res = adapter.extract_car_setups(decoded, player_idx=0)

        assert res["front_wing"] == 28
        assert res["rear_wing"] == 24
        assert res["on_throttle"] == 65
        assert res["off_throttle"] == 55
        assert res["front_camber"] == pytest.approx(-2.70, abs=0.01)
        assert res["rear_camber"] == pytest.approx(-1.50, abs=0.01)
        assert res["front_anti_roll_bar"] == 9
        assert res["rear_anti_roll_bar"] == 3
        assert res["brake_bias"] == 56
        assert res["front_left_tyre_pressure"] == pytest.approx(22.5, abs=0.1)

        if year >= 2024:
            assert res["engine_braking"] == 60
            assert res["next_front_wing_value"] == pytest.approx(30.0, abs=0.1)

    # ── 10. Motion Ex Packet (ID 13) ──> Chassis Dynamics & Suspension Travel
    @pytest.mark.parametrize("year,struct_cls", [
        (2023, packet_structs_23.PacketMotionExData),
        (2025, packet_structs_25.PacketMotionExData),
    ])
    def test_motion_ex_packet_cross_version(self, year, struct_cls):
        packet = struct_cls()
        packet.m_header.m_packetFormat = year
        packet.m_header.m_packetId = 13

        for i, val in enumerate([12.4, 12.8, 18.2, 18.5]):
            packet.m_suspensionPosition[i] = val
            packet.m_suspensionVelocity[i] = val * 0.1
            packet.m_suspensionAcceleration[i] = val * 0.5
            packet.m_wheelSpeed[i] = 285.0 + i

        if hasattr(packet, "m_wheelSlipRatio"):
            for i, val in enumerate([0.04, 0.04, 0.08, 0.09]):
                packet.m_wheelSlipRatio[i] = val
                packet.m_wheelSlipAngle[i] = val * 0.5
                packet.m_wheelLatForce[i] = 2400.0 + i * 50
                packet.m_wheelLongForce[i] = 1800.0 + i * 50

        packet.m_frontWheelsAngle = 0.08

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None
        assert isinstance(decoded, struct_cls)

        adapter = get_adapter_for_format(year)
        res = adapter.extract_motion_ex(decoded)

        assert [pytest.approx(p, abs=0.1) for p in res["suspension_position"]] == [12.4, 12.8, 18.2, 18.5]
        assert [pytest.approx(s, abs=0.1) for s in res["wheel_speed"]] == [285.0, 286.0, 287.0, 288.0]
        assert [pytest.approx(r, abs=0.01) for r in res["wheel_slip_ratio"]] == [0.04, 0.04, 0.08, 0.09]
        assert res["front_wheels_angle"] == pytest.approx(0.08, abs=0.01)

    # ── 11. Event Packet (ID 3) ──> Race Events & Flags
    @pytest.mark.parametrize("year,struct_cls", [
        (2020, packet_structs_20.PacketEventData),
        (2021, packet_structs_21.PacketEventData),
        (2022, packet_structs_22.PacketEventData),
        (2023, packet_structs_23.PacketEventData),
        (2025, packet_structs_25.PacketEventData),
    ])
    def test_event_packet_cross_version(self, year, struct_cls):
        # 1. Fastest Lap event
        pkt_ftlp = struct_cls()
        pkt_ftlp.m_header.m_packetFormat = year
        pkt_ftlp.m_header.m_packetId = 3
        pkt_ftlp.m_eventStringCode = (ctypes.c_uint8 * 4)(*b"FTLP")
        pkt_ftlp.m_eventDetails.FastestLap.m_vehicleIdx = 4
        pkt_ftlp.m_eventDetails.FastestLap.m_lapTime = 78.450

        decoded_ftlp = PacketDecoder.decode(bytes(pkt_ftlp))
        assert decoded_ftlp is not None
        assert isinstance(decoded_ftlp, struct_cls)

        adapter = get_adapter_for_format(year)
        res_ftlp = adapter.extract_event(decoded_ftlp)
        assert res_ftlp["event_type"] == "FASTEST_LAP"
        assert res_ftlp["vehicle_idx"] == 4
        assert res_ftlp["lap_time"] == pytest.approx(78.450, abs=1e-3)

        # 2. Penalty event
        pkt_pnty = struct_cls()
        pkt_pnty.m_header.m_packetFormat = year
        pkt_pnty.m_header.m_packetId = 3
        pkt_pnty.m_eventStringCode = (ctypes.c_uint8 * 4)(*b"PNTY")
        pkt_pnty.m_eventDetails.Penalty.m_penaltyType = 1
        pkt_pnty.m_eventDetails.Penalty.m_infringementType = 2
        pkt_pnty.m_eventDetails.Penalty.m_vehicleIdx = 0
        pkt_pnty.m_eventDetails.Penalty.m_otherVehicleIdx = 5
        pkt_pnty.m_eventDetails.Penalty.m_time = 5
        pkt_pnty.m_eventDetails.Penalty.m_lapNum = 14
        pkt_pnty.m_eventDetails.Penalty.m_placesGained = 0

        decoded_pnty = PacketDecoder.decode(bytes(pkt_pnty))
        res_pnty = adapter.extract_event(decoded_pnty)
        assert res_pnty["event_type"] == "PENALTY"
        assert res_pnty["vehicle_idx"] == 0
        assert res_pnty["time"] == 5
        assert res_pnty["lap_num"] == 14

        # 3. Speed Trap event
        pkt_sptp = struct_cls()
        pkt_sptp.m_header.m_packetFormat = year
        pkt_sptp.m_header.m_packetId = 3
        pkt_sptp.m_eventStringCode = (ctypes.c_uint8 * 4)(*b"SPTP")
        pkt_sptp.m_eventDetails.SpeedTrap.m_vehicleIdx = 0
        pkt_sptp.m_eventDetails.SpeedTrap.m_speed = 342.8
        pkt_sptp.m_eventDetails.SpeedTrap.m_isOverallFastestInSession = 1

        decoded_sptp = PacketDecoder.decode(bytes(pkt_sptp))
        res_sptp = adapter.extract_event(decoded_sptp)
        assert res_sptp["event_type"] == "SPEED_TRAP"
        assert res_sptp["speed"] == pytest.approx(342.8, abs=0.1)
        assert res_sptp["is_overall_fastest"] is True

    # ── 12. Tyre Sets Packet (ID 12) ──> Stint Degradation & Pit Strategy
    @pytest.mark.parametrize("year,struct_cls", [
        (2023, packet_structs_23.PacketTyreSetsData),
        (2025, packet_structs_25.PacketTyreSetsData),
    ])
    def test_tyre_sets_packet_cross_version(self, year, struct_cls):
        packet = struct_cls()
        packet.m_header.m_packetFormat = year
        packet.m_header.m_packetId = 12
        packet.m_carIdx = 0
        packet.m_fittedIdx = 1

        # Set 0: Soft
        packet.m_tyreSetData[0].m_actualTyreCompound = 16
        packet.m_tyreSetData[0].m_visualTyreCompound = 16
        packet.m_tyreSetData[0].m_wear = 45
        packet.m_tyreSetData[0].m_available = 1
        packet.m_tyreSetData[0].m_lifeSpan = 18
        packet.m_tyreSetData[0].m_usableLife = 22
        packet.m_tyreSetData[0].m_fitted = 0

        # Set 1: Medium (fitted)
        packet.m_tyreSetData[1].m_actualTyreCompound = 17
        packet.m_tyreSetData[1].m_visualTyreCompound = 17
        packet.m_tyreSetData[1].m_wear = 20
        packet.m_tyreSetData[1].m_available = 1
        packet.m_tyreSetData[1].m_lifeSpan = 26
        packet.m_tyreSetData[1].m_usableLife = 30
        packet.m_tyreSetData[1].m_fitted = 1

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None
        assert isinstance(decoded, struct_cls)

        adapter = get_adapter_for_format(year)
        res = adapter.extract_tyre_sets(decoded)

        assert res["car_idx"] == 0
        assert res["fitted_idx"] == 1
        assert len(res["tyre_sets"]) == 20
        assert res["tyre_sets"][0]["wear"] == 45
        assert res["tyre_sets"][1]["wear"] == 20
        assert res["tyre_sets"][1]["fitted"] is True
        assert res["tyre_sets"][1]["life_span"] == 26

    # ── 13. Time Trial Packet (ID 14) ──> PB & Rival Time Trial Delta
    @pytest.mark.parametrize("year,struct_cls", [
        (2023, packet_structs_23.PacketTimeTrialData),
        (2025, packet_structs_25.PacketTimeTrialData),
    ])
    def test_time_trial_packet_cross_version(self, year, struct_cls):
        packet = struct_cls()
        packet.m_header.m_packetFormat = year
        packet.m_header.m_packetId = 14

        # Personal Best
        packet.m_personalBestDataSet.m_carIdx = 0
        packet.m_personalBestDataSet.m_lapTimeInMS = 76540
        packet.m_personalBestDataSet.m_sector1TimeInMS = 23800
        packet.m_personalBestDataSet.m_sector2TimeInMS = 27400
        packet.m_personalBestDataSet.m_sector3TimeInMS = 25340
        packet.m_personalBestDataSet.m_valid = 1

        # Rival
        packet.m_rivalDataSet.m_carIdx = 1
        packet.m_rivalDataSet.m_lapTimeInMS = 76210
        packet.m_rivalDataSet.m_sector1TimeInMS = 23650
        packet.m_rivalDataSet.m_sector2TimeInMS = 27350
        packet.m_rivalDataSet.m_sector3TimeInMS = 25210
        packet.m_rivalDataSet.m_valid = 1

        raw_bytes = bytes(packet)
        decoded = PacketDecoder.decode(raw_bytes)
        assert decoded is not None
        assert isinstance(decoded, struct_cls)

        adapter = get_adapter_for_format(year)
        res = adapter.extract_time_trial(decoded)

        assert res["personal_best"]["lap_time_ms"] == 76540
        assert res["personal_best"]["sector_1_ms"] == 23800
        assert res["rival"]["lap_time_ms"] == 76210
        assert res["rival"]["sector_1_ms"] == 23650




class TestRecordedFrameReplayToWidgets:
    """
    Simulates the exact end-to-end recorded frame pipeline:
    Binary Packet -> Decoder -> Universal Adapter -> Socket.IO Emit Payload -> Frontend Store Selectors -> Rendered Values.
    Proves that live packets produce non-zero/non-default rendered values in every newly-live widget.
    """

    def test_status_bar_recorded_frame_replay(self):
        """
        StatusBar: Weather code -> label, temps, safety car / FIA flag, session elapsed timer.
        """
        packet = packet_structs_23.PacketSessionData()
        packet.m_header.m_packetFormat = 2023
        packet.m_header.m_packetId = 1
        packet.m_trackId = 5  # Monaco
        packet.m_weather = 1  # Light Cloud
        packet.m_trackTemperature = 43
        packet.m_airTemperature = 29
        packet.m_sessionDuration = 7200
        packet.m_sessionTimeLeft = 4500
        packet.m_safetyCarStatus = 1  # Full Safety Car

        decoded = PacketDecoder.decode(bytes(packet))
        adapter = get_adapter_for_format(2023)
        session_dict = adapter.extract_session(decoded)

        # Emulated Socket.IO payload emitted by main.py
        socket_payload = {
            "trackId": session_dict["track_id"],
            "weather": session_dict["weather"],
            "totalLaps": session_dict["total_laps"],
            "trackLength": session_dict["track_length"],
            "trackTemp": session_dict["track_temperature"],
            "airTemp": session_dict["air_temperature"],
            "sessionDuration": session_dict["session_duration"],
            "sessionTimeLeft": session_dict["session_time_left"],
            "safetyCarStatus": session_dict["safety_car_status"],
        }

        # Track and Weather string maps matching ui/src/utils/constants.ts
        track_map = {5: "Monaco", 14: "Abu Dhabi", 10: "Spa"}
        weather_map = {0: "Clear", 1: "Light Cloud", 2: "Overcast", 3: "Light Rain", 4: "Heavy Rain", 5: "Storm"}

        rendered_track = track_map.get(socket_payload["trackId"], f"TRACK {socket_payload['trackId']}")
        rendered_weather = weather_map.get(socket_payload["weather"], f"CODE {socket_payload['weather']}")
        rendered_temps = f"{socket_payload['trackTemp']}°C TRK · {socket_payload['airTemp']}°C AIR"
        elapsed_s = socket_payload["sessionDuration"] - socket_payload["sessionTimeLeft"]
        rendered_clock = f"{elapsed_s // 60:02d}:{elapsed_s % 60:02d}.00"
        flag_label = "Full Safety Car" if socket_payload["safetyCarStatus"] == 1 else "Track clear"


        assert rendered_track == "Monaco"
        assert rendered_weather == "Light Cloud"
        assert rendered_temps == "43°C TRK · 29°C AIR"
        assert rendered_clock == "45:00.00"
        assert flag_label == "Full Safety Car"

    def test_battle_panel_recorded_frame_replay(self):
        """
        BattlePanel: Real driver name, real deltaToFrontMs in seconds, real sector times.
        """
        # Lap packet
        lap_pkt = packet_structs_23.PacketLapData()
        lap_pkt.m_header.m_packetFormat = 2023
        lap_pkt.m_header.m_packetId = 2
        lap = lap_pkt.m_lapData[0]
        lap.m_carPosition = 2
        lap.m_deltaToCarInFrontMSPart = 1840
        lap.m_deltaToCarInFrontMinutesPart = 0
        lap.m_sector1TimeMSPart = 4250
        lap.m_sector1TimeMinutesPart = 1  # 64250 ms = 64.250s
        lap.m_sector2TimeMSPart = 28310
        lap.m_sector2TimeMinutesPart = 0  # 28310 ms = 28.310s

        # Participants packet
        part_pkt = packet_structs_23.PacketParticipantsData()
        part_pkt.m_header.m_packetFormat = 2023
        part_pkt.m_header.m_packetId = 4
        part_pkt.m_numActiveCars = 2
        part_pkt.m_participants[0].m_name = b"L. HAMILTON\x00"

        adapter = get_adapter_for_format(2023)
        lap_dict = adapter.extract_lap_data(PacketDecoder.decode(bytes(lap_pkt)), 0)
        part_dict = adapter.extract_participants(PacketDecoder.decode(bytes(part_pkt)))

        # Emulated BattlePanel.tsx rendering calculations
        gap_ahead_s = lap_dict["delta_to_front_ms"] / 1000.0
        s1_rendered = f"{lap_dict['sector_1_ms'] / 1000.0:.3f}"
        s2_rendered = f"{lap_dict['sector_2_ms'] / 1000.0:.3f}"
        driver_ahead_name = part_dict["participants"][0]["name"]

        assert gap_ahead_s == 1.84
        assert s1_rendered == "64.250"
        assert s2_rendered == "28.310"
        assert driver_ahead_name == "L. HAMILTON"

    def test_track_map_recorded_frame_replay(self):
        """
        TrackMap: Real yaw heading angle and world position coordinates from Motion packet.
        """
        pkt = packet_structs_23.PacketMotionData()
        pkt.m_header.m_packetFormat = 2023
        pkt.m_header.m_packetId = 0
        motion = pkt.m_carMotionData[0]
        motion.m_worldPositionX = 142.8
        motion.m_worldPositionY = 15.2
        motion.m_worldPositionZ = -820.4
        motion.m_yaw = 1.95  # radians

        adapter = get_adapter_for_format(2023)
        mot_dict = adapter.extract_motion(PacketDecoder.decode(bytes(pkt)), 0)

        # TrackMap uses yaw for car chevron orientation
        assert mot_dict["yaw"] == pytest.approx(1.95, abs=1e-3)
        assert mot_dict["world_pos_x"] == pytest.approx(142.8, abs=0.1)
        assert mot_dict["world_pos_z"] == pytest.approx(-820.4, abs=0.1)

    def test_bottom_instruments_recorded_frame_replay(self):
        """
        BottomInstruments: Real front brake bias (%) and 4-corner tyre pressures (PSI).
        """
        # Car Status
        stat_pkt = packet_structs_23.PacketCarStatusData()
        stat_pkt.m_header.m_packetFormat = 2023
        stat_pkt.m_header.m_packetId = 7
        stat_pkt.m_carStatusData[0].m_frontBrakeBias = 58

        # Car Telemetry
        telem_pkt = packet_structs_23.PacketCarTelemetryData()
        telem_pkt.m_header.m_packetFormat = 2023
        telem_pkt.m_header.m_packetId = 6
        telem_pkt.m_carTelemetryData[0].m_tyresPressure[0] = 23.4
        telem_pkt.m_carTelemetryData[0].m_tyresPressure[1] = 23.6
        telem_pkt.m_carTelemetryData[0].m_tyresPressure[2] = 21.2
        telem_pkt.m_carTelemetryData[0].m_tyresPressure[3] = 21.5

        adapter = get_adapter_for_format(2023)
        stat_dict = adapter.extract_car_status(PacketDecoder.decode(bytes(stat_pkt)), 0)
        telem_dict = adapter.extract_telemetry(PacketDecoder.decode(bytes(telem_pkt)), 0)

        rendered_bias_text = f"{stat_dict['front_brake_bias']:.1f}"
        rendered_psi = [f"{p:.1f}" for p in telem_dict["tyres_pressure"]]

        assert rendered_bias_text == "58.0"
        assert rendered_psi == ["23.4", "23.6", "21.2", "21.5"]

    def test_race_car_telemetry_recorded_frame_replay(self):
        """
        RaceCarTelemetry: Real tyre compound, tyre age in laps, inner temps, and brake rotor temps.
        """
        stat_pkt = packet_structs_23.PacketCarStatusData()
        stat_pkt.m_header.m_packetFormat = 2023
        stat_pkt.m_header.m_packetId = 7
        stat_pkt.m_carStatusData[0].m_visualTyreCompound = 16  # Soft
        stat_pkt.m_carStatusData[0].m_actualTyreCompound = 16  # C5 Soft
        stat_pkt.m_carStatusData[0].m_tyresAgeLaps = 12

        telem_pkt = packet_structs_23.PacketCarTelemetryData()
        telem_pkt.m_header.m_packetFormat = 2023
        telem_pkt.m_header.m_packetId = 6
        telem = telem_pkt.m_carTelemetryData[0]
        telem.m_tyresInnerTemperature[0] = 106
        telem.m_tyresInnerTemperature[1] = 108
        telem.m_tyresInnerTemperature[2] = 101
        telem.m_tyresInnerTemperature[3] = 102
        telem.m_brakesTemperature[0] = 620
        telem.m_brakesTemperature[1] = 630
        telem.m_brakesTemperature[2] = 480
        telem.m_brakesTemperature[3] = 490

        adapter = get_adapter_for_format(2023)
        stat_dict = adapter.extract_car_status(PacketDecoder.decode(bytes(stat_pkt)), 0)
        telem_dict = adapter.extract_telemetry(PacketDecoder.decode(bytes(telem_pkt)), 0)

        assert stat_dict["tyre_compound"] == "C5 (Soft)"
        assert stat_dict["visual_tyre_compound"] == 16
        assert stat_dict["tyres_age_laps"] == 12
        assert telem_dict["tyre_inner_temps"] == [106, 108, 101, 102]
        assert telem_dict["brakes_temperature"] == [620, 630, 480, 490]

    def test_race_car_telemetry_tyre_wear_recorded_frame_replay(self):
        """
        RaceCarTelemetry: Real 4-corner tyre wear percentages from Car Damage packet.
        """
        dam_pkt = packet_structs_23.PacketCarDamageData()
        dam_pkt.m_header.m_packetFormat = 2023
        dam_pkt.m_header.m_packetId = 10
        dam_pkt.m_header.m_playerCarIndex = 0

        dam = dam_pkt.m_carDamageData[0]
        dam.m_tyresWear[0] = 14.6
        dam.m_tyresWear[1] = 16.2
        dam.m_tyresWear[2] = 22.8
        dam.m_tyresWear[3] = 24.1

        adapter = get_adapter_for_format(2023)
        dam_dict = adapter.extract_car_damage(PacketDecoder.decode(bytes(dam_pkt)), 0)

        # Emulated Socket.IO payload emitted by main.py
        socket_payload = {
            "tyresWear": dam_dict["tyres_wear"],
            "frontLeftWingDamage": dam_dict["front_left_wing_damage"],
        }

        # Emulated RaceCarTelemetry rendering
        rendered_wear = [f"{round(w)}%" for w in socket_payload["tyresWear"]]
        avg_wear = f"{round(sum(socket_payload['tyresWear']) / 4)}%"

        assert rendered_wear == ["15%", "16%", "23%", "24%"]
        assert avg_wear == "19%"

    def test_delta_bar_session_history_recorded_frame_replay(self):
        """
        DeltaBar: Real personal best lap from Session History calculates live delta against personal best.
        """
        hist_pkt = packet_structs_23.PacketSessionHistoryData()
        hist_pkt.m_header.m_packetFormat = 2023
        hist_pkt.m_header.m_packetId = 11
        hist_pkt.m_carIdx = 0
        hist_pkt.m_numLaps = 2
        hist_pkt.m_bestLapTimeLapNum = 1
        hist_pkt.m_lapHistoryData[0].m_lapTimeInMS = 78450  # Best lap: 78.450s

        adapter = get_adapter_for_format(2023)
        hist_dict = adapter.extract_session_history(PacketDecoder.decode(bytes(hist_pkt)))

        # Emulated current live lap time in lap packet
        current_lap_time_ms = 78150  # 300ms faster than PB

        best_lap_idx = hist_dict["best_lap_time_lap_num"] - 1
        best_lap_ms = hist_dict["laps"][best_lap_idx]["lap_time_ms"]
        delta_ms = current_lap_time_ms - best_lap_ms  # -300 ms (-0.300s)

        # Emulated DeltaBar rendering
        delta_s = delta_ms / 1000.0
        sign = "+" if delta_s >= 0 else "−"
        rendered_delta = f"{sign}{abs(delta_s):.3f}"
        is_purple = delta_s < -0.20

        assert delta_ms == -300
        assert rendered_delta == "−0.300"
        assert is_purple is True  # Purple delta for -0.300s

    def test_battle_panel_session_history_sector3_and_stint_replay(self):
        """
        BattlePanel: Real Sector 3 time and stint count from Session History.
        """
        hist_pkt = packet_structs_23.PacketSessionHistoryData()
        hist_pkt.m_header.m_packetFormat = 2023
        hist_pkt.m_header.m_packetId = 11
        hist_pkt.m_numLaps = 1
        hist_pkt.m_numTyreStints = 2

        lap = hist_pkt.m_lapHistoryData[0]
        lap.m_sector3TimeMinutesPart = 0
        lap.m_sector3TimeMSPart = 25840  # 25.840s

        adapter = get_adapter_for_format(2023)
        hist_dict = adapter.extract_session_history(PacketDecoder.decode(bytes(hist_pkt)))

        s3_ms = hist_dict["laps"][0]["sector_3_ms"]
        num_stints = hist_dict["num_tyre_stints"]

        # Emulated SectorChips rendering
        s3_rendered = f"{s3_ms / 1000.0:.3f}"
        stint_rendered = f"STINT {num_stints}"

        assert s3_rendered == "25.840"
        assert stint_rendered == "STINT 2"

    def test_setup_matrix_recorded_frame_replay(self):
        """
        SetupMatrixSliders: Real front wing, rear ARB, on-throttle differential, and brake bias from Car Setups packet.
        """
        setup_pkt = packet_structs_23.PacketCarSetupData()
        setup_pkt.m_header.m_packetFormat = 2023
        setup_pkt.m_header.m_packetId = 5
        setup_pkt.m_header.m_playerCarIndex = 0

        setup = setup_pkt.m_carSetups[0]
        setup.m_frontWing = 28
        setup.m_rearWing = 24
        setup.m_rearAntiRollBar = 3
        setup.m_frontAntiRollBar = 9
        setup.m_onThrottle = 65
        setup.m_brakeBias = 56

        adapter = get_adapter_for_format(2023)
        setup_dict = adapter.extract_car_setups(PacketDecoder.decode(bytes(setup_pkt)), 0)

        # Emulated Socket.IO payload emitted by main.py
        socket_payload = {
            "frontWing": setup_dict["front_wing"],
            "rearWing": setup_dict["rear_wing"],
            "rearAntiRollBar": setup_dict["rear_anti_roll_bar"],
            "frontAntiRollBar": setup_dict["front_anti_roll_bar"],
            "onThrottle": setup_dict["on_throttle"],
            "brakeBias": setup_dict["brake_bias"],
        }

        # Emulated SetupMatrixSliders rendering
        front_wing_rendered = f"{socket_payload['frontWing']}"
        rear_arb_rendered = f"{socket_payload['rearAntiRollBar']}"
        diff_lock_rendered = f"{socket_payload['onThrottle']}%"
        brake_bias_rendered = f"{socket_payload['brakeBias']}%"

        assert front_wing_rendered == "28"
        assert rear_arb_rendered == "3"
        assert diff_lock_rendered == "65%"
        assert brake_bias_rendered == "56%"

    def test_motion_ex_recorded_frame_replay(self):
        """
        Chassis dynamics & suspension: Real 4-corner suspension position and wheel slip ratios from Motion Ex packet.
        """
        mot_ex_pkt = packet_structs_23.PacketMotionExData()
        mot_ex_pkt.m_header.m_packetFormat = 2023
        mot_ex_pkt.m_header.m_packetId = 13

        for i, val in enumerate([12.4, 12.8, 18.2, 18.5]):
            mot_ex_pkt.m_suspensionPosition[i] = val
        for i, val in enumerate([0.04, 0.04, 0.08, 0.09]):
            mot_ex_pkt.m_wheelSlipRatio[i] = val
            mot_ex_pkt.m_wheelSlipAngle[i] = val * 0.5

        adapter = get_adapter_for_format(2023)
        mot_ex_dict = adapter.extract_motion_ex(PacketDecoder.decode(bytes(mot_ex_pkt)))

        # Emulated Socket.IO payload emitted by main.py
        socket_payload = {
            "suspensionPosition": mot_ex_dict["suspension_position"],
            "wheelSlipRatio": mot_ex_dict["wheel_slip_ratio"],
            "wheelSlipAngle": mot_ex_dict["wheel_slip_angle"],
        }

        # Emulated chassis suspension travel & slip indicators
        susp_pos_fl = f"{socket_payload['suspensionPosition'][0]:.1f} mm"
        slip_ratio_rr = f"{socket_payload['wheelSlipRatio'][3] * 100.0:.1f}%"

        assert susp_pos_fl == "12.4 mm"
        assert slip_ratio_rr == "9.0%"

    def test_status_bar_event_recorded_frame_replay(self):
        """
        StatusBar: Real fastest lap and penalty events render dedicated status indicators.
        """
        pkt = packet_structs_23.PacketEventData()
        pkt.m_header.m_packetFormat = 2023
        pkt.m_header.m_packetId = 3
        pkt.m_eventStringCode = (ctypes.c_uint8 * 4)(*b"FTLP")
        pkt.m_eventDetails.FastestLap.m_vehicleIdx = 0
        pkt.m_eventDetails.FastestLap.m_lapTime = 78.450

        adapter = get_adapter_for_format(2023)
        event_dict = adapter.extract_event(PacketDecoder.decode(bytes(pkt)))

        # Emulated Socket.IO payload emitted by main.py
        socket_payload = {
            "eventType": event_dict["event_type"],
            "lapTime": event_dict["lap_time"],
        }

        # Emulated StatusBar active race event pill
        rendered_event_text = f"FASTEST LAP: {socket_payload['lapTime']:.3f}s"
        assert rendered_event_text == "FASTEST LAP: 78.450s"

    def test_tyre_strategy_window_recorded_frame_replay(self):
        """
        TyreStrategyWindow: Real fitted tyre set wear %, lifespan, and usable life from Tyre Sets packet.
        """
        pkt = packet_structs_23.PacketTyreSetsData()
        pkt.m_header.m_packetFormat = 2023
        pkt.m_header.m_packetId = 12
        pkt.m_carIdx = 0
        pkt.m_fittedIdx = 0

        pkt.m_tyreSetData[0].m_actualTyreCompound = 16
        pkt.m_tyreSetData[0].m_visualTyreCompound = 16
        pkt.m_tyreSetData[0].m_wear = 34
        pkt.m_tyreSetData[0].m_lifeSpan = 24
        pkt.m_tyreSetData[0].m_usableLife = 28
        pkt.m_tyreSetData[0].m_fitted = 1

        adapter = get_adapter_for_format(2023)
        tyre_sets_dict = adapter.extract_tyre_sets(PacketDecoder.decode(bytes(pkt)))

        # Emulated Socket.IO payload emitted by main.py
        fitted_set = tyre_sets_dict["tyre_sets"][tyre_sets_dict["fitted_idx"]]
        socket_payload = {
            "wear": fitted_set["wear"],
            "lifeSpan": fitted_set["life_span"],
            "usableLife": fitted_set["usable_life"],
        }

        # Emulated TyreStrategyWindow rendering
        rendered_pill = f"FITTED SET: {socket_payload['wear']}% WEAR"
        rendered_stint = f"STINT LAP 16 / {socket_payload['lifeSpan']}"
        rendered_cliff = f"WEAR CLIFF: ~LAP {socket_payload['usableLife']}"

        assert rendered_pill == "FITTED SET: 34% WEAR"
        assert rendered_stint == "STINT LAP 16 / 24"
        assert rendered_cliff == "WEAR CLIFF: ~LAP 28"

    def test_time_trial_recorded_frame_replay(self):
        """
        TimeTrial: Real personal best vs rival delta calculations.
        """
        pkt = packet_structs_23.PacketTimeTrialData()
        pkt.m_header.m_packetFormat = 2023
        pkt.m_header.m_packetId = 14

        pkt.m_personalBestDataSet.m_lapTimeInMS = 76540
        pkt.m_rivalDataSet.m_lapTimeInMS = 76210

        adapter = get_adapter_for_format(2023)
        tt_dict = adapter.extract_time_trial(PacketDecoder.decode(bytes(pkt)))

        pb_ms = tt_dict["personal_best"]["lap_time_ms"]
        rival_ms = tt_dict["rival"]["lap_time_ms"]
        delta_to_rival_ms = pb_ms - rival_ms  # +330ms (+0.330s behind rival)

        rendered_delta = f"+{delta_to_rival_ms / 1000.0:.3f}s"
        assert rendered_delta == "+0.330s"





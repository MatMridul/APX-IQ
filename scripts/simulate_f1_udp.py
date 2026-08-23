"""
APX-IQ — Real-Time Synthetic F1 UDP Telemetry Generator
========================================================

Transmits high-fidelity binary UDP telemetry packets across all supported
game formats (F1 2020, 2021, 2022, 2023, 2024, 2025) to 127.0.0.1:20777.

Simulates a continuous driving stint on a 5.4km circuit with braking zones,
hairpins, high-speed sweepers, tyre temperature dynamics, and battery usage.

Usage:
    py -3.13 scripts/simulate_f1_udp.py --version 2025 --laps 5 --hz 60
"""

import argparse
import math
import socket
import sys
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ingestion import (
    packet_structs_20,
    packet_structs_21,
    packet_structs_22,
    packet_structs_23,
    packet_structs_25,
)

FORMAT_MAP = {
    2020: packet_structs_20,
    2021: packet_structs_21,
    2022: packet_structs_22,
    2023: packet_structs_23,
    2024: packet_structs_23, # 2024 shares layout with 2023
    2025: packet_structs_25,
}


def run_simulator(version: int = 2025, laps: int = 5, hz: int = 60, host: str = "127.0.0.1", port: int = 20777):
    struct_mod = FORMAT_MAP.get(version, packet_structs_25)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    dt = 1.0 / hz
    track_len = 5412.0 # 5.412km (Bahrain length)
    session_uid = 0xABCD1234EF567890
    player_car_idx = 0

    print(f"[APX-IQ Simulator] Streaming F1 {version} UDP telemetry to {host}:{port} @ {hz}Hz")
    print(f"[APX-IQ Simulator] Target: {laps} laps | Circuit length: {track_len:.0f}m")

    lap_num = 1
    lap_dist = 0.0
    lap_start_time = time.time()
    last_lap_ms = 0
    frame_id = 0
    ers_energy = 4_000_000.0 # 4MJ initial

    while lap_num <= laps:
        now = time.time()
        lap_elapsed_s = now - lap_start_time
        cur_lap_ms = int(lap_elapsed_s * 1000)

        # Physics simulation along track
        progress = (lap_dist % track_len) / track_len
        angle = progress * 2 * math.pi

        # 3 simulated braking zones at 20%, 55%, 85% of track
        in_turn_1 = 0.18 < progress < 0.25
        in_turn_2 = 0.52 < progress < 0.60
        in_turn_3 = 0.82 < progress < 0.88

        if in_turn_1 or in_turn_2 or in_turn_3:
            throttle = 0.0
            brake = 0.85
            speed_kph = 95.0 + 30.0 * math.sin(progress * 40)
            gear = 3
            rpm = 8500
            drs = 0
        else:
            throttle = 1.0
            brake = 0.0
            speed_kph = 295.0 + 35.0 * math.sin(progress * 10)
            gear = 8
            rpm = 12400
            drs = 1 if (0.05 < progress < 0.15 or 0.65 < progress < 0.78) else 0

        # Motion coords
        world_x = 500.0 + 400.0 * math.cos(angle)
        world_y = 500.0 + 300.0 * math.sin(angle) * (1 + 0.3 * math.cos(angle))
        world_z = 0.0

        # Increment distance
        speed_mps = speed_kph / 3.6
        lap_dist += speed_mps * dt

        # Tyre temperatures (°C)
        tyre_temps = [
            int(98 + 4 * math.sin(angle)),
            int(99 + 4 * math.cos(angle)),
            int(104 + (6 if throttle > 0.8 else 0)),
            int(105 + (6 if throttle > 0.8 else 0)),
        ]
        brake_temps = [int(750 if brake > 0.5 else 320)] * 4

        # ERS Energy drain / recharge
        if throttle > 0.8 and not drs:
            ers_energy = max(100_000.0, ers_energy - 15000.0 * dt)
        elif brake > 0.5:
            ers_energy = min(4_000_000.0, ers_energy + 30000.0 * dt)

        # 1. Motion Packet (ID=0)
        try:
            p_motion = struct_mod.PacketMotionData()
            p_motion.m_header.m_packetFormat = version
            p_motion.m_header.m_packetId = struct_mod.PACKET_ID_MOTION
            p_motion.m_header.m_sessionUID = session_uid
            p_motion.m_header.m_frameIdentifier = frame_id
            p_motion.m_header.m_playerCarIndex = player_car_idx

            car_m = p_motion.m_carMotionData[player_car_idx]
            car_m.m_worldPositionX = world_x
            car_m.m_worldPositionY = world_y
            car_m.m_worldPositionZ = world_z
            car_m.m_gForceLateral = 2.5 * math.sin(angle * 3)
            car_m.m_gForceLongitudinal = (1.8 if throttle > 0.5 else -4.2 if brake > 0.5 else 0.0)

            sock.sendto(bytes(p_motion), (host, port))
        except Exception:
            pass

        # 2. Car Telemetry Packet (ID=6)
        try:
            p_telem = struct_mod.PacketCarTelemetryData()
            p_telem.m_header.m_packetFormat = version
            p_telem.m_header.m_packetId = struct_mod.PACKET_ID_CAR_TELEMETRY
            p_telem.m_header.m_sessionUID = session_uid
            p_telem.m_header.m_frameIdentifier = frame_id
            p_telem.m_header.m_playerCarIndex = player_car_idx

            t_data = p_telem.m_carTelemetryData[player_car_idx]
            t_data.m_speed = int(speed_kph)
            t_data.m_throttle = throttle
            t_data.m_brake = brake
            t_data.m_gear = gear
            t_data.m_engineRPM = rpm
            t_data.m_drs = drs
            for idx in range(4):
                t_data.m_tyresSurfaceTemperature[idx] = tyre_temps[idx]
                t_data.m_brakesTemperature[idx] = brake_temps[idx]

            sock.sendto(bytes(p_telem), (host, port))
        except Exception:
            pass

        # 3. Lap Data Packet (ID=2)
        try:
            p_lap = struct_mod.PacketLapData()
            p_lap.m_header.m_packetFormat = version
            p_lap.m_header.m_packetId = struct_mod.PACKET_ID_LAP_DATA
            p_lap.m_header.m_sessionUID = session_uid
            p_lap.m_header.m_frameIdentifier = frame_id
            p_lap.m_header.m_playerCarIndex = player_car_idx

            l_data = p_lap.m_lapData[player_car_idx]
            l_data.m_currentLapNum = lap_num
            l_data.m_lapDistance = lap_dist % track_len
            l_data.m_totalDistance = lap_dist
            l_data.m_carPosition = 1

            if version == 2020:
                l_data.m_currentLapTime = lap_elapsed_s
                l_data.m_lastLapTime = last_lap_ms / 1000.0
            else:
                l_data.m_currentLapTimeInMS = cur_lap_ms
                l_data.m_lastLapTimeInMS = last_lap_ms

            sock.sendto(bytes(p_lap), (host, port))
        except Exception:
            pass

        # Check Lap Crossing
        if lap_dist >= lap_num * track_len:
            last_lap_ms = cur_lap_ms
            print(f"  [Lap {lap_num} Complete] Time: {last_lap_ms/1000.0:.3f}s | Speed: {speed_kph:.0f} km/h")
            lap_num += 1
            lap_start_time = time.time()

        frame_id += 1
        time.sleep(dt)

    print(f"[APX-IQ Simulator] Simulation finished ({laps} laps sent).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="APX-IQ Synthetic F1 UDP Telemetry Generator")
    parser.add_argument("--version", type=int, default=2025, choices=[2020, 2021, 2022, 2023, 2024, 2025], help="F1 Game Format")
    parser.add_argument("--laps", type=int, default=3, help="Number of laps to stream")
    parser.add_argument("--hz", type=int, default=60, help="Packet transmission rate (Hz)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Target host")
    parser.add_argument("--port", type=int, default=20777, help="Target UDP port")

    args = parser.parse_args()
    run_simulator(version=args.version, laps=args.laps, hz=args.hz, host=args.host, port=args.port)

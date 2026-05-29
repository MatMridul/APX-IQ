"""Simulate a complete lap to test lap saving."""
import socket
import time
import struct
import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from ingestion.packet_structs_22 import (
    PacketHeader, PacketCarTelemetryData, CarTelemetryData,
    PacketLapData, LapData, PacketSessionData
)

UDP_IP = "127.0.0.1"
UDP_PORT = 20777

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

print("=" * 60)
print("COMPLETE LAP SIMULATOR")
print("=" * 60)
print("Simulating a full lap with lap boundary crossing...")
print("=" * 60)

session_uid = 99999
track_length = 5000  # 5km track

# Send session packet first
session_pkt = PacketSessionData()
session_pkt.m_header = PacketHeader()
session_pkt.m_header.m_packetFormat = 2022
session_pkt.m_header.m_packetId = 1  # Session
session_pkt.m_header.m_sessionUID = session_uid
session_pkt.m_header.m_playerCarIndex = 0
session_pkt.m_trackId = 0  # Melbourne
session_pkt.m_trackLength = track_length
session_pkt.m_totalLaps = 5

sock.sendto(bytes(session_pkt), (UDP_IP, UDP_PORT))
print("📍 Sent session packet (Melbourne, 5 laps)")
time.sleep(0.1)

# Simulate lap 1 - full lap
lap_num = 1
for distance in range(0, track_length + 500, 50):  # Go past finish line
    # Lap Data packet
    lap_pkt = PacketLapData()
    lap_pkt.m_header = PacketHeader()
    lap_pkt.m_header.m_packetFormat = 2022
    lap_pkt.m_header.m_packetId = 2  # Lap Data
    lap_pkt.m_header.m_sessionUID = session_uid
    lap_pkt.m_header.m_playerCarIndex = 0
    
    lap_data = lap_pkt.m_lapData[0]
    
    # Simulate lap crossing
    if distance > track_length:
        lap_data.m_lapDistance = distance - track_length  # Reset distance
        lap_data.m_currentLapNum = lap_num + 1
    else:
        lap_data.m_lapDistance = float(distance)
        lap_data.m_currentLapNum = lap_num
    
    lap_data.m_totalDistance = float(distance)
    lap_data.m_currentLapInvalid = 0
    lap_data.m_carPosition = 1
    lap_data.m_currentLapTimeInMS = int((distance / track_length) * 90000)  # 90s lap
    
    sock.sendto(bytes(lap_pkt), (UDP_IP, UDP_PORT))
    
    # Telemetry packet
    telem_pkt = PacketCarTelemetryData()
    telem_pkt.m_header = PacketHeader()
    telem_pkt.m_header.m_packetFormat = 2022
    telem_pkt.m_header.m_packetId = 6  # Telemetry
    telem_pkt.m_header.m_sessionUID = session_uid
    telem_pkt.m_header.m_playerCarIndex = 0
    
    car_data = telem_pkt.m_carTelemetryData[0]
    car_data.m_speed = int(150 + (distance % 1000) / 10)  # Varying speed
    car_data.m_throttle = 0.8
    car_data.m_brake = 0.0
    car_data.m_steer = 0.0
    car_data.m_gear = 5
    car_data.m_engineRPM = 9000
    car_data.m_drs = 0
    
    for j in range(4):
        car_data.m_tyresSurfaceTemperature[j] = 90
    
    sock.sendto(bytes(telem_pkt), (UDP_IP, UDP_PORT))
    
    if distance % 500 == 0:
        print(f"\r🏎️  Distance: {distance}m / {track_length}m | Lap: {lap_num}", end="", flush=True)
    
    time.sleep(0.02)  # 50Hz

print("\n" + "=" * 60)
print("✅ Lap complete! Check the API for saved laps.")
print("   Visit: http://localhost:8000/telemetry/laps/completed")
print("=" * 60)
sock.close()

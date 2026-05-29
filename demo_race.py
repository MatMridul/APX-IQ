"""
APX-IQ Demo Race Simulator
Simulates a complete F1 race with realistic telemetry for video recording.
"""
import socket
import time
import sys
from pathlib import Path
import math
import io

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from ingestion.packet_structs_22 import (
    PacketHeader, PacketCarTelemetryData, CarTelemetryData,
    PacketLapData, LapData, PacketSessionData, PacketMotionData
)

UDP_IP = "127.0.0.1"
UDP_PORT = 20777

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

print("=" * 70)
print("🏎️  APX-IQ DEMO RACE SIMULATOR")
print("=" * 70)
print("Simulating a realistic F1 race with 3 laps...")
print("Watch your dashboard come alive!")
print("=" * 70)

session_uid = 123456
track_length = 5364  # Melbourne circuit length in meters
total_laps = 3

# Send session packet
session_pkt = PacketSessionData()
session_pkt.m_header = PacketHeader()
session_pkt.m_header.m_packetFormat = 2022
session_pkt.m_header.m_packetId = 1
session_pkt.m_header.m_sessionUID = session_uid
session_pkt.m_header.m_playerCarIndex = 0
session_pkt.m_trackId = 0  # Melbourne
session_pkt.m_trackLength = track_length
session_pkt.m_totalLaps = total_laps
session_pkt.m_weather = 0  # Clear

sock.sendto(bytes(session_pkt), (UDP_IP, UDP_PORT))
print(f"\n📍 Session started: Melbourne, {total_laps} laps")
time.sleep(0.5)

# Simulate 3 complete laps
for lap_num in range(1, total_laps + 1):
    print(f"\n🏁 LAP {lap_num}/{total_laps}")
    
    lap_start_time = time.time()
    lap_duration = 240  # ~4 minutes per lap (240 seconds)
    
    # Simulate lap with varying speed profile
    for i in range(0, track_length + 500, 25):
        elapsed = time.time() - lap_start_time
        progress = min(i / track_length, 1.0)
        
        # Realistic speed profile (slow corners, fast straights)
        base_speed = 150
        corner_factor = math.sin(progress * math.pi * 4) * 0.3 + 0.7
        speed = base_speed + (progress * 50) * corner_factor
        
        # Throttle and brake based on position
        if progress < 0.3:
            throttle = 0.9
            brake = 0.0
        elif progress < 0.5:
            throttle = 0.3
            brake = 0.7
        elif progress < 0.7:
            throttle = 0.95
            brake = 0.0
        else:
            throttle = 0.8
            brake = 0.2
        
        # Gear selection based on speed
        if speed < 100:
            gear = 3
        elif speed < 150:
            gear = 4
        elif speed < 200:
            gear = 5
        elif speed < 250:
            gear = 6
        else:
            gear = 7
        
        # RPM based on gear and speed
        rpm = int(3000 + (speed * 30))
        
        # Steering input (smooth curves)
        steer = math.sin(progress * math.pi * 6) * 0.5
        
        # Tyre temperatures (heat up during lap)
        tyre_temp = 80 + (progress * 30)
        
        # Lap Data packet
        lap_pkt = PacketLapData()
        lap_pkt.m_header = PacketHeader()
        lap_pkt.m_header.m_packetFormat = 2022
        lap_pkt.m_header.m_packetId = 2
        lap_pkt.m_header.m_sessionUID = session_uid
        lap_pkt.m_header.m_playerCarIndex = 0
        
        lap_data = lap_pkt.m_lapData[0]
        
        # Handle lap crossing
        if i > track_length:
            lap_data.m_lapDistance = float(i - track_length)
            lap_data.m_currentLapNum = lap_num + 1
        else:
            lap_data.m_lapDistance = float(i)
            lap_data.m_currentLapNum = lap_num
        
        lap_data.m_totalDistance = float((lap_num - 1) * track_length + i)
        lap_data.m_currentLapInvalid = 0
        lap_data.m_carPosition = 1
        lap_data.m_currentLapTimeInMS = int(elapsed * 1000)
        lap_data.m_lastLapTimeInMS = int(lap_duration * 1000) if lap_num > 1 else 0
        
        # Sector times
        if progress < 0.33:
            lap_data.m_sector1TimeInMS = int(elapsed * 1000)
        elif progress < 0.66:
            lap_data.m_sector2TimeInMS = int((elapsed - 30) * 1000)
        
        sock.sendto(bytes(lap_pkt), (UDP_IP, UDP_PORT))
        
        # Telemetry packet
        telem_pkt = PacketCarTelemetryData()
        telem_pkt.m_header = PacketHeader()
        telem_pkt.m_header.m_packetFormat = 2022
        telem_pkt.m_header.m_packetId = 6
        telem_pkt.m_header.m_sessionUID = session_uid
        telem_pkt.m_header.m_playerCarIndex = 0
        
        car_data = telem_pkt.m_carTelemetryData[0]
        car_data.m_speed = int(speed)
        car_data.m_throttle = throttle
        car_data.m_brake = brake
        car_data.m_steer = steer
        car_data.m_gear = gear
        car_data.m_engineRPM = rpm
        car_data.m_drs = 1 if progress > 0.7 else 0
        
        # Tyre temperatures
        for j in range(4):
            car_data.m_tyresSurfaceTemperature[j] = int(tyre_temp + (j * 2))
        
        sock.sendto(bytes(telem_pkt), (UDP_IP, UDP_PORT))
        
        # Motion packet
        motion_pkt = PacketMotionData()
        motion_pkt.m_header = PacketHeader()
        motion_pkt.m_header.m_packetFormat = 2022
        motion_pkt.m_header.m_packetId = 0
        motion_pkt.m_header.m_sessionUID = session_uid
        motion_pkt.m_header.m_playerCarIndex = 0
        
        car_motion = motion_pkt.m_carMotionData[0]
        car_motion.m_worldPositionX = progress * 1000
        car_motion.m_worldPositionY = math.sin(progress * math.pi * 4) * 100
        car_motion.m_worldPositionZ = 0
        car_motion.m_gForceLateral = math.sin(progress * math.pi * 6) * 2
        car_motion.m_gForceLongitudinal = (throttle - brake) * 2
        
        sock.sendto(bytes(motion_pkt), (UDP_IP, UDP_PORT))
        
        # Progress display
        bar_length = 40
        filled = int(bar_length * progress)
        bar = "█" * filled + "░" * (bar_length - filled)
        print(f"\r  [{bar}] {progress*100:.0f}% | Speed: {speed:.0f} km/h | Gear: {gear} | RPM: {rpm}", end="", flush=True)
        
        # Simulate 60Hz packet rate
        time.sleep(1/60)
    
    print(f"\n  ✅ Lap {lap_num} complete! Time: {lap_duration:.1f}s")
    time.sleep(1)

print("\n" + "=" * 70)
print("🏁 RACE COMPLETE!")
print("=" * 70)
print("✅ Demo finished successfully!")
print("📊 Check your dashboard for:")
print("   • Real-time telemetry data")
print("   • Lap recordings")
print("   • Speed/RPM graphs")
print("   • Tyre temperatures")
print("=" * 70)

sock.close()

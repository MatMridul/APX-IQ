import sys
import os
import socket
import struct
import time
import math

# Add parent directory to path to allow importing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion import packet_structs_25

def create_header(packet_id, version=1):
    header = packet_structs_25.PacketHeader()
    header.m_packetFormat = 2025
    header.m_gameMajorVersion = 1
    header.m_gameMinorVersion = 5
    header.m_packetVersion = version
    header.m_packetId = packet_id
    header.m_sessionUID = 123456789
    header.m_sessionTime = time.time()
    header.m_frameIdentifier = 1
    header.m_overallFrameIdentifier = 1 
    header.m_playerCarIndex = 0
    header.m_secondaryPlayerCarIndex = 255
    return header

def send_packet(sock, addr, packet_struct):
    try:
        sock.sendto(packet_struct, addr)
    except Exception as e:
        print(f"Error sending packet {packet_struct.m_header.m_packetId}: {e}")

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    addr = ("127.0.0.1", 20777)

    print("Sending simulated F1 25 packets (Looping)... Press Ctrl+C to stop.")

    # State variables for simulation
    speed = 0
    rpm = 0
    gear = 1
    lap_time = 0
    lap_num = 1
    frame_count = 0
    
    try:
        while True:
            frame_count += 1
            if frame_count % 60 == 0:
                print(f"Simulating... Frame {frame_count} Speed={int(speed)} RPM={int(rpm)}")

            # Update Simulation State
            rpm += 100
            if rpm > 12000:
                rpm = 4000
                gear = (gear % 8) + 1
            
            speed = rpm / 40 # Rough approximation
            lap_time += 16 # ~16ms per frame
            
            # --- 1. Car Telemetry (ID=6) ---
            telemetry = packet_structs_25.PacketCarTelemetryData()
            telemetry.m_header = create_header(packet_structs_25.PACKET_ID_CAR_TELEMETRY)
            
            # Update Player Car (Index 0)
            telemetry.m_carTelemetryData[0].m_speed = int(speed)
            telemetry.m_carTelemetryData[0].m_engineRPM = int(rpm)
            telemetry.m_carTelemetryData[0].m_gear = gear
            telemetry.m_carTelemetryData[0].m_throttle = 1.0 if rpm < 11000 else 0.0
            telemetry.m_carTelemetryData[0].m_brake = 0.0
            telemetry.m_carTelemetryData[0].m_drs = 1 if speed > 250 else 0
            
            # Dummy temps
            for i in range(4):
                telemetry.m_carTelemetryData[0].m_tyresSurfaceTemperature[i] = 90 + (i * 2)

            send_packet(sock, addr, telemetry)

            # --- 2. Lap Data (ID=2) ---
            lap = packet_structs_25.PacketLapData()
            lap.m_header = create_header(packet_structs_25.PACKET_ID_LAP_DATA)
            lap.m_lapData[0].m_currentLapTimeInMS = int(lap_time)
            lap.m_lapData[0].m_currentLapNum = lap_num
            lap.m_lapData[0].m_lastLapTimeInMS = 85000 # 1:25.000
            lap.m_lapData[0].m_position = 1
            
            send_packet(sock, addr, lap)
            
            # --- 3. Car Status (ID=7) - Less frequent ---
            if rpm % 1000 == 0:
                status = packet_structs_25.PacketCarStatusData()
                status.m_header = create_header(packet_structs_25.PACKET_ID_CAR_STATUS)
                status.m_carStatusData[0].m_fuelInTank = 10.0 - (lap_time / 1000000)
                status.m_carStatusData[0].m_fuelRemainingLaps = 15.5
                status.m_carStatusData[0].m_maxRPM = 13000
                send_packet(sock, addr, status)

            # --- 4. Session (ID=1) - Less frequent ---
            if rpm % 5000 == 0:
                session = packet_structs_25.PacketSessionData()
                session.m_header = create_header(packet_structs_25.PACKET_ID_SESSION)
                session.m_totalLaps = 50
                session.m_trackId = 1
                session.m_sessionType = 10 # Race
                send_packet(sock, addr, session)

            # 60Hz loop
            time.sleep(0.016)

    except KeyboardInterrupt:
        print("\nSimulation stopped.")

if __name__ == "__main__":
    main()

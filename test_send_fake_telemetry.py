"""Send fake F1 telemetry packets to test the pipeline."""
import socket
import time
import struct
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from ingestion.packet_structs_22 import PacketHeader, PacketCarTelemetryData, CarTelemetryData

UDP_IP = "127.0.0.1"
UDP_PORT = 20777

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

print("=" * 60)
print("FAKE TELEMETRY SENDER")
print("=" * 60)
print(f"Sending to {UDP_IP}:{UDP_PORT}")
print("Simulating car driving...")
print("=" * 60)

# Create a fake telemetry packet
speed = 100
gear = 3
rpm = 8000

for i in range(300):  # Send 300 packets (5 seconds at 60Hz)
    # Simulate acceleration
    speed = 100 + (i * 0.5)
    rpm = 8000 + (i * 10)
    gear = min(8, 3 + (i // 50))
    
    # Create header
    header = PacketHeader()
    header.m_packetFormat = 2022
    header.m_packetId = 6  # Car Telemetry
    header.m_sessionUID = 12345
    header.m_sessionTime = float(i)
    header.m_playerCarIndex = 0
    
    # Create telemetry data
    packet = PacketCarTelemetryData()
    packet.m_header = header
    
    # Fill player car data (index 0)
    car_data = packet.m_carTelemetryData[0]
    car_data.m_speed = int(speed)
    car_data.m_throttle = 0.8
    car_data.m_brake = 0.0
    car_data.m_steer = 0.0
    car_data.m_gear = gear
    car_data.m_engineRPM = int(rpm)
    car_data.m_drs = 0
    
    # Set tyre temps
    for j in range(4):
        car_data.m_tyresSurfaceTemperature[j] = 85 + j
    
    # Send packet
    try:
        data = bytes(packet)
        sock.sendto(data, (UDP_IP, UDP_PORT))
        print(f"\r📡 Sent packet {i+1}/300 | Speed: {speed:.0f} km/h | Gear: {gear} | RPM: {rpm:.0f}", end="", flush=True)
    except Exception as e:
        print(f"\n❌ Error sending packet: {e}")
        break
    
    time.sleep(1/60)  # 60Hz

print("\n" + "=" * 60)
print("✅ Test complete! Check your dashboard.")
print("=" * 60)
sock.close()

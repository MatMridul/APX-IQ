import sys
import os
import ctypes

# Add parent directory to path to allow importing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion import packet_structs_25
from ingestion.decoder import PacketDecoder

def create_mock_packet():
    # Create a Car Telemetry Packet (ID 6)
    packet = packet_structs_25.PacketCarTelemetryData()
    packet.m_header.m_packetFormat = 2025
    packet.m_header.m_packetId = 6
    packet.m_header.m_packetVersion = 1
    
    # Set verification values
    packet.m_carTelemetryData[0].m_speed = 300
    packet.m_carTelemetryData[0].m_engineRPM = 11500
    packet.m_carTelemetryData[0].m_gear = 7
    
    return packet

def test_decoding():
    print("--- Testing Packet Decoder ---")
    
    # 1. Create Packet
    mock_packet = create_mock_packet()
    print(f"Created Mock Packet: Format={mock_packet.m_header.m_packetFormat}, ID={mock_packet.m_header.m_packetId}")
    
    # 2. Serialize to bytes
    packet_bytes = bytes(mock_packet)
    print(f"Serialized to {len(packet_bytes)} bytes")
    
    # 3. Decode
    decoded = PacketDecoder.decode(packet_bytes)
    
    # 4. Verify
    if decoded:
        print("✅ Decoding Successful!")
        print(f"Decoded Type: {type(decoded)}")
        
        if hasattr(decoded, 'm_carTelemetryData'):
            speed = decoded.m_carTelemetryData[0].m_speed
            rpm = decoded.m_carTelemetryData[0].m_engineRPM
            print(f"Values -> Speed: {speed} (Exp: 300), RPM: {rpm} (Exp: 11500)")
            
            if speed == 300 and rpm == 11500:
                print("✅ Data Integrity Verified")
            else:
                print("❌ Data Integrity Failed!")
        else:
            print("⚠️ Decoded packet missing carTelemetryData attribute")
            
    else:
        print("❌ Decoding Failed (Returned None)")

if __name__ == "__main__":
    test_decoding()

import socket
import struct
import time
import ctypes
from ingestion import packet_structs_22

def create_header(packet_id):
    header = packet_structs_22.PacketHeader()
    header.m_packetFormat = 2022
    header.m_gameMajorVersion = 1
    header.m_gameMinorVersion = 5
    header.m_packetVersion = 1
    header.m_packetId = packet_id
    header.m_sessionUID = 123456789
    header.m_sessionTime = time.time()
    header.m_frameIdentifier = 1
    header.m_playerCarIndex = 0
    header.m_secondaryPlayerCarIndex = 255
    return header

def send_packet(sock, addr, packet_struct):
    sock.sendto(packet_struct, addr)
    print(f"Sent Packet ID: {packet_struct.m_header.m_packetId}")

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    addr = ("127.0.0.1", 20777)

    print("Sending simulated F1 22 packets...")

    # 1. Session Data
    session = packet_structs_22.PacketSessionData()
    session.m_header = create_header(packet_structs_22.PACKET_ID_SESSION)
    session.m_totalLaps = 50
    session.m_trackId = 1 # Melbourne
    send_packet(sock, addr, session)
    time.sleep(0.1)

    # 2. Car Status
    status = packet_structs_22.PacketCarStatusData()
    status.m_header = create_header(packet_structs_22.PACKET_ID_CAR_STATUS)
    status.m_carStatusData[0].m_fuelInTank = 10.5
    send_packet(sock, addr, status)
    time.sleep(0.1)
    
    # 3. Lap Data
    lap = packet_structs_22.PacketLapData()
    lap.m_header = create_header(packet_structs_22.PACKET_ID_LAP_DATA)
    lap.m_lapData[0].m_currentLapTimeInMS = 1000
    send_packet(sock, addr, lap)
    time.sleep(0.1)

    print("Done.")

if __name__ == "__main__":
    main()

"""Test if UDP packets are being received from F1 game."""
import socket
import time

UDP_IP = "0.0.0.0"
UDP_PORT = 20777

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))
sock.settimeout(5.0)

print("=" * 60)
print("UDP PACKET LISTENER TEST")
print("=" * 60)
print(f"Listening on {UDP_IP}:{UDP_PORT}")
print("Waiting for F1 game packets...")
print("(Press Ctrl+C to stop)")
print("=" * 60)

packet_count = 0
start_time = time.time()

try:
    while True:
        try:
            data, addr = sock.recvfrom(2048)
            packet_count += 1
            elapsed = time.time() - start_time
            rate = packet_count / elapsed if elapsed > 0 else 0
            
            print(f"\r✅ Packets received: {packet_count} | Rate: {rate:.1f} Hz | From: {addr[0]}:{addr[1]}", end="", flush=True)
            
        except socket.timeout:
            print("\n⚠️  No packets received in last 5 seconds")
            print("   Make sure:")
            print("   1. F1 game is running (in a session, not menu)")
            print("   2. UDP Telemetry is ON in game settings")
            print("   3. UDP Port is set to 20777")
            print("   4. UDP IP is set to this PC's IP")
            print("\nWaiting...")
            
except KeyboardInterrupt:
    print("\n\n" + "=" * 60)
    print(f"Test complete: {packet_count} packets received")
    print("=" * 60)
finally:
    sock.close()

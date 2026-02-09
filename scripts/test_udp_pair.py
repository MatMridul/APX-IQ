import socket
import threading
import time

def udp_server():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_address = ('127.0.0.1', 9999)
    print(f"TEST-SERVER: Starting up on {server_address[0]} port {server_address[1]}")
    sock.bind(server_address)
    
    while True:
        print("TEST-SERVER: Waiting to receive message")
        data, address = sock.recvfrom(4096)
        print(f"TEST-SERVER: Received {len(data)} bytes from {address}")
        print(f"TEST-SERVER: Data: {data.decode()}")
        if data:
            break

def run_test():
    # Start Server in Thread
    server_thread = threading.Thread(target=udp_server)
    server_thread.daemon = True
    server_thread.start()
    
    time.sleep(1)
    
    # Client
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_address = ('127.0.0.1', 9999)
    message = b'Hello UDP World!'
    
    try:
        print(f"TEST-CLIENT: Sending {message} to {server_address}")
        sent = sock.sendto(message, server_address)
        print(f"TEST-CLIENT: Sent {sent} bytes")
    finally:
        sock.close()
        
    time.sleep(1)
    print("TEST: Finished")

if __name__ == "__main__":
    run_test()

import socket

def get_ip_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == "__main__":
    ip = get_ip_address()
    print("\n" + "="*40)
    print(f"  YOUR LOCAL IP:  {ip}")
    print("="*40)
    print("  Enter this IP in the F1 25 UDP Settings")
    print("  on your gaming laptop.")
    print("="*40 + "\n")

import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("Connected to APX IQ Backend!")

@sio.event
def connect_error(data):
    print(f"Connection Failed: {data}")

@sio.event
def disconnect():
    print("Disconnected from server")

@sio.event
def game_version(data):
    print(f"[GAME VERSION] {data}")

@sio.event
def telemetry_update(data):
    print(f"[TELEMETRY] Speed: {data.get('speed')} | RPM: {data.get('rpm')}")

@sio.event
def lap_update(data):
    print(f"[LAP DATA] Lap: {data.get('lap')} | Pos: {data.get('position')}")

@sio.event
def session_update(data):
    print(f"[SESSION] Track: {data.get('trackId')} | Weather: {data.get('weather')}")

@sio.event
def car_status_update(data):
    print(f"[CAR STATUS] Fuel: {data.get('fuelInTank')}")

if __name__ == "__main__":
    try:
        sio.connect('http://localhost:3001')
        print("Listening for events... (Press CTRL+C to stop)")
        sio.wait()
    except Exception as e:
        print(f"Error: {e}")

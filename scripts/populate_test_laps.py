"""
Populate Test Laps
==================

Creates sample lap data for testing the intelligence dashboard.
Sends POST requests to the telemetry API to save test laps.

Usage:
    python scripts/populate_test_laps.py
"""

import requests
import numpy as np
import json

API_BASE = "http://localhost:8000"


def generate_lap_telemetry(lap_number: int, track_length: float = 5000.0, num_points: int = 500):
    """
    Generate synthetic telemetry for a lap.
    
    Args:
        lap_number: Lap number
        track_length: Track length in meters
        num_points: Number of telemetry points
    
    Returns:
        List of telemetry points
    """
    telemetry = []
    
    for i in range(num_points):
        # Distance progresses linearly
        distance = (i / num_points) * track_length
        
        # Speed varies with corners (sine wave pattern)
        base_speed = 250
        speed_variation = 80 * np.sin(i / 50)
        speed = max(80, base_speed + speed_variation)
        
        # Throttle inversely related to braking
        throttle = 0.8 + 0.2 * np.sin(i / 50)
        throttle = max(0.0, min(1.0, throttle))
        
        # Brake in corners (when speed drops)
        brake = max(0.0, -0.3 * np.sin(i / 50))
        
        # Steering varies through corners
        steer = 0.15 * np.sin(i / 30)
        steer = max(-1.0, min(1.0, steer))
        
        # Gear based on speed
        if speed < 100:
            gear = 2
        elif speed < 150:
            gear = 3
        elif speed < 200:
            gear = 4
        elif speed < 250:
            gear = 5
        elif speed < 280:
            gear = 6
        else:
            gear = 7
        
        # RPM based on speed and gear
        rpm = int(8000 + 3000 * (speed / 300))
        
        # DRS active on straights (high speed sections)
        drs = speed > 270
        
        # World position (simple circular track)
        angle = (i / num_points) * 2 * np.pi
        radius = track_length / (2 * np.pi)
        x = radius * np.cos(angle)
        y = radius * np.sin(angle)
        z = 0.0
        
        telemetry.append({
            "distance_m": float(distance),
            "speed_kph": float(speed),
            "throttle": float(throttle),
            "brake": float(brake),
            "steer": float(steer),
            "gear": int(gear),
            "rpm": int(rpm),
            "drs": bool(drs),
            "x": float(x),
            "y": float(y),
            "z": float(z),
        })
    
    return telemetry


def calculate_lap_time(telemetry):
    """
    Calculate approximate lap time from telemetry.
    
    Args:
        telemetry: List of telemetry points
    
    Returns:
        Lap time in milliseconds
    """
    total_time_s = 0.0
    
    for i in range(1, len(telemetry)):
        distance_delta = telemetry[i]["distance_m"] - telemetry[i-1]["distance_m"]
        avg_speed_kph = (telemetry[i]["speed_kph"] + telemetry[i-1]["speed_kph"]) / 2
        avg_speed_mps = avg_speed_kph / 3.6  # Convert km/h to m/s
        
        if avg_speed_mps > 0:
            time_delta_s = distance_delta / avg_speed_mps
            total_time_s += time_delta_s
    
    return int(total_time_s * 1000)  # Convert to milliseconds


def save_lap(session_uid: int, lap_number: int, telemetry: list, lap_time_ms: int):
    """
    Save a lap to the API.
    
    Args:
        session_uid: Session UID
        lap_number: Lap number
        telemetry: Telemetry data
        lap_time_ms: Lap time in milliseconds
    
    Returns:
        Response from API
    """
    # Calculate sector times (approximate thirds)
    sector_1_time = lap_time_ms // 3
    sector_2_time = lap_time_ms // 3
    sector_3_time = lap_time_ms - sector_1_time - sector_2_time
    
    payload = {
        "session_uid": session_uid,
        "lap_number": lap_number,
        "lap_time_ms": lap_time_ms,
        "sector_1_time_ms": sector_1_time,
        "sector_2_time_ms": sector_2_time,
        "sector_3_time_ms": sector_3_time,
        "is_valid": True,
        "telemetry": telemetry,
    }
    
    response = requests.post(f"{API_BASE}/telemetry/lap/save", json=payload)
    return response


def main():
    """Generate and save test laps."""
    print("🏁 Populating test laps...")
    
    # Session configuration
    session_uid = 123456789
    track_length = 5000.0  # meters
    num_laps = 5
    
    # Generate laps with varying performance
    lap_times = []
    
    for lap_num in range(1, num_laps + 1):
        print(f"\n📊 Generating Lap {lap_num}...")
        
        # Generate telemetry
        telemetry = generate_lap_telemetry(
            lap_number=lap_num,
            track_length=track_length,
            num_points=500
        )
        
        # Calculate lap time
        base_lap_time = calculate_lap_time(telemetry)
        
        # Add variation to make laps different
        # Lap 3 is the "best" lap
        if lap_num == 3:
            lap_time_ms = int(base_lap_time * 0.98)  # 2% faster
        elif lap_num == 1:
            lap_time_ms = int(base_lap_time * 1.05)  # 5% slower (first lap)
        else:
            lap_time_ms = int(base_lap_time * (1.0 + np.random.uniform(-0.02, 0.02)))
        
        lap_times.append(lap_time_ms)
        
        print(f"   Lap time: {lap_time_ms/1000:.3f}s")
        print(f"   Telemetry points: {len(telemetry)}")
        
        # Save to API
        try:
            response = save_lap(session_uid, lap_num, telemetry, lap_time_ms)
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Saved as lap_id: {result['lap_id']}")
            else:
                print(f"   ❌ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Summary
    print("\n" + "="*50)
    print("📈 Summary:")
    print(f"   Total laps: {num_laps}")
    print(f"   Best lap: Lap {lap_times.index(min(lap_times)) + 1} - {min(lap_times)/1000:.3f}s")
    print(f"   Worst lap: Lap {lap_times.index(max(lap_times)) + 1} - {max(lap_times)/1000:.3f}s")
    print(f"   Average: {np.mean(lap_times)/1000:.3f}s")
    print("="*50)
    
    print("\n✅ Test laps populated successfully!")
    print(f"   View at: http://localhost:3000/dashboard/intelligence")


if __name__ == "__main__":
    main()

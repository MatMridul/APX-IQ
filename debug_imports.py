import sys
import os

# Ensure current dir is in path
sys.path.append(os.getcwd())

try:
    from ingestion import packet_structs_25
    print("Successfully imported packet_structs_25")
    
    if hasattr(packet_structs_25, 'PacketCarTelemetryData'):
        print("PASS: PacketCarTelemetryData found!")
    else:
        print("FAIL: PacketCarTelemetryData NOT found.")
        print("Available attributes:", dir(packet_structs_25))
        
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")

"""
APX-IQ Platform - Ingestion Service Launcher
Run this from the project root to start the UDP telemetry listener.

NOTE: lifecycle hooks are registered at import time inside
ingestion/main.py — do NOT append them again here. Duplicate
registration made the UDP listener start twice and collide with
itself (WinError 10048).
"""
import sys
from pathlib import Path

# Ensure the project root is in the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Importing the module registers on_startup/on_cleanup exactly once
from ingestion.main import app
from aiohttp import web

if __name__ == "__main__":
    print("=" * 60)
    print("APX-IQ INGESTION SERVICE")
    print("=" * 60)
    print("UDP Listener:  0.0.0.0:20777")
    print("Socket.IO API: http://localhost:3001")
    print("=" * 60)

    # Run App
    web.run_app(app, port=3001)

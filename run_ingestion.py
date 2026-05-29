"""
APX-IQ Platform - Ingestion Service Launcher
Run this from the project root to start the UDP telemetry listener.
"""
import sys
from pathlib import Path

# Ensure the project root is in the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import and run the ingestion main
from ingestion.main import app, start_background_tasks, cleanup_background_tasks
from aiohttp import web

if __name__ == "__main__":
    # Setup background tasks for aiohttp
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)
    
    print("=" * 60)
    print("APX-IQ INGESTION SERVICE")
    print("=" * 60)
    print(f"UDP Listener: 0.0.0.0:20777")
    print(f"WebSocket Server: http://localhost:3001")
    print("=" * 60)
    
    # Run App
    web.run_app(app, port=3001)

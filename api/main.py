from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import asyncio
import logging
import json
import uvicorn

# Ingestion Imports
from ingestion.listener import TelemetryListener
from ingestion.router import PacketRouter
from ingestion.decoder import PacketDecoder
from core.session_manager import SessionManager

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("APXIQ.API")

app = FastAPI(title="APX IQ API")

# CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# Global State (Shared between API and Ingestion)
# -------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Broadcast to all connected clients
        if not self.active_connections:
            return
            
        json_msg = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(json_msg)
            except Exception:
                pass # Handle disconnects gracefully in loop

manager = ConnectionManager()
broadcast_queue = asyncio.Queue(maxsize=1000)
session_manager = SessionManager()
packet_router = PacketRouter(session_manager, broadcast_queue)

# -------------------------------------------------------------------------
# Background Tasks
# -------------------------------------------------------------------------

async def ingestion_worker():
    """
    Runs the UDP Listener and routes packets.
    """
    logger.info("Starting Ingestion Worker...")
    listener = TelemetryListener(port=20777)
    await listener.start()
    
    try:
        while True:
            data, addr = await listener.get_packet()
            packet = PacketDecoder.decode(data)
            if packet:
                await packet_router.route(packet)
    except asyncio.CancelledError:
        logger.info("Ingestion Worker Cancelled")
    finally:
        listener.stop()

async def broadcast_worker():
    """
    Consumes messages from Router and sends to WebSockets.
    """
    logger.info("Starting Broadcast Worker...")
    while True:
        msg = await broadcast_queue.get()
        await manager.broadcast(msg)
        broadcast_queue.task_done()

@app.on_event("startup")
async def startup_event():
    # Run ingestion as background tasks within the FastAPI loop
    asyncio.create_task(ingestion_worker())
    asyncio.create_task(broadcast_worker())

# -------------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "ingestion": "running",
        "session_active": session_manager.is_active,
        "active_clients": len(manager.active_connections)
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep alive / wait for commands
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

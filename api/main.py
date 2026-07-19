"""
APX IQ — FastAPI Application
==============================

Startup order:
  1. Load .env
  2. Configure structured logging
  3. Connect database pool
  4. Mount routers
  5. Start background broadcast worker
"""

import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ─── Bootstrap ────────────────────────────────────────────────────────────────

# Load .env before anything reads os.getenv
load_dotenv()

# Project root on sys.path for absolute imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Structured logging must be configured before any logger is created
from core.logging_config import configure_logging, get_logger
configure_logging()
log = get_logger("APXIQ.API")

from core.database import db
from core.session_manager import SessionManager
from ingestion.router import PacketRouter

# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan — runs startup code, then yields, then shutdown."""
    log.info("apxiq_starting", version="1.0")

    # Database
    await db.connect()

    # Background broadcast worker
    app.state.broadcast_task = asyncio.create_task(broadcast_worker())

    yield

    # Cleanup
    log.info("apxiq_shutting_down")
    app.state.broadcast_task.cancel()
    try:
        await app.state.broadcast_task
    except asyncio.CancelledError:
        pass
    await db.close()
    log.info("apxiq_stopped")


# ─── App ──────────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="APX IQ API",
    version="1.0.0",
    description="Real-time F1 telemetry analysis platform",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — env-based origin whitelist
_raw_origins = os.getenv("CORS_ORIGINS", "*")
cors_origins  = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

from api.intelligence_router import router as intelligence_router
from api.telemetry_router     import router as telemetry_router

app.include_router(intelligence_router)
app.include_router(telemetry_router)

# ─── WebSocket broadcast state ────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self) -> None:
        self._connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        log.info("ws_client_connected", total=len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws) if hasattr(self._connections, "discard") \
            else (self._connections.remove(ws) if ws in self._connections else None)
        log.info("ws_client_disconnected", total=len(self._connections))

    async def broadcast(self, message: dict) -> None:
        if not self._connections:
            return
        payload = json.dumps(message)
        dead: List[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager       = ConnectionManager()
broadcast_queue: asyncio.Queue = asyncio.Queue(maxsize=1000)
session_manager = SessionManager()
packet_router   = PacketRouter(session_manager, broadcast_queue)


async def broadcast_worker() -> None:
    log.info("broadcast_worker_started")
    while True:
        msg = await broadcast_queue.get()
        await manager.broadcast(msg)
        broadcast_queue.task_done()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "online",
        "db_connected":   db.is_connected,
        "session_active": session_manager.is_active,
        "active_clients": len(manager._connections),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)

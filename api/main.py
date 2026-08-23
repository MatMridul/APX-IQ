"""
APX IQ — FastAPI Application
==============================

Startup order:
  1. Configure structured logging
  2. Wire app configuration from core.config
  3. Connect database pool
  4. Select and attach services (LapService, ReportService) to app.state
  5. Initialise long-lived module instances (ReportGenerator, BattlePredictor)
  6. Mount routers
  7. Start background WebSocket broadcast worker
"""

import asyncio
import json
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ─── Bootstrap ────────────────────────────────────────────────────────────────
# Project root on sys.path for absolute imports when running as a script
sys.path.insert(0, str(Path(__file__).parent.parent))

# Structured logging must be configured before any logger is created
from core.logging_config import configure_logging, get_logger
configure_logging()
log = get_logger("APXIQ.API")

from core.config import settings
from core.database import db
from core.session_manager import SessionManager
from api.services import create_lap_service, create_report_service, create_analysis_service

# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan — runs startup code, yields, then tears down.

    Services are attached to app.state here so they are:
      - Accessible from any request via request.app.state
      - Replaceable without touching router code (e.g., swap InMemory → DB)
      - Not module-level globals (safe for multi-worker uvicorn)
    """
    log.info("apxiq_starting", version="1.0")

    # 1. Database pool
    await db.connect()
    pool = db._pool  # None if DATABASE_URL is not set

    # 2. Storage and processing services
    app.state.lap_service      = create_lap_service(pool)
    app.state.report_service   = create_report_service(pool)
    app.state.analysis_service = create_analysis_service()

    # 3. Long-lived module instances (stateless — safe to share across requests)
    from intelligence.report_generator import ReportGenerator
    from intelligence.battle_predictor import BattlePredictor
    app.state.report_generator = ReportGenerator()
    app.state.battle_predictor = BattlePredictor()

    # 4. Hardware profile (session-scoped, set by POST /intelligence/hardware)
    app.state.hardware_profile = None

    # 5. Session manager
    app.state.session_manager = SessionManager()

    # 6. Background WebSocket broadcast worker
    app.state.broadcast_task = asyncio.create_task(broadcast_worker())

    log.info("apxiq_ready", db_connected=db.is_connected)
    yield

    # ── Teardown ──────────────────────────────────────────────────────────────
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
    description="Real-time F1 telemetry analysis and coaching platform",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

from api.intelligence_router import router as intelligence_router
from api.telemetry_router     import router as telemetry_router

app.include_router(intelligence_router)
app.include_router(telemetry_router)


# ─── WebSocket Broadcast ──────────────────────────────────────────────────────

class ConnectionManager:
    """Manages active WebSocket connections and fan-out broadcasting."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        log.info("ws_client_connected", total=len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)
        log.info("ws_client_disconnected", total=len(self._connections))

    async def broadcast(self, message: dict) -> None:
        if not self._connections:
            return
        payload = json.dumps(message)
        
        async def _send(ws: WebSocket):
            try:
                await asyncio.wait_for(ws.send_text(payload), timeout=0.1)
                return None
            except Exception:
                return ws

        results = await asyncio.gather(*[_send(ws) for ws in list(self._connections)], return_exceptions=True)
        for dead_ws in results:
            if isinstance(dead_ws, WebSocket):
                self.disconnect(dead_ws)

    @property
    def active_count(self) -> int:
        return len(self._connections)


manager:         ConnectionManager = ConnectionManager()
broadcast_queue: asyncio.Queue     = asyncio.Queue(maxsize=1000)


async def broadcast_worker() -> None:
    log.info("broadcast_worker_started")
    while True:
        msg = await broadcast_queue.get()
        await manager.broadcast(msg)
        broadcast_queue.task_done()


# ─── System Endpoints ─────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """System health — database connection, session status, connected clients."""
    return {
        "status":         "online",
        "db_connected":   db.is_connected,
        "session_active": app.state.session_manager.is_active,
        "active_clients": manager.active_count,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket broadcast endpoint — receives telemetry events from ingestion."""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=True,
    )

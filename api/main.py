"""
APX IQ — FastAPI Application
=============================

Startup order:
  1. Configure structured logging
  2. Wire app configuration from core.config
  3. Connect database pool
  4. Select and attach services (LapService, ReportService) to app.state
  5. Initialise long-lived module instances (ReportGenerator, BattlePredictor)
  6. Mount routers

Note: live telemetry streaming to the UI is handled by the ingestion
process's Socket.IO server (:3001). This API intentionally has no
WebSocket fan-out — the previous /ws path had no producers and was
removed in the audit repair (issue C1).
"""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
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
    pool = db.pool  # None if DATABASE_URL is not set

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

    log.info("apxiq_ready", db_connected=db.is_connected)
    yield

    # ── Teardown ──────────────────────────────────────────────────────────────
    log.info("apxiq_shutting_down")
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


# ─── System Endpoints ─────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """System health — database connection and session status."""
    return {
        "status":         "online",
        "db_connected":   db.is_connected,
        "session_active": app.state.session_manager.is_active,
    }


if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=True,
    )

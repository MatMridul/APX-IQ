from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import datetime

app = FastAPI(
    title="APX IQ API",
    description="Real-time F1 Telemetry Intelligence API",
    version="1.0.0"
)

# -----------------------------------------------------------------------------
# Models (Schemas)
# -----------------------------------------------------------------------------

class SessionSummary(BaseModel):
    session_uid: int
    track_name: str
    session_type: str
    start_time: datetime.datetime

class DriverSummary(BaseModel):
    driver_id: int
    name: str
    team_name: str

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """
    Service health check.
    """
    return {"status": "online", "service": "APX IQ API", "version": "1.0.0"}

@app.get("/api/v1/sessions", response_model=List[SessionSummary])
async def get_sessions(limit: int = 10, offset: int = 0):
    """
    List recent sessions.
    (Mock implementation for Phase 1)
    """
    # TODO: Connect to DB
    return []

@app.get("/api/v1/sessions/{session_uid}")
async def get_session_details(session_uid: int):
    """
    Get details for a specific session.
    """
    # TODO: Connect to DB
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/api/v1/drivers", response_model=List[DriverSummary])
async def get_drivers():
    """
    List all drivers.
    """
    return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

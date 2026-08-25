# 🏎️ APX IQ — Real-Time Formula 1 Intelligence Platform

APX IQ ingests live telemetry from the EA Sports F1 game over UDP, decodes
six game generations (F1 2020–25), streams it to a real-time cockpit
dashboard, persists every completed lap, and generates AI coaching debriefs
that compare you against real F1 ghost laps.

> **Status:** stable local-first platform. CI-gated (`main` is protected by
> backend + UI workflows: lint, unit tests, real-Postgres integration tests,
> typecheck, build). Security hardening pass pending.

## Architecture

```
EA F1 Game ──UDP :20777──▶ INGESTION (:3001)
                             decode → adapt (per-year) → Socket.IO live stream
                             TelemetryRecorder → lap complete → POST /lap/save
                                   │
                        API (:8000 FastAPI) ── PostgreSQL (laps, reports)
                             intelligence engines: align · corners · delta ·
                             coach · hardware FFT · battle · FastF1 ghosts
                             LLM debriefs: Ollama → Gemini → template fallback
                                   │
                        UI (Next.js 16) :3000
                             live cockpit (Socket.IO + Zustand)
                             intelligence page (REST + React Query)
```

Full details: [`docs/architecture/system_architecture.md`](docs/architecture/system_architecture.md) ·
API reference: [`docs/architecture/api_map.md`](docs/architecture/api_map.md) ·
Schema: [`docs/architecture/database_schema.md`](docs/architecture/database_schema.md).

## Quick Start

```bash
# 1. Infrastructure (Postgres + Redis images)
docker compose -f infra/docker-compose.yml up -d

# 2. Schema
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head

# 3. Three processes (separate terminals)
python -m uvicorn api.main:app --reload --port 8000
python run_ingestion.py
cd ui && npm ci && npm run dev        # http://localhost:3000

# 4. No game? Fake it.
python scripts/simulate_f1_udp.py
```

Everything also runs with zero infrastructure — omit Postgres and storage
falls back to in-memory (dev only).

## Development Gates

```bash
ruff check .                       # Python lint (blocking)
pytest -m "not integration"       # unit suite
DATABASE_URL=... alembic upgrade head && \
DATABASE_URL=... pytest -m integration   # real-DB round-trips
cd ui && npx tsc --noEmit && npm run lint && npm run build
```

Agent onboarding & Definition of Done: [`AGENTS.md`](AGENTS.md).
Coding standards: [`docs/knowledge/coding_standards.md`](docs/knowledge/coding_standards.md).

## Design Principles

Backend-first · stable core schema · append-only telemetry · layered
modules · versioned API contracts · graceful degradation everywhere
(DB→memory, Redis→memory, Ollama→Gemini→template) · local-first.

## Disclaimer

Research/engineering project for learning and experimentation. Not
affiliated with Formula 1, EA Sports, or Codemasters; telemetry comes
exclusively from officially documented UDP interfaces.

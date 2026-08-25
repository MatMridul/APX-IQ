# APX IQ — Agent Context File

> Last updated: 2026-08-25 (post-audit repair)
> Purpose: single source of truth for AI agents and new contributors.
> Every claim here reflects the code as it exists NOW. If you find a
> discrepancy, fix this file in the same PR.

---

## Operator Rules (non-negotiable)

1. **Plan before multi-step changes** — affected files, steps, validation.
2. **Never declare done without runnable evidence** — tests, typecheck,
   build must pass; report command output.
3. **Feedback loop for every change** — a test, script, or query against
   real output. If it can't be self-tested, say so explicitly.
4. **Review your own diff; open with a risk summary; flag uncertainty.**
5. **Implement exactly what was asked.**

## Definition of Done (project-specific)

A change is done when ALL of the following pass locally:

```bash
ruff check .                      # backend lint (blocking)
pytest -m "not integration"       # unit suite (in-memory path)
# if you touched schema or anything DB-adjacent:
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/apxiq_test \
    alembic upgrade head && \
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/apxiq_test \
    pytest -m integration         # real-Postgres round-trips
cd ui && npx tsc --noEmit && npm run lint && npm run build   # blocking gates
```

CI enforces every line above. **Any change touching storage, models, or
migrations MUST ship with an integration test** covering its round-trip.
This rule exists because the 2026-08 audit found four core paths that had
never been executed against their own database.

---

## What This Project Is

Real-time motorsport intelligence platform. The EA F1 game broadcasts
telemetry over UDP; we decode it, stream it live to a cockpit dashboard,
persist completed laps, and generate AI coaching debriefs comparing your
laps against real F1 ghost laps (FastF1).

Product principles: backend-first, stable core schema, append-only
telemetry, layered modules, versioned API contracts, local-first dev.

---

## Architecture (actual)

```
EA F1 Game ──UDP :20777──▶ INGESTION PROCESS (:3001)
  listener.py → queue → decoder.py (ctypes, formats 2020–2025)
  → adapters/ (UniversalPacketAdapter normalizes per-year differences)
  → main.py packet_processor():
      • Socket.IO emits to UI (60Hz-throttled; stealth_mode silences)
      • TelemetryRecorder buffers current lap (times + validity captured)
  [session packet]  → POST /telemetry/session/start (bridge)
  [lap completes]   → lap_saver_worker POSTs /telemetry/lap/save
                       (retries failures; idempotent via UNIQUE constraint)

API PROCESS (:8000) — FastAPI, lifespan DI on app.state:
  services: LapService / ReportService / AnalysisService (+ factories)
  intelligence engines instantiated once; hardware profile session-scoped
  Storage: DatabaseLapService/ReportService when DATABASE_URL set,
           InMemory fallback otherwise (Protocol pattern)
  NOTE: no WebSocket here by design — Socket.IO :3001 is the only live path

UI (Next.js 16 App Router):
  LIVE : Socket.IO :3001 → useSocket (globalThis singleton)
         → useTelemetry (refs + RAF batching) → Zustand telemetryStore
         Bridge mounted ONCE in app/providers.tsx.
  QUERY: React Query hooks (useIntelligence.ts) → REST :8000
  Dashboard: components/cockpit/* spatial canvas; Intelligence page:
  components/f1/intelligence/*

LLM reports: Ollama → Gemini → deterministic template (auto-fallback),
  streaming variant at POST /intelligence/report/lap/stream
```

### Deliberate non-obvious decisions

| Decision | Why |
|---|---|
| Two backend processes | Hot lossy lane (60Hz sockets) separated from durable transactional lane |
| Raw-SQL alembic migrations | Schema truth in SQL; no ORM. Migrations use psycopg2 (multi-statement); runtime uses asyncpg |
| `UNIQUE(session_uid, lap_number)` on laps | Makes ingestion retries idempotent |
| FK CASCADE user_lap_telemetry→laps | Clearing laps cannot orphan telemetry rows |
| No TimescaleDB yet (image installed only) | Write pattern is bulk-per-lap (~1–2k rows), not streaming inserts. Revisit when raw frame persistence ships |
| Cache backends behind get_cache() | Redis optional; memory backend enforces TTL |

---

## Repository Layout

```
ingestion/        UDP listener, ctypes decoders (packet_structs_20..25),
                  adapters/, Socket.IO server, lap saver worker
core/             config (pydantic-settings), database pool, cache,
                  logging (structlog), session manager
api/              FastAPI app, routers, Protocol-based services,
                  models/shared.py (single source for Pydantic contracts)
intelligence/     aligner, corner detector, delta engine, coach engine,
                  battle predictor, hardware profiler (FFT), recorder,
                  FastF1 client, report generator (Ollama/Gemini/template)
alembic/          raw-SQL migrations (001–004). env.py uses psycopg2.
ui/               Next.js: app/ pages, hooks/, store/, lib/api,
                  components/cockpit (live dashboard),
                  components/f1 (primitives + intelligence widgets)
tests/            unit/contract suites + tests/integration (real PG;
                  run separately with DATABASE_URL set — see pytest.ini marker)
scripts/          simulators & utilities (simulate_f1_udp.py etc.)
docs/             architecture/, knowledge/coding_standards.md,
                  internal/technical_debt.md  ← kept lean and truthful
graphify-out/     code knowledge graph (gitignored). Query it before grepping:
                  graphify query "..." / explain "..." ; after code edits:
                  graphify update .
```

Root-level legacy scripts (`test_*.py`, `demo_race.py`) are manual dev
utilities, not part of the test suite (`testpaths = tests`).

## Running Locally

```bash
# infra (Postgres + Redis images)
docker compose -f infra/docker-compose.yml up -d
alembic upgrade head

# three processes, three terminals
python -m uvicorn api.main:app --reload --port 8000   # API
python run_ingestion.py                               # ingestion+Socket.IO :3001
cd ui && npm run dev                                  # UI :3000

# fake game data without F1 25 running
python scripts/simulate_f1_udp.py
```

Config lives in `.env` (see `.env.example`). All settings flow through
`core/config.py` — never call `os.getenv` outside it. Logging is structlog
everywhere; never stdlib `logging`.

## Known Debt & Security Posture

See `docs/internal/technical_debt.md`. Security hardening is deliberately
deferred to a Strix-assisted pass; until then: no new pickle usage, secrets
via env only, destructive endpoints ship admin-guarded from day one.

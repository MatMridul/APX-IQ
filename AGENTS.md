# APX IQ — Agent Context File

> Last updated: 2026-08-14
> Purpose: Guide AI agents working on this repo. Read this before touching any file.

---

## Operator Rules (non-negotiable)

### RULE 1: Formulate concrete plans before implementation

Before applying multi-step changes or modifying configurations, present a concise plan
outlining affected files, specific steps, and validation methods. Do not jump straight
into file edits without establishing this blueprint first.

### RULE 2: Never declare done without runnable evidence

Treat a task as unfinished until the project's tests, typecheck, and build have run and
passed. Report the commands and their output as evidence — never declare something works
because it should.

### RULE 3: Build a feedback loop for every change

Give every change a runnable check that closes the loop: a test, a script, or a query
against real output. When something genuinely can't be self-tested, say so explicitly
instead of asserting correctness.

### RULE 4: Review your own full diff and flag uncertainty

Re-read the full diff before presenting it, and open with a short risk summary: what
changed, where the reviewer should focus, and what you're uncertain about. Flag
uncertainty instead of asserting success.

### RULE 5: Implement only what was asked

Implement exactly what the task asks and nothing more: no speculative edge cases,
defensive layers, or abstractions the requirements don't name. Extra just-in-case
complexity becomes debugging debt.

---

## Project Identity

APX IQ is a **real-time motorsport intelligence platform**. It ingests live telemetry
from the EA Sports F1 game via UDP, decodes binary packets, stores structured data,
runs analytics and ML-lite intelligence, and displays everything on a Next.js dashboard.

This is a **product-first engineering project**, not a script collection. Architecture
decisions must honour: backend-first, stable core schema, append-only telemetry,
layered modular design, versioned API contracts, local-first development.

---

## Repository Layout

```
apx-iq-platform/
├── ingestion/          UDP listener, binary packet decoder, routing
├── core/               Config, DB pool, Redis cache, logging, session manager
├── api/                FastAPI app — telemetry + intelligence routers, LLM service
│   ├── models/         (currently empty — Pydantic models live inline in routers)
│   └── services/       llm_service.py — OpenAI / Anthropic wrapper
├── intelligence/       All analytics engines (coach, delta, corners, battle, etc.)
├── alembic/            DB migrations (3 versions exist; NOT yet applied)
├── ui/                 Next.js 15 / React 19 frontend
│   └── src/
│       ├── app/        Pages: landing, /dashboard, /dashboard/intelligence, /debug
│       ├── components/
│       │   └── f1/     Modular component library (charts, layout, metrics, primitives)
│       ├── hooks/      useSocket, useTelemetry, useIntelligence
│       ├── lib/        theme/, api/intelligence.ts, utils.ts
│       └── store/      telemetryStore.ts (Zustand — currently vestigial)
├── scripts/            UDP simulators, test utilities
├── docs/
│   ├── architecture/   System design docs
│   ├── history/        Completed phase docs — read-only record
│   ├── internal/       technical_debt.md — authoritative issue list
│   └── knowledge/      coding_standards.md
├── tests/              Empty (only .gitkeep) — no test suite yet
├── infra/              docker-compose.yml (DB + Redis only, no API/UI containers yet)
├── requirements.txt
├── .env.example
└── AGENTS.md           ← you are here
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Python 3.11+ |
| Web framework | FastAPI 0.115 + Uvicorn |
| DB driver | asyncpg 0.29 (PostgreSQL) |
| Migrations | Alembic 1.13 |
| Cache | Redis 5 via `redis` + `aiocache` |
| HTTP client | aiohttp 3.9 |
| Config | pydantic-settings 2.2 |
| Logging | structlog 24 |
| Rate limiting | slowapi 0.1 (installed, not yet wired) |
| LLM | openai 1.35 (gpt-4o) + anthropic 0.28 (claude-3-5-sonnet) |
| F1 reference data | fastf1 3.3 |
| Analytics | numpy 1.26 + pandas 2.2 |
| System info | psutil 6.0 |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS + container queries |
| State (server) | TanStack React Query v5 |
| State (client) | Zustand v4 (partially used — see issues) |
| WebSocket | socket.io-client |
| Charts | lightweight-charts + d3-scale/shape/interpolate |
| UI primitives | @radix-ui/themes |
| Fonts | Inter + JetBrains Mono (next/font); Rajdhani (@fontsource — legacy) |

### Infrastructure
| Component | Status |
|---|---|
| PostgreSQL | docker-compose, schema via Alembic migrations |
| Redis | docker-compose |
| API container | Dockerfile.api exists; not in compose |
| UI container | ui/Dockerfile exists; not in compose |

---

## Data Flow

```
EA F1 Game (UDP port 20777)
    ↓
ingestion/listener.py  — async UDP socket
    ↓
ingestion/decoder.py   — ctypes struct decode (F1 22 or F1 25 format)
    ↓
ingestion/main.py      — dispatch by packet type, accumulate lap telemetry
    ↓ HTTP POST (aiohttp, hardcoded localhost:8000)
api/telemetry_router.py — /telemetry/lap/save + /telemetry/telemetry/update
    ↓ (also in parallel)
api/intelligence_router.py — feeds intelligence engines
    ↓
intelligence/*         — coach, delta, corners, battle, recorder
    ↓ (on demand)
api/services/llm_service.py — LLM report narrative
    ↓
WebSocket broadcast (api/main.py ws_broadcast_loop)
    ↓
ui/src/hooks/useSocket.ts → useTelemetry.ts
    ↓
ui/src/app/dashboard/page.tsx  (main display)
ui/src/app/dashboard/intelligence/page.tsx  (report display)
```

---

## Environment Variables

From `.env.example` — all required for full operation:

```
DATABASE_URL=postgresql://apxiq:apxiq@localhost:5432/apxiq
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
F1_UDP_PORT=20777          # default, matches EA F1 game setting
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

UI also uses `ui/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Note**: `ui/src/lib/api/intelligence.ts` hardcodes `http://localhost:8000` — it does NOT
read `NEXT_PUBLIC_API_URL`. This is a known bug (see issues below).

---

## How to Run (local dev)

```bash
# 1. Start infrastructure
cd infra && docker-compose up -d

# 2. Run DB migrations
cd apx-iq-platform
alembic upgrade head

# 3. Start API
cd apx-iq-platform
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# 4. Start ingestion listener (separate terminal)
cd apx-iq-platform
python run_ingestion.py

# 5. Start UI (separate terminal)
cd apx-iq-platform/ui
npm run dev

# 6. (Optional) Simulate telemetry without F1 game
python scripts/simulate_udp_25.py
```

---

## Known Issues & Technical Debt

This is a condensed view. Authoritative list: `docs/internal/technical_debt.md`.

### Critical (blocks correctness or production use)

| # | Issue | Location | Fix path |
|---|---|---|---|
| C1 | All storage is in-memory — lost on restart | `api/telemetry_router.py`, `api/intelligence_router.py` | Implement `DatabaseLapStorage` using existing asyncpg pool; wire via FastAPI DI |
| C2 | Alembic migrations exist but tables never written to | `alembic/env.py` — `Base` never imported | Import models into env.py; run `alembic upgrade head` |
| C3 | `logger` NameError on `DELETE /telemetry/laps/clear` | `api/telemetry_router.py` line ~311 | Change `logger.info` → `log.info` |
| C4 | No authentication on any endpoint | All routers | Out of scope until auth design decided |
| C5 | `alembic/env.py` — `Base.metadata` referenced but `Base` never imported | `alembic/env.py` | Import `Base` from models before autogenerate works |

### High (should fix before new features)

| # | Issue | Location | Fix path |
|---|---|---|---|
| H1 | `TelemetryPoint` Pydantic model duplicated | `telemetry_router.py` + `intelligence_router.py` | Move to `api/models/shared.py`, import in both routers |
| H2 | `PacketRouter` instantiated but never called | `api/main.py` | Either wire it or delete it |
| H3 | `SessionManager` instantiated but never connected to packet flow | `api/main.py` | Wire to ingestion or remove |
| H4 | Rate limiter decorator not applied to report generation | `api/intelligence_router.py` line ~281 | Apply `@limiter.limit("5/minute")` |
| H5 | `intelligence_router` singletons not scoped to session | `api/intelligence_router.py` lines 38-44 | Scope per-session via DB or request context |
| H6 | Ingestion API URL hardcoded | `ingestion/main.py` | Read from `core/config.py` `API_HOST`/`API_PORT` |
| H7 | UI API base URL hardcoded in `intelligence.ts` | `ui/src/lib/api/intelligence.ts` | Use `process.env.NEXT_PUBLIC_API_URL` |
| H8 | Zustand `telemetryStore` appears vestigial — `useTelemetry` manages its own state | `ui/src/store/telemetryStore.ts` | Audit usage; either wire or delete |
| H9 | `useSocket` module-level mutable global causes stale socket on hot reload | `ui/src/hooks/useSocket.ts` | Move to React context or ref |

### Medium (backlog)

| # | Issue | Location | Note |
|---|---|---|---|
| M1 | Dashboard `page.tsx` not yet migrated to modular components | `ui/src/app/dashboard/page.tsx` | Revamp plan exists in `ui/DASHBOARD_REVAMP_PLAN.md` |
| M2 | `LiveGraph` and `getTyreColor` defined inline in dashboard | `ui/src/app/dashboard/page.tsx` | `getTyreColor` canonical version in `lib/theme/colors.ts` |
| M3 | `CircularRPMGauge` arc path computed 3× inline instead of reusing `useMemo` | `ui/src/components/f1/charts/CircularRPMGauge.tsx` | Refactor to use memoized refs |
| M4 | Rajdhani font loaded via `@fontsource` (CSS import) not `next/font` | `ui/src/app/layout.tsx` | Migrate to `next/font/local` or `next/font/google` |
| M5 | No test suite | `tests/` | Add pytest + pytest-asyncio; move root test files |
| M6 | F1 22 vs F1 25 sector time branching is inline | `ingestion/main.py` | Absorb into decoder |
| M7 | `TelemetryRecorder` has no max buffer size | `intelligence/telemetry_recorder.py` | Add cap; flush oldest on overflow |
| M8 | `LLMService` raises at construction if keys missing | `api/services/llm_service.py` | Make key validation lazy (at call time) |
| M9 | `ingestion/router.py` (`PacketRouter`) uses sync `requests.post` — dead code | `ingestion/router.py` | Delete or rewrite async |

---

## Component Architecture (UI)

The component library lives in `ui/src/components/f1/` and is fully built. Use the
barrel import `from '@/components/f1'` for everything.

```
components/f1/
├── index.ts              ← single import point for all f1 components
├── Primitives.tsx         ← LEGACY — only dashboard/page.tsx still imports from here
├── primitives/
│   ├── Panel.tsx          container card with title
│   ├── MetricValue.tsx    label + value + unit display
│   ├── BarGauge.tsx       horizontal fill gauge
│   ├── Badge.tsx          status badge (live/offline/warning)
│   └── TelemetryErrorBoundary.tsx
├── charts/
│   ├── SpeedChart.tsx         lightweight-charts line chart
│   ├── ThrottleBrakeChart.tsx dual-line throttle/brake overlay
│   ├── RPMGauge.tsx           linear RPM bar gauge
│   ├── CircularRPMGauge.tsx   circular SVG arc gauge (has bug M3)
│   ├── TyreTempsDisplay.tsx   4-tyre temp grid
│   └── RadialTyreDisplay.tsx  radial tyre layout (alternative)
├── layout/
│   ├── DashboardHeader.tsx    session info + connection badge
│   └── DashboardFooter.tsx    analytics stats bar
├── metrics/
│   ├── MetricCard.tsx         avg/max/current 3-value card
│   ├── LapTimingPanel.tsx     lap time + sectors + delta
│   └── FuelPanel.tsx          fuel load + burn rate + bar
└── intelligence/
    ├── LapSelector.tsx        lap picker dropdown
    ├── GhostSelector.tsx      ghost/reference lap picker
    ├── ReportView.tsx         full report renderer
    └── StatusPanel.tsx        intelligence engine status
```

**Rule**: Do not add new inline components to page files. All new UI elements go in
`components/f1/` and are exported from `index.ts`.

---

## Intelligence Engines

All engines live in `intelligence/` and are pure Python (no Django/Flask).
They are instantiated as process-level singletons in `api/intelligence_router.py`.

| Engine | File | Input | Output |
|---|---|---|---|
| `CoachEngine` | `coach_engine.py` | live telemetry dict | `CoachingAdvice` (rule-based) |
| `DeltaEngine` | `delta_engine.py` | two `LapRecord`s | `DeltaResult` (sector delta) |
| `CornerDetector` | `corner_detector.py` | telemetry history list | `CornerScore` per corner |
| `BattlePredictor` | `battle_predictor.py` | telemetry + session dict | `OvertakePrediction` |
| `TelemetryRecorder` | `telemetry_recorder.py` | telemetry point | buffered per session+lap |
| `HardwareProfiler` | `hardware_profiler.py` | — | hardware tier + recommended settings |
| `ReportGenerator` | `report_generator.py` | LapRecord + optional ref | `ReportData` (structured + LLM narrative) |
| `FastF1Client` | `fastf1_client.py` | year/event/driver params | `LapRecord` from FastF1 API |
| `AlignmentEngine` | `alignment.py` | two telemetry streams | distance-resampled aligned streams |

**Cache location**: FastF1 disk cache at `data/fastf1_cache/`. Do not delete.

---

## API Endpoints Reference

### Telemetry Router (`/telemetry`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/telemetry/lap/save` | Save a completed lap record (called by ingestion) |
| GET | `/telemetry/laps` | List all stored laps |
| GET | `/telemetry/laps/{lap_id}` | Get single lap |
| DELETE | `/telemetry/laps/clear` | Clear all laps (**BUG C3 — crashes**) |
| POST | `/telemetry/session/start` | Record session start |
| GET | `/telemetry/session/current` | Current session info |
| POST | `/telemetry/telemetry/update` | Receive live telemetry point |
| GET | `/telemetry/telemetry/latest` | Latest telemetry snapshot |
| GET | `/telemetry/telemetry/history` | Rolling telemetry history (max 500) |
| WS | `/ws` | WebSocket stream to frontend |

### Intelligence Router (`/intelligence`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/intelligence/telemetry/update` | Feed telemetry to intelligence engines |
| GET | `/intelligence/lap/analysis/{lap_id}` | Full lap analysis |
| GET | `/intelligence/delta/{lap_a}/{lap_b}` | Lap delta comparison |
| GET | `/intelligence/coaching/live` | Real-time coaching feedback |
| POST | `/intelligence/battle/update` | Update battle predictor |
| GET/POST | `/intelligence/hardware/profile` | Get/set hardware profile |
| GET | `/intelligence/report/generate` | Generate LLM report (expensive) |
| GET | `/intelligence/reports` | List reports |
| GET | `/intelligence/reports/{id}` | Get single report |
| DELETE | `/intelligence/reports/clear` | Clear all reports |
| GET | `/intelligence/fastf1/lap` | Fetch FastF1 reference lap |
| GET | `/intelligence/fastf1/driver-season` | Driver season summary |

---

## Active Work Items (as of 2026-08-14)

Prioritised by impact:

1. **Dashboard modular refactor** — `DASHBOARD_REVAMP_PLAN.md` is written and component library
   is built. Task: migrate `ui/src/app/dashboard/page.tsx` (~500 lines inline) to use
   `components/f1/` components per the plan. Target: ~150 lines.

2. **Fix C3** — `logger` → `log` in `telemetry_router.py` line ~311. One-line fix.

3. **DB persistence** — `InMemoryLapStorage` → `DatabaseLapStorage` using the existing asyncpg
   pool in `core/database.py`. Alembic migrations exist and are ready to apply once
   `alembic/env.py` imports `Base`.

4. **Wire the API URL env var** — `ui/src/lib/api/intelligence.ts` should read
   `process.env.NEXT_PUBLIC_API_URL` instead of hardcoding `localhost:8000`.

---

## Coding Standards

See `docs/knowledge/coding_standards.md` for full standards. Key rules:

- **Python**: Type hints on all function signatures. `structlog` for logging (never `print`).
  Async throughout — no blocking I/O in async functions without `asyncio.to_thread`.
- **TypeScript**: Strict mode. No `any`. Props interfaces always explicit.
- **Components**: No inline component definitions in page files.
- **Imports**: Use barrel imports (`from '@/components/f1'`, not deep paths).
- **Env vars**: Never hardcode URLs or keys. Use `core/config.py` (backend) or
  `process.env.NEXT_PUBLIC_*` (frontend).
- **Tests**: Any new function in `intelligence/` or `api/` should have a corresponding test
  in `tests/`. (Test suite setup is itself a pending task.)

# APX IQ Platform - Upgrade Package

**Version:** 1.0  
**Date:** January 2025  
**Status:** 🟡 Ready to Execute  
**Objective:** Transform APX IQ from prototype to production-grade F1 telemetry platform

---

## Executive Summary

This document outlines the complete technology upgrade path for the APX IQ platform based on a comprehensive audit of the current stack. The upgrades are organized into **5 implementation phases** designed to be executed sequentially without breaking the existing system.

**Current State:**
- Working prototype with solid architecture
- Beautiful UI but performance issues at 60Hz
- No database persistence (in-memory only)
- Blocking I/O in async context
- No authentication or rate limiting

**Target State:**
- Broadcast-quality dashboard with 60fps telemetry
- Full database integration with migrations
- Background job processing for expensive operations
- Production-ready with auth, monitoring, and error tracking
- 10-100x performance improvements on key operations

---

## Package Matrix

### UI Layer (Frontend)

| Package | Version | Size | Purpose | Phase |
|---------|---------|------|---------|-------|
| `lightweight-charts` | ^4.0.0 | 30kb | Canvas-based real-time charts | 1 |
| `d3-scale` | ^4.0.0 | 4kb | Color interpolation & scales | 1 |
| `d3-shape` | ^3.2.0 | 4kb | SVG path generators for arcs | 1 |
| `d3-interpolate` | ^3.0.1 | 4kb | Smooth color gradients | 1 |
| `@radix-ui/themes` | ^3.0.0 | 40kb | Accessible UI primitives | 1 |
| `tailwindcss-animate` | ^1.0.7 | 0kb* | Animation utility classes | 1 |
| `@tailwindcss/container-queries` | ^0.1.1 | 0kb* | Responsive containers | 1 |
| `@fontsource/rajdhani` | ^5.0.0 | 100kb | Bold futuristic font | 1 |
| `@fontsource/inter` | ^5.0.0 | (existing) | UI text font | 1 |
| `@fontsource/jetbrains-mono` | ^5.0.0 | (existing) | Monospace telemetry | 1 |
| `zustand` | ^4.4.0 | 3kb | Granular state management | 1 |
| `@tanstack/react-query` | ^5.0.0 | 15kb | Server state + caching | 2 |

*\*Compile-time only*

**Total Added:** ~200kb gzipped


### Python Backend

| Package | Version | Purpose | Phase |
|---------|---------|---------|-------|
| `redis` | ^5.0.0 | In-memory data store | 3 |
| `aiocache` | ^0.12.0 | Async caching decorator | 3 |
| `aioredis` | ^2.0.0 | Async Redis client | 3 |
| `celery` | ^5.3.0 | Background job queue | 3 |
| `alembic` | ^1.13.0 | Database migrations | 3 |
| `structlog` | ^24.0.0 | Structured JSON logging | 3 |
| `slowapi` | ^0.1.9 | Rate limiting middleware | 3 |
| `jinja2` | ^3.1.0 | Template engine | 3 |
| `construct` | ^2.10.0 | Binary packet parsing | 4 |
| `sentry-sdk[fastapi]` | ^1.40.0 | Error tracking | 4 |
| `pytest` | ^7.4.0 | Test framework | 5 |
| `pytest-asyncio` | ^0.21.0 | Async test support | 5 |
| `black` | ^23.12.0 | Code formatter | 5 |
| `ruff` | ^0.1.0 | Fast linter | 5 |
| `mypy` | ^1.7.0 | Type checker | 5 |
| `prometheus-client` | ^0.19.0 | Metrics export | 5 |

### Intelligence Module

| Package | Version | Purpose | Phase |
|---------|---------|---------|-------|
| `polars` | ^0.20.0 | High-perf DataFrame (replaces pandas) | 4 |
| `diskcache` | ^5.6.0 | LRU disk cache | 4 |
| `langchain` | ^0.1.0 | LLM orchestration | 4 |
| `langchain-google-genai` | ^0.0.5 | Gemini streaming | 4 |

---

## Phase 1: UI Foundation (IMMEDIATE)

**Goal:** Enable the dashboard revamp with best-in-class visualization tools

**Duration:** 1 day  
**Risk:** Low (additive changes only)


### Installation

```bash
cd ui
npm install lightweight-charts \
  d3-scale d3-shape d3-interpolate \
  @radix-ui/themes \
  tailwindcss-animate @tailwindcss/container-queries \
  @fontsource/rajdhani @fontsource/inter @fontsource/jetbrains-mono \
  zustand
```

### Implementation Tasks

#### 1.1 Configure Fonts
**Files:** `ui/src/app/layout.tsx`, `ui/tailwind.config.ts`

- Import `@fontsource/rajdhani` variable font
- Add to Tailwind config as `font-rajdhani`
- Use for hero numbers: speed, RPM, lap times

#### 1.2 Add Tailwind Plugins
**Files:** `ui/tailwind.config.ts`

```typescript
// ui/tailwind.config.ts
import tailwindAnimate from 'tailwindcss-animate';
import containerQueries from '@tailwindcss/container-queries';

export default {
  plugins: [tailwindAnimate, containerQueries],
  // ...
}
```

#### 1.3 Create Lightweight Charts Components
**Files:** New components in `ui/src/components/f1/charts/`

Replace Recharts-based charts:
- `SpeedChart.tsx` → LightweightCharts line series
- `ThrottleBrakeChart.tsx` → LightweightCharts dual histogram

**Refactor:**
- Convert from Recharts declarative API to imperative LightweightCharts API
- Use `IChartApi.createLineSeries()` for speed trace
- Use `IChartApi.createHistogramSeries()` for throttle/brake overlay


#### 1.4 Create D3 Circular Gauges
**Files:** New components in `ui/src/components/f1/charts/`

- `CircularRPMGauge.tsx` — Arc from 0-360° representing 0-maxRPM
- `RadialTyreDisplay.tsx` — 4 concentric arcs for FL/FR/RL/RR temps
- `FuelRingGauge.tsx` — Circular progress ring around gear number

**API:**
```typescript
import { arc } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';

// Create RPM arc path
const arcGenerator = arc()
  .innerRadius(80)
  .outerRadius(100)
  .startAngle(0)
  .endAngle((rpm / maxRPM) * 2 * Math.PI);
```

#### 1.5 Setup Zustand Store
**Files:** `ui/src/store/telemetryStore.ts` (new)

Replace `useState` chains in `useTelemetry` with Zustand store:

```typescript
import { create } from 'zustand';

export const useTelemetryStore = create<TelemetryState>((set) => ({
  telemetry: null,
  lapData: null,
  history: [],
  derived: initialDerived,
  
  updateTelemetry: (data) => set({ telemetry: data }),
  // ...
}));
```

**Why:** Prevents unnecessary re-renders. Components subscribe only to data they need.


#### 1.6 Radix UI Primitives
**Files:** `ui/src/components/f1/primitives/Tooltip.tsx` (new)

```typescript
import * as Tooltip from '@radix-ui/react-tooltip';

// Wrap chart data points with tooltips showing exact values
<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>{metric}</Tooltip.Trigger>
    <Tooltip.Content>Speed: 267 km/h @ 12:34.567</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
```

### Success Criteria

- [ ] Dashboard loads with new circular RPM gauge
- [ ] Speed chart renders at 60fps without frame drops
- [ ] Throttle/brake overlay displays as dual histogram
- [ ] Tyre temps show as 4 radial arcs
- [ ] Hero numbers use Rajdhani font
- [ ] Hover tooltips work on all metrics
- [ ] Bundle size < 2MB (currently ~1.8MB)

### Rollback Plan

If any chart fails:
1. Keep new primitives (Radix, Zustand)
2. Revert to Recharts for broken charts only
3. Charts are isolated components — no cross-dependencies

---

## Phase 2: Intelligence API Integration (AFTER DASHBOARD)

**Goal:** Add server state management for intelligence features

**Duration:** Half day  
**Risk:** Low (intelligence page only)


### Installation

```bash
cd ui
npm install @tanstack/react-query
```

### Implementation Tasks

#### 2.1 Setup React Query Provider
**Files:** `ui/src/app/layout.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### 2.2 Refactor Intelligence API Calls
**Files:** `ui/src/app/dashboard/intelligence/page.tsx`

Replace `useState` + `fetch` with React Query hooks:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Before: manual loading state
const [report, setReport] = useState(null);
const [isLoading, setIsLoading] = useState(false);

// After: automatic loading/error handling
const { data: report, isLoading } = useQuery({
  queryKey: ['lap-report', lapId],
  queryFn: () => fetch(`/api/intelligence/report/lap/${lapId}`).then(r => r.json()),
});
```

### Success Criteria

- [ ] Loading spinners appear automatically during API calls
- [ ] Error states display user-friendly messages
- [ ] Reports are cached (second view is instant)
- [ ] Network tab shows reduced redundant requests

---


## Phase 3: Backend Production Hardening (CRITICAL)

**Goal:** Database persistence, background jobs, caching, observability

**Duration:** 3-4 days  
**Risk:** Medium (touches core infrastructure)

### Installation

```bash
cd ..  # Project root
pip install redis aiocache aioredis celery alembic structlog slowapi jinja2
```

### Implementation Tasks

#### 3.1 Database Connection Pool
**Files:** `api/main.py`, `core/database.py` (new)

**Problem:** `get_db_connection()` returns `None` — database schema exists but unused

```python
# core/database.py
import asyncpg
from contextlib import asynccontextmanager

class Database:
    def __init__(self):
        self.pool = None
    
    async def connect(self):
        self.pool = await asyncpg.create_pool(
            os.getenv("DATABASE_URL"),
            min_size=5,
            max_size=20,
        )
    
    async def close(self):
        await self.pool.close()

db = Database()

@asynccontextmanager
async def get_db():
    async with db.pool.acquire() as conn:
        yield conn
```

**Update:** `api/main.py` startup/shutdown hooks

```python
@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.close()
```


#### 3.2 Alembic Migration Setup
**Files:** `alembic/` (new directory), `alembic.ini` (new)

```bash
cd apx-iq-platform
alembic init alembic
```

- Migrate existing `db/schema.sql` into Alembic revisions
- Migration 001: Core tables (sessions, laps, drivers, teams)
- Migration 002: Telemetry tables
- Migration 003: Intelligence schema (reports, ghost laps)

Future schema changes are versioned SQL, not manual edits.

#### 3.3 Redis Cache for Intelligence Operations
**Files:** `intelligence/alignment.py`, `core/cache.py` (new)

**Problem:** Alignment runs every request even for same lap

```python
# core/cache.py
from aiocache import Cache
from aiocache.serializers import PickleSerializer

cache = Cache.from_url("redis://localhost:6379")

# Usage in alignment
@cache.cached(ttl=300, key_builder=lambda *args: f"align:{lap_id_1}:{lap_id_2}")
async def align_telemetry(user_laps, ghost_lap):
    # expensive operation — only runs once per 5 minutes for same pair
    return await DistanceAligner().align(user_laps, ghost_lap)
```

#### 3.4 Celery Background Jobs
**Files:** `core/tasks.py` (new), `celery_app.py` (new)

**Problem:** Ghost lap fetching (30-60s) blocks the async event loop

```python
# core/tasks.py
from celery import Celery

celery_app = Celery('apxiq', broker='redis://localhost:6379/0')

@celery_app.task
def fetch_ghost_lap(year: int, gp_name: str, driver: str):
    # Runs in separate worker process — never blocks API
    return fastf1_client.fetch_lap(year, gp_name, driver)
```

**API endpoint change:**
```python
# Before: blocks for 60 seconds
@router.get("/intelligence/ghost/{track}")
async def get_ghost_lap(track: str):
    data = fastf1_client.fetch_lap(...)  # BLOCKS
    return data

# After: immediate response, client polls for status
@router.get("/intelligence/ghost/{track}")
async def get_ghost_lap(track: str):
    task = fetch_ghost_lap.delay(year, track, driver)
    return {"task_id": task.id, "status": "queued"}

@router.get("/intelligence/ghost/status/{task_id}")
async def get_task_status(task_id: str):
    result = celery_app.AsyncResult(task_id)
    return {"status": result.status, "data": result.result}
```


#### 3.5 Rate Limiting
**Files:** `api/main.py`

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/intelligence/report/lap")
@limiter.limit("5/minute")  # Protect LLM endpoints
async def generate_lap_report(request: Request, ...):
    ...
```

#### 3.6 Structured Logging
**Files:** All Python backend files

```python
# Before
import logging
logger = logging.getLogger("APXIQ.API")
logger.info(f"Saved lap {lap_id}")

# After
import structlog
log = structlog.get_logger()
log.info("lap_saved", lap_id=lap_id, duration_ms=45, track="Monza")
# Outputs JSON: {"event": "lap_saved", "lap_id": 42, "duration_ms": 45, "track": "Monza"}
```

Structured logs are queryable (Grafana Loki, Datadog, etc.)

#### 3.7 Jinja2 Report Templates
**Files:** `intelligence/templates/` (new), `intelligence/report_generator.py`

```
intelligence/templates/
  lap_debrief.md.j2
  race_summary.md.j2
  corner_study.md.j2
```

```python
# Before: f-string horror
text = f"# Lap Analysis\n\nLap time: {lap_time_str}\n\n..."

# After: proper templating
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('intelligence/templates'))
template = env.get_template('lap_debrief.md.j2')
report = template.render(lap_time=lap_time, sectors=sectors, ...)
```

### Infrastructure Required for Phase 3

```yaml
# docker-compose.yml (create at project root)
services:
  postgres:
    image: timescale/timescaledb-ha:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_PASSWORD: apxiq_dev

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  celery-worker:
    command: celery -A celery_app worker --loglevel=info
    depends_on: [redis, postgres]
```

### Success Criteria

- [ ] Data persists after API restart
- [ ] Ghost lap fetch completes in background (UI shows progress)
- [ ] Same lap alignment result in <10ms (cached)
- [ ] LLM endpoints rate limited to 5 req/min
- [ ] All logs output structured JSON
- [ ] Alembic `upgrade head` runs cleanly from scratch

---


## Phase 4: Intelligence Layer Performance

**Goal:** 10-100x speedup on telemetry operations, streaming LLM responses

**Duration:** 2 days  
**Risk:** Medium (major library swap)

### Installation

```bash
pip install polars diskcache langchain langchain-google-genai construct
```

### Implementation Tasks

#### 4.1 Pandas → Polars Migration
**Files:** `intelligence/alignment.py`, `intelligence/delta_engine.py`

**Why:** Polars is 10-100x faster, no GIL, lazy evaluation

```python
# Before (pandas)
import pandas as pd
df = pd.DataFrame(telemetry)
df['time_delta'] = df['user_time'] - df['ghost_time']
result = df.groupby('corner_id')['time_delta'].mean()

# After (polars)
import polars as pl
df = pl.DataFrame(telemetry)
result = (df
    .with_columns((pl.col('user_time') - pl.col('ghost_time')).alias('time_delta'))
    .groupby('corner_id')
    .agg(pl.col('time_delta').mean())
)
```

**Migration strategy:**
1. Polars has pandas-compatible API — most code works unchanged
2. `.to_pandas()` escape hatch for edge cases
3. Test each module individually (alignment, delta, corners)

#### 4.2 FastF1 Cache Management
**Files:** `intelligence/fastf1_client.py`

**Problem:** Cache grows unbounded (GB+)

```python
import diskcache as dc

cache = dc.FanoutCache('./data/fastf1_cache', size_limit=5_000_000_000)  # 5GB

@cache.memoize(expire=86400*7)  # 7 day TTL
def fetch_lap(year, gp, driver):
    # Old sessions evicted automatically when cache hits 5GB
    return fastf1.get_session(...).laps.pick_driver(driver)
```


#### 4.3 Streaming LLM Reports
**Files:** `intelligence/report_generator.py`, `api/intelligence_router.py`

**Problem:** User waits 30-60s staring at blank screen

```python
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage, HumanMessage

llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", streaming=True)

@router.post("/intelligence/report/stream")
async def stream_report(request: ReportRequest):
    async def event_stream():
        async for chunk in llm.astream([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]):
            yield f"data: {chunk.content}\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

**UI side:**
```typescript
const eventSource = new EventSource('/api/intelligence/report/stream');
eventSource.onmessage = (event) => {
  setReport(prev => prev + event.data);  // Append token-by-token
};
```

#### 4.4 Binary Packet Parser (construct)
**Files:** `ingestion/decoder.py`, `ingestion/packet_structs_25.py`

**Problem:** ctypes structs break on game updates

```python
# Before (ctypes — fragile)
class PacketMotionData(ctypes.Structure):
    _fields_ = [
        ("m_worldPositionX", ctypes.c_float),
        # ...must match EA binary layout exactly
    ]

# After (construct — versioned, resilient)
from construct import Struct, Float32l, Int16ul, Array

PacketMotionData = Struct(
    "m_worldPositionX" / Float32l,
    "m_worldPositionY" / Float32l,
    # ...self-documenting, version-aware
)
```

**Why:** Construct handles endianness, alignment, versioning automatically.

### Success Criteria

- [ ] Alignment operation < 100ms (was ~2s)
- [ ] LLM reports stream token-by-token to UI
- [ ] Cache stays under 5GB even after 100 sessions
- [ ] Packet decoder handles F1 22/24/25 automatically

---


## Phase 5: DevOps & Quality Assurance

**Goal:** Testing, monitoring, deployment automation

**Duration:** 2-3 days  
**Risk:** Low (no user-facing changes)

### Installation

```bash
pip install pytest pytest-asyncio black ruff mypy sentry-sdk prometheus-client
```

### Implementation Tasks

#### 5.1 Test Suite
**Files:** `tests/` (new directory)

```
tests/
  api/
    test_intelligence_router.py
    test_telemetry_router.py
  intelligence/
    test_alignment.py
    test_delta_engine.py
    test_corner_detector.py
  ingestion/
    test_decoder.py
    test_listener.py
```

```python
# Example: tests/intelligence/test_alignment.py
import pytest
from intelligence.alignment import DistanceAligner

@pytest.mark.asyncio
async def test_alignment_monotonic():
    aligner = DistanceAligner()
    result = await aligner.align(user_laps, ghost_laps, grid_points=1000)
    
    # Assert monotonicity (no time travel)
    assert all(result.distance[i] <= result.distance[i+1] 
               for i in range(len(result.distance)-1))
```

**Run:** `pytest tests/ -v --cov=. --cov-report=html`

#### 5.2 Code Formatting & Linting
**Files:** `.pre-commit-config.yaml` (new), `pyproject.toml`

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    hooks: [{id: black}]
  - repo: https://github.com/charliermarsh/ruff-pre-commit
    hooks: [{id: ruff, args: [--fix]}]
  - repo: https://github.com/pre-commit/mirrors-mypy
    hooks: [{id: mypy}]
```

```bash
pip install pre-commit
pre-commit install
```

Now `black`, `ruff`, `mypy` run automatically on every commit.


#### 5.3 Error Tracking (Sentry)
**Files:** `api/main.py`, `ui/src/app/layout.tsx`

```python
# Backend
import sentry_sdk
sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)
```

```typescript
// Frontend
import * as Sentry from "@sentry/nextjs";
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN });
```

All Python exceptions + React errors reported to Sentry dashboard.

#### 5.4 Metrics (Prometheus)
**Files:** `api/main.py`, `ingestion/main.py`

```python
from prometheus_client import Counter, Histogram, generate_latest

# Define metrics
packet_count = Counter('apxiq_packets_received_total', 'Total UDP packets')
api_latency = Histogram('apxiq_api_duration_seconds', 'API request duration')

# Expose metrics endpoint
@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

**Grafana Dashboard Queries:**
- Packet loss rate: `rate(apxiq_packets_received_total[5m])`
- API p95 latency: `histogram_quantile(0.95, apxiq_api_duration_seconds)`

#### 5.5 Docker Deployment
**Files:** `Dockerfile` (new), `docker-compose.prod.yml` (new)

```dockerfile
# Dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.prod.yml
services:
  api:
    build: .
    ports: ["8000:8000"]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/apxiq
      REDIS_URL: redis://redis:6379/0
```

**Deploy:**
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### Success Criteria

- [ ] 80%+ test coverage on intelligence module
- [ ] Black/Ruff pass with zero warnings
- [ ] Sentry captures API errors in dashboard
- [ ] Prometheus /metrics endpoint responds
- [ ] Docker build completes in <5 minutes
- [ ] Production deploy via `docker-compose up`

---


## Technical Debt Register

Issues identified during audit that don't need a new package but need fixing:

### Critical (Fix During Relevant Phase)

| ID | File | Issue | Fix | Phase |
|----|------|-------|-----|-------|
| TD-01 | `api/main.py` | CORS wildcard `allow_origins=["*"]` | Env-based origin whitelist | 3 |
| TD-02 | `ingestion/main.py` | Port 20777 hardcoded | `os.getenv("UDP_PORT", 20777)` | 3 |
| TD-03 | `api/intelligence_router.py` | `_report_storage` is dict (lost on restart) | DB integration | 3 |
| TD-04 | `intelligence/fastf1_client.py` | Sync calls in async context | `asyncio.to_thread()` wrapper | 3 |
| TD-05 | `requirements.txt` | All `>=` versions (breaking changes) | Pin to `~=` | 5 |
| TD-06 | `ui/src/hooks/useSocket.ts` | No reconnection backoff | Exponential backoff | 2 |
| TD-07 | `db/schema.sql` | `get_db_connection()` returns None | asyncpg pool | 3 |

### Medium (Fix When Touching That File)

| ID | File | Issue | Fix | Phase |
|----|------|-------|-----|-------|
| TD-08 | `ui/src/app/dashboard/page.tsx` | Still uses old Primitives imports | New modular imports | 1 |
| TD-09 | `ingestion/main.py` | `packet_count % 60` logging chatty | Reduce to every 600 | 3 |
| TD-10 | `intelligence/alignment.py` | Multiple DataFrame copies | Use views | 4 |
| TD-11 | `core/session_manager.py` | Session state lost on restart | DB persistence | 3 |
| TD-12 | `db/schema.sql` | No indexes on `distance_m` | `CREATE INDEX` | 3 |

### Low (Scheduled)

| ID | File | Issue | Fix | Phase |
|----|------|-------|-----|-------|
| TD-13 | `ui/src/app/globals.css` | `box-shadow` animations (expensive) | `transform` animations | 1 |
| TD-14 | `ui/src/app/dashboard/page.tsx` | No React error boundaries | Wrap panels | 2 |
| TD-15 | `intelligence/report_generator.py` | Ollama model hardcoded | Auto-detect available models | 4 |
| TD-16 | `api/main.py` | No request size limits | Pydantic max length validators | 3 |

---

## Environment Variables Required

When Phase 3 is complete, these env vars must be configured:

```bash
# Core
DATABASE_URL=postgresql://user:pass@localhost:5432/apxiq
REDIS_URL=redis://localhost:6379/0

# Intelligence
GEMINI_API_KEY=your_key_here
OLLAMA_BASE_URL=http://localhost:11434

# Networking
UDP_PORT=20777
API_PORT=8000
INGESTION_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Observability
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Security
CORS_ORIGINS=http://localhost:3000,http://192.168.x.x:3000
SECRET_KEY=your_secret_key_here
```

Create a `.env.example` file at project root with all keys (no values).

---


## Execution Timeline

```
Current State: Working prototype (no DB, Recharts, blocking I/O)
     │
     ▼
Phase 1 (1 day)
 Install: lightweight-charts, d3, zustand, radix, fonts, tailwind plugins
 Build: Circular gauges, canvas charts, Zustand store, Radix tooltips
 Output: UI foundation ready for dashboard revamp
     │
     ▼
Dashboard Revamp (1-2 days)
 Build: Full new dashboard using Phase 1 components
 Deploy: Live on dev machine, test with game running
 Output: Professional analytics dashboard at 60fps
     │
     ▼
Phase 2 (0.5 day)
 Install: @tanstack/react-query
 Build: Intelligence page loading states, error handling
 Output: Intelligence page production-ready
     │
     ▼
Phase 3 (3-4 days)  ← CRITICAL MILESTONE
 Install: redis, celery, alembic, structlog, slowapi, jinja2
 Build: DB connection, migrations, caching, background jobs, rate limiting
 Output: DATA NOW PERSISTS — first real data milestone
     │
     ▼
Phase 4 (2 days)
 Install: polars, diskcache, langchain, construct
 Build: Streaming reports, faster alignment, cache management
 Output: Intelligence layer is production-grade
     │
     ▼
Phase 5 (2-3 days)
 Install: pytest, sentry, prometheus, black, ruff, mypy
 Build: Test suite, CI pipeline, Docker, monitoring
 Output: Production deployment ready
     │
     ▼
Production-Ready APX IQ Platform
```

---

## Decision Log

Decisions made during upgrade planning, with rationale:

| Decision | Option Considered | Chosen | Reason |
|----------|------------------|--------|--------|
| Charting | Recharts, Visx, Victory, LightweightCharts | LightweightCharts | Only canvas-based option; 60fps real-time focused |
| State | Redux, Jotai, Zustand, Context | Zustand | Smallest API; selector-based re-renders |
| Server State | SWR, React Query | React Query | Better devtools, mutation support |
| DataFrame | Pandas, Polars, Spark | Polars | 10-100x faster; Pandas API compatible |
| LLM | Raw httpx, LangChain, LlamaIndex | LangChain | Streaming support; Gemini integration |
| Cache | Redis, Memcached, diskcache | Redis + diskcache | Redis for hot data; diskcache for F1 sessions |
| Binary Parsing | ctypes, construct, pydantic | construct | Self-documenting; versioned; handles endianness |
| Logging | logging, loguru, structlog | structlog | JSON output; queryable in production |
| Task Queue | Celery, RQ, FastAPI BackgroundTasks | Celery | Persistent tasks; survives process restart |
| Migrations | Manual SQL, Alembic, SQLModel | Alembic | Industry standard; schema versioning |

---

## Notes for Future Context

If reading this document after a context reset:

1. **We just finished Phases 1-4 of the modular component architecture**
   - See `ui/COMPONENT_ARCHITECTURE.md` for what was built
   - `ui/src/components/f1/` has primitives, charts, metrics, layout
   - `ui/src/lib/theme/` is the design system

2. **The dashboard has NOT been revamped yet**
   - `ui/src/app/dashboard/page.tsx` still uses old Recharts + Primitives
   - See `ui/DASHBOARD_REVAMP_PLAN.md` for the layout plan
   - This is the next thing to build (after Phase 1 installs)

3. **Current known working state**
   - UDP ingestion works (port 20777)
   - Socket.IO to UI works (port 3001)
   - FastAPI running (port 8000)
   - Intelligence endpoints exist but FastF1 blocks async

4. **Nothing is in Docker yet** — everything runs manually:
   ```bash
   # Terminal 1: Ingestion + Socket.IO
   python -m ingestion.main
   
   # Terminal 2: API
   uvicorn api.main:app --reload --port 8000
   
   # Terminal 3: UI
   cd ui && npm run dev
   ```

5. **No database is connected** — all lap/report data is in-memory
   - Schema is in `db/schema.sql` and `db/intelligence_reports_schema.sql`
   - asyncpg is installed but `get_db_connection()` returns None

6. **The intelligence module is fully built** but needs:
   - DB connection for report persistence
   - Async wrapper for FastF1
   - Streaming for LLM reports

---

*Last Updated: Generated from comprehensive system audit*  
*Next Action: Execute Phase 1 installs, then proceed with Dashboard Revamp*

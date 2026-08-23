# APX IQ — System Architecture

> Last updated: 2026-07-29 | Lead Architect review

---

## Overview

APX IQ is a real-time motorsport intelligence platform that ingests F1 game telemetry over UDP, processes it through an intelligence pipeline, and surfaces insights via a live web dashboard.

The system is composed of **three concurrently running processes** with distinct responsibilities.

```
[F1 Game UDP :20777]
        │
        ▼
PROCESS 1: ingestion/main.py  (aiohttp + Socket.IO :3001)
  TelemetryListener → PacketDecoder → packet_processor
  TelemetryRecorder → lap DataFrames
        │ HTTP POST (lap boundary)
        ▼
PROCESS 2: api/main.py  (FastAPI + uvicorn :8000)
  /telemetry/*  → InMemoryLapStorage
  /intelligence/* → DistanceAligner → CornerDetector → DeltaEngine
                    → CoachEngine → ReportGenerator
  ← FastF1 (thread) / Ollama / Gemini
        │ Socket.IO + HTTP REST
        ▼
PROCESS 3: ui/  (Next.js :3000)
  Socket.IO client → useTelemetry hook → Zustand store
  React Query → useIntelligence hooks → /intelligence/*
```

---

## Service Communication Map

| From | To | Protocol | Port | Data |
|---|---|---|---|---|
| F1 Game | Ingestion | UDP | 20777 | Binary packet structs |
| Ingestion | UI | Socket.IO | 3001 | JSON events (60Hz) |
| Ingestion | API | HTTP POST | 8000 | Completed lap JSON |
| UI | API | HTTP REST | 8000 | Intelligence queries |
| UI | Ingestion | Socket.IO | 3001 | Telemetry stream |
| API | FastF1 | Python lib | — | Session/telemetry data |
| API | Ollama | HTTP | 11434 | LLM inference |
| API | Gemini | HTTPS | 443 | LLM inference |
| API | PostgreSQL | TCP | 5432 | Persistence (wired, not active) |

---

## Technology Stack

### Backend
| Layer | Technology |
|---|---|
| Web framework | FastAPI 0.100+ |
| ASGI server | Uvicorn |
| Real-time | python-socketio + aiohttp |
| Data validation | Pydantic v2 |
| Data processing | Pandas 2.0, NumPy, SciPy |
| Interpolation | PCHIP (scipy.interpolate) |
| Peak detection | scipy.signal.find_peaks |
| F1 data | FastF1 3.4+ |
| Database client | asyncpg |
| Caching | Redis (aioredis) / in-memory fallback |
| Structured logging | structlog |
| Rate limiting | slowapi |
| HTTP client | httpx |
| LLM cloud | google-genai |
| LLM local | Ollama HTTP API |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State management | Zustand v5 |
| Data fetching | TanStack Query v5 |
| Real-time | Socket.IO client v4 |
| Charts | LightweightCharts v5 (canvas) |
| SVG gauges | d3-shape, d3-scale, d3-interpolate |
| Animation | Framer Motion v12 |

---

## Key Design Patterns

### Snapshot-Merge Telemetry Recording
Game sends Lap Data (ID=2), Car Telemetry (ID=6), Motion (ID=0) as separate packets at different rates. `TelemetryRecorder` keeps a "latest snapshot" of each type and composes rows on every Lap Data tick, accepting ≤50ms temporal misalignment.

### asyncio.to_thread for CPU Work
All Pandas/NumPy/SciPy computations in the intelligence pipeline run via `asyncio.to_thread()` to avoid blocking the FastAPI event loop.

### RAF Loop → Zustand Decoupling
Socket.IO events land in `useRef` snapshots; a `requestAnimationFrame` loop drains those into Zustand. This prevents 60Hz socket events from triggering 60Hz React re-renders.

### Graceful Degradation
Both `Database` and `Cache` fall back to in-memory if env vars absent. LLM chain: Ollama → Gemini API → deterministic template.

### Distance Grid Normalization
Both user and ghost telemetry are interpolated onto a shared 1000-point distance grid (PCHIP) before comparison, making laps with different sample rates comparable.

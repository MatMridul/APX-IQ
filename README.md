# 🏎️ APX IQ — Real-Time Formula 1 Intelligence Platform

APX IQ ingests live telemetry from the EA Sports F1 game over UDP, decodes
six game generations (F1 2020–25), streams it to a real-time cockpit
dashboard, persists every completed lap, and generates AI coaching debriefs
that compare you against real F1 ghost laps.

> **Live Edge Deployment:** [https://apx-iq.pages.dev](https://apx-iq.pages.dev)  
> **Status:** CI-gated (`main` is protected by backend + UI workflows: lint, unit tests, real-Postgres integration tests, typecheck, build, automated Cloudflare Pages deployment).

---

## 🌐 Workstation Quick Start

### 1. Live Web Workstation
Open **[https://apx-iq.pages.dev](https://apx-iq.pages.dev)** in any modern browser.
- **Cockpit HUD (`/dashboard`)**: AMOLED steering wheel MFD, 4-corner tyre thermals (surface vs carcass), MoTeC distance ribbon, battle predictor.
- **Mission Control (`/dashboard/intelligence`)**: FastF1 reference ghost benchmarking, pedal dynamics matrix, mechanical setup tuning, AI debriefs.
- **Observability (`/debug`)**: Socket.IO transport inspector, 60Hz UDP frame buffers, Zustand state tree.

### 2. Connect Your EA Sports F1 Game (UDP 20777)
In **EA Sports F1 (2020 through 2025)** on PC, PlayStation, or Xbox:
1. Go to: **Options** ➔ **Settings** ➔ **Telemetry Settings**
2. Set **UDP Telemetry** = `ON`
3. Set **UDP IP Address** = `127.0.0.1` (or your PC's LAN IP for console)
4. Set **UDP Port** = `20777`
5. Set **UDP Send Rate** = `60 Hz`
6. Set **UDP Format** = `2024 / Auto`

Run the local bridge from the project root:
```bash
python run_ingestion.py
```
*Full Setup Guide: [`docs/frontend/USER_ONBOARDING_AND_TELEMETRY_GUIDE.md`](docs/frontend/USER_ONBOARDING_AND_TELEMETRY_GUIDE.md)*

---

## ⌨️ Workstation Hotkeys

| Hotkey | Action | Scope |
| :--- | :--- | :--- |
| **`Space`** | Play / Pause Telemetry Stream | Cockpit HUD |
| **`⌘K` / `Ctrl+K`** | Open Command Palette | Global |
| **`?` / `F1`** | Open Platform Guide & Architecture | Global |
| **`C`** | Open F1 Game Connection Wizard | Cockpit HUD |
| **`⇧1` / `⇧2` / `⇧3`** | Switch Views (HUD / Mission Control / Debug) | Global |
| **`1` / `2` / `3` / `4`** | Switch DDU Mode (Race / Qualy / Tyres / Chassis) | Steering Wheel |
| **`M`** | Cycle Motion Level (Full / Reduced / Off) | Layout |
| **`D`** | Toggle UI Density (Comfortable / Compact) | Layout |

---

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
                        UI (Next.js 16) :3000 / Cloudflare Pages Edge
                             live cockpit (Socket.IO + Zustand)
                             intelligence page (REST + React Query)
```

Full details: [`docs/architecture/system_architecture.md`](docs/architecture/system_architecture.md) ·
API reference: [`docs/architecture/api_map.md`](docs/architecture/api_map.md) ·
Schema: [`docs/architecture/database_schema.md`](docs/architecture/database_schema.md) ·
Cloud Deployment: [`docs/architecture/CLOUD_DEPLOYMENT_GUIDE.md`](docs/architecture/CLOUD_DEPLOYMENT_GUIDE.md).

## Local Development & Gates

```bash
# 1. Run local test suite
ruff check .                       # Python lint (blocking)
pytest -m "not integration"       # unit suite
DATABASE_URL=... alembic upgrade head && \
DATABASE_URL=... pytest -m integration   # real-DB round-trips

# 2. UI Gates
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

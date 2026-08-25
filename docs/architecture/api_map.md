# APX IQ — API Map

> Generated from routers 2026-08-25. Prefixes: `/telemetry`, `/intelligence`.
> All destructive DELETEs require `X-Admin-Key` when `ADMIN_API_KEY` is set.
> Rate limits: global 200/min (slowapi); report generation 10/min.

## Telemetry Router (`api/telemetry_router.py`)

| Method | Path | Purpose |
|---|---|---|
| GET  | `/telemetry/laps/completed?session_uid=&min_telemetry_points=100` | List laps (`LapInfo[]`) |
| GET  | `/telemetry/lap/{lap_id}` | Full lap: header + telemetry points |
| GET  | `/telemetry/lap/{lap_id}/steering` | Steering trace (hardware profiling input) |
| POST | `/telemetry/lap/save` | Persist completed lap. Idempotent per (session_uid, lap_number). Body: `SaveLapRequest` |
| POST | `/telemetry/session/start` | Register session (ingestion bridge). Upserts sessions row; updates SessionManager |
| GET  | `/telemetry/session/current` | Active session snapshot from SessionManager |
| DELETE | `/telemetry/laps/clear` | Wipe laps + cascaded telemetry |

## Intelligence Router (`api/intelligence_router.py`)

| Method | Path | Purpose |
|---|---|---|
| GET  | `/intelligence/health` | Module status + active LLM backend info |
| POST | `/intelligence/delta` | Aligned delta, corner analysis, coaching tips. Body: `DeltaRequest` |
| POST | `/intelligence/hardware` | FFT hardware classification from ≥200 steer samples. Stores profile on app.state. Body: `HardwareRequest` |
| POST | `/intelligence/battle` | Overtake/race projection. Body: `BattleRequest` |
| POST | `/intelligence/report/lap` | Full AI debrief (rate-limited) |
| POST | `/intelligence/report/lap/stream` | Same, streamed text chunks (SSE-style) |
| GET  | `/intelligence/ghost/{track_id}?year=&driver=&session_type=` | FastF1 ghost lap (cached 1h) |
| GET  | `/intelligence/track/{track_id}/layout?year=&driver=` | Normalized circuit geometry (cached 24h) |
| POST | `/intelligence/reports/save` | Persist report (all fields). Body: `SaveReportRequest` |
| GET  | `/intelligence/reports/history?limit=&report_type=` | List summaries incl. stored deltas |
| GET  | `/intelligence/reports/{report_id}` | Single report content |
| GET  | `/intelligence/career/progression?limit=` | Real-metrics pace trend; nulls + sufficiency marker when data thin |
| DELETE | `/intelligence/reports/clear` | Wipe reports |

## System

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{status, db_connected, session_active}` |

Shared request/response models: `api/models/shared.py` — the only place
Pydantic contracts live. UI mirrors them in `ui/src/lib/api/intelligence.ts`.

Removed in the audit repair: the API's WebSocket `/ws` path (no producers);
Socket.IO :3001 is the sole realtime channel.

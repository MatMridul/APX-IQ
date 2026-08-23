# APX IQ — Database Schema Summary

> Last updated: 2026-07-29

---

## Schema Design Philosophy

Two-layer schema with clean separation:
- **Frozen Core** — canonical racing data (sessions, laps, drivers, telemetry raw)
- **Intelligence Extension** — additive-only, never modifies core tables

---

## Entity Relationship Map

```
teams ──────────┐
                ├── drivers ─────┐
                └── cars         │
                                 ▼
sessions (session_uid: uint64) ──┴── laps ──── telemetry_raw
     │                              │
     ├── pit_stops                  ├── user_lap_telemetry  (distance-indexed)
     └── events                     └── ghost_telemetry ─── ghost_laps
                                         │
                                         └── lap_deltas
                                               │
                                               ├── user_lap_id → user_lap_telemetry
                                               └── ghost_lap_id → ghost_laps

hardware_profiles → sessions
```

---

## Table Reference

### Core Tables

| Table | PK | Key Columns | Notes |
|---|---|---|---|
| `teams` | team_id (int) | name | Static reference |
| `drivers` | driver_id (int) | name, team_id, nationality | Official F1 IDs |
| `cars` | car_id (serial) | team_id, model | e.g. "RB20" |
| `sessions` | session_uid (numeric 20,0) | session_type, track_id, start_time | uint64 from game |
| `laps` | lap_id (serial) | session_uid, lap_number, lap_time_ms | Sector times included |
| `pit_stops` | pit_id (serial) | session_uid, driver_id, duration_ms | |
| `events` | event_id (serial) | event_type, event_details (JSONB) | Game event codes |
| `telemetry_raw` | (no PK — time-series) | time, speed_kph, throttle, brake, steer, gear, rpm | TimescaleDB hypertable |

### Intelligence Extension Tables

| Table | PK | Key Columns | Notes |
|---|---|---|---|
| `ghost_laps` | ghost_lap_id (serial) | source, year, gp_name, driver_code, lap_time_ms | Year check ≥ 2022 |
| `ghost_telemetry` | (ghost_lap_id, distance_m) | speed_kph, throttle, brake, gear, x, y, z | Distance-indexed, cascades |
| `user_lap_telemetry` | (user_lap_id, distance_m) | speed_kph, throttle, brake, **steer**, gear, x, y, z | steer col for profiling |
| `hardware_profiles` | profile_id (serial) | session_uid, detected_type, steer_variance | confirmed bool |
| `lap_deltas` | delta_id (serial) | user_lap_id, ghost_lap_id, distance_m, time_delta_ms | Pre-computed results |

---

## Indexing Status

| Index | Table | Columns | Status |
|---|---|---|---|
| PK | ghost_telemetry | (ghost_lap_id, distance_m) | ✅ |
| PK | user_lap_telemetry | (user_lap_id, distance_m) | ✅ |
| idx_user_lap_session | user_lap_telemetry | (session_uid, lap_number) | ✅ |
| idx_lap_deltas_user | lap_deltas | (user_lap_id) | ✅ |
| Missing | ghost_laps | (gp_name, year, driver_code) | ❌ |
| Missing | sessions | (start_time DESC) | ❌ |
| Missing | laps | (session_uid, lap_time_ms) | ❌ |

---

## Migration Status (Alembic)

| Version | Description | Status |
|---|---|---|
| 001_initial_schema.py | Core tables | Created |
| 002_user_lap_telemetry.py | User telemetry + hardware profiles | Created |
| 003_intelligence_reports.py | Reports table | Created |

**Problem:** Migration 003 creates an `intelligence_reports` table, but the code uses in-memory `_report_storage` dict. The migration and the code are **out of sync**.

---

## Current Runtime State

**Database is wired but not active.** The API runs entirely on in-memory storage:
- `InMemoryLapStorage` in `telemetry_router.py` — all lap data lost on API restart
- `_report_storage` dict in `intelligence_router.py` — all reports lost on restart
- `Database.connect()` is called in the lifespan but gracefully skips if `DATABASE_URL` not set

**This is the single largest production blocker.**

---

## Naming Conventions

- Tables: `snake_case` plural nouns
- PKs: `{singular_table_name}_id`
- Time columns: `TIMESTAMPTZ` with `DEFAULT NOW()`
- Boolean flags: `is_*` prefix
- Timestamps: `_at` suffix
- Session UIDs: `NUMERIC(20,0)` to hold uint64 without Python `int` overflow

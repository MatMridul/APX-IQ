# APX IQ — Database Schema

> State after migration **004** (2026-08-25). Migrations are raw SQL under
> `alembic/versions/`; apply with `alembic upgrade head`.
> Driver note: migrations run on psycopg2 (multi-statement support); the
> app runtime uses asyncpg. Both declared in requirements.txt.

## Tables

### sessions
Parent context for laps. Upserted automatically by `DatabaseLapService`
and by `POST /telemetry/session/start`.

| column | type | notes |
|---|---|---|
| session_uid | NUMERIC(20,0) PK | from game header |
| session_type | INT | |
| track_id | INT | enriched by session bridge |
| track_name, weather | VARCHAR/INT | reserved |
| start_time, created_at | TIMESTAMPTZ | |

### laps
| column | type | notes |
|---|---|---|
| lap_id | SERIAL PK | |
| session_uid | NUMERIC(20,0) FK→sessions | upserted in save transaction (audit A1) |
| lap_number | INT | **UNIQUE(session_uid, lap_number)** → idempotent retries (audit B4) |
| lap_time_ms | INT NULL | game-reported; captured since audit B1 fix |
| sector_1/2/3_time_ms | INT NULL | |
| is_valid | BOOLEAN | real validity persisted (audit B1 fix) |
| created_at | TIMESTAMPTZ | |

### user_lap_telemetry
Distance-indexed points per lap (~500–2 000 rows/lap).

| column | type |
|---|---|
| user_lap_id | FK→laps(lap_id) **ON DELETE CASCADE** (added 004) |
| session_uid, lap_number | denormalized NOT NULL (written by service) |
| distance_m | REAL — part of PK (user_lap_id, distance_m) |
| speed_kph, throttle, brake, steer, x, y, z | REAL |
| gear, rpm | INT · drs BOOLEAN |

Indexes: `(session_uid, lap_number)`, `(user_lap_id, distance_m)`.

Access pattern note: rows are **distance-ordered per lap**, not wall-clock
time-series — this is why TimescaleDB hypertables are unnecessary today
despite the timescaledb Docker image. Bulk inserts happen once per
completed lap, never at streaming rate.

### intelligence_reports
| column | type | notes |
|---|---|---|
| report_id | SERIAL PK | |
| user_lap_id | INT FK→laps ON DELETE SET NULL (004) | |
| ghost_lap_id, session_uid, lap_number | nullable refs | |
| report_type | VARCHAR CHECK IN ('lap_debrief','race_summary','corner_study') | |
| title, markdown, summary | TEXT (markdown NOT NULL — audit A2 fix) | |
| key_findings | JSONB | list of strings |
| generated_by, generation_time_ms | VARCHAR / INT | backend + latency |
| total_time_delta_ms, avg_speed_delta_kph | REAL | consumed by career progression (audit B2/B3 fixes) |
| corner_count, worst/best_corner_index | INT | |
| hardware_profile | JSONB | |
| created_at | TIMESTAMPTZ | |

Indexes: `(session_uid, lap_number)`, `created_at DESC`.

## Dropped in 004 (never had a writer)

`teams`, `drivers`, `hardware_profiles`, `ghost_laps`, `ghost_telemetry`.
Resurrect via a new migration only when a feature actually writes them.

## Conventions

- No ORM. Services speak raw asyncpg parameterized SQL.
- Schema changes = new migration file; never edit applied ones.
- Any migration PR must include an integration test round-tripping the
  changed tables (`tests/integration/`, Postgres service in CI).

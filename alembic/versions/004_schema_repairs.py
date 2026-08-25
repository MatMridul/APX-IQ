"""004 — Schema repairs: orphan tables, missing FKs, uniqueness

Repairs identified in the 2026-08 audit:
  - Drop never-written reference tables (teams, drivers) and their dead FK.
  - Drop feature tables built ahead of any writer (hardware_profiles,
    ghost_laps, ghost_telemetry) — resurrect when features ship (YAGNI).
  - laps.session_uid previously referenced sessions, but nothing inserted
    sessions -> first lap save crashed with an FK violation (audit A1).
    Sessions are now upserted by the save/session-start paths; FK stays.
  - Enforce one row per (session_uid, lap_number): makes lap-save retries
    idempotent (ON CONFLICT DO NOTHING) — audit B4.
  - user_lap_telemetry.user_lap_id had NO foreign key -> orphaned telemetry
    rows possible. Added FK with CASCADE so clearing laps wipes its rows.

Revision ID: 004
Revises: 003
"""

from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    -- 1. Detach laps from the reference tables BEFORE dropping them
    ALTER TABLE laps DROP COLUMN IF EXISTS driver_id;

    -- 2. Drop tables that no code ever wrote to (audit finding C2)
    DROP TABLE IF EXISTS ghost_telemetry;
    DROP TABLE IF EXISTS ghost_laps;
    DROP TABLE IF EXISTS hardware_profiles;
    DROP TABLE IF EXISTS drivers;
    DROP TABLE IF EXISTS teams;

    -- 3. Idempotent lap saves (retry-safety for the ingestion worker)
    CREATE UNIQUE INDEX IF NOT EXISTS uq_laps_session_lapnum
        ON laps (session_uid, lap_number);

    -- 4. Telemetry rows must belong to a real lap (audit finding C2/A1)
    DELETE FROM user_lap_telemetry t
    WHERE NOT EXISTS (SELECT 1 FROM laps l WHERE l.lap_id = t.user_lap_id);
    ALTER TABLE user_lap_telemetry
        ADD CONSTRAINT fk_user_lap_telemetry_lap
        FOREIGN KEY (user_lap_id) REFERENCES laps(lap_id) ON DELETE CASCADE;

    -- 5. Reports referencing deleted laps must not dangle silently either
    ALTER TABLE intelligence_reports
        ADD CONSTRAINT fk_reports_user_lap
        FOREIGN KEY (user_lap_id) REFERENCES laps(lap_id) ON DELETE SET NULL;
    """)


def downgrade() -> None:
    op.execute("""
    ALTER TABLE intelligence_reports DROP CONSTRAINT IF EXISTS fk_reports_user_lap;
    ALTER TABLE user_lap_telemetry DROP CONSTRAINT IF EXISTS fk_user_lap_telemetry_lap;
    DROP INDEX IF EXISTS uq_laps_session_lapnum;
    ALTER TABLE laps ADD COLUMN IF NOT EXISTS driver_id INT REFERENCES drivers(driver_id);

    CREATE TABLE IF NOT EXISTS teams (
        team_id   INT PRIMARY KEY,
        name      VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS drivers (
        driver_id   INT PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        team_id     INT REFERENCES teams(team_id),
        nationality VARCHAR(50),
        created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    """)

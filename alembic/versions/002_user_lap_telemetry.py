"""002 — User lap telemetry + ghost laps

Revision ID: 002
Revises: 001
Create Date: 2025-01-01
"""

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS user_lap_telemetry (
        user_lap_id  SERIAL,
        session_uid  NUMERIC(20,0) NOT NULL,
        lap_number   INT NOT NULL,
        distance_m   REAL NOT NULL,
        speed_kph    REAL,
        throttle     REAL,
        brake        REAL,
        steer        REAL,
        gear         INT,
        rpm          INT,
        drs          BOOLEAN,
        x REAL, y REAL, z REAL,
        PRIMARY KEY (user_lap_id, distance_m)
    );

    CREATE INDEX IF NOT EXISTS idx_user_lap_session
        ON user_lap_telemetry (session_uid, lap_number);

    CREATE INDEX IF NOT EXISTS idx_user_lap_distance
        ON user_lap_telemetry (user_lap_id, distance_m);

    CREATE TABLE IF NOT EXISTS ghost_laps (
        ghost_lap_id   SERIAL PRIMARY KEY,
        source         VARCHAR(20) NOT NULL,
        year           INT NOT NULL,
        gp_name        VARCHAR(100) NOT NULL,
        session_type   VARCHAR(10) NOT NULL,
        driver_code    VARCHAR(5) NOT NULL,
        lap_number     INT,
        lap_time_ms    INT,
        track_distance_m REAL,
        created_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ghost_telemetry (
        ghost_lap_id INT REFERENCES ghost_laps(ghost_lap_id) ON DELETE CASCADE,
        distance_m   REAL NOT NULL,
        speed_kph    REAL,
        throttle     REAL,
        brake        REAL,
        gear         INT,
        rpm          INT,
        drs          BOOLEAN,
        x REAL, y REAL, z REAL,
        PRIMARY KEY (ghost_lap_id, distance_m)
    );

    CREATE INDEX IF NOT EXISTS idx_ghost_telemetry_distance
        ON ghost_telemetry (ghost_lap_id, distance_m);
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS ghost_telemetry;
    DROP TABLE IF EXISTS ghost_laps;
    DROP TABLE IF EXISTS user_lap_telemetry;
    """)

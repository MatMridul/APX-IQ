"""001 — Initial schema

Revision ID: 001
Revises:
Create Date: 2025-01-01
"""

from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
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

    CREATE TABLE IF NOT EXISTS sessions (
        session_uid  NUMERIC(20,0) PRIMARY KEY,
        session_type INT,
        track_id     INT,
        track_name   VARCHAR(100),
        weather      INT,
        start_time   TIMESTAMPTZ DEFAULT NOW(),
        created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS laps (
        lap_id           SERIAL PRIMARY KEY,
        session_uid      NUMERIC(20,0) REFERENCES sessions(session_uid),
        driver_id        INT REFERENCES drivers(driver_id),
        lap_number       INT NOT NULL,
        lap_time_ms      INT,
        sector_1_time_ms INT,
        sector_2_time_ms INT,
        sector_3_time_ms INT,
        is_valid         BOOLEAN DEFAULT TRUE,
        created_at       TIMESTAMPTZ DEFAULT NOW()
    );
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS laps;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS drivers;
    DROP TABLE IF EXISTS teams;
    """)

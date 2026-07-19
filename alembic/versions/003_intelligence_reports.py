"""003 — Intelligence reports

Revision ID: 003
Revises: 002
Create Date: 2025-01-01
"""

from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS intelligence_reports (
        report_id            SERIAL PRIMARY KEY,
        user_lap_id          INT,
        ghost_lap_id         INT,
        session_uid          NUMERIC(20,0),
        lap_number           INT,
        report_type          VARCHAR(50) NOT NULL,
        title                TEXT NOT NULL,
        markdown             TEXT NOT NULL,
        summary              TEXT,
        key_findings         JSONB,
        generated_by         VARCHAR(50) NOT NULL,
        generation_time_ms   INT,
        total_time_delta_ms  REAL,
        avg_speed_delta_kph  REAL,
        corner_count         INT,
        worst_corner_index   INT,
        best_corner_index    INT,
        hardware_profile     JSONB,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT chk_report_type CHECK (
            report_type IN ('lap_debrief', 'race_summary', 'corner_study')
        )
    );

    CREATE INDEX IF NOT EXISTS idx_intelligence_reports_session
        ON intelligence_reports (session_uid, lap_number);

    CREATE INDEX IF NOT EXISTS idx_intelligence_reports_created
        ON intelligence_reports (created_at DESC);

    CREATE TABLE IF NOT EXISTS hardware_profiles (
        profile_id    SERIAL PRIMARY KEY,
        session_uid   NUMERIC(20,0) NOT NULL,
        detected_type VARCHAR(30) NOT NULL,
        confirmed     BOOLEAN DEFAULT FALSE,
        steer_variance REAL,
        steer_frequency REAL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS hardware_profiles;
    DROP TABLE IF EXISTS intelligence_reports;
    """)

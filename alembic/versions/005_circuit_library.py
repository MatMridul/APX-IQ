"""005 — Circuit library

Library-first circuit architecture (docs/architecture/era_profiles.md §4):
every circuit for every supported game year, with layout, sector bounds
and aero zones (DRS zones 2020-25, X-mode zones 2026), persisted so the
dashboard renders the correct circuit the moment the session packet
names it — no first-lap tracing required.

Rows are seeded by scripts/seed_circuits.py and self-populate when the
track-layout API fetches a circuit not yet cached.

Revision ID: 005
Revises: 004
"""

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS circuits (
        circuit_id  SERIAL PRIMARY KEY,
        track_id    INT NOT NULL UNIQUE,
        name        VARCHAR(100) NOT NULL,
        game_years  INT[] DEFAULT '{}',
        layout      JSONB,
        sectors     JSONB,
        aero_zones  JSONB,
        turns       JSONB,
        updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_circuits_track
        ON circuits (track_id);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS circuits;")

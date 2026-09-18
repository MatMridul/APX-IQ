"""006 — Thermal & ERS telemetry columns on user_lap_telemetry

The recorder and the canonical TelemetryPoint model carry tyre surface/inner
temperatures, brake temperatures, and ERS store energy / deploy mode, and the
CoachEngine's thermal/energy rules consume them. But the persistence INSERT
omitted these columns, so laps reloaded from PostgreSQL lost their thermal/ERS
data and thermal/energy coaching silently degraded on persisted laps
(wiring_map.md: HALF-WIRED data-loss boundary).

This migration adds the missing columns so the persisted lap is a faithful
round-trip of what the recorder captured. Nullable / defaulted so existing
rows and in-memory-origin laps remain valid.

Revision ID: 006
Revises: 005
"""

from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE user_lap_telemetry
        ADD COLUMN IF NOT EXISTS tyres_surface_temp REAL[],
        ADD COLUMN IF NOT EXISTS tyres_inner_temp   REAL[],
        ADD COLUMN IF NOT EXISTS brakes_temp        REAL[],
        ADD COLUMN IF NOT EXISTS ers_store_energy   REAL,
        ADD COLUMN IF NOT EXISTS ers_deploy_mode    INT;
    """)


def downgrade() -> None:
    op.execute("""
    ALTER TABLE user_lap_telemetry
        DROP COLUMN IF EXISTS tyres_surface_temp,
        DROP COLUMN IF EXISTS tyres_inner_temp,
        DROP COLUMN IF EXISTS brakes_temp,
        DROP COLUMN IF EXISTS ers_store_energy,
        DROP COLUMN IF EXISTS ers_deploy_mode;
    """)

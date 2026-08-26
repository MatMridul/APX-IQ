"""
Seed the circuit library from FastF1 — every track for a reference season.

Run once (and after adding new game years):
    python scripts/seed_circuits.py [year]

Requires DATABASE_URL. Uses the FastF1Client layout fetcher; sectors and
aero zones are left NULL for later refinement from session data.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings  # noqa: E402
from intelligence.fastf1_client import resolve_track_name  # noqa: E402

# Game track IDs present across supported titles (F1 20-25 share most).
TRACK_IDS = list(range(0, 32))

UPSERT = """
INSERT INTO circuits (track_id, name, game_years, layout)
VALUES ($1, $2, ARRAY[$3::int], $4::jsonb)
ON CONFLICT (track_id) DO UPDATE
    SET name = EXCLUDED.name,
        layout = EXCLUDED.layout,
        game_years = (
            SELECT array_agg(DISTINCT y)
            FROM unnest(circuits.game_years || EXCLUDED.game_years) AS y
        ),
        updated_at = NOW()
RETURNING circuit_id;
"""


async def seed(year: int) -> None:
    from core.database import db
    from intelligence.fastf1_client import FastF1Client

    await db.connect()
    if db.pool is None:
        print("DATABASE_URL not set — cannot seed.")
        return

    client = FastF1Client()
    seeded = skipped = failed = 0

    for track_id in TRACK_IDS:
        name = resolve_track_name(track_id)
        if not name:
            continue
        try:
            layout = await asyncio.to_thread(
                client.get_track_layout, year=year, gp=name,
                session_type="Q", driver="VER",
            )
            if not layout:
                skipped += 1
                continue
            import json
            async with db.pool.acquire() as conn:
                await conn.fetchval(
                    UPSERT, track_id, name, year, json.dumps(layout)
                )
            seeded += 1
            print(f"  [ok] {track_id:>2} {name}")
        except Exception as exc:
            failed += 1
            print(f"  [fail] {track_id} {name}: {str(exc)[:80]}")

    print(f"\nSeeded {year}: {seeded} ok · {skipped} unavailable · {failed} failed")
    await db.close()


if __name__ == "__main__":
    yr = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
    asyncio.run(seed(yr))

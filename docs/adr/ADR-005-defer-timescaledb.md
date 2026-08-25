# ADR-005: Defer TimescaleDB despite shipping the image

- Status: Accepted
- Date: 2026-08-25
- Deciders: MatMridul, opencode agent

## Context

The original vision promised hybrid relational + time-series storage, and
`infra/docker-compose.yml` uses the `timescale/timescaledb` image. But no
extension/hypertable was ever created, and measured write patterns are
bulk-insert-per-lap (~500–2 000 rows every couple of minutes) with
distance-ordered per-lap reads — a relational access pattern, not a
wall-clock streaming one.

## Decision

Keep plain PostgreSQL semantics. Do not create hypertables until a
feature actually persists raw frames at stream rate; when that ships,
convert the new table (not user_lap_telemetry) via
`CREATE EXTENSION timescaledb` + `create_hypertable`. Decide keep-vs-swap
of the compose image as part of v1.0 Option B packaging.

## Consequences

+ Zero operational surface we don't use; honest docs (schema note added).
+ Migration path stays cheap because writes already go through
  DatabaseLapService, not ad-hoc SQL scattered around.
− The image/feature mismatch must not be described as "hybrid storage"
  anywhere (docs corrected 2026-08-25).

Reversal cost: low — additive extension on a future table.

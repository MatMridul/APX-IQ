# ADR-001: Split ingestion and API into two processes

- Status: Accepted
- Date: 2026-08 (pre-audit); reaffirmed 2026-08-25 audit
- Deciders: MatMridul, agent-assisted

## Context

F1 games stream UDP telemetry at high frequency (~60 Hz bursts across 5+
packet types). Persisting to PostgreSQL takes milliseconds per statement;
the intelligence pipeline runs pandas/numpy workloads. Coupling these to
the decode loop would stall packet consumption or drop frames, and an API
crash would take live dashboards down with it.

## Decision

Run ingestion as its own process (`ingestion/main.py`, Socket.IO :3001)
that owns UDP, decoding, lap buffering, and live fan-out. Completed laps
cross to the API process (:8000) via idempotent HTTP POSTs; sessions are
bridged the same way.

## Consequences

+ Hot path never blocks on storage; API restarts don't interrupt racing.
+ Each process scales/fails independently.
− Two deployment units to run/observe (mitigated by one-command compose
  planned for v1.0 Option B).
− Cross-process contract (SaveLapRequest) must stay versioned and
  validated — enforced by shared Pydantic models + integration tests.

Reversal cost: moderate — merge points are already narrow (two POSTs).

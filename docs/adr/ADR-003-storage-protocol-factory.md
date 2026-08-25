# ADR-003: Storage behind Protocol + factory (DB/memory swap)

- Status: Accepted
- Date: 2026-08-25 (pattern pre-dates; formalised after audit)
- Deciders: MatMridul, agent-assisted

## Context

Lap/report storage must work in three worlds: CI (no services), dev
(optional Docker), production-ish local (Postgres). The original audit
also proved that a Database implementation with zero integration tests
can be completely broken while every unit test stays green.

## Decision

Every storage concern defines a `Protocol` (save/get/list/clear) with two
implementations — InMemory and Database — selected by a factory at app
startup (`create_lap_service(pool)`, `create_report_service(pool)`),
attached to `app.state` in the lifespan. Routers depend only on the
Protocol.

## Consequences

+ CI runs the whole API without infrastructure; prod swaps in Postgres by
  env var alone.
+ Contract tests on the InMemory implementation double as the interface
  spec the DB implementation must honour.
− Two implementations must stay behaviourally identical — enforced by the
  shared contract tests + required integration suite for the DB side.

Reversal cost: n/a (this is the seam that makes other reversals cheap).

# APX IQ — Technical Debt Registry

> Reset 2026-08-25 after the full audit + repair campaign
> (commits a2374df → present). Items below are OPEN.
> Fixed items live in git history, not here.

## Open Engineering Debt

| ID | Item | Location | Notes |
|---|---|---|---|
| T1 | Process-level singletons: `battle_predictor`, `hardware_profile` on app.state leak state across concurrent users | api/main.py lifespan | Single-player local app today; must scope per-session before any multi-user deploy |
| T2 | ESLint warnings (~31): exhaustive-deps, unused vars | ui/src | Errors are zero & blocking; warnings tracked here |
| T3 | Root-level manual dev scripts (`test_*.py`, `demo_race.py`) look like tests but aren't collected | repo root | Excluded via `testpaths = tests`; rename/move when convenient — keep their `sys.path` assumptions in mind |
| T4 | Analysis cache key uses Python `hash()` of float tuples | analysis_service.py | Fine in-process; would need stable keys if Redis backend becomes multi-process |
| T5 | No request authentication between ingestion and API | ingestion→API POSTs | Acceptable localhost-only; part of security pass |
| T6 | `cached` decorator builds keys from raw args repr | core/cache.py | Currently unused; fix or delete on next touch |

## Deferred Security Pass (Strix-assisted)

Hardening was deliberately deferred and will be driven by a Strix
penetration-style audit. Known items to feed it:

- D1 No authn/authz on data endpoints (deletes admin-guarded only)
- D2 `CORS_ORIGINS="*"` default
- D3 Default `SECRET_KEY`
- D4 Pickle serialisation in Redis cache backend (deserialisation risk;
  no NEW pickle code until replaced)
- D5 Ingestion→API trust model (anyone can POST fake laps)
- Dependency audit runs in CI as report-only (`pip-audit`, `npm audit`)
  — promote to blocking once baseline noise is triaged

## Recurrence Prevention (process, not code)

The original Category-A bugs (code that never ran against its own DB)
are prevented by three standing rules:

1. Storage/model/migration changes require an integration test
   (`tests/integration/`) — enforced socially by Definition of Done,
   technically by CI's Postgres job.
2. Docs must match reality in the same PR (`AGENTS.md` header date +
   this file).
3. Dead code is deleted, not commented or left orphaned.

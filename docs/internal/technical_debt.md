# APX IQ — Technical Debt & Outstanding TODOs

> Last updated: 2026-07-29

---

## Critical Debt (Blocks Production)

### 1. All Storage is In-Memory
**Files**: `api/telemetry_router.py`, `api/intelligence_router.py`
- `InMemoryLapStorage` — all lap telemetry lost on API restart
- `_report_storage: dict` + `_next_report_id: int` global — same problem
- Database connection pool exists (`core/database.py`) but no router uses it
- Alembic migrations exist (3 versions) but tables are never written to

**Fix path**: Implement `DatabaseLapStorage` and `DatabaseReportStorage` classes that use the existing asyncpg pool. Wire into routers via FastAPI dependency injection.

### 2. No Authentication
- All endpoints are completely open
- DELETE endpoints (`/laps/clear`, `/reports/clear`) accessible by anyone
- LLM generation endpoint has no rate limiting (decorator is mentioned in comments but not applied)

### 3. `_hardware_profile` and `_battle_predictor` are Process-Level Singletons
**File**: `api/intelligence_router.py` lines 38-44
- Hardware profile set by one user affects all users
- Battle predictor maintains lap history that leaks across sessions
- Not thread-safe for concurrent requests

---

## High Debt (Needs Fixing Soon)

### 4. `TelemetryPoint` Pydantic Model Duplicated
Both `telemetry_router.py` and `intelligence_router.py` define an identical `TelemetryPoint` Pydantic model. Should live in `api/models/shared.py`.

### 5. `SESSION_MANAGER` Not Connected
`SessionManager` is instantiated in `api/main.py` and `PacketRouter` is created, but `PacketRouter` is never called — packets are dispatched directly in `ingestion/main.py` instead. The `PacketRouter` in `ingestion/router.py` is **dead code**.

### 6. Ingestion → API HTTP POST Hardcoded
`ingestion/main.py` lap saver posts to `http://localhost:8000/telemetry/lap/save`. No env var. Will fail if API moves.

### 7. `logger` vs `log` Name Clash in `telemetry_router.py`
Line 311: `logger.info(f"Cleared {count} laps from storage")` uses `logger` (undefined). The file uses `log = get_logger(...)` (structlog). This will throw `NameError` on `DELETE /telemetry/laps/clear`.

### 8. `CircularRPMGauge.tsx` Has Duplicate Arc Calculations
Arc path `d` attribute is computed three times via inline IIFEs (lines 122-133, 137-149, 153-164) because the memoized refs don't re-export the generated paths. Should use the `useMemo` refs.

### 9. Rate Limiting Not Actually Applied on Report Generation
`intelligence_router.py` line 281-286: Comment says "rate limited to 5/minute" but the rate limiter decorator is NOT applied — manual comment references importing Limiter but it's never called.

### 10. `useSocket.ts` Has a Module-Level Mutable Global
`let socket: Socket | null = null` at module level is fine for a single-page app, but it means the socket is never torn down. If environment changes (e.g., dev hot reload), the stale socket persists. Should be managed via React context or store.

---

## Medium Debt (Backlog)

### 11. No Test Suite
- `tests/` directory contains only `.gitkeep`
- Multiple test files at root (`test_complete_lap.py`, `test_intelligence_audit.py`, etc.) — ad hoc, not in pytest structure
- No unit tests for any intelligence module
- No integration tests for API endpoints
- No E2E tests

### 12. F1 25 vs F1 22 Branching in Ingestion
`ingestion/main.py` has format-specific sector time parsing inline. This will grow into a maintenance problem with each F1 release. Should be abstracted into the decoder.

### 13. `debug_imports.py` at Root
Root-level `debug_imports.py` script — debugging artifact not removed.

### 14. Dozens of Markdown Files at Root
17 markdown files at project root (`PHASE_5B_COMPLETE.md`, `DEMO_READY.md`, etc.) — these are development history artifacts, not documentation. Should be archived or deleted.

### 15. No Dockerfile for API or UI
Only the database has a docker-compose service. Full containerization incomplete.

### 16. Alembic `env.py` Has Placeholder Model Metadata
`alembic/env.py` references `target_metadata = Base.metadata` but `Base` is never imported — migration autogenerate would fail.

### 17. `docs/` Had No Content Before This Review
The `docs/` directory existed but was empty. Now populated by this review.

### 18. `@fontsource/rajdhani` Mixed With `next/font`
Inter and JetBrains Mono use `next/font/google` (optimized, self-hosted). Rajdhani uses `@fontsource` (CSS import, not optimized). Should unify to all `next/font`.

---

## TODO Comments in Code

| File | Line | TODO |
|---|---|---|
| `api/telemetry_router.py` | 31 | Replace with proper DB connection pool |
| `api/telemetry_router.py` | 37 | Implement connection pooling |
| `api/telemetry_router.py` | 289 | Get session info from session manager |
| `api/main.py` | (implied) | Connect PacketRouter to actual packet flow |
| `intelligence_router.py` | 42 | Will be replaced with DB in Phase 3b |

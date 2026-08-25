# Changelog

All notable changes to APX IQ. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning intent
is [SemVer](https://semver.org/). The first tagged release is planned as
v1.0.0 — see `docs/internal/v1_definition.md` for its scope definition.

## [Unreleased]

### Added
- Real CI: Backend (ruff · unit · Postgres-16 integration via service
  container · migrations gate) and UI (tsc · eslint blocking · build)
  workflows; branch protection requires both.
- Integration test suite (`tests/integration/`) round-tripping laps,
  reports, sessions against real PostgreSQL.
- Migration `004_schema_repairs`: dropped orphan tables, added lap-save
  uniqueness + FK CASCADE/SET NULL constraints.
- Session bridging: ingestion → `POST /telemetry/session/start`; sessions
  upserted inside the save transaction; `SessionManager` wired.
- Lap persistence now stores game-reported lap times, sector times and
  true validity; report persistence stores all fields including deltas,
  corner stats and hardware profile (JSONB).
- Career progression endpoint returns only real computed metrics with an
  explicit data-sufficiency marker.
- ADRs 001–005; SECURITY.md; CONTRIBUTING.md; CODEOWNERS.

### Changed
- Ingestion lap saver retries failed POSTs; acknowledged laps are pruned
  from recorder memory (bounded buffers throughout).
- Cache layer: Redis dependency declared; in-memory backend enforces TTL;
  backend selection centralised in `core.config.settings`.
- UI: socket bridge mounted app-wide in Providers (direct `/dashboard`
  visits live); ESLint errors reduced 31→0 and made blocking; deleted two
  superseded component generations.

### Fixed
- Missing `get_adapter_for_format` import crashed every UDP packet in the
  ingestion pipeline (silent due to broad except).
- Report save used nonexistent column `markdown_content`.
- Lap save violated `laps→sessions` FK on a migrated database.
- Telemetry inserts omitted required session/lap columns.
- Migrations were unrunnable (alembic/driver not declared).
- Dead WebSocket fan-out and PacketRouter removed after audit proved them
  unwired.

### Removed
- 26 stale documentation files; replaced with truthful canonical set.

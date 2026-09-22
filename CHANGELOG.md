# Changelog

All notable changes to APX IQ. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning intent
is [SemVer](https://semver.org/). The first tagged release is planned as
v1.0.0 — see `docs/internal/v1_definition.md` for its scope definition.

## [Unreleased]

### Added
- **F1 Game Connection Wizard (`GameConnectModal`)**: Interactive in-game telemetry setup matrix, 60Hz UDP listener health diagnostics, platform tab selector (PC / PlayStation / Xbox), 1-click launch commands, and simulated test stream triggers.
- **Platform Architecture Guide & Workstation Manual (`PlatformGuideModal`)**: Comprehensive interactive manual detailing AMOLED steering wheel MFD, 4-corner carcass vs surface tyre thermals, MoTeC distance ribbon, Mission Control FastF1 benchmarking, and complete keyboard shortcuts keymap (`?` / `F1`).
- **Pit Wall Standby & Telemetry Honesty Overlay (`TelemetryStandbyOverlay`)**: Motorsport pit wall standby state informing the user when awaiting live UDP 20777 packets, with instant quick-actions to connect or run offline benchmark laps.
- **Continuous Deployment (CD) Pipeline**: Automated sequenced deployment to Cloudflare Pages edge network (`.github/workflows/cd.yml`) with zero-downtime global asset distribution (<20ms edge latency).
- **Master User Onboarding & Telemetry Guide**: `docs/frontend/USER_ONBOARDING_AND_TELEMETRY_GUIDE.md` covering end-to-end game configuration, UDP socket bridge architecture, and telemetry provenance.
- Real CI: Backend (ruff · unit · Postgres-16 integration via service container · migrations gate) and UI (tsc · eslint blocking · build) workflows; branch protection requires both.
- Integration test suite (`tests/integration/`) round-tripping laps, reports, sessions against real PostgreSQL.
- Migration `004_schema_repairs`: dropped orphan tables, added lap-save uniqueness + FK CASCADE/SET NULL constraints.
- Session bridging: ingestion → `POST /telemetry/session/start`; sessions upserted inside the save transaction; `SessionManager` wired.
- Lap persistence now stores game-reported lap times, sector times and true validity; report persistence stores all fields including deltas, corner stats and hardware profile (JSONB).
- Career progression endpoint returns only real computed metrics with an explicit data-sufficiency marker.
- ADRs 001–005; SECURITY.md; CONTRIBUTING.md; CODEOWNERS.

### Changed
- **Default Workstation State**: Cockpit HUD now initializes strictly in paused standby mode (`isPlaying: false`, `virtualTime: 0.0s`), preventing uncommanded telemetry movement on page load.
- Ingestion lap saver retries failed POSTs; acknowledged laps are pruned from recorder memory (bounded buffers throughout).
- Cache layer: Redis dependency declared; in-memory backend enforces TTL; backend selection centralised in `core.config.settings`.
- UI: socket bridge mounted app-wide in Providers (direct `/dashboard` visits live); ESLint errors reduced 31→0 and made blocking; deleted two superseded component generations.

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

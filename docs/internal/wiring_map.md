# APX IQ — Platform Wiring Map

> Last updated: 2026-09-19
> Purpose: the single source of truth for whether each platform capability is
> actually connected end-to-end (SOURCE → SINK), or merely implemented and left
> idle. "Done" means WIRED and covered by an outcome test — not "the code exists."
>
> Status legend:
> - **CONNECTED** — wired end-to-end AND has an outcome/e2e test that would fail if it broke.
> - **HALF-WIRED** — partially connected; works on some path/version but silently degrades or drops data elsewhere.
> - **DEAD** — implemented but no consumer, or broken decode; produces nothing live.
>
> Rule for contributors: if you add or change a capability, update its row here in
> the same PR. If you add a feature with no outcome test, it is HALF-WIRED at best.

---

## Core product loop (the healthy heart)

| Capability | Source → Sink | Status | Evidence | Note |
|---|---|---|---|---|
| Car Telemetry ingest (speed/throttle/brake/gear/rpm/drs) | UDP ID=6 → recorder → `telemetry_update` → UI | CONNECTED | `ingestion/main.py` ID=6 branch; `useTelemetry.ts` `onTelemetry` | Core cockpit stream, all 6 game formats |
| Lap Data ingest + finalize | UDP ID=2 → recorder lap boundary → completed lap | CONNECTED | `telemetry_recorder.py` `update_lap_data`/`_finalize_lap` | |
| Lap persistence (base columns) | recorder → `POST /telemetry/lap/save` → DB/in-mem | CONNECTED | `ingestion/main.py` `lap_saver_worker`; `lap_service.py` | Real Postgres when `DATABASE_URL` set; else in-memory |
| Thermal/ERS coaching (live/in-memory laps) | recorder thermal+ERS → `AnalysisService` → `CoachEngine` → tip | CONNECTED | `analysis_service.py` passes `user_telemetry_df`; `tests/test_coach_pipeline_integration.py` | Fixed + tested (commit a87d280) |
| Delta / corner / alignment engines | `AnalysisService` orchestration | CONNECTED | `analysis_service.py:82-104` | Called by `/delta`, `/report/lap` |
| LLM/template report generation | `/report/lap` → `ReportGenerator` (Gemini→Ollama→template) | CONNECTED | `intelligence_router.py` report route | Live; no *outcome* test on generated content (see Test gaps) |
| FastF1 ghost / track layout fetch | `/ghost/{id}`, `/track/{id}/layout` → FastF1 + cache | CONNECTED | `intelligence_router.py` | Live external dependency |
| DB round-trip (idempotency, sectors, CASCADE, career deltas) | API ↔ Postgres | CONNECTED (gated) | `tests/integration/test_db_roundtrip.py` | ⚠️ Tests only run when `DATABASE_URL` is set — see Systemic risks |
| Windows UTF-8 logging | `configure_logging` | CONNECTED | `core/logging_config.py`; `tests/test_logging_unicode.py` | Fixed + tested (commit 4c76d59) |

---

## Data-loss boundaries (HALF-WIRED — v1-critical bugs)

| Capability | What breaks | Status | Evidence | Fix path |
|---|---|---|---|---|
| Sector times persistence | Ingestion sends `sector_1_ms`/`sector_2_ms`; `SaveLapRequest` expects `sector_1_time_ms`/`sector_2_time_ms`/`sector_3_time_ms`. Pydantic silently drops the unknown keys → **every persisted lap has NULL sectors** | HALF-WIRED | `ingestion/main.py` save payload vs `api/models/shared.py` `SaveLapRequest`; DB test `test_lap_times_and_validity_survive_roundtrip` only covers correctly-named fields | Rename ingestion payload keys to `sector_N_time_ms`; add ingestion→API field-contract test |
| Thermal/ERS at DB persistence | `TelemetryPoint` carries thermal/ERS and they reach the coach in-memory, but the `user_lap_telemetry` INSERT omits those columns → laps reloaded from Postgres lose them; thermal/energy coaching silently degrades on persisted laps | HALF-WIRED | `lap_service.py` `DatabaseLapService.save_lap` INSERT column list | Add columns to schema (Alembic) + INSERT + row read; e2e test asserting thermal survives DB round-trip |
| `ersStoreEnergy` socket → UI | Emitted on `car_status_update` (6 fields) but `CarStatusData` type declares 5; field received and discarded | HALF-WIRED | `ingestion/main.py:238` emit vs `useTelemetry.ts` `CarStatusData` | Add field to type + render target |

---

## Enrichment features (to be WIRED for v1 — user wants these included)

| Capability | Current state | Status | Evidence | What "wired" requires |
|---|---|---|---|---|
| Battle / rival-gap projection | `/intelligence/battle` fully built; `BattlePanel.tsx` shows synthetic demo gaps; `deltaToFront` hardcoded `0.0`; **no rival-gap computed anywhere in ingestion** | DEAD | `intelligence_router.py` battle route; `main.py:229`; `BattlePanel.tsx` | (1) compute real rival gaps in ingestion from Lap Data positions/distances; (2) emit them; (3) UI calls `/battle` (or consumes live gaps); (4) e2e test. **Blocked on (1) — nothing real to show until gaps exist.** |
| Career progression | `/career/progression` built with honest-null logic; no UI caller | DEAD | `intelligence_router.py` career route | Add UI fetch + view; e2e test (DB-backed) |
| Session context (weather/timing/type) | Session packet decodes only on F1 22 & 25; thin modules (2020/21/23/24) lack `PacketSessionData` → throws, session-bridge dies on 4/6 versions; laps persist `session_uid=None` there | HALF-WIRED | `decoder.py` ID=1 dispatch; only `packet_structs_22/25` define `PacketSessionData` | Add `PacketSessionData` to the 4 thin struct modules; e2e decode test per version |
| Participants (driver names/teams) | Decodes only on F1 25; consumed by nobody | DEAD | `packet_structs_25.py` only; no recorder/adapter reader | Add struct to other versions; wire `participants` emit → UI (fix `{drivers:[...]}` shape + `team_id`); BattlePanel real names |
| Race events (flags/penalties/speed trap) | **No decoder branch — broken on ALL versions**; `m_speedTrapSpeed` doesn't exist in any struct | DEAD | `decoder.py` has no ID=3 branch | Add Event decode branch; correct field names; wire `race_event` → StatusBar |
| Hardware auto-profiling | Recorder accumulates steer trace, never POSTed; `/hardware` only classifies a client-supplied trace | HALF-WIRED | `telemetry_recorder.py` `get_steer_trace` (no caller); `intelligence_router.py` hardware route | Wire recorder trace → `/hardware` after N laps; assert classification *value* not just keys |
| Tyre pressures | `extract_telemetry` provides `tyre_pressures`; emitted on `telemetry_update`; UI consumption unconfirmed | HALF-WIRED | `universal_adapter.py`; `main.py` emit | Confirm/ add UI render |
| Brake bias | `extract_car_status` provides `brake_bias`; emitted; UI consumption unconfirmed | HALF-WIRED | `universal_adapter.py`; `main.py` emit | Confirm/ add UI render |
| `/intelligence/delta` route | Full delta+coaching endpoint; UI computes delta client-side instead | DEAD (by choice) | no UI caller | Either adopt server delta or document client-side as intentional |
| `/report/lap/stream` | Streaming client fn exists; no hook/component calls it | DEAD | `intelligence.ts` `generateLapReportStream` unused | Wire streaming into report UI or remove |
| `GET /telemetry/session/current` | No caller | DEAD | no UI fetch | Remove or wire |

---

## Dead abstractions (remove or wire; currently pure dead weight)

| Item | Status | Evidence | Note |
|---|---|---|---|
| `UniversalPacketAdapter.extract_motion` | DEAD | never called; motion recorded directly from ctypes | Remove or route recorder through it |
| `CanonicalTelemetryFrame` model | DEAD | defined in `shared.py`; no constructor in non-test code | Adapter docstrings claim it produces these frames; nothing builds one |

---

## Test-suite trust ledger

| Test | Kind | Trustworthy? | Note |
|---|---|---|---|
| `tests/test_coach_pipeline_integration.py` | OUTCOME / e2e | ✅ | Gold standard — real ctypes packets through full pipeline |
| `tests/test_logging_unicode.py` | OUTCOME | ✅ | Isolated-subprocess reproduction of the cp1252 defect |
| `tests/integration/test_db_roundtrip.py` | OUTCOME / e2e | ✅ but gated | Strongest real coverage — **only runs when `DATABASE_URL` set** |
| `tests/test_multi_version_udp.py` (decode/adapt) | OUTCOME | ✅ | Real bytes → decode → adapt on F1-20/22 |
| `tests/test_shared_models.py` (validators) | OUTCOME (unit) | ✅ | Real validation behavior, unit-level |
| `tests/test_motorsport_physics.py` thermal/trail | ISOLATED-UNIT | ⚠️ misleading | Hand-built DataFrames straight into private rules — the archetype that hid the thermal gap. Thermal now also has a pipeline test; **trail-braking + brake-glazing still isolation-only** |
| `test_intelligence_audit.py` column-contract tests | STRUCTURE-ONLY | ⚠️ false assurance | Compare two hardcoded literal lists, not real recorder output — cannot catch a dropped column |
| `tests/test_api_endpoints.py` health/hardware | STRUCTURE-ONLY | ⚠️ | Assert keys exist, not values; a stub returning fixed keys would pass |

**Claimed capabilities with NO outcome coverage:** trail-braking through the pipeline, brake-glazing end-to-end, report *content* generation, hardware classification *values*, UDP transport/listener, live game→UI rendering.

---

## Systemic risks

1. **DB-gated tests can make the suite lie.** The strongest e2e tests skip without `DATABASE_URL`. If CI doesn't provision Postgres, the suite goes green with near-zero real coverage. **Action: confirm CI provisions Postgres; make its absence a loud skip, not a silent one.**
2. **In-memory by default.** `database_url` defaults to `None` and a failed connect silently falls back to in-memory — data is real but ephemeral unless explicitly configured.
3. **Root-level `test_*.py` manual scripts** (`test_complete_lap.py`, `test_send_fake_telemetry.py`, `test_udp_receiving.py`, `test_llm_*.py`) are pytest-collectable but are live-server/game/Ollama scripts, not automated tests — they belong under `scripts/`.

---

## Definition of "done" for this platform

A capability is DONE when:
1. Its wire is continuous from SOURCE (packet/adapter/DB) to SINK (rendered UI or persisted+reloadable output).
2. It has an **outcome test** that follows that wire and fails if any segment breaks.
3. This map's row for it reads CONNECTED with the test named in Evidence.

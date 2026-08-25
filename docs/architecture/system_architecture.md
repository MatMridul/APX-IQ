# APX IQ — System Architecture

> Canonical technical reference. Updated 2026-08-25.
> For agent onboarding rules see `/AGENTS.md`. For debt see
> `docs/internal/technical_debt.md`.

## 1. Process Topology

Three independently-runnable processes:

| Process | Port | Transport in | Transport out |
|---|---|---|---|
| Ingestion (`ingestion/main.py`) | 3001 (Socket.IO) | UDP :20777 | Socket.IO events, HTTP POST to API |
| API (`api/main.py`) | 8000 (HTTP) | REST from UI + ingestion | JSON responses |
| UI (`ui/`) | 3000 | HTTP | — |

Rationale: the 60 Hz live stream must never block on database
transactions, and a crash in either backend must not kill the other.

## 2. Data Flow

```
UDP packet bytes
  → PacketDecoder.decode()            ingestion/decoder.py
      picks module by header.m_packetFormat ∈ {2020..2025}
      dispatches by m_packetId ∈ {motion:0, session:1, lap:2,
                                  telemetry:6, status:7}
  → UniversalPacketAdapter            ingestion/adapters/
      extract_{motion,telemetry,lap_data,car_status} → canonical dicts
  → three consumers:
      a) Socket.IO emits (60Hz-throttled, stealth_mode-gated)
      b) TelemetryRecorder.update_*     intelligence/telemetry_recorder.py
         latest-snapshot composition per tick; distance-drop detects S/F line;
         finalize captures game-reported lap_time_ms / sectors / is_valid
      c) bridge_session_to_api on Session packets

lap_saver_worker (2s poll)
  → POST /telemetry/lap/save          api/telemetry_router.py
      DatabaseLapService.save_lap:
        upsert sessions row → insert lap (ON CONFLICT skip) → bulk telemetry
      success ⇒ recorder.prune_saved(); failure ⇒ retried next poll
```

## 3. API Composition

`api/main.py` lifespan is the single composition root:

```
db.connect() → pool
app.state.lap_service      = create_lap_service(pool)       # DB or memory
app.state.report_service   = create_report_service(pool)
app.state.analysis_service = create_analysis_service()
app.state.report_generator = ReportGenerator()               # Ollama→Gemini→template
app.state.battle_predictor = BattlePredictor()
app.state.session_manager  = SessionManager()
```

Routers depend only on Protocols; implementations are swappable. The
InMemory fallbacks make the full stack runnable with zero infrastructure —
and are also why CI's unit pass needs no services.

## 4. Intelligence Pipeline

`AnalysisService.run_pipeline(user_telemetry, ghost_telemetry, grid_points)`:

1. **DistanceAligner** resamples both laps onto a shared distance grid —
   prerequisite for all point-wise comparison.
2. **CornerDetector** finds corners from curvature/speed signatures → CornerMap.
3. **DeltaEngine** integrates `(1/v_user − 1/v_ghost)·ds` → cumulative time
   delta, brake-point deltas per corner.
4. **CoachEngine** applies rule-based analysis (braking, trail-braking,
   thermals, ERS) with cooldowns → prioritized tips.

Supporting engines: HardwareProfiler (FFT over steering traces classifies
wheel/gamepad/keyboard and adapts brake thresholds), BattlePredictor
(gap-trend overtake projection), FastF1Client (real F1 ghost laps + track
geometry, disk-cached under `data/fastf1_cache/`), ReportGenerator
(LLM debrief with backend fallback chain and SSE streaming).

Heavy pandas work runs via `asyncio.to_thread`; results cached (TTL).

## 5. Frontend State Model

Two state domains, two transports — never mix them:

| Domain | Transport | Store |
|---|---|---|
| Live telemetry frames (ephemeral) | Socket.IO :3001 | Zustand `telemetryStore`, fed by refs+requestAnimationFrame batch in `useTelemetry` (mounted once in Providers) |
| Queryable resources (laps, reports, ghosts, layouts) | REST :8000 | TanStack Query via `useIntelligence.ts` hooks |

Components subscribe with atomic Zustand selectors to avoid re-render storms.

## 6. Storage Schema (summary)

See `database_schema.md` for full DDL. Tables after migration 004:
`sessions`, `laps`, `user_lap_telemetry` (FK→laps CASCADE),
`intelligence_reports` (FK SET NULL on user_lap_id).
Dropped as never-written: teams, drivers, hardware_profiles, ghost_laps(+_telemetry).

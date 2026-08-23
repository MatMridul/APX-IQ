# APX IQ — Module Dependency Map

> Last updated: 2026-07-29

---

## Python Module Dependency Graph

```
api/main.py
├── core/logging_config.py
├── core/database.py (asyncpg pool singleton)
├── core/session_manager.py
├── ingestion/router.py
│   └── core/session_manager.py
├── api/intelligence_router.py
│   ├── core/logging_config.py
│   ├── core/cache.py
│   ├── intelligence/alignment.py
│   │   └── intelligence/constants.py
│   ├── intelligence/corner_detector.py
│   │   └── intelligence/constants.py
│   ├── intelligence/delta_engine.py
│   │   └── intelligence/corner_detector.py
│   ├── intelligence/hardware_profiler.py
│   │   └── intelligence/constants.py
│   ├── intelligence/coach_engine.py
│   │   ├── intelligence/delta_engine.py
│   │   ├── intelligence/corner_detector.py
│   │   └── intelligence/constants.py
│   ├── intelligence/battle_predictor.py (numpy only)
│   ├── intelligence/report_generator.py
│   │   ├── intelligence/coach_engine.py
│   │   ├── intelligence/corner_detector.py
│   │   ├── intelligence/delta_engine.py
│   │   └── intelligence/hardware_profiler.py
│   └── intelligence/constants.py
└── api/telemetry_router.py
    └── core/logging_config.py

ingestion/main.py
├── ingestion/listener.py (UDP)
├── ingestion/decoder.py
│   ├── ingestion/packet_structs_25.py (ctypes, F1 25)
│   └── ingestion/packet_structs_22.py (ctypes, F1 22)
└── intelligence/telemetry_recorder.py
    └── intelligence/constants.py
```

---

## Frontend Module Dependency Graph

```
app/layout.tsx
└── app/providers.tsx (QueryClient, TelemetryStore)

app/page.tsx
├── hooks/useTelemetry.ts
│   ├── hooks/useSocket.ts (Socket.IO singleton)
│   └── store/telemetryStore.ts (Zustand)
└── components/f1/ConnectionStatus.tsx

app/dashboard/page.tsx
├── hooks/useTelemetry.ts (same as above)
├── store/telemetryStore.ts
├── components/f1/primitives/Panel.tsx
│   └── lib/theme.ts
├── components/f1/primitives/MetricValue.tsx
├── components/f1/primitives/BarGauge.tsx
├── components/f1/primitives/Badge.tsx
├── components/f1/charts/SpeedChart.tsx (LightweightCharts)
├── components/f1/charts/ThrottleBrakeChart.tsx
├── components/f1/charts/CircularRPMGauge.tsx (d3-shape)
├── components/f1/charts/RadialTyreDisplay.tsx
├── components/f1/metrics/LapTimingPanel.tsx
├── components/f1/metrics/FuelPanel.tsx
└── components/f1/layout/DashboardFooter.tsx

app/dashboard/intelligence/page.tsx
├── hooks/useIntelligence.ts
│   └── lib/api/intelligence.ts (typed fetch client)
├── components/f1/intelligence/StatusPanel.tsx
├── components/f1/intelligence/LapSelector.tsx
├── components/f1/intelligence/GhostSelector.tsx
└── components/f1/intelligence/ReportView.tsx
```

---

## Shared Primitive: `TelemetryPoint`
This type is **duplicated** in three places with identical shape:

| Location | Purpose |
|---|---|
| `api/intelligence_router.py::TelemetryPoint` | Pydantic model for intelligence API |
| `api/telemetry_router.py::TelemetryPoint` | Pydantic model for telemetry API |
| `ui/src/lib/api/intelligence.ts::TelemetryPoint` | TypeScript type for API client |

**Action needed:** Extract to `api/models/shared.py` and a shared TS types file.

---

## Critical Coupling Points

1. **ingestion → api**: HTTP POST hardcoded to `http://localhost:8000`. If API port changes, ingestion breaks.
2. **ui → ingestion**: Socket URL `NEXT_PUBLIC_SOCKET_URL` (env var). Well-structured.
3. **ui → api**: `NEXT_PUBLIC_API_URL` env var in `lib/api/intelligence.ts`. Well-structured.
4. **intelligence_router → BattlePredictor**: Module-level singleton `_battle_predictor` is session-specific state in a process-level object. Breaks with multi-user access.
5. **intelligence_router → _hardware_profile**: Global mutable singleton. Same multi-user issue.
6. **intelligence_router → _report_storage**: In-memory dict with mutable `global _next_report_id`. Not thread-safe.

---

## Circular Dependency Risk: None Found
All import dependencies are strictly acyclic. The `intelligence/` package only imports from within itself and `core/`. The `api/` package imports from `intelligence/` and `core/`. No circular imports detected.

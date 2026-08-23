# APX IQ — API Map

> Last updated: 2026-07-29

---

## Telemetry Router (`/telemetry/*`)

| Method | Path | Description | Input | Output |
|---|---|---|---|---|
| POST | `/telemetry/lap/save` | Save completed lap | `SaveLapRequest` (session_uid, lap_number, telemetry[]) | `{lap_id, message}` |
| GET | `/telemetry/laps/completed` | List all laps | `?session_uid=&min_telemetry_points=100` | `LapInfo[]` |
| GET | `/telemetry/lap/{lap_id}` | Full telemetry for lap | path: `lap_id` | `LapTelemetryResponse` |
| GET | `/telemetry/lap/{lap_id}/steering` | Steering trace only | path: `lap_id` | `{steer_trace: float[]}` |
| GET | `/telemetry/session/current` | Current session info | — | `{session_uid, track_id, is_active}` |
| DELETE | `/telemetry/laps/clear` | Clear all laps (debug) | — | `{laps_cleared: int}` |

---

## Intelligence Router (`/intelligence/*`)

| Method | Path | Description | Input | Output |
|---|---|---|---|---|
| GET | `/intelligence/health` | Module status + LLM backend | — | `{status, modules, llm_backend}` |
| POST | `/intelligence/delta` | Compute lap delta | `DeltaRequest` | Delta + coaching tips array |
| POST | `/intelligence/hardware` | Classify input device | `{steer_trace: float[]}` | `HardwareProfile` |
| POST | `/intelligence/battle` | Race position projection | `BattleRequest` | `RaceProjection` |
| POST | `/intelligence/report/lap` | Generate AI debrief | `DeltaRequest` | `{title, markdown, summary, key_findings, generated_by}` |
| GET | `/intelligence/ghost/{track_id}` | Fetch FastF1 ghost lap | `?year=2024&driver=VER&session_type=R` | `{telemetry: TelemetryPoint[]}` |
| POST | `/intelligence/reports/save` | Save report | `SaveReportRequest` | `{report_id}` |
| GET | `/intelligence/reports/history` | Report list | `?limit=20&report_type=lap_debrief` | `ReportHistoryItem[]` |
| GET | `/intelligence/reports/{report_id}` | Get single report | path: `report_id` | Full report |
| DELETE | `/intelligence/reports/clear` | Clear all reports (debug) | — | `{reports_cleared}` |

---

## System Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | System health — db_connected, session_active, active_clients |
| WS | `/ws` | WebSocket broadcast (currently unused by UI; UI uses Socket.IO instead) |

---

## Shared Data Models

### TelemetryPoint (appears in BOTH routers — duplicated)
```python
{
  distance_m: float,
  speed_kph:  float,
  throttle:   float,   # 0.0 – 1.0
  brake:      float,   # 0.0 – 1.0
  steer:      float,   # -1.0 – 1.0
  gear:       int,
  rpm:        int,
  drs:        bool,
  x:          float,
  y:          float,
  z:          float
}
```

### HardwareProfile
```python
{
  detected_type:    str,    # "controller", "wheel_entry", etc.
  tier_label:       str,    # Human-readable tier
  confidence:       float,  # 0.0 – 1.0
  steer_variance:   float,
  dominant_freq_hz: float,
  brake_threshold_m: float
}
```

---

## API Design Issues

| Issue | Severity | Detail |
|---|---|---|
| No versioning | HIGH | All routes at `/` — no `/v1/` prefix |
| No authentication | HIGH | Completely open API |
| Hardcoded DB URL in router | MEDIUM | `telemetry_router.py` line 33 |
| `logger` name clash | BUG | `telemetry_router.py` line 311 uses `logger` (stdlib) but file uses structlog `log` — will crash on DELETE /laps/clear |
| DELETE endpoints unprotected | MEDIUM | Can wipe all data unauthenticated |
| No pagination | MEDIUM | `get_completed_laps` returns ALL laps |
| rate_limit decorator not applied | MEDIUM | Comment in code says "5/minute" but decorator is not actually applied on `/report/lap` |
| `/session/current` is a stub | LOW | Returns hardcoded `is_active: false` |

# APX-IQ — Wave 1 Validation Report: Full-Protocol Utilization & Engineering Truth Pass

> **Document Type:** Validation & Handover Report  
> **Author:** Antigravity  
> **Reviewer:** Kiro (Lead Auditor) / Mridul (Product Owner)  
> **Date:** September 19, 2026  
> **Governing Directives:** [`docs/frontend/PROTOCOL_COMPLETENESS_MATRIX.md`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/docs/frontend/PROTOCOL_COMPLETENESS_MATRIX.md) and [`docs/frontend/WAVE1_SEED_PROMPT.md`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/docs/frontend/WAVE1_SEED_PROMPT.md)  
> **Status:** COMPLETED & VERIFIED (`tsc` ✅, `pytest` ✅)

---

## 1. Executive Summary & Mandate

The APX-IQ platform has completed **Wave 1: Full-Protocol Utilization & Engineering Truth Pass**.

### The Governing Mandate
The F1 UDP protocol is APX-IQ's core raw material. We have transitioned from treating the protocol as a subset broadcast feed to utilizing every transmitted byte: **every field transmitted in decoded packets (0, 1, 2, 4, 6, 7) is now parsed $\rightarrow$ adapted $\rightarrow$ stored $\rightarrow$ rendered**.

### The Honesty Contract
- **`TRANSMITTED` fields**: Built real across all layers (Backend struct $\rightarrow$ Universal Adapter $\rightarrow$ Socket.IO $\rightarrow$ `useTelemetry` refs $\rightarrow$ RAF $\rightarrow$ Zustand store $\rightarrow$ UI components).
- **`NOT-TRANSMITTED` fields**: Genuinely unmeasured channels (e.g., 3-band lateral tyre surface strips, live ride height, live aerodynamic downforce, chaser rear gap) are either eliminated or explicitly badged with `<SimBadge />` / `MODELED`.
- **Zero Fabrication**: All ungrounded `Math.sin()` interval tickers, fake `60 Hz · 4.8 KB/s` indicators, and `0.4ms JITTER` badges have been purged from the codebase.

---

## 2. Phase 0: Consolidation & Clean Architecture

Before landing the new data pipelines, Phase 0 consolidation was performed to establish clean architectural boundaries:

1. **Namespace Unification**:
   - Consolidated legacy `ui/src/components/f1/` $\rightarrow$ [`ui/src/components/intelligence/`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/components/intelligence/).
   - Purged duplicate components and updated import paths across [`GhostSelector.tsx`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/components/intelligence/GhostSelector.tsx), [`LapSelector.tsx`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/components/intelligence/LapSelector.tsx), [`ReportView.tsx`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/components/intelligence/ReportView.tsx), [`StatusPanel.tsx`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/components/intelligence/StatusPanel.tsx), and [`ui/src/app/dashboard/intelligence/page.tsx`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/app/dashboard/intelligence/page.tsx).

2. **Single Design Token Source**:
   - Deleted legacy `ui/src/lib/theme/` (`colors.ts`, `constants.ts`, `variants.ts`).
   - Standardized entirely on [`ui/src/design/system.ts`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/design/system.ts) and unified CSS panel tokens (`apx-panel`, `apx-panel-header`).

3. **Honesty Regression Purge**:
   - Removed hardcoded `60 Hz · 4.8 KB/s` and `0.4ms JITTER` from [`StatusBar.tsx`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/components/cockpit/StatusBar.tsx).
   - Removed ungrounded `Math.sin()` tickers from [`ui/src/app/page.tsx`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ui/src/app/page.tsx), anchoring live telemetry through `useLiveOrDemo()`.

---

## 3. Backend Ingestion & Multi-Version Packet Adapters

### Packet Struct Extensions
Added missing C-types packet definitions across multi-year schemas:
- **`ParticipantData` & `PacketParticipantsData`**: Added to [`packet_structs_20.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ingestion/packet_structs_20.py), [`packet_structs_21.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ingestion/packet_structs_21.py), and [`packet_structs_23.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ingestion/packet_structs_23.py).
- **`MarshalZone`, `WeatherForecastSample`, & `PacketSessionData`**: Added to [`packet_structs_20.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ingestion/packet_structs_20.py), [`packet_structs_21.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ingestion/packet_structs_21.py), [`packet_structs_22.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ingestion/packet_structs_22.py), and [`packet_structs_23.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/ingestion/packet_structs_23.py).

### Universal Adapter (`ingestion/adapters/universal_adapter.py`)
Implemented full extraction methods:
- `extract_session(packet)`: Extracts `weather`, `track_temperature`, `air_temperature`, `total_laps`, `track_length`, `track_id`, `session_type`, `session_time_left`, `session_duration`, `safety_car_status`, `network_game`, `formula`, `ai_difficulty`.
- `extract_participants(packet)`: Extracts `name` (null-terminated byte string decoding), `car_index`, `ai_controlled`, `driver_id`, `team_id`, `race_number`, `nationality`.
- **Un-dropped Transmitted Fields**:
  - Motion (ID 0): `g_force_vert`, `yaw`, `pitch`, `roll`.
  - Telemetry (ID 6): `tyres_pressure`, `clutch`, `engine_temperature`, `rev_lights_percent`, `surface_type`, `suggested_gear`.
  - Lap (ID 2): `delta_to_front_ms`, `delta_to_leader_ms`, `safety_car_delta`, `sector`, `pit_status`, `num_pit_stops` (with F1 2020 float $\times 1000$ conversion).
  - Car Status (ID 7): `front_brake_bias`, `fuel_mix`, `ers_harvested_mguk`, `ers_harvested_mguh`, `ers_deployed_this_lap`, `tyres_age_laps`, `visual_tyre_compound`, `vehicle_fia_flags`, `drs_activation_distance`.

### Socket.IO Emission Pipeline (`ingestion/main.py`)
- Emits new events: `motion_update` (Packet 0) and `participants_update` (Packet 4).
- Serializes enriched payloads in camelCase for seamless frontend ingestion.

---

## 4. Frontend Hook & Store Pipeline (`useTelemetry.ts` & `telemetryStore.ts`)

### Zero-Re-render Architecture Maintained
To prevent 60 Hz socket events from triggering re-render storms across the React component tree, the data path strictly adheres to the established contract:
$$\text{Socket.IO} \longrightarrow \text{useRef (Mutable Ingestion)} \longrightarrow \text{RAF Loop} \longrightarrow \text{Zustand Store} \longrightarrow \text{Fine-grained Selectors / Canvas}$$

### Typed Contracts
- **`MotionData`**: `worldPosX`, `worldPosY`, `worldPosZ`, `worldVelX`, `worldVelY`, `worldVelZ`, `gForceLat`, `gForceLon`, `gForceVert`, `yaw`, `pitch`, `roll`.
- **`ParticipantData`**: `carIndex`, `aiControlled`, `driverId`, `networkId`, `teamId`, `myTeam`, `raceNumber`, `nationality`, `name`, `yourTelemetry`.
- **`TelemetryData`**: Enriched with `tyresPressure` (PSI), `tyreInnerTemps` (°C), `brakesTemp` (°C), `engineTemp` (°C), `revLightsPercent`, `clutch`, `surfaceType`, `suggestedGear`.
- **`LapData`**: Enriched with `deltaToFrontMs`, `deltaToLeaderMs`, `safetyCarDelta`, `sector`, `pitStatus`, `numPitStops`.
- **`SessionData`**: Enriched with `trackTemp`, `airTemp`, `sessionType`, `sessionTimeLeft`, `sessionDuration`, `safetyCarStatus`, `aiDifficulty`.
- **`CarStatusData`**: Enriched with `frontBrakeBias`, `ersHarvestedMGUK`, `ersHarvestedMGUH`, `ersDeployedThisLap`, `tyresAgeLaps`, `visualTyreCompound`, `vehicleFiaFlags`, `drsActivationDist`.

---

## 5. Widget Truth Pass (Traceability Matrix)

Every widget in the cockpit was audited and refactored to render real transmitted data, replacing previously simulated or placeholder values:

| Widget File | Previously Faked / Hardcoded | Newly Rendered Real UDP Channel | Behavior in SIM / Fallback |
| :--- | :--- | :--- | :--- |
| **`BattlePanel.tsx`** | Hardcoded driver names `HAM` (P1) and `LEC` (P3); fake `2.6s` chaser gap; `Math.sin()` sector chips | Real driver names from `participants_update` (e.g. `P1 · LEADER` / `HAM` / `YOU`); real `deltaToFrontMs`/`deltaToLeaderMs` (split ms + min calculation); real `sector1`/`sector2` ms $\rightarrow$ s; real stint laps from `carStatus.fuelRemainingLaps` | Unmeasured chaser gap & unmeasured legacy year deltas are honestly rendered with `<NoSignal />` or `<SimBadge />` in live mode; demo sectors in SIM mode |
| **`TrackMap.tsx`** | Car heading fixed to parametric tangent | Real `yaw` heading angle from `motion_update` drives the car chevron rotation; real DRS status in dynamic HUD tag | Uses track curve tangent when motion unavailable |
| **`BottomInstruments.tsx`** | `psiIv` interval with `Math.sin()`; fake `clickIv` random ±0.5% brake bias shifts; hardcoded `ADJUSTS PER CORNER · SIM` footer | Real 4-corner `tyresPressure` in PSI from Packet 6; real `frontBrakeBias` (%) from Packet 7 with dynamic click flash on driver adjustments; footer shows `F1 UDP CAR STATUS` | Falls back to simulated warm-up curve and click intervals when offline |
| **`RaceCarTelemetry.tsx`** | Hardcoded `PIRELLI C4 SOFT`; simulated `Math.sin()` inner tyre & brake rotor temps; simulated tyre wear `lap % 30` | Real `tyreInnerTemps` (core), `brakesTemp` (carbon rotors), `visualTyreCompound` + Pirelli compound label, and real `tyresAgeLaps` | Falls back to simulated heat and lap wear when offline |
| **`StatusBar.tsx`** | Simulated `t % 120` yellow flag toggles; hardcoded weather text; static timer | Real `vehicleFiaFlags` (multi-color Green/Yellow/Red/Blue), real `safetyCarStatus` (Full SC, VSC), real session timer (`sessionDuration - sessionTimeLeft`), and real `trackTemp` / `airTemp` | Falls back to demo clock and periodic yellow flag in SIM mode |
| **`ShiftLights.tsx`** | Shift LEDs derived purely from RPM threshold percentage | Real native `revLightsPercent` from F1 UDP Packet 6 Car Telemetry | Derives from RPM % when `revLightsPercent` is 0 or offline |
| **`CentralTelemetry.tsx`** | Fixed `/56` laps and `/20` cars; static MGU-K label | Real `session.totalLaps`, real active `participants.length`, and real `carStatus.ersDeployMode` (`MGU-K 120kW`, `ERS OVERTAKE`, `ERS HOTLAP`, `ERS OFF`) | Defaults to standard 56 laps / 20 cars when offline |

---

## 6. Verification & Test Execution

### 1. TypeScript Strict Type Checking
```pwsh
cd ui
npx tsc --noEmit
# Exit Code: 0 (0 errors)
```

### 2. Multi-Version UDP Packet Decoding & Ingestion Test Suite
Added comprehensive unit tests in [`tests/test_multi_version_udp.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/tests/test_multi_version_udp.py) covering Session and Participant extraction across F1 2020, 2021, 2022, 2023, 2024, and 2025.

### 3. End-to-End Packet-to-Pixel Integration Test Suite
Added strict packet-to-pixel integration tests in [`tests/test_packet_to_pixel_integration.py`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/tests/test_packet_to_pixel_integration.py). This verifies that distinct, non-zero binary payload values for every live widget channel (Motion vertical G/yaw/pitch/roll, Session weather/temps/safety-car/laps, Lap split deltas and sector times, Telemetry 4-corner pressures/temps/clutch/rev-lights, Car Status bias/fuel-mix/ERS/FIA flags) survive decoding and adaptation without being hidden by default values or silent zeros.

```pwsh
python -m pytest
# Results: 57 passed, 8 skipped, 0 failed in 16.49s
```

### 4. Protocol Completeness Matrix Update
Updated [`docs/frontend/PROTOCOL_COMPLETENESS_MATRIX.md`](file:///C:/Mridul/Programs/APXIQ/apx-iq-platform/docs/frontend/PROTOCOL_COMPLETENESS_MATRIX.md) checking off Wave 1 packets with verified packet-to-pixel traces:
- `Motion (ID 0)`: Parse: ✅ · Adapt: ✅ · Store: ✅ · Render: ✅
- `Session (ID 1)`: Parse: ✅ · Adapt: ✅ · Store: ✅ · Render: ✅
- `Lap (ID 2)`: Parse: ✅ · Adapt: ✅ · Store: ✅ · Render: ✅
- `Participants (ID 4)`: Parse: ✅ · Adapt: ✅ · Store: ✅ · Render: ✅
- `Car Telemetry (ID 6)`: Parse: ✅ · Adapt: ✅ · Store: ✅ · Render: ✅
- `Car Status (ID 7)`: Parse: ✅ · Adapt: ✅ · Store: ✅ · Render: ✅

---

## 7. Roadmap to Wave 2 & Beyond

With Wave 1 plumbing and truth passes complete, the runway is clear for the subsequent waves:

- **Wave 2 — Real In-Game Ghost & Degradation Modeling**:
  - Build `PacketCarDamageData` (ID 10) struct $\rightarrow$ unlock real 4-corner `m_tyresWear` (%).
  - Build `PacketSessionHistoryData` (ID 11) struct $\rightarrow$ unlock per-lap times and best sector splits for real in-game delta without external dependencies.
- **Wave 3 — Chassis Depth & Setup Matrix**:
  - Build `PacketMotionExData` (ID 13) struct $\rightarrow$ unlock real suspension travel, velocity, acceleration, and wheel slip ratio/angle.
  - Build `PacketCarSetupsData` (ID 5) struct $\rightarrow$ make setup matrix reflect the real car setup.
- **Wave 4 — Events & Polish**:
  - Build `PacketEventData` (ID 3) $\rightarrow$ event codes for fastest lap, penalties, and chequered flags.


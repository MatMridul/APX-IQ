# APX-IQ — Wave 1 Seed Prompt for Antigravity (Full Protocol Utilization)

> Paste the block below into Antigravity to start Wave 1. Grounded in
> `docs/frontend/PROTOCOL_COMPLETENESS_MATRIX.md` (the master ledger) and verified against
> `ingestion/decoder.py`, `ingestion/adapters/universal_adapter.py`, `ingestion/packet_structs_25.py`.

---

Antigravity — we are starting **Wave 1** of the full-protocol-utilization mandate. Read
`docs/frontend/PROTOCOL_COMPLETENESS_MATRIX.md` in full first; it is the master data ledger and
supersedes `CHANNEL_SOURCE_AUDIT.md`. Then read this and post a PLAN before writing any code.

**The mandate (governing principle):** the F1 UDP protocol is APX-IQ's core resource and we are
using a fraction of it. Every field the game transmits must be built into the real data path
(parse → adapt → store → render). This **authorizes backend work** — you may extend packet
structs, decoder branches, adapters, Socket.IO events, and the frontend store/types. The old
HANDOVER.md "no backend" rule is lifted; it only ever existed to prevent fabrication, and the way
to prevent fabrication is to build the real data path, not to fake or drop channels.

**The one absolute rule:** TRANSMITTED-by-the-game → BUILD IT. NOT-TRANSMITTED → drop or show only
as an explicitly badged `MODELED` estimate. Never fabricate a value or a connection state. A clean
`tsc`/`npm run build` proves compilation, NOT honesty — do not conflate them.

**Wave 1 scope = PLUMBING ONLY. No new packet structs.** Every field below is ALREADY decoded into
the struct but dropped before it reaches the UI. Your job is to carry it through the existing
pipeline. Concretely:

1. **`ingestion/adapters/universal_adapter.py`** — extend the existing extractors and add two missing ones:
   - `extract_telemetry`: add `m_tyresPressure[4]`, `m_clutch`, `m_engineTemperature`,
     `m_revLightsPercent`, `m_surfaceType[4]`, `m_suggestedGear`.
   - `extract_car_status`: add `m_frontBrakeBias`, `m_fuelMix`, `m_ersHarvestedThisLapMGUK`,
     `m_ersHarvestedThisLapMGUH`, `m_ersDeployedThisLap`, `m_tyresAgeLaps`,
     `m_actualTyreCompound`/`m_visualTyreCompound` (real compound), `m_vehicleFiaFlags`,
     `m_drsActivationDistance`, `m_maxGears`, `m_idleRPM`, `m_fuelCapacity`.
   - `extract_lap_data`: add `m_deltaToCarInFront`, `m_deltaToRaceLeader`, `m_safetyCarDelta`,
     `m_sector`, `m_pitStatus`, `m_numPitStops`, `m_speedTrapFastestSpeed`.
   - `extract_motion`: add `m_worldPositionX/Y/Z`, `m_yaw`, `m_gForceVertical`,
     `m_worldVelocity*`, `m_pitch`, `m_roll`.
   - **NEW `extract_session`** (Session packet ID 1 is already decoded but has NO extractor):
     `m_weather`, `m_trackTemperature`, `m_airTemperature`, `m_trackId`, `m_trackLength`,
     `m_sector2LapDistanceStart`, `m_sector3LapDistanceStart`, `m_safetyCarStatus`,
     `m_weatherForecastSamples`, `m_marshalZones`.
   - **NEW `extract_participants`** (Participants packet ID 4 already decoded, NO extractor):
     per-driver `m_name`, `m_teamId`, `m_raceNumber`, `m_liveryColours`.
   - Add the two new abstract methods to `ingestion/adapters/base_adapter.py`.
   - IMPORTANT: field layouts differ across game years — verify each added field against every
     `packet_structs_20..25.py` (and each `docs/Data Output from F1 XX.txt`). Do not assume the
     F1 25 layout holds for F1 22. Where a field is absent in an older year, degrade gracefully
     (omit / NoSignal), never fabricate.

2. **Ingestion → Socket.IO** (`ingestion/main.py` + the socket emit layer): emit the new session
   and participants dicts as their own events; extend the existing telemetry/lap/status/motion
   emits with the new fields. Do NOT invent throughput/jitter/"connected" readouts — those were
   the previous session's fabrication regression.

3. **Frontend store/types** (`ui/src/hooks/useTelemetry.ts` + `ui/src/store/telemetryStore.ts`):
   add the new fields to the typed contracts and wire the new session/participants events into the
   store. Do NOT change the refs→RAF→Zustand→selectors pattern — it is correct; only extend it.

4. **Render** the newly-real data into EXISTING widgets, replacing any faked values:
   - Real rival gaps → BattlePanel (replace fabricated gaps).
   - Real GPS track map from world position + yaw → TrackMap (replace the parametric loop).
   - Real brake bias → BottomInstruments; real compound/age → RaceCarTelemetry; real tyre pressure
     → thermal/pressure widget; real weather/track temp → a status/weather surface; real FIA flag →
     StatusBar.
   - Anything not yet backed by a real field stays `NoSignal`/`SimBadge` — never faked.

**Also in this wave (pre-existing debt + regressions):**
- Do Phase 0 consolidation first if not already done: one token source (`design/system.ts`, delete
  `apxColors`), one panel primitive, `components/f1/` → `components/intelligence/`.
- Fix the earlier honesty regressions: the fabricated `60 Hz · 4.8 KB/s` monitor, `0.4ms JITTER`,
  and oscillating landing-page/status-bar tickers must be routed through `useLiveOrDemo()` and
  badged `SIM`, or removed.

**Process (binding):**
- **Post a PLAN before coding**: for each field, name the exact file(s), the Socket.IO event, the
  store type change, and the target widget. I (via Mridul) will review the plan before you write code.
- Small, single-concern PRs (one packet/extractor per PR is ideal). Trace each PR to a matrix row.
- Verify against `packet_structs_*.py` and `universal_adapter.py`, never the F1 spec PDF alone.
- After each PR, update the matrix's Parse/Adapt/Store/Render columns for the fields it landed.
- Prove live rendering via recorded-frame replay (TRD §4), not by asserting it works. `tsc`/build
  green is necessary but NOT sufficient — show the widget rendering the real field.

Start by posting the Wave 1 PLAN. Do not write code until the plan is reviewed.

---

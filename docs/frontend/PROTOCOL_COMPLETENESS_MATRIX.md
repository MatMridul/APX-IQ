# APX-IQ — F1 UDP Protocol Completeness Matrix

> Status: DRAFT v1 · Owner: Mridul · Author: Kiro (verified against code) · 2026-09-19
> Supersedes `CHANNEL_SOURCE_AUDIT.md` as the master data ledger.
> Mandate: **the F1 UDP protocol is APX-IQ's core resource. Utilize it to the fullest.**
> Every field the game transmits should be parsed → adapted → stored → rendered. The only
> permanent exclusions are fields the game does NOT transmit.

---

## 0. The one honesty rule that survives the "build it all" mandate

Two buckets, and only two:

- **`TRANSMITTED`** — the field is on the wire in an F1 UDP packet. **BUILD IT.** If it's not
  reaching the UI yet, that's our plumbing gap to close, not a reason to fake or drop it.
- **`NOT-TRANSMITTED`** — the game never sends it. **DROP**, or show only as an explicitly
  `MODELED` estimate with a visible badge. No amount of backend work makes it real.

"We haven't built the parser" is NEVER a reason to fabricate. It's a work item. Faking a
`TRANSMITTED` field is the cardinal sin; building it is the mandate.

---

## 1. Verified current state (read from code, 2026-09-19)

Sources of truth checked: `ingestion/decoder.py`, `ingestion/packet_structs_25.py`,
`ingestion/adapters/{base,universal}_adapter.py`, `ingestion/main.py`, `ui/src/hooks/useTelemetry.ts`.

**Decoder dispatches 6 of 16 packet types.** The rest fall through to `return header` (discarded).

| Pipeline stage | What it handles today |
| :--- | :--- |
| Decoded (`decoder.py`) | Motion(0), Lap(2), Session(1), Telemetry(6), Status(7), Participants(4) |
| Adapted (`universal_adapter.py`) | ONLY Motion, Telemetry, Lap, Status — a SUBSET of each. **No `extract_session`, no `extract_participants`** despite both being decoded. |
| In frontend store (`useTelemetry.ts`) | speed, throttle, brake, gear, rpm, drs, tyreTemps[4] (+ lap/session/status subsets) |

**Not built at all** (PACKET_ID constant exists, no struct, no decode branch): Event(3),
Car Setups(5), Car Damage(10), Session History(11), Tyre Sets(12), **Motion Ex(13)**,
Time Trial(14), Lap Positions(15), Final Classification(8), Lobby(9).

---

## 2. Packet-level completeness

Legend — Parse: struct exists & decoded · Adapt: forwarded by adapter · Store: in FE store · Render: drawn in UI.

| ID | Packet | Parse | Adapt | Store | Render | Priority | Unlocks |
| :-: | :--- | :-: | :-: | :-: | :-: | :-: | :--- |
| 0 | Motion | ✅ | ✅ | ✅ | ✅ | P1 | Real track map (pos+yaw), vertical G, attitude |
| 1 | Session | ✅ | ✅ | ✅ | ✅ | **P0** | Weather, track/air temp, trackId, trackLength, sector boundaries, safety car, forecast |
| 2 | Lap | ✅ | ✅ | ✅ | ✅ | **P0** | Delta-to-front/leader, sector idx, pit status, speed trap |
| 3 | Event | ✅ | ✅ | ✅ | ✅ | P2 | Fastest lap, penalties, DRS enabled, chequered flag |
| 4 | Participants | ✅ | ✅ | ✅ | ✅ | P1 | Real driver names, team ids, liveries (battle panel truth) |
| 5 | Car Setups | ✅ | ✅ | ✅ | ✅ | P1 | REAL setup → setup matrix stops being MODELED |
| 6 | Car Telemetry | ✅ | ✅ | ✅ | ✅ | **P0** | Pressure, clutch, engine temp, rev%, surface type, suggested gear |
| 7 | Car Status | ✅ | ✅ | ✅ | ✅ | **P0** | Brake bias, fuel mix, MGU-K/H harvest, deployed, tyre age, compound, FIA flags, DRS dist |
| 8 | Final Classification | ❌ | ❌ | ❌ | ❌ | P2 | Post-race results |
| 9 | Lobby Info | ❌ | ❌ | ❌ | ❌ | P3 | Multiplayer lobby (low value) |
| 10 | Car Damage | ✅ | ✅ | ✅ | ✅ | **P0** | **Tyre wear[4]**, wing/floor/brake/engine wear/damage |
| 11 | Session History | ✅ | ✅ | ✅ | ✅ | **P0** | Per-lap times + **best sectors → real ghost/delta without FastF1** |
| 12 | Tyre Sets | ✅ | ✅ | ✅ | ✅ | P1 | Available sets, wear, stint planning |
| 13 | **Motion Ex** | ✅ | ✅ | ✅ | ✅ | P1 | **Suspension pos/vel/accel, wheel slip, wheel speed, tyre contact, brake temp detail** |
| 14 | Time Trial | ✅ | ✅ | ✅ | ✅ | P2 | TT PB/rival |
| 15 | Lap Positions | ❌ | ❌ | ❌ | ❌ | P2 | Per-lap position history |


---

## 3. Field-level: already-parsed packets (CHEAPEST WINS — plumbing only, no new struct)

These fields are ALREADY decoded into the struct but dropped by the adapter. Closing them is
pure adapter+socket+store work — the highest ratio of value to effort.

### Car Telemetry (ID 6) — dropped fields
| Field | Unit | Verdict | Instrument |
| :--- | :--- | :-: | :--- |
| `m_tyresPressure[4]` | PSI | TRANSMITTED | 4-corner pressure (was falsely "unavailable") |
| `m_clutch` | 0–100 | TRANSMITTED | Clutch trace |
| `m_engineTemperature` | °C | TRANSMITTED | Powertrain thermal |
| `m_revLightsPercent` | % | TRANSMITTED | Native shift-light source (replace derived) |
| `m_surfaceType[4]` | enum | TRANSMITTED | Off-track / kerb detection per wheel |
| `m_suggestedGear` | 1–8 | TRANSMITTED | Coaching cue |

### Car Status (ID 7) — dropped fields
| Field | Unit | Verdict | Instrument |
| :--- | :--- | :-: | :--- |
| `m_frontBrakeBias` | % front | TRANSMITTED | Real brake bias (BottomInstruments needle) |
| `m_fuelMix` | enum | TRANSMITTED | Engine mode |
| `m_ersHarvestedThisLapMGUK/MGUH` | J | TRANSMITTED | Real MGU-K/H harvest (kW derivable) |
| `m_ersDeployedThisLap` | J | TRANSMITTED | ERS deploy budget |
| `m_tyresAgeLaps` | laps | TRANSMITTED | Real tyre age (replace "LAP n ON SET") |
| `m_actualTyreCompound` / `m_visualTyreCompound` | enum | TRANSMITTED | Real Pirelli compound + color |
| `m_vehicleFiaFlags` | enum | TRANSMITTED | Real flag state (status bar) |
| `m_drsActivationDistance` | m | TRANSMITTED | DRS zone marker on ribbon |
| `m_maxGears`, `m_idleRPM`, `m_fuelCapacity` | — | TRANSMITTED | Calibration for gauges |

### Lap (ID 2) — dropped fields
| Field | Unit | Verdict | Instrument |
| :--- | :--- | :-: | :--- |
| `m_deltaToCarInFront` / `m_deltaToRaceLeader` | s | TRANSMITTED | Real battle-panel gaps (replace faked) |
| `m_safetyCarDelta` | s | TRANSMITTED | SC delta window |
| `m_sector` | idx | TRANSMITTED | Live sector highlight |
| `m_pitStatus`, `m_numPitStops` | — | TRANSMITTED | Pit state |
| `m_speedTrapFastestSpeed` | kph | TRANSMITTED | Speed trap |

### Motion (ID 0) — dropped fields
| Field | Unit | Verdict | Instrument |
| :--- | :--- | :-: | :--- |
| `m_worldPosition{X,Y,Z}` | m | TRANSMITTED | **Real GPS track map** (replace parametric loop) |
| `m_yaw` | rad | TRANSMITTED | Car heading on map |
| `m_gForceVertical` | G | TRANSMITTED | Vertical load |
| `m_worldVelocity`, `m_pitch`, `m_roll` | — | TRANSMITTED | Attitude / vector |

### Session (ID 1) & Participants (ID 4) — decoded but NO extractor at all
| Field | Verdict | Instrument |
| :--- | :-: | :--- |
| `m_weather`, `m_trackTemperature`, `m_airTemperature` | TRANSMITTED | Real weather panel |
| `m_trackId`, `m_trackLength` | TRANSMITTED | Correct circuit + lap-progress math |
| `m_sector2/3LapDistanceStart` | TRANSMITTED | Real sector geometry on ribbon/map |
| `m_safetyCarStatus`, `m_weatherForecastSamples[64]` | TRANSMITTED | SC state, weather strategy |
| `m_marshalZones[21]` | TRANSMITTED | Flag zones on track map |
| Participants `m_name`, `m_teamId`, `m_liveryColours` | TRANSMITTED | Real driver names + team colors |

---

## 4. Field-level: packets needing a NEW struct + decode branch

### Car Damage (ID 10) — build struct
`m_tyresWear[4]` (%), `m_tyresDamage[4]`, `m_brakesDamage[4]`, wings, floor, diffuser, engine/gearbox wear.
All **TRANSMITTED**. Unlocks real degradation modeling.

### Session History (ID 11) — build struct
Per-lap `lapTimeInMS`, sector times, `bestLapTimeLapNum`, best sector laps, tyre stints.
**TRANSMITTED.** Unlocks **real in-game ghost/delta** — no FastF1 dependency.

### Motion Ex (ID 13) — build struct
`m_suspensionPosition[4]`, `m_suspensionVelocity[4]`, `m_suspensionAcceleration[4]`,
`m_wheelSpeed[4]`, `m_wheelSlip[4]` (F1 23+: slip ratio/angle, tyre contact, `m_localVelocity`).
All **TRANSMITTED**. This is where suspension travel & wheel slip actually live — reclassifies
the audit's DROP items to BUILD.

### Car Setups (ID 5) — build struct
Front/rear wing, on/off-throttle diff, brake bias/pressure, camber, toe, pressures, ride height.
**TRANSMITTED.** Makes the setup matrix reflect the real car (removes MODELED where the game gives truth).

### Event (ID 3) — build struct
Event string codes: fastest lap, retirement, penalty, DRS enabled, chequered, overtake.
**TRANSMITTED.** Powers honest micro-celebrations & flags.

---

## 5. The genuinely NOT-TRANSMITTED shortlist (permanent DROP / MODELED)

Even after building every packet, these remain unreal because the game never sends them:

| Wanted channel | Reality | Verdict |
| :--- | :--- | :-: |
| I-C-O 3-band lateral tyre strips | Game sends surface + inner = **2 layers**, not 3 lateral bands | **DROP** → show 2-layer (real) |
| Brake line pressure (Bar) | Game sends brake 0–1 pedal, not hydraulic pressure | **MODELED** if shown in Bar, else show % |
| Steering torque (Nm) | Not transmitted | **DROP** → use steering angle + angular velocity |
| Ride height (mm) live | Not a channel; only setup static + suspension pos | **MODELED** (static − suspension travel), badged |
| Aero balance % (live forces) | Aero forces not transmitted | **MODELED** from setup geometry, badged |
| Tyre carcass temp (distinct from inner) | "Inner" IS the carcass proxy; no separate channel | Use inner as carcass, label honestly |

Ride height slip/damper NOTE: ride-height is MODELED, but suspension **travel/velocity/accel** and
**wheel slip** ARE transmitted via Motion Ex (§4) — build those as real.

---

## 6. Build sequence (by leverage)

1. **Wave 1 — Plumbing (no new structs):** forward the dropped fields in Motion/Lap/Telemetry/Status,
   and add `extract_session` + `extract_participants` (packets already decoded). Highest value/effort:
   real weather, real gaps, real brake bias, real compound/age, real GPS track map, real pressure.
2. **Wave 2 — Real ghost + degradation:** build Session History(11) and Car Damage(10) structs →
   real in-game delta and tyre wear (removes FastF1 dependency for the live path).
3. **Wave 3 — Chassis depth:** build Motion Ex(13) → suspension & wheel slip instruments (the elite
   spec's chassis hub becomes real). Build Car Setups(5) → real setup matrix.
4. **Wave 4 — Events & polish:** Event(3) for honest flags/celebrations; Tyre Sets(12); Time Trial(14).

Each wave: extend struct/adapter → Socket.IO event → store type → widget. Update this matrix's
Parse/Adapt/Store/Render columns as each lands. "To the fullest" = every TRANSMITTED cell ✅.

---

## 7. Cross-version note
Structs exist for 2020–2025 (`packet_structs_20..25.py`). New packets (Damage/History/MotionEx/Setups)
must be added per supported version, gated on field-layout diffs across years. Verify each version's
layout against its `docs/Data Output from F1 XX.txt` before decoding — layouts shifted between years.

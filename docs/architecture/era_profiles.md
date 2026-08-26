# APX IQ — Regulation-Era Profiles (Study)

> Why an F1 21 dashboard differs from an F1 25 one — and how ours adapts.
> Study date: 2026-08-25. Sources: FIA 2026 PU Technical Regulations
> (Issue 7), F1.com / RaceFans / F1Chronicle 2026 regulation explainers,
> EA F1 25 "2026 Season Pack" developer notes, in-game ERS documentation
> (F1 22–25).

---

## 1. The problem

We support game packet formats 2020–2025 (2026 arrives with its own
format). Each game year simulates a specific FIA regulation era, and the
eras change the *semantics* of the instruments:

- The energy system's name, physics, and per-lap limits
- The overtaking system (DRS → Manual Override Mode)
- The aero system (fixed wings → X/Z active modes)
- The shift-light RPM curve
- Even the fuel label

A dashboard that says "ERS · DRS READY" to an F1 25 2026-season player is
wrong in the same way our current "DRS READY at 84 km/h" is wrong.

## 2. Era facts (verified)

### Hybrid era — game years 2020–2025 (2014–2025 regulations)
| System | Fact |
|---|---|
| Power unit | 1.6L V6 turbo-hybrid; MGU-K **120 kW (160 bhp)** + MGU-H (uncapped charging) + ES |
| Per-lap energy | Deploy ≤ **4 MJ** · MGU-K harvest ≤ **2 MJ** · MGU-H unlimited |
| Deploy modes (game) | `NONE / MEDIUM / HOTLAP / OVERTAKE` (simplified from 6 levels in F1 2020; Overtake = push-to-pass) |
| Overtaking aero | **DRS** — rear flap only, proximity-gated (≤1 s at detection point) |
| Fuel | Standard (F1 22+ simulates **E10**) |
| Shift lights | Tuned ~12–13 k RPM redline |
| HUD grammar (games) | Yellow = ES state of charge · Green = deployment remaining this lap · Red = harvest remaining this lap — all reset at S/F |

### 2026 era — F1 25 "2026 Season Pack" (and game year 2026 when it ships)
| System | Fact |
|---|---|
| Power unit | MGU-H **deleted**; MGU-K **350 kW** (~3×); ICE ~400 kW; total ~750 kW — near 50/50 electric/ICE |
| Per-lap energy | Harvest ≤ **8.5 MJ** (+0.5 MJ under MOM); deployment **ramps down with speed**: 350 kW → 0 between 290–355 kph |
| **Manual Override Mode (MOM)** | Replaces DRS as the overtaking aid: within 1 s at detection → higher deployment ceiling (350 kW to 337 kph) + 0.5 MJ extra harvest for that lap. Proximity-gated, like DRS was |
| **Active aero** | **X-mode** (low drag, front+rear flaps open) / **Z-mode** (max downforce, default). Available to ALL drivers regardless of proximity — ECU-gated zones (~3 s straights). Lift-off regen disables active aero. Replaces DRS entirely |
| Fuel | 100% sustainable |
| Shift lights | Lower revving PUs → different LED curve (~10.5–11.5 k) |
| In-game (F1 25) | "Overtake mode" = MOM implementation; Active Aero zones modeled per circuit (more zones than DRS); battery management is the core strategic skill |

## 3. The mechanism: `EraProfile`

A config object keyed by packet format, consumed by the API and UI:

```ts
interface EraProfile {
  label: string;                    // "Hybrid Era (2014–2025)" | "2026 Regulations"
  energy: {
    systemName: string;             // "ERS" | "ES / MGU-K"
    hasMguH: boolean;               // true 2020-25, false 2026
    deployModes: string[];          // ["NONE","MEDIUM","HOTLAP","OVERTAKE"] | recharge-map vocabulary
    hudVariant: "triple-bar" | "soc-rampdown";
    perLap: { deployMJ: number; harvestMJ: number };
  };
  aero: {
    system: "DRS" | "XZ";
    chipLabels: { ready: string; active: string };  // "DRS READY/ACTIVE" | "Z-MODE"/"X-MODE"
    proximityGated: boolean;        // true for DRS & MOM, false for X-mode
  };
  overtake: {
    label: string;                  // "OVERTAKE" | "OVERRIDE"
    note: string;                   // MOM: +0.5 MJ, 350 kW to 337 kph
  };
  shiftLights: { startRpm: number; endRpm: number };  // LED curve per era
  fuelLabel: string;                // "FUEL" | "FUEL · E10" | "FUEL · 100% SUSTAINABLE"
}
```

- Backend: `EraProfile` selected by the packet format detected in
  ingestion and stamped onto every broadcast frame + persisted lap.
- UI: instruments read the profile — labels, chips, LED curves, and the
  energy HUD variant all become era-correct automatically.
- 2026 readiness: when game year 2026 ships its packet format, support
  = new `packet_structs_26.py` + one `EraProfile` entry. The adapter
  pattern (ADR) already isolates the decode; the profile isolates the
  *meaning*.

## 4. Circuit library (revised architecture — decision)

**Library-first, trace-last-resort.**

- `circuits` table (Postgres): `track_id` (game), `name`, `game_years[]`,
  `layout` (normalized polyline JSON), `sectors` (3 distance bounds),
  `aero_zones` (DRS zones for 20–25; X-mode zones for 26), `turns`
  (optional names).
- **Seed script** (`scripts/seed_circuits.py`): pulls every circuit for
  every supported year from FastF1 (layout + circuit info + DRS zones)
  and upserts. ~25 unique venues across 2020–25 with heavy overlap.
- API: `GET /intelligence/track/{id}/layout` serves from the DB
  (layout + sectors + zones in one payload).
- UI map renders the library layout with zone shading the moment the
  session packet names the track — no first lap needed.
- Live trace stays only as a last resort for an unseeded circuit (and
  its result is *promoted into* the library after a clean lap).

## 5. Dashboard deltas by era (summary)

| Instrument | 2020–21 | 2022–25 | 2026 |
|---|---|---|---|
| Energy panel title | ERS | ERS | ES / MGU-K |
| Energy HUD | Deploy 4 MJ / Harvest 2 MJ / SoC bars | same | SoC + speed-rampdown arc + 8.5 MJ harvest |
| Overtake chip | OVERTAKE | OVERTAKE | OVERRIDE (MOM) |
| Aero chip | DRS READY/ACTIVE | DRS READY/ACTIVE | Z-MODE / X-MODE |
| Shift LED curve | 12–13 k | 12–13 k | ~10.5–11.5 k |
| Fuel label | FUEL | FUEL · E10 | FUEL · 100% SUSTAINABLE |
| Map zones | DRS zones | DRS zones | X-mode zones |

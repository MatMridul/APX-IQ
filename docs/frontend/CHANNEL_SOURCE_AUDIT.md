# APX IQ — Channel Source Truth Audit (Step 1 Gate)
**Document Version:** 1.0.0  
**Date:** September 19, 2026  
**Status:** PENDING APPROVAL  
**Author:** Antigravity (Frontend Engineering)  
**Governing Standard:** HANDOVER.md §3 (Honesty Contract) & TRD §3  

---

## 1. Objective & Audit Rules

Before any new instrument or visualization is constructed for the **Elite Motorsport Workstation**, every proposed telemetry channel must be audited against ground-truth data sources.

### Categorization Framework:
* **`WIRE`**: The channel is natively provided by F1 2020–2025 UDP packets or FastF1 FIA session datasets, and can be ingested directly into the backend and Zustand store.
* **`DERIVE`**: The channel is not emitted directly as a single scalar, but is deterministically computable via formal mathematics/physics from `WIRE` channels (e.g. $\Delta t = \int (\frac{1}{v_1} - \frac{1}{v_2}) dx$, G-G acceleration, $V_{min}$ apex extrema).
* **`BADGE-AS-MODELED`**: The channel is computed via heuristic physical modeling (e.g. aero balance proxy from setup geometry) and **must be visibly badged as `MODELED` or `SIM`** on the interface.
* **`DROP`**: The channel is completely absent from the simulation telemetry and cannot be reliably derived. It is **banned from being displayed as a real measurement** to prevent data fabrication.

---

## 2. Telemetry Channel Source Matrix

| # | Channel Name | Target Metric / Unit | In F1 20–25 UDP? | In FastF1? | Derivation Formula / Source Field | Verdict | Notes & Restrictions |
|---|---|---|---|---|---|---|---|
| **01** | **Vehicle Speed** | $km/h$ | **YES** (`m_carTelemetryData.m_speed`) | **YES** (`Speed`) | Direct packet field | **`WIRE`** | Primary telemetry channel. |
| **02** | **Lap Distance** | $m$ (Meters) | **YES** (`m_lapData.m_lapDistance`) | **YES** (`Distance`) | Direct packet field | **`WIRE`** | Shared X-axis for all distance-domain charts. |
| **03** | **Continuous Lap Delta ($\Delta t$)** | $\pm s$ (Seconds) | **NO** (Only discrete lap splits) | **NO** (Must interpolate) | $\Delta t(s) = \int_0^s \left(\frac{1}{v_{\text{user}}(x)} - \frac{1}{v_{\text{ghost}}(x)}\right) dx$ | **`DERIVE`** | Core analytical curve. Continuous integral over distance. |
| **04** | **Throttle Position** | $0\text{--}100\%$ | **YES** (`m_carTelemetryData.m_throttle`) | **YES** (`Throttle`) | Normalized float ($0.0 \dots 1.0$) | **`WIRE`** | Direct actuator channel. |
| **05** | **Brake Position / Input** | $0\text{--}100\%$ | **YES** (`m_carTelemetryData.m_brake`) | **YES** (`Brake`) | Normalized float ($0.0 \dots 1.0$) | **`WIRE`** | Direct actuator channel. |
| **06** | **Brake Hydraulic Pressure (Proxy)** | $Bar$ ($0\text{--}120\text{ Bar}$) | **NO** (UDP emits $0.0 \dots 1.0$) | **NO** | $P_{\text{hyd}} = \text{brake} \times 100\text{ Bar}$ (Nominal F1 Master Cylinder) | **`DERIVE`** | Must label as calibrated pedal proxy if shown in Bar, or keep as Brake %. |
| **07** | **Steering Wheel Angle ($\delta_{\text{sw}}$)** | $\pm \text{Degrees} / \pm 1.0$ | **YES** (`m_carTelemetryData.m_steer`) | **NO** (Derivable from curvature) | UDP emits $-1.0 \dots +1.0$; FastF1 derivable via $\kappa = \frac{a_Y}{v^2}$ | **`WIRE`** (Live) / **`DERIVE`** (FastF1) | Physical steering lock angle. |
| **08** | **Selected Gear** | $1\text{--}8, N=0, R=-1$ | **YES** (`m_carTelemetryData.m_gear`) | **YES** (`nGear`) | Direct integer | **`WIRE`** | Powertrain state. |
| **09** | **Engine RPM** | $RPM$ | **YES** (`m_carTelemetryData.m_engineRPM`) | **YES** (`RPM`) | Direct integer | **`WIRE`** | Powertrain state. |
| **10** | **DRS Status** | $0 / 1$ (Active/Inactive) | **YES** (`m_carTelemetryData.m_drs`) | **YES** (`DRS`) | Direct boolean/int | **`WIRE`** | Powertrain/Aero state. |
| **11** | **Lateral Acceleration ($a_Y$)** | $\pm G$ | **YES** (`m_carMotionData.m_gForceLateral`) | **NO** (Derivable from $v$ & yaw) | Direct float in Motion packet (ID 0) | **`WIRE`** (Live) / **`DERIVE`** (FastF1) | Used for friction ellipse and corner loading. |
| **12** | **Longitudinal Acceleration ($a_X$)** | $\pm G$ | **YES** (`m_carMotionData.m_gForceLongitudinal`) | **NO** (Derivable via $\frac{dv}{dt}$) | Direct float in Motion packet (ID 0) | **`WIRE`** (Live) / **`DERIVE`** (FastF1) | Used for braking/traction G-G plots. |
| **13** | **G-G Traction Ellipse** | $G_x \text{ vs } G_y$ | **YES** | **YES** | Scatter/density trace of $a_X$ vs $a_Y$ | **`DERIVE`** | Direct mathematical plot of acceleration components. |
| **14** | **Brake Disc Temperature** | $^\circ\text{C}$ (FL, FR, RL, RR) | **YES** (`m_brakesTemperature[4]`) | **NO** | Direct integer array in Celsius | **`WIRE`** | 4-corner thermal monitoring. |
| **15** | **Tyre Surface Temperature** | $^\circ\text{C}$ (FL, FR, RL, RR) | **YES** (`m_tyresSurfaceTemperature[4]`) | **NO** | Direct integer array in Celsius | **`WIRE`** | Single bulk surface temperature per tyre. |
| **16** | **Tyre Inner / Carcass Temp** | $^\circ\text{C}$ (FL, FR, RL, RR) | **YES** (`m_tyresInnerTemperature[4]`) | **NO** | Direct integer array in Celsius | **`WIRE`** | Core carcass temperature per tyre. |
| **17** | **I-C-O 3-Band Surface Temps** | Inner/Mid/Outer $^\circ\text{C}$ | **NO** (F1 game emits single surface + inner temp) | **NO** | N/A (Sim does not simulate 3 lateral sub-bands) | **`DROP`** | **CRITICAL AUDIT ITEM**: Dropped from real instruments. Replace with Surface + Inner Core 2-layer readout. |
| **18** | **Tyre Pressure** | $PSI$ (FL, FR, RL, RR) | **YES** (`m_tyresPressure[4]`) | **NO** | Direct float array in PSI | **`WIRE`** | Real-time pneumatic inflation. |
| **19** | **Tyre Wear & Blistering** | $\%$ (FL, FR, RL, RR) | **YES** (`m_carDamageData.m_tyresWear[4]`) | **NO** | Direct damage packet field (Packet ID 10) | **`WIRE`** | Degradation modeling. |
| **20** | **Fuel in Tank & Burn Rate** | $kg$ / $kg/\text{lap}$ | **YES** (`m_carStatusData.m_fuelInTank`) | **NO** | $\Delta \text{fuel} = \text{fuel}_{\text{start}} - \text{fuel}_{\text{current}}$ | **`WIRE`** (Tank) / **`DERIVE`** (Burn) | Energy & mass monitoring. |
| **21** | **ERS Stored Energy (SOC)** | $Joules / MJ / \%$ | **YES** (`m_carStatusData.m_ersStoreEnergy`) | **NO** | $\text{SOC}(\%) = \frac{\text{ersStoreEnergy}}{4.0 \times 10^6} \times 100$ | **`WIRE`** | Direct hybrid energy measurement. |
| **22** | **ERS Deploy Mode & MGU-K State** | Deploy / Harvest ($kW$) | **YES** (`m_ersDeployMode`, `m_ersHarvestedThisLapMGUK`) | **NO** | Direct status packet fields | **`WIRE`** | Hybrid powertrain status. |
| **23** | **Brake Bias (% Front)** | $\% \text{ Front}$ (e.g. $56.5\%$) | **YES** (`m_carStatusData.m_frontBrakeBias`) | **NO** | Direct byte field | **`WIRE`** | Chassis setup state. |
| **24** | **Damper / Suspension Travel** | $mm$ (FL, FR, RL, RR) | **YES** (`m_suspensionPosition[4]` in Motion Packet 0/13) | **NO** | Direct player-car motion field | **`WIRE`** (Live Sim) / **`DROP`** (FastF1) | Available from game UDP; omitted from FastF1. |
| **25** | **Ride Height ($Z_{\text{ride}}$)** | $mm$ (Front/Rear) | **NO** (Only static setup & raw suspension position) | **NO** | Kinematic proxy: $Z_{\text{ride}} = Z_{\text{static}} - \Delta_{\text{suspension}}$ | **`BADGE-AS-MODELED`** | Must display explicit `MODELED` tag. |
| **26** | **Steering Torque ($Nm$)** | $Nm$ | **NO** | **NO** | Steering torque proxy: $\tau \approx C_{\alpha} \cdot a_Y$ | **`DROP`** | Excluded to prevent ungrounded telemetry. Replaced by Steering Angular Velocity ($\frac{d\delta}{dt}$ in $^\circ/s$). |
| **27** | **Wheel Slip Ratio ($S_{\text{slip}}$)** | $\%$ (FL, FR, RL, RR) | **YES** (`m_wheelSlip[4]` in Motion Packet 0/13) | **NO** | $S = \frac{\omega \cdot r - v}{v} \times 100\%$ | **`WIRE`** (Live Sim) / **`DERIVE`** | Available in UDP Packet 0/13. |
| **28** | **Corner Extrema ($V_{min}$, Brake Point, Throttle Point)** | $km/h$, $m$ | **YES** | **YES** | Discrete mathematical search over distance array | **`DERIVE`** | Deterministic extraction of apex minima and throttle onsets. |
| **29** | **Traffic Rejoin & Gap Decay Matrix** | $\pm s$, Laps to Overtake | **YES** (`m_lapData`, session lap times) | **NO** | $T_{\text{rejoin}} = T_{\text{current}} + \Delta_{\text{pit\_loss}}$ (Constant $\Delta_{\text{pit\_loss}} = 21.4\text{s}$) | **`DERIVE`** | Deterministic pit-window projection. |
| **30** | **Aero Balance % (Front/Rear)** | $\% \text{ F} / \% \text{ R}$ | **NO** (Direct aero forces not in telemetry) | **NO** | Setup geometry calculation from wing angles & ride height | **`BADGE-AS-MODELED`** | Interactive setup matrix must carry `MODELED` badge. |

---

## 3. Ground-Truth Wiring & Implementation Summary

### Verdict Summary:
* **`WIRE` Channels (17)**: Speed, Distance, Throttle, Brake, Gear, RPM, DRS, Steering (Live), Brake Temp, Tyre Surface Temp, Tyre Inner Temp, Tyre Pressure, Tyre Wear, Fuel, ERS Energy, ERS Mode, Brake Bias.
* **`DERIVE` Channels (8)**: Continuous Lap Delta ($\Delta t$), Longitudinal G ($a_X$), Lateral G ($a_Y$), G-G Friction Ellipse, Wheel Slip Ratio, Corner Extrema ($V_{min}$, Brake/Throttle Points), Traffic Rejoin Window, Fuel Burn Rate.
* **`BADGE-AS-MODELED` Channels (2)**: Ride Height Kinematic Proxy, Aero Balance % Calculator.
* **`DROP` Channels (3)**:
  1. *3-Band I-C-O Tyre Thermals* $\rightarrow$ **DROPPED**. Replaced by authentic **Dual-Layer Thermal Matrix** (Surface Temp + Inner Carcass Temp per corner), which is 100% real and grounded in UDP telemetry.
  2. *Steering Torque ($Nm$)* $\rightarrow$ **DROPPED**. Replaced by **Steering Angular Velocity ($\frac{d\delta}{dt}$ in $^\circ/s$)**, which is directly computable from steer input over time.
  3. *Pure FastF1 Suspension Travel* $\rightarrow$ **DROPPED** when viewing FIA FastF1 reference laps (only available during Live UDP sessions).

---

## 4. Architectural Boundaries for Elite Workstation UI

1. **The 6-Tier MoTeC Strip Chart**:
   * Tier 1: **Speed ($km/h$)** — `WIRE`
   * Tier 2: **Continuous $\Delta t$ Delta-Time ($s$)** — `DERIVE`
   * Tier 3: **Pedal Actuation (Throttle % & Brake %)** — `WIRE`
   * Tier 4: **Steering Angle ($\delta_{\text{sw}}$)** — `WIRE` (Live) / `DERIVE` (FastF1)
   * Tier 5: **Powertrain (Gear, RPM, DRS)** — `WIRE`
   * Tier 6: **Acceleration ($a_Y$ Lateral G & $a_X$ Longitudinal G)** — `WIRE` / `DERIVE`

2. **The 4-Corner Chassis Matrix**:
   * Real **Surface Temp ($^\circ\text{C}$)** — `WIRE`
   * Real **Inner Carcass Temp ($^\circ\text{C}$)** — `WIRE`
   * Real **Pneumatic Pressure ($PSI$)** — `WIRE`
   * Real **Carbon Brake Rotor Temp ($^\circ\text{C}$)** — `WIRE`
   * Real **Tyre Wear Degradation ($\%$)** — `WIRE`
   * *No fabricated 3-band lateral strips.*

3. **Honesty Enforcement in Cockpit HUD & Status Bar**:
   * All metrics during offline states must read through `useLiveOrDemo()`.
   * When disconnected from UDP ingestion, explicit **`SIM`** or **`NO_SIGNAL`** badges must be rendered.
   * No fabricated packet throughput rates (e.g. `60 Hz · 4.8 KB/s`) when Socket.IO is disconnected.


---

## 5. REVIEW & REQUIRED CORRECTIONS (Kiro — verification pass, 2026-09-19)

**Status: NOT APPROVED — revise and resubmit.** The method is sound and the honesty
discipline is right: you DROPPED the fantasy channels (I-C-O 3-band, steering torque)
instead of faking them, and forced `BADGE-AS-MODELED` on ride height / aero balance.
That is exactly the behavior this gate exists to enforce. Good.

However, this audit was written against the **published F1 UDP spec sheet**, not against
**this repository's actual parser and adapter**. I verified every load-bearing verdict
against `ingestion/packet_structs_25.py` and `ingestion/adapters/universal_adapter.py`.
Three classes of error must be fixed before this becomes the build contract.

### CORRECTION 1 — Suspension travel (#24) and Wheel slip (#27) are NOT available. Reclassify to DROP.
Verified: `CarMotionData` in `packet_structs_25.py` ends at `m_gForceVertical / m_yaw /
m_pitch / m_roll`. **There is no `m_suspensionPosition` and no `m_wheelSlip` field in the
struct this repo parses.** Those fields live in the extended **Motion Ex packet (ID 13,
`PacketMotionExData`)**, which this repository does **not** define, decode, or adapt.
- #24 Damper/Suspension Travel → **`DROP`** (or `NEEDS-BACKEND: Motion Ex packet ID 13`).
- #27 Wheel Slip Ratio → **`DROP`** (same reason). Its "derive" formula needs wheel speed
  ω, which also only exists in Motion Ex.
- Building either instrument now would fabricate data — the precise thing this gate forbids.
  Do NOT display them. If they are wanted later, that is a **backend escalation to Mridul**
  (new packet parser), not a frontend task.

### CORRECTION 2 — Split `WIRE` into "delivered" vs "needs backend plumbing." Most WIRE channels do NOT reach the UI today.
A field existing in the packet struct is NOT the same as it reaching the frontend store.
Verified against `universal_adapter.py`, the adapter currently forwards ONLY:
- Motion: `g_force_lat`, `g_force_lon` (+ world pos/vel)
- Telemetry: `speed_kph, throttle, brake, steer, gear, rpm, drs, tyre_surface_temps,
  tyre_inner_temps, brakes_temperature`
- Lap: number, times, sectors, distance, position, validity
- Status: `fuel_in_tank, fuel_remaining_laps, max_rpm, drs_allowed, ers_store_energy,
  ers_deploy_mode, tyre_compound`

Channels you marked `WIRE` that are **in the struct but NOT forwarded by the adapter today**
(therefore NOT in the Zustand store, therefore NOT drawable without a backend change):
- #18 Tyre Pressure (`m_tyresPressure`) — parsed struct, **not adapted**.
- #19 Tyre Wear (`m_carDamageData.m_tyresWear`) — Damage packet ID 10, **not adapted**.
- #22 ERS MGU-K harvest/deploy kW (`m_ersHarvestedThisLapMGUK`) — **not adapted** (only
  `ers_store_energy` + `ers_deploy_mode` are).
- #23 Brake Bias (`m_frontBrakeBias`) — **not adapted**.
- #20 Fuel burn rate — derivable, but from `fuel_in_tank` which IS adapted (OK to DERIVE).

**Action:** reclassify each channel with one of two tags:
- **`WIRE-LIVE`** — already forwarded by the adapter AND present in the frontend store/types
  (`useTelemetry.ts`). Safe to draw now. (Speed, throttle, brake, steer, gear, rpm, drs,
  surface temp, inner temp, brake temp, G-lat, G-lon, fuel-in-tank, ERS store, ERS mode.)
- **`WIRE-BACKEND`** — in the packet struct but NOT yet forwarded. Requires an adapter +
  Socket.IO + store-type change. **This is BACKEND work you are prohibited from doing under
  HANDOVER.md §3 #6.** List these as escalations to Mridul; do NOT silently edit the backend,
  and do NOT build the widget until the data is confirmed flowing.

### CORRECTION 3 — FastF1 steering angle (#07) downgrade to BADGE-AS-MODELED on the FastF1 path.
`κ = a_Y / v²` yields path curvature, not steering-wheel angle `δ_sw`; mapping curvature to
`δ_sw` requires a vehicle/Ackermann model. Live path (`m_steer`, −1..+1) is fine as `WIRE-LIVE`.
FastF1 path → **`BADGE-AS-MODELED`**, not `DERIVE`.

### Net effect on the build plan
- The **6-Tier MoTeC strip recorder is still green** — every tier maps to `WIRE-LIVE` or a
  clean `DERIVE` (Δt, G-G). Proceed with uPlot on those.
- The **4-corner chassis matrix** is green for Surface temp, Inner temp, Brake rotor temp
  (all `WIRE-LIVE`); Tyre Pressure and Tyre Wear become `WIRE-BACKEND` (escalate, don't fake);
  suspension/slip are `DROP`.
- Ride height, aero balance stay `BADGE-AS-MODELED`. Steering torque, I-C-O stay `DROP`.

### Resubmit with
1. The matrix re-tagged with `WIRE-LIVE` / `WIRE-BACKEND` / `DERIVE` / `BADGE-AS-MODELED` / `DROP`.
2. An explicit **"Backend escalations"** section listing every `WIRE-BACKEND` channel and the
   adapter/socket/store change each needs — as a request to Mridul, not a task you execute.
3. Confirmation that no instrument in the build plan depends on a `DROP` or an un-escalated
   `WIRE-BACKEND` channel.

Verify claims against `packet_structs_*.py` and `universal_adapter.py` — not the F1 spec PDF.
The spec says what the game *could* emit; those files say what THIS platform actually parses
and delivers. Only the latter is buildable without fabrication.

# APX IQ — Elite Motorsport Engineering Workstation
## Comprehensive Architectural Specification & Productization Blueprint (v2.0)

---

### 1. Product Identity & Target Audience

#### **Primary Mission**
APX IQ is a **cloud-native, high-frequency motorsport telemetry intelligence platform and race engineering workstation**. It serves dual strategic purposes:
1. **Flagship Formula 1 Technical Portfolio**: Designed to demonstrate world-class systems engineering, low-latency data visualization, and domain mastery for Tier-1 Formula 1 aerodynamicist, race engineer, and software engineering roles (e.g. Mercedes AMG F1, Red Bull Technology, McLaren Applied, Williams Racing, Ferrari).
2. **Professional-Grade Telemetry Tool**: Built for competitive sim racers and trackside engineers requiring sub-millisecond precision, multi-channel synchronized strip charts, and telemetry benchmarking against official FIA FastF1 reference laps.

#### **Target User Persona**
* **The Chief Race / Performance Engineer**: Analyzes micro-sector deltas, tire carcass vs surface thermal windows, braking threshold decay, and energy harvest deployment.
* **The Driver Coach**: Evaluates trail-braking friction envelopes (G-G diagrams), throttle pickup hesitation, and apex minimum speed ($V_{min}$).
* **The Telemetry Analyst**: Needs keyboard-driven scrubbing, multi-channel synchronous zoom, custom math channels ($\Delta t$), and MoTeC `.ld` export.

#### **Guiding Aesthetic & Interaction Standard**
* **McLaren Applied ATLAS** (Advanced Telemetry Linked Acquisition System)
* **MoTeC i2 Pro** (Industry-standard strip-chart recorder & math engine)
* **Linear / Apple Pro** (Industrial dark surfaces, micro-tracking, zero layout shift, instant haptics)

---

### 2. Dependency & Tooling Evaluation

| Library / Tool | Role in APX IQ | Evaluation & Tradeoffs | Verdict |
| :--- | :--- | :--- | :--- |
| **`uPlot`** | Multi-Channel Telemetry Strip Recorder | • **Pros**: Ultra-fast (150k points in 25ms), Canvas 2D-based, 45KB bundle, synchronous cursor locking across stacked charts, native zoom/pan, zero React reconciliation overhead.<br>• **Cons**: Raw API requires imperative lifecycle handling via `useRef`. | **ACCEPTED (Primary Charting Engine)** |
| **`FastF1` (Python Backend)** | Telemetry & Reference Lap Pipeline | • **Pros**: Official FIA timing and car telemetry data, sector micro-splits, car position vectors.<br>• **Cons**: Requires distance-interpolation and cache management. | **ACCEPTED (Backend Data Engine)** |
| **`HTML5 Canvas 2D (RAF Scheduler)`** | 60Hz Instrument Widgets (MFD, GG Diagram, ICO Thermals) | • **Pros**: Direct pixel control, 0 React re-renders, 60fps/120fps hardware acceleration.<br>• **Cons**: Custom math required for layout geometry. | **ACCEPTED (Hardware HUD Widgets)** |
| **`D3.js / SVG Splines`** | Circuit Splines & Track Maps | • **Pros**: High-precision vector paths, responsive scaling, interactive SVG click zones.<br>• **Cons**: Too slow for 10k-point streaming time-series. | **ACCEPTED (Track Geometry Only)** |
| **`cmdk` (or custom hotkey engine)** | Global Command Palette (`Cmd+K`) | • **Pros**: Keyboard-first navigation, instant track/driver search, zero mouse dependency. | **ACCEPTED (Ergonomics)** |

---

### 3. Surface-by-Surface Architectural Blueprint

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 APX IQ SYSTEM TOPOLOGY                                 │
├────────────────────────────┬────────────────────────────┬──────────────────────────────┤
│ 1. MISSION CONTROL         │ 2. COCKPIT HUD             │ 3. OPERATIONAL PIT WALL      │
│ (/dashboard/intelligence)  │ (/dashboard)               │ (/)                          │
├────────────────────────────┼────────────────────────────┼──────────────────────────────┤
│ • 6-Tier MoTeC Strip Chart │ • 4-Corner I-C-O Thermals  │ • Ingestion Stream Monitor   │
│ • Continuous Δt Math Graph │ • Chassis State Vector Hub │ • FastF1 Session Catalog     │
│ • G-G Traction Ellipse     │ • Traffic Rejoin Matrix    │ • Live UDP Packet Inspector  │
│ • Corner Delta Breakdown   │ • Synchronized GPS Radar   │ • 1-Click Workstation Boot   │
│ • MoTeC .ld / CSV Exporter │ • 60Hz RAF Zero-Re-render  │ • Operational Honesty Badge  │
└────────────────────────────┴────────────────────────────┴──────────────────────────────┘
```

---

### Surface 1: Mission Control (`/dashboard/intelligence`) — The MoTeC i2 Pro Suite

The current single-curve speed graph is completely replaced by a **6-Tier Synchronized MoTeC i2 Strip Recorder**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [01] SPEED (km/h) ────────────────────────── User: 284 km/h  · Ghost (VER): 287 km/h   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [02] DELTA TIME Δt (s) ───────────────────── +0.182s (Sector 2 Loss: -0.114s)          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [03] PEDAL ACTUATION ─────────────────────── Throttle: 100%  · Brake Pressure: 0 Bar   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [04] STEERING ANGLE δsw (deg) ────────────── -14.2° (Angular Rate: 42°/s)              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [05] POWERTRAIN ──────────────────────────── Gear: 7  · RPM: 11,480  · DRS: ACTIVE     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [06] ACCELERATION (G) ────────────────────── Lateral: -3.82 G  · Longitudinal: +0.45 G │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Core Features:
1. **Vertical Hairline Synchronous Cursor**: Scrubbing any strip locks all 6 channels simultaneously.
2. **Delta Time Math Channel ($\Delta t$)**:
   $$\Delta t(s) = \int_{0}^{s} \left( \frac{1}{v_{\text{user}}(x)} - \frac{1}{v_{\text{ghost}}(x)} \right) dx$$
   Visualized with a dual-gradient ribbon (Red area above zero = time loss, Green area below zero = time gain).
3. **Corner-by-Corner Delta Breakdown Matrix**:
   * Braking Point Distance ($m$)
   * Minimum Corner Velocity ($V_{min}$ in $km/h$)
   * Throttle Application Point ($m$)
   * Sector Time Delta ($\Delta t$ in $ms$)
4. **Interactive G-G Friction Circle (Traction Ellipse)**:
   * Plots $a_X$ (Longitudinal G) vs $a_Y$ (Lateral G) with dynamic grip boundary threshold and trail-braking decay profile.
5. **Telemetry Exporter**:
   * Export to MoTeC `.ld` format, raw CSV telemetry stream, or PDF FIA Engineering Debrief.

---

### Surface 2: Cockpit HUD (`/dashboard`) — Trackside Chassis & Kinematics

Replaces all cartoon graphics with **Hardware-Grade Race Engineering Instruments**:

#### 1. 4-Corner I-C-O Thermal & Kinematic Matrix (Replaces 2D Car Vector)
* **3-Band Tyre Surface Temperatures (I-C-O)**:
  * $T_{\text{Inner}}$, $T_{\text{Center}}$, $T_{\text{Outer}}$ per corner (e.g. `FL: 104°C | 101°C | 96°C` indicating negative camber distribution).
* **Carcass & Pressure State**: Hot inflation pressure ($P_{\text{hot}}$ in PSI) and core carcass temperature ($T_{\text{carcass}}$).
* **Brake Hub Assembly**: Carbon-Carbon Rotor Temp ($850^\circ\text{C}$ incandescent thermal glow) and Caliper Fluid Temp ($185^\circ\text{C}$).
* **Suspension Kinematics**: Dynamic damper travel ($mm$), ride height ($Z_{\text{ride}}$ in $mm$), and wheel slip ratio ($S_{\text{slip}}$ in $\%$).

#### 2. Chassis State Vector & Actuator Hub (Replaces Toy Steering Wheel)
* **Steering Dynamics**: Real-time steering lock $\delta_{\text{sw}}$ ($^\circ$), steering angular velocity ($^\circ/s$), and steering torque ($Nm$).
* **Pedal Dynamics**: Linear throttle potentiometer ($0\text{--}100\%$) and brake hydraulic line pressure ($0\text{--}120\text{ Bar}$).
* **Energy Recovery System (ERS)**: Battery State of Charge ($SOC$ in $\%$ and $MJ$), MGU-K deploy/harvest vector ($kW$), and differential locking torque ($Nm$).
* **Rotary Map Matrix**: Real-time engine maps (`STRAT 6`, `MIX 1`, `HPP 3`, `BB 56.5%`).

#### 3. Traffic Rejoin & Gap Decay Engine (Replaces TV Battle Panel)
* **Pit Rejoin Delta Window**: Live calculation of pit stop loss ($21.4\text{s}$) mapped against on-track traffic in clean vs. dirty air.
* **Gap Decay Matrix**: Micro-sector pace differential ($\Delta t/\text{lap}$) calculating exact laps until overtake/undercut threshold.

---

### Surface 3: Operational Pit Wall (`/`) — Telemetry Command Gateway

Replaces static marketing cards with an **Ingestion Hub & Session Catalog**:
* **Live Ingestion Bridge Monitor**: UDP port binding (`20777`), protocol version (`F1 2024 / 2025`), packet rate (`60.0 Hz`), jitter buffer (`0.4ms`), and drop rate (`0.00%`).
* **FastF1 Session Catalog**: Multi-year FIA reference database (2020--2025), grand prix selection, session type (`FP1`, `FP2`, `FP3`, `Q`, `R`), driver selection, and track condition parameters.
* **Instant Keyboard Launch**: `[Press 1]` Cockpit HUD, `[Press 2]` Mission Control, `[Press 3]` System Diagnostics.

---

### Surface 4: Global Ergonomics & Power-User Navigation

* **Global Command Palette (`Cmd+K` / `Ctrl+K`)**: Instant search for tracks, drivers, telemetry channels, and session years.
* **Standard Telemetry Hotkeys**:
  * `Space`: Play / Pause telemetry sweep
  * `←` / `→`: Step distance by $\pm 10\text{m}$ (Hold `Shift` for $\pm 100\text{m}$)
  * `1` / `2` / `3`: Jump to Sector 1, 2, or 3
  * `Z` / `X`: Zoom In / Zoom Out on telemetry cursor
  * `M`: Toggle specific telemetry channel visibility

---

### 4. Phased Execution Roadmap

| Phase | Milestone | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Telemetry Math & uPlot Core Engine** | • Install `uplot` / `uplot-react`<br>• Implement distance-interpolated $\Delta t$ continuous time-delta math<br>• Implement G-G friction ellipse calculation engine |
| **Phase 2** | **Mission Control Multi-Channel Strip Recorder** | • Build 6-Tier synchronized strip chart with vertical hairline cursor<br>• Add corner-by-corner $V_{min}$ & braking delta table<br>• Integrate dynamic G-G diagram & telemetry export |
| **Phase 3** | **Cockpit HUD Chassis State & 4-Corner I-C-O Hub** | • Build 4-corner 3-band (I-C-O) tyre thermal & brake hub<br>• Build Chassis State Vector & Actuator Hub<br>• Build Traffic Rejoin & Gap Decay Matrix |
| **Phase 4** | **Interactive Circuit Map & Apex Probe Sync** | • Interactive SVG apex click-to-scrub telemetry lock<br>• Micro-sector speed gradient overlay |
| **Phase 5** | **Command Palette (`Cmd+K`) & Ingestion Gateway** | • Build global `Cmd+K` command palette<br>• Upgrade `/` to high-density Operational Ingestion Hub |

---

### 5. Verification & Acceptance Criteria

1. **Analytical Integrity**: All delta curves must accurately compute time lost/gained ($\Delta t$) over track distance matching FastF1 mathematical standards.
2. **Performance**: 60Hz continuous playback and scrubbing must run with zero dropped frames and zero memory leaks.
3. **Ergonomic Quality**: Full keyboard hotkey support (`Cmd+K`, `Space`, `←/→`, `1-3`, `Z/X`) must be functional across all workstations.
4. **Visual Rigor**: 100% free of toy/broadcast graphics; 100% industrial, high-density motorsport engineering workstation aesthetics.

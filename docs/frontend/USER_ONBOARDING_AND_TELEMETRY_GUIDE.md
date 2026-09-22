# 🏁 APX-IQ Workstation Onboarding & F1 Game Telemetry Guide

## 1. Executive Summary

APX-IQ is an elite Formula 1 telemetry ingestion, ghost benchmarking, and race engineering intelligence platform supporting **six generations of EA Sports F1 games (F1 2020 through F1 2025)**.

The platform processes high-frequency **60 Hz UDP telemetry packets**, decodes them in real time using zero-copy binary struct parsers, streams them over Socket.IO to an in-browser Zustand state store, and renders a 60 FPS digital pit wall cockpit with Canvas 2D and Web Audio synthesis.

---

## 2. F1 Game Connection Guide (UDP 20777)

### In-Game Configuration Matrix

In your EA Sports F1 game (**PC**, **PlayStation 4/5**, or **Xbox Series X/S**):
1. Navigate to: **Game Options** ➔ **Settings** ➔ **Telemetry Settings**
2. Configure the following fields:

| Setting | Recommended Value | Description |
| :--- | :--- | :--- |
| **UDP Telemetry** | **ON** | Enables raw binary packet broadcast. |
| **UDP Broadcast Mode** | **OFF** (PC) / **ON** (Console LAN) | Direct IP unicast or local subnet broadcast. |
| **UDP IP Address** | **`127.0.0.1`** (or PC Local IP) | IP address running the APX-IQ Ingestion Service. |
| **UDP Port** | **`20777`** | Standard Codemasters F1 UDP listener port. |
| **UDP Send Rate** | **`60 Hz`** | High-frequency telemetry stream (16.6ms per frame). |
| **UDP Format** | **`2024`** (or Game Year / Auto) | APX-IQ auto-detects 2020 through 2025 formats. |

---

### Ingestion Service Architecture

```
┌────────────────────────────────────────────────────────┐
│             EA SPORTS F1 GAME (PC / Console)           │
│   Broadcasts binary packets at 60 Hz on UDP :20777     │
└──────────────────────────┬─────────────────────────────┘
                           │ UDP Packets
                           ▼
┌────────────────────────────────────────────────────────┐
│           APX-IQ INGESTION SERVICE (:3001)             │
│   • ctypes struct decoders (F1 2020 - 2025 auto-detect)│
│   • Packet types: Motion, Telemetry, Lap, Session,     │
│     Car Status, Car Damage, Session History, Setups    │
│   • Socket.IO real-time emission (port 3001)           │
└──────────────────────────┬─────────────────────────────┘
                           │ Socket.IO Stream
                           ▼
┌────────────────────────────────────────────────────────┐
│             APX-IQ EDGE WORKSTATION (UI)               │
│   • Zustand store (`useTelemetryStore`)                │
│   • 60 FPS RAF scheduler (`RafScheduler`)              │
│   • AMOLED Steering MFD · 4-Corner Thermals · MoTeC    │
└────────────────────────────────────────────────────────┘
```

#### Starting the Local Ingestion Bridge
From the root of the repository:
```bash
python run_ingestion.py
```
*The service listens on `0.0.0.0:20777` (UDP) and hosts the WebSocket relay on `http://localhost:3001`.*

---

## 3. Workstation UI & Cockpit Feature Tour

### 1. Pit Wall Standby & Telemetry Honesty Contract
- **Standby by Default**: When launched, the workstation initializes in a clean, stationary **0.00s Pit Wall Standby** state.
- **Telemetry Provenance Badging**:
  - **`LIVE` (Green)**: Active real-time UDP stream from a connected F1 game.
  - **`SIM` (Amber)**: High-fidelity synthetic benchmark lap (Monaco, Silverstone, Spa, Monza) for offline testing.

### 2. AMOLED Steering Wheel Multifunction Display (MFD)
- **Central LCD**: Gear indicator, speed (KPH), delta LEDs, lap time, ERS battery storage (MJ / %), and fuel remaining (kg / laps).
- **Active Rotary Knobs**:
  - **STRAT**: Engine mixture & deployment strategy (Modes 1 to 12).
  - **HPP**: High Performance Powertrain mapping (Modes 1 to 8).
- **Interactive Buttons**:
  - **DRS**: Drag Reduction System override flap indicator.
  - **OT**: Overtake boost actuator.
  - **PIT**: Pit lane speed limiter with audio pulses.
  - **RAD**: Team radio communication with synthetic race engineer voice comms.

### 3. 4-Corner Chassis & Tyre Thermal Matrix
- **Dual-Layer Thermal Physics**:
  - **SURF**: Outer tread surface temperature (°C).
  - **CORE**: Inner carcass core temperature (°C).
- **Brake Rotor Saturation**: Real-time brake disc thermal glow and warning flags (>800°C).
- **Tyre Pressures & Wear**: PSI operating windows and dynamic compound degradation curves (Pirelli Soft, Medium, Hard, Intermediate, Wet).

### 4. MoTeC Distance-Domain Telemetry Ribbon
- Multi-channel synchronized traces: Speed, Throttle, Brake, Gear.
- Interactive scrub cursor: Click anywhere along the distance axis to freeze and inspect exact track coordinates.
- Corner apex quick-jumps: Sainte Dévote (`T1`), Casino Square (`T4`), Mirabeau (`T7`), Nouvelle Chicane (`T11`), La Rascasse (`T14`).

### 5. Mission Control (Post-Session Engineering)
- **FastF1 Ghost Benchmarking**: Compare your lap telemetry against official pole-position reference laps (Verstappen, Hamilton, Leclerc).
- **Pedal Dynamics Matrix**: Micro-second throttle pick-up and braking transition delta curves.
- **Mechanical Setup Optimizer**: Anti-roll bars, suspension heights, camber, and wing angle tuning.
- **AI Race Engineer Debrief**: Automated debriefs with corner-by-corner apex delta analysis and setup recommendations.

---

## 4. Keyboard Shortcuts & Actuator Keymap

| Key / Hotkey | Action | Scope |
| :--- | :--- | :--- |
| **`Spacebar`** | **Play / Pause Telemetry** | Cockpit HUD / Replay |
| **`⌘K` / `Ctrl+K`** | **Open Command Palette** | Platform-Wide |
| **`?` / `F1`** | **Open Platform Guide & Architecture** | Platform-Wide |
| **`C`** | **Open F1 Game Connection Wizard** | Cockpit HUD |
| **`⇧1` / `⇧2` / `⇧3`** | **Navigate**: Cockpit HUD / Mission Control / Observability | Platform-Wide |
| **`1` / `2` / `3` / `4`** | **Switch DDU Mode**: Race / Qualy / Tyres / Chassis | Steering MFD |
| **`M`** | **Cycle Motion Level**: Full / Reduced / Off | Accessibility |
| **`D`** | **Toggle UI Density**: Comfortable / Compact | Workstation Layout |
| **`T1` - `T14`** | **Seek Corner Apices** | MoTeC Ribbon |
| **`0.5x` - `5x`** | **Adjust Playback Speed** | Replay Engine |

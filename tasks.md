# APX-IQ Motorsport Visual Shaders & Animations — Implementation Tasks

## Phase 1: Command Portal (Home `/`) Animations & Interactions
- [x] **Task 1.1: Stage Selector Liquid Sliding Pill (`layoutId`)**
  - File: `ui/src/app/page.tsx`
  - Implement Framer Motion `layoutId="activeStageHighlight"` for a smooth gliding frosted amber pill beneath the active tab with spring damping.
- [x] **Task 1.2: Hero Title Carbon Sheen Light Sweep**
  - File: `ui/src/app/page.tsx` & `ui/src/app/globals.css`
  - Add specular shimmer gradient sweep across "REAL-TIME MOTORSPORT TELEMETRY & STRATEGY OS".
- [x] **Task 1.3: 3D Car Viewport Gyroscopic Cursor Parallax**
  - File: `ui/src/components/telemetry/CarDigitalTwin3D.tsx`
  - Subtle mouse pitch/yaw camera offset via `useFrame` with lerp damping (±2.5° range).
- [x] **Task 1.4: Monaco Lap Tour Spline Telemetry Dot & Breadcrumb Markers**
  - File: `ui/src/components/home/MonacoLapTour.tsx`
  - Smooth tracking orb with animated purple/green micro-sector breadcrumbs and spring tooltips.

---

## Phase 2: Cockpit HUD (`/dashboard`) Avionics & Thermal Micro-Interactions
- [x] **Task 2.1: AMOLED DDU Ignition Self-Test Boot Sequence**
  - File: `ui/src/components/cockpit/CentralTelemetry.tsx`
  - 600ms diagnostic startup: outer collar halo, 7-segment gear/speed `888` cycling, bus self-test indicators, then settling into live telemetry.
- [x] **Task 2.2: RPM Limiter Strobe & Cockpit Edge Bloom**
  - File: `ui/src/components/cockpit/CentralTelemetry.tsx`
  - 15Hz high-contrast LED strobe when RPM > 11,800 / redline + ambient peripheral edge bloom on inner screen bezel.
- [x] **Task 2.3: 4-Corner Incandescent Brake Disc Thermal Glow**
  - File: `ui/src/components/cockpit/RaceCarTelemetry.tsx`
  - Multi-stop incandescent gradient (white-hot core to orange-red halo) with SVG gaussian blur bloom filter and dynamic flare on heavy deceleration.
- [x] **Task 2.4: Tactical Battle Radar Ping Sweep & DRS Beacon**
  - File: `ui/src/components/cockpit/BattlePanel.tsx`
  - 360° rotating radar sweep beam with phosphor fade + expanding beacon ring when rival is in DRS range (<1.0s), plus sliding Framer Motion tab pill.
- [x] **Task 2.5: Spring-Damped MoTeC Telemetry Crosshair**
  - File: `ui/src/components/cockpit/TelemetryRibbon.tsx`
  - Spring-damped cursor interpolation with gold bloom halo line for silky MoTeC inspection.

---

## Phase 3: Mission Control (`/dashboard/intelligence`) Visuals
- [x] **Task 3.1: FastF1 Ghost Lap "Ghost Wave" Sweep**
  - File: `ui/src/components/intelligence/TelemetryDeltaChart.tsx`
  - Laser sweep across the distance graph with trailing phosphor cyan wave polygon and glowing particle head following ghost telemetry.
- [x] **Task 3.2: Dynamic Differential Shading (Split Delta Fill)**
  - File: `ui/src/components/intelligence/TelemetryDeltaChart.tsx`
  - Continuous quad-polygon differential fill between User and Ghost speed traces with dynamic emerald gradient (ahead) and crimson gradient (behind).
- [x] **Task 3.3: AI Debrief Teletype Radio Stream**
  - File: `ui/src/components/intelligence/AiEngineerBriefingBox.tsx`
  - Real-time typewriter character stream with blinking terminal block cursor and pit wall team radio roger squelch audio.

---

## Phase 4: Observability (`/debug`) & System Polish
- [x] **Task 4.1: UDP Datagram Ingestion Heartbeat Spark**
  - File: `ui/src/app/debug/page.tsx`
  - Emerald pulse ring with animated beacon ping and glowing datagram badge on port 20777 packet reception.
- [x] **Task 4.2: Zustand Store State Variable Diff Flash**
  - File: `ui/src/app/debug/page.tsx`
  - Subtle 200ms amber flash on modified state variables with a dynamic `DIFF: [key]` update badge in the JSON inspector.

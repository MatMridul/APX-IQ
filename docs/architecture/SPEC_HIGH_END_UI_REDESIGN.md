# APX-IQ — High-End UI Elevation & Workstation Redesign Specification
**Document Version:** 2.0.0  
**Status:** APPROVED FOR IMPLEMENTATION  
**Branch:** `feature/high-end-ui-redesign`  
**Target Identity:** Tier-1 Formula 1 Telemetry Workstation (McLaren Applied ATLAS + MoTeC i2 Pro + Linear/Apple Pro Haptic Precision)  

---

## 1. Vision & Architectural Philosophy

### 1.1 The Core Mission
Transform APX-IQ from a visual dashboard into an **industry-defining, museum-grade motorsport engineering workstation**. The interface must deliver the razor-sharp operational authority of trackside telemetry tools used by Mercedes AMG F1 and Ferrari, blended with the tactile ergonomics and micro-motion polish of modern luxury software (Linear, Apple Pro, Raycast).

### 1.2 The Hybrid Stack Architecture
To achieve 60 FPS live telemetry while retaining accessible, fluid interactive components:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          APX-IQ HYBRID HIGH-PERFORMANCE UI STACK                       │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ TIER A: SHADCN / RADIX PRIMITIVES         │ TIER B: RAF HARDWARE CANVAS 2D             │
│ (App Shell, Overlays, Power-User Controls)│ (High-Frequency 60Hz Telemetry Pipelines)  │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • cmdk / Command Dialog (Cmd+K navigation)│ • 60 FPS Telemetry Ribbon (Direct 2D path) │
│ • Radix Tabs (DDU & Workstation switchers)│ • Live GPS Circuit Radar (Yaw & heatmaps)  │
│ • Radix Sliders (Mechanical setup matrix) │ • 15-LED Progressive Shift Lights          │
│ • Radix Tooltips & Contextual Popovers    │ • Dynamic Carbon-Ceramic Incandescent Glow │
│ • Radix Dialogs (Full Technical Debriefs) │ • Zero React Re-Renders per frame          │
│ • Framer Motion spring physics            │ • Direct mutable Zustand / DOM ref updates │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Design Tokens, Materiality & Typography

### 2.1 The Materiality Palette (Matte Obsidian & Titanium Precision)
*Ruthlessly eliminates gamer RGB neon glow in favor of calibrated industrial instrumentation.*

| Token Name | Hex / CSS Value | Semantic Role |
| :--- | :--- | :--- |
| `--color-obsidian-950` | `#050608` | Deepest OLED viewport background |
| `--color-carbon-900` | `#0B0C10` | Outer double-bezel panel shell |
| `--color-carbon-800` | `#13151B` | Inner core instrument card background |
| `--color-titanium-border`| `rgba(255, 255, 255, 0.08)` | Hairline 1px precision separation lines |
| `--color-titanium-bevel` | `rgba(255, 255, 255, 0.04)` | Inset 1px light reflection line |
| `--color-gold-f1` | `#C5A880` / `#D4AF37` | Metallic champagne telemetry accents (muted, anti-slop) |
| `--color-cyan-ghost` | `#06B6D4` / `#38BDF8` | Official FastF1 reference ghost benchmark curve |
| `--color-signal-go` | `#22C55E` | DRS active, throttle application, green delta split |
| `--color-signal-caution` | `#F59E0B` | Brake engagement, cautionary thermal thresholds |
| `--color-signal-stop` | `#EF4444` | Heavy braking threshold, lockups, time loss |
| `--color-signal-purple` | `#A855F7` | Fastest in-game personal best sector / delta |

### 2.2 Typography Scale & Monospace Discipline
- **Primary Technical Monospace**: `JetBrains Mono` / `Geist Mono` (`tabular-nums font-mono`).
- **Primary Interface Sans**: `Inter` / `Geist Sans` (`font-sans tracking-tight`).
- **Telemetry Display**: `Rajdhani` / `Barlow Condensed` (`font-display font-black`).
- **Mathematical Hierarchy**:
  - `text-[9px] font-mono tracking-[0.18em] uppercase text-neutral-400` $\rightarrow$ Micro-labels & engineering units.
  - `text-[11px] font-mono font-bold text-neutral-200` $\rightarrow$ Secondary sensor parameters.
  - `text-xs md:text-sm font-semibold text-white` $\rightarrow$ Card titles and navigation.
  - `text-2xl md:text-4xl font-mono font-black tabular-nums tracking-tighter` $\rightarrow$ Primary telemetry channels (Speed, RPM, Gear, Delta).

### 2.3 The "Double-Bezel" (Doppelrand) Hardware Architecture
Every major instrument panel is built with physical hardware layering:
1. **Outer Shell**: `p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.9)]`.
2. **Inner Core**: `p-3 rounded-[calc(1rem-0.25rem)] bg-[#0A0B0E] border border-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]`.

---

## 3. Surface-by-Surface Elevation Plan

### Surface 1: Universal Workstation Navigation (`StatusBar.tsx`)
- **Elevation**: A floating, detached glass capsule top bar with embedded 1-click workstation switcher:
  - `[ ⊞ COCKPIT HUD ]` $\rightarrow$ `/dashboard` (60Hz live driver & chassis telemetry)
  - `[ ⚡ MISSION CONTROL ]` $\rightarrow$ `/dashboard/intelligence` (FastF1 ghost benchmarking & debrief)
  - `[ 📟 OBSERVABILITY ]` $\rightarrow$ `/debug` (Socket.IO packet inspector & store tree)
- **Live Pills**: Active weather, air/track temperatures, safety car status, FIA flags, and session clock.

### Surface 2: Cockpit HUD & DDU Multi-Mode Engine (`CentralTelemetry.tsx`)
- **Elevation**: Transform the central cluster into an interactive Cosworth / Bosch DDU with 4 switchable display modes:
  - **`[RACE]`**: Giant gear, ground speed, continuous $\Delta t$ delta bar, ERS battery SoC %, and fuel remaining.
  - **`[QUALY / PUSH]`**: Sector delta split chips (S1, S2, S3), RPM progression curve, suggested gear shift cues, and DRS readiness.
  - **`[TYRES & BRAKES]`**: 4-corner hot inflation PSI, core carcass thermal window, brake fluid headroom, and lockup alerts.
  - **`[CHASSIS & FORCES]`**: 4-corner dynamic suspension travel ($mm$), wheel slip ratio %, and G-G lateral/longitudinal acceleration vector.

### Surface 3: Kinetic Cross-Widget Synchronization
- **Elevation**: Scrubbing or hovering the `TelemetryRibbon` or Mission Control chart synchronously:
  1. Glides the **GPS track car marker & heading chevron** to that exact meter on the circuit map.
  2. Updates the **4-corner tyre pods** to reflect the exact thermal load and incandescent brake disc glow at that corner entry.
  3. Displays the exact **$\Delta t$ gap vs reference ghost** at that specific apex.

### Surface 4: Mission Control — MoTeC i2 5-Tier Strip Recorder & Consolidated AI Pit Wall
- **Elevation**:
  - **5-Tier Synchronized MoTeC Strip Chart**: Speed (User vs Ghost), $\Delta t$ continuous curve (red loss / purple gain), Throttle & Brake line pressure, Steering angle & Lateral G, Powertrain (Gear, RPM, DRS).
  - **Clickable Apex Radar Nodes**: Clicking Turn 1, Turn 3, Turn 4 on the circuit map snaps the workstation to that exact corner apex and displays the corner breakdown matrix ($V_{min}$, braking point, throttle pickup latency).
  - **Consolidated AI Pit Wall Radio**: Merges fragmented debrief boxes into a single tactical race engineer briefing console with 1-click "Inspect on Telemetry" jump buttons and PDF/Markdown export.

### Surface 5: Global Power-User Ergonomics (`Cmd+K` Command Palette)
- **Elevation**:
  - `Cmd+K` / `Ctrl+K` modal to search tracks, reference drivers, telemetry channels, and session years.
  - Hotkey engine: `Space` (Play/Pause sweep), `←`/`→` (Step 10m/100m), `1`/`2`/`3` (Snap to S1/S2/S3), `Z`/`X` (Zoom in/out).

---

## 4. Verification & Acceptance Criteria

1. **Visual Stability**: Zero layout jumping (`translateY`) on panel hover.
2. **Performance**: Consistent 60 FPS animation loop with `< 0.05ms` store dispatch time.
3. **Type Safety & Build**: `npx tsc --noEmit` = 0 errors; `npm run build` = 100% clean.
4. **Honesty Contract**: All live vs demo signals strictly respect `<SourceBadge source="LIVE" | "SIM" />`.

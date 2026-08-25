# APX IQ User Stories & Information Architecture

> Source of truth for navigation and page intent. Every route must trace
> to a story here. Updated 2026-08-25 (pre-redesign baseline).

## Personas

### 1. The Engineer (driver coaching, live)
Watches live telemetry while driving or immediately after a stint.
Wants: instant, glanceable car state — speed, gear, RPM shift points,
tyre state, track position — with zero latency and zero clutter.

### 2. The Strategist (analysis, post-session)
Sits on the pit wall comparing laps against ghosts and history.
Wants: delta charts, ghost-lap selection, AI debriefs, setup levers,
progression trends. Latency-tolerant, depth-hungry.

### 3. The System Operator (platform health)
Wants: socket health, packet flow, backend status, raw payloads.
Debug-grade honesty over aesthetics.

## Routes (single source of truth)

| Route | Persona | Page | Status |
|---|---|---|---|
| `/` | all | Landing — role portals + live pulse | redesigning |
| `/dashboard` | Engineer | Live cockpit | visual redesign pending; wiring pending |
| `/dashboard/intelligence` | Strategist | Mission Control (delta, ghosts, debriefs) | styled; data = synthetic path pending wiring |
| `/debug` | Operator | Raw socket/telemetry inspector | done (honest by design) |

## Acceptance criteria

- [ ] Every portal on `/` leads to a DISTINCT route matching its persona.
- [ ] Portals are always visible — never conditionally removed by data state.
- [ ] No numeric value is displayed unless it comes from the live stream
      (or is explicitly badged `SIM` / `SYNTHETIC`).
- [ ] Every page consumes design tokens only (see `ui/src/design/README.md`);
      zero raw hex outside token files.
- [ ] Keyboard-reachable portals; focus-visible rings.

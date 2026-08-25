# APX IQ — Motion & Animation Spec

> Part of the design system. Source rules: `design/README.md`.
> Philosophy: **motion is information**. Every animation must encode a state
> change, guide attention, or smooth a physical quantity. Decorative motion
> is a bug. Racing tools feel *mechanical and precise* — no bounce, no
> elastic, no spring overshoot.

---

## 1. The prime directive: "Numbers snap, physics flows"

| Content type | Motion | Why |
|---|---|---|
| Discrete readouts (speed, RPM, gear value) | **Instant swap**, tabular numerals | Tweening a live number lies about freshness and is unreadable at 60 Hz |
| Continuous quantities (delta bar, trails, needles, LEDs) | **Interpolated every frame** (lerp in the render loop) | These are physical — the car is never teleporting |
| Discrete state changes (sector done, flag, position) | **Short CSS transition** (150–300 ms) | Acknowledge the event, then get out of the way |

## 2. Two animation domains — never mix them

### Domain A — Canvas render loop (data motion, 60 fps)
Driven by the existing rAF flush in `useTelemetry` → store. **React never
re-renders for these.** Instruments: shift LEDs, delta bar, track-map car +
trail, telemetry ribbon scroll, needle sweeps, temp-color lerps.

Rules:
- Single shared rAF scheduler; each instrument registers a draw hook.
- Lerp with frame-rate-independent factor: `v += (target - v) * (1 - exp(-k*dt))`.
- Deadbands/hysteresis near thresholds (LED red-zone: enter 90%, exit 85%).
- **Min/max column decimation** for ribbon traces; spikes survive.

### Domain B — DOM/CSS motion (discrete events & chrome)
CSS transitions/keyframes; framer-motion only where layout animates
(insight-chip reorder via FLIP). Everything else: opacity/transform only
(compositor-friendly, never animate layout properties).

## 3. Instrument-by-instrument inventory

### Shift-light engine (LED strip)
- Progressive fill G→G→R→B mapped to RPM between configured start/end.
- **Limiter**: synchronized full-strip flash (~8 Hz square wave), entered
  with hysteresis; doubles as pit-limiter / flag flasher (amber flash on
  yellow flag, per broadcast convention).
- **Upshift moment**: 120 ms full-strip white blink + reset to the new
  gear's baseline. The single most satisfying beat in the UI — protect it.

### Gear digit
- Swap: old digit scales 1→0.92 + fades (80 ms), new digit 1.06→1 (120 ms,
  standard easing). Downshift under braking: digit flashes gold once.

### Delta-to-best bar
- Bar length lerps every frame; color crossfades signal-go/signal-stop
  across zero over 150 ms. Sector complete: one pulse ring at the bar head.
- Numeric readout next to it: snaps (prime directive), bar flows.

### Track map
- Car dot: heading-rotated, sub-frame interpolated between packet updates.
- **Trail**: last ~6 s of positions as fading polyline (alpha ramp) —
  the "living circuit" effect, drawn in the canvas loop.
- Sector completion: color-wipe along the sector segment (300 ms), then
  the sector chip updates (Domain B).
- Cursor sync with ribbon: cursor position eased (k≈14/s), never teleports.

### Telemetry ribbon
- Scroll is data-driven (canvas redraw per frame) — no CSS.
- Crosshair: eased follow on hover; snaps to nearest sample on release.
- Full-throttle/full-brake moments get a 1px brighter edge on the lane —
  preattentive highlight, zero extra UI.

### Status bar
- Flag chip: slide-in + single border flash; persists while active.
- Race-control messages: slow ticker, pauses on hover, 4 s hold per item.
- Session clock: continuous tabular digits — never re-layouts.

### Thermal car view
- Tyre/brake colors: lerped in canvas (same ramp as legend — one meaning).
- Brake-temp bars: smooth fill; crossing the over-temp threshold fires a
  single pulse.
- Compound + age badges: static; age increments get a 150 ms flip.

### Battle panel & insight chips
- Gap values: direction arrow + color flip on sign change; value snaps.
- Position change: broadcast-style outline flash on the row (300 ms).
- New insight chip: slide-in from right + single gold border pulse;
  list reorder via FLIP (framer-motion), 200 ms.

### Page & panels
- Mount: staggered fade-up, 40 ms stagger, once per navigation (not on
  every data render).
- Panel hover: existing `-translate-y-0.5` + border lift (already tokened).
- Density toggle: 200 ms grid transition; fallback = instant.

## 4. Global constraints

- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for UI; **linear** for
  data-interpolated motion (physical truth). Durations: 80 / 150 / 300 ms.
  Nothing exceeds 400 ms except flag wipes.
- **`prefers-reduced-motion`**: mandatory — sweeps/trails/flashes degrade
  to opacity-only; limiter flash becomes steady state. Plus an in-app
  **Motion: Full / Reduced / Off** toggle beside the density toggle
  (Off = instant states everywhere; LEDs still fill, nothing flashes).
- **Frame budget**: all Domain-A work ≤ 2 ms/frame (measured, per the
  rendering research); decimation keeps it constant regardless of rate.
- **No animation** for: raw numeric readouts, scroll position, focus rings
  (instant), and nothing at all during `STEALTH_MODE`.

## 5. Review hook

Playwright gallery (Phase 3) captures before/after stills for state
changes; motion itself is reviewed live against the simulator — the
gallery proves layout, the sim proves motion.

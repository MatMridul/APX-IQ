# APX-IQ Frontend — Design Specification (FROZEN)

> Status: DRAFT v1 (freeze on Mridul sign-off) · Owner: Mridul · Last updated: 2026-09-19
> Companion docs: [`PRD.md`](./PRD.md) · [`TRD.md`](./TRD.md)
> This is the visual contract. Once frozen, changes require a documented decision.

---

## 1. Design thesis

**A broadcast-grade, FIA-timing-grade race engineer's workbench.** Every screen should read like
an F1 pit-wall display or a MoTeC data screen — carbon and gold, monospace tabular numerals,
preattentive color coding, zero decorative noise. Both audits independently rated this thesis
8–9/10 and "not AI slop." The design job is to protect and complete it, not reinvent it.

### 1.1 Prime directive: "Numbers snap, physics flows"
Two animation domains, never mixed:
- **Domain A (Canvas, 60 Hz):** shift LEDs, needle sweeps, track-map car+trail, telemetry ribbon.
  Frame-rate-independent lerp. React never re-renders.
- **Domain B (DOM/Framer, discrete events):** gear-change scale pop (120 ms), sector-complete
  border flash, insight FLIP reorder, portal hover, debrief drawers.

### 1.2 Human-factors principles (ADOPTED from Antigravity, PRD §6.1)
These are design *principles*, applied to existing data only:
- **Flow-state preservation:** the live cockpit communicates through preattentive primitives
  (color/position/shape). No layout shift, no dense tables, nothing that forces conscious parsing
  mid-lap.
- **Loss-aversion phrasing:** delta insights framed as loss ("bleeding 0.24s in T4") not neutral
  numbers — a copy rule, no new data.
- **Dopamine on real events:** micro-glow on delta zero-cross, thermal color shifts, purple-sector
  flash — all driven by data we already have.
- Explicitly NOT adopted: mastery rings, trophies, habit loops, retention mechanics (PRD §6.2/6.3).

---

## 2. Color tokens (SINGLE SOURCE — `design/system.ts` + globals.css @theme)

`lib/theme/colors.ts` (`apxColors`) is RETIRED. These values win on any drift.

| Token | Value | Meaning |
| :--- | :--- | :--- |
| `gold` | `#cfa349` | Brand accent, active chrome, **user** telemetry trace |
| `goldDark` | `#bf953f` | Gradient start |
| `goldLight` | `#fcf6ba` | Gradient end, metallic hero |
| `silver` | `#9fa6b2` | Secondary text, labels, **ghost** reference trace |
| `carbon` | `#1c1f24` | Panel background |
| `carbonLight` | `#252930` | Raised panel |
| `black` | `#0b0b0d` | Base canvas |
| `signalGo` | `#22c55e` | Improvement, green sector, throttle, DRS available |
| `signalCaution` | `#eab308` | Warning, yellow sector, **speed** trace |
| `signalStop` | `#ef4444` | Critical, red sector, brake trace |
| `signalPurple` | `#a855f7` | Session best — F1 convention, ONLY use |
| `signalEnergy` | `#c8ccd4` | ERS/SoC neutral metallic |

### 2.1 Channel colors — ONE meaning everywhere (MoTeC rule)
`speed=#eab308 · throttle=#22c55e · brake=#ef4444 · steering=#a855f7 · ghost=#e8e8ec · gearTick=#9fa6b2`.
A chart draws a channel in exactly this color or not at all.

### 2.2 Pirelli compound colors (ADOPTED addition — realism, no product change)
`SOFT #ef4444 · MEDIUM #eab308 · HARD #ffffff · INTER #22c55e · WET #3b82f6`.
Note: HARD white and INTER green collide with signal colors — compound swatches are only used in an
explicit "compound" context (tyre badge), never on a signal surface.

---

## 3. Typography
- **Numeric telemetry:** `font-mono tracking-tight tabular-nums` — mandatory, prevents layout shift
  during high-frequency updates.
- **HUD micro-labels:** `text-[10px] font-mono uppercase tracking-[0.14em] text-silver/65`
  (per `MicroLabel` primitive — the canonical spec; Antigravity's 9px/0.18em is rejected in favor
  of the existing 10px/0.14em standard to keep one rule).
- **Hero display:** `font-display` (Rajdhani), bold.

## 4. Panel chrome (SINGLE PRIMITIVE)
Canonical recipe (from `f1/primitives/Panel` visual, unified into cockpit primitives):
carbon bg · `border rgba(191,149,63,0.3)` · 2px radius · top gold shimmer line · 4 gold corner
accents (`w-2 h-2 border-gold/30`) · optional header (`MicroLabel` title + status dot) · faint dot
texture (`opacity-0.03`). All panels use this; no per-component variants.

---

## 5. Data-honesty visual contract (P0)
Every panel with data-bound values shows a source indicator:
- **LIVE** — gold `LIVE` chip, panel border at full gold.
- **SIM** — existing `SimBadge` (caution-yellow "SIM"), title "Driven by the demo signal generator."
- **NO SIGNAL** — existing `NoSignal` em-dash + micro-label; no fabricated value ever.

`NO_SIGNAL = "—"`. This contract is non-negotiable and applies to all routes including `/debug`.

---

## 6. Route-by-route design intent

### `/` Landing
- Standby state when no telemetry (fixes the "void"): idle gauges at 0 / `N` / `IDLE_STANDBY`,
  optional demo toggle — badged SIM. No collapsed DOM.
- Portal cards carry **honest** capability chips (real specs only; no aspirational claims).

### `/dashboard` Live cockpit
- Layout per current 3-column grid (thermals | wheel+ribbon | trackmap+battle+insight). Preserve it.
- Source badge per panel (§5). Cockpit reads `useLiveOrDemo()`.
- Ghost delta overlay on ribbon (dotted silver, `ghost` channel color) when session-best exists.

### `/dashboard/intelligence` Mission Control
- Delta chart driven by real lap data; **physics-plausible** waveform (braking cliffs, throttle
  steps, gearshift notches) — applies to both real render and demo fallback.
- AI debrief = real structured coaching feed; keep measured-vs-heuristic impact distinction visible.
- Debrief expand uses a drawer/modal so columns stay balanced (no 1800px center vs 600px sides).

### `/debug`
- Restyle onto carbon/gold tokens + `MicroLabel`. Report **true** connection/rate/latency.
- Never show a fabricated "connected" state (the Antigravity mock's cardinal sin).

---

## 7. Motion tokens
- Easing: UI `cubic-bezier(0.4,0,0.2,1)`; data `linear`.
- Durations: `fast 80ms · base 150ms · slow 300ms`.
- Respect the in-app `MOTION: FULL / REDUCED / OFF` switch — REDUCED limits to opacity, OFF disables
  flashes. Any adopted dopamine glow / audio cue MUST honor this switch.

## 8. Accessibility
- WCAG AA contrast on all text over carbon (verify gold-on-carbon meets AA at label sizes).
- Motion-reduction honored (§7). No information conveyed by color alone — pair with
  position/shape/label (already the preattentive design intent).

## 9. Frozen decisions (change requires a logged decision)
1. Visual thesis = broadcast/MoTeC race-engineer workbench. Not reinvented.
2. One token source (`system.ts`), one panel primitive, one micro-label rule (10px/0.14em).
3. Data-honesty contract (§5) is mandatory on every route.
4. Psychology adopted as human-factors principle only; retention/engagement mechanics rejected.
5. `demo.ts` is a sanctioned, badged offline fallback — not a stopgap to remove.

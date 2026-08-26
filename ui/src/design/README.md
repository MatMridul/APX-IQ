# APX IQ Design System

One design file to rule them all. Any new page/component **must** consume
these tokens — raw hex values outside `globals.css` / `system.ts` are a
code-review rejection.

## Sources of truth

| Layer | File | Use |
|---|---|---|
| Tailwind tokens (classes) | `src/app/globals.css` → `@theme` | JSX classNames: `text-gold`, `bg-carbon`, `border-gold/40`, `font-display`… |
| Programmatic tokens | `src/design/system.ts` | SVG fills, canvas paints, chart libs |
| Legacy HSL vars | `globals.css` `:root` | inline `hsl(var(--color-apx-*))` only — do not extend |

## Palette

**Theme lock (D6): Black · Carbon · Silver · Gold + FIA signal semantics + team liveries (data only) + white.**
No blue/cyan/emerald/orange outside the exceptions below. Any new color
must map to an existing token or the PR is rejected.

| Token | Hex | Intent |
|---|---|---|
| `gold` | `#cfa349` | Brand accent, hero numerals, active states, USER trace |
| `silver` | `#9fa6b2` | Body text, secondary labels, GHOST trace |
| `carbon` / `carbon-light` | `#1c1f24` / `#252930` | Panel fills, hover lifts |
| `apx-black` | `#0b0b0d` | App background |
| `alert` | `#d72638` | Destructive, critical |
| `signal-go/caution/stop` | green/amber/red | Sector & status semantics (FIA) |
| `signal-purple` | `#a855f7` | **Session-best only** (F1 convention) |
| `signal-energy` | `#c8ccd4` | ERS/SoC — neutral metallic, never blue |
| `LED_RAMP.blue` | `#3b82f6` | **Sanctioned exception**: shift-light ramp only (real F1 wheel hardware runs G→R→B) |
| Team colors (HAM red, LEC yellow…) | liveries | Data semantics — chips only, never chrome |

Trace discipline: ghost = white/silver, user = gold, throttle = green,
brake = red, speed = yellow. One meaning per channel, everywhere.

## Typography

- **Display numerals**: `font-display` (Rajdhani) — lap times, speed.
- **Data/mono**: `font-mono` (JetBrains Mono) — telemetry, labels, code.
- **Micro-labels**: 10px · mono · uppercase · `tracking-[0.14em]` · silver.
- Body: `font-sans` (Inter). Tabular numerals everywhere data ticks.

## Panel chrome

Use `.apx-panel` (carbon fill + hairline gold border + top-edge shine).
Radius scale: `rounded` (2px) panels · `rounded-lg` (8px) inner cards ·
`rounded-full` pills. Elevation via `shadow-panel` token, never ad-hoc.

## Honesty contract

Absent data renders as `—` (see `NO_SIGNAL`) with a muted `NO SIGNAL`
micro-label — **never** a plausible-looking number. Simulated/synthetic
content is always badged `SIM` / `SYNTHETIC`.

## Motion

Full spec: [`MOTION.md`](MOTION.md). Prime directive: **numbers snap,
physics flows** — discrete readouts swap instantly; continuous quantities
(delta bar, trails, LEDs) interpolate in the canvas render loop; discrete
events get 80/150/300 ms transitions. Easing `cubic-bezier(0.4,0,0.2,1)`
for UI, linear for data. `prefers-reduced-motion` + an in-app Motion
Full/Reduced/Off toggle are mandatory. No bounce, no elastic — mechanical
and precise.

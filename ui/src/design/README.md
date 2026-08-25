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

| Token | Hex | Intent |
|---|---|---|
| `gold` | `#cfa349` | Brand accent, hero numerals, active states |
| `silver` | `#9fa6b2` | Body text, secondary labels |
| `carbon` / `carbon-light` | `#1c1f24` / `#252930` | Panel fills, hover lifts |
| `apx-black` | `#0b0b0d` | App background |
| `alert` | `#d72638` | Destructive, critical |
| `signal-go/caution/stop/purple` | green/amber/red/purple | Sector & status semantics (F1 broadcast convention) |

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

One easing family `cubic-bezier(0.4, 0, 0.2, 1)`; durations 150/300ms.
`animate-pulse-gold` reserved for live indicators. No bounce.

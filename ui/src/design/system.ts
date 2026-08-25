/**
 * APX IQ Design System — programmatic tokens
 *
 * SOURCE OF TRUTH for Tailwind classes: `src/app/globals.css` @theme.
 * This file mirrors tokens for contexts where classes can't apply
 * (SVG fills, canvas paints, chart libraries). Keep both in sync —
 * a mismatch is a design-system bug.
 *
 * Rules:
 *  - No raw hex anywhere else in the app. Import from here.
 *  - Prefer Tailwind token classes in JSX; use this file only when
 *    a library needs literal values.
 */

export const COLOR = {
  gold: "#cfa349",
  goldDark: "#bf953f",
  goldLight: "#fcf6ba",
  silver: "#9fa6b2",
  carbon: "#1c1f24",
  carbonLight: "#252930",
  black: "#0b0b0d",
  alert: "#d72638",

  // Semantic signals (broadcast conventions)
  signalGo: "#22c55e", // improvement, green sector, DRS available
  signalCaution: "#eab308", // yellow sector, warnings
  signalStop: "#ef4444", // red sector, critical
  signalInfo: "#3b82f6", // purple sector uses #a855f7 below
  signalPurple: "#a855f7",

  // Telemetry traces
  traceGhost: "#22d3ee",
  traceUser: "#3b82f6",
  traceThrottle: "#22c55e",
  traceBrake: "#ef4444",
  traceSpeed: "#eab308",
} as const;

export const FONT = {
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
  display: "var(--font-display)",
} as const;

/** Micro-label convention: 10px, mono, uppercase, wide tracking. */
export const LABEL_STYLE = {
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
} as const;

/** Panel chrome recipe — use .apx-panel class; these are the raw values. */
export const PANEL = {
  bg: "hsl(var(--color-apx-carbon))",
  border: "rgba(191, 149, 63, 0.3)",
  radius: 2,
} as const;

/** Absent-data display contract (honesty rule). */
export const NO_SIGNAL = "—" as const;

/**
 * Shift-light ramp — 15 LEDs, F1 convention (green → red → blue).
 * Contrast matters more than hue (McLaren electronics interview);
 * these hues maximize distinction on carbon.
 */
export const LED_RAMP = {
  greens: 5,
  reds: 5, // indices 5-9 (blues are the rest)
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  white: "#f8fafc",
  unlitAlpha: 0.13,
  limiterEnterPct: 0.97,
  limiterExitPct: 0.9, // hysteresis — no flicker at the edge
  limiterFlashHz: 8,
  upshiftBlinkMs: 120,
} as const;

/**
 * Channel colors — ONE meaning per channel everywhere (MoTeC rule).
 * If a chart draws throttle, it uses this exact color or nothing.
 */
export const CHANNEL = {
  speed: "#eab308",
  throttle: "#22c55e",
  brake: "#ef4444",
  steering: "#a855f7",
  ghost: "#22d3ee",
  gearTick: "#9fa6b2",
} as const;

/** Motion tokens (see design/MOTION.md). */
export const EASING = {
  ui: "cubic-bezier(0.4, 0, 0.2, 1)",
  data: "linear",
} as const;

export const DURATION = { fast: 80, base: 150, slow: 300 } as const;

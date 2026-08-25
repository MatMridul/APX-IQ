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

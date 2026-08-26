/**
 * APX IQ Design System - Component Variants
 * Reusable variant configs for components using class-variance-authority pattern
 */

/**
 * MetricValue size → text class mapping
 */
export const metricSizeVariants = {
  xs: 'text-base',
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-7xl',
  '2xl': 'text-9xl',
} as const;

/**
 * MetricValue color → text class mapping
 */
export const metricColorVariants = {
  white: 'text-white',
  gold: 'text-gold',
  red: 'text-alert',
  green: 'text-signal-go',
  silver: 'text-silver',
  yellow: 'text-signal-caution',
} as const;

/**
 * Badge/Status variant configs
 */
export const badgeVariants = {
  default: 'bg-white/10 text-silver border-white/10',
  gold: 'bg-gold/20 text-gold border-gold/30',
  success: 'bg-signal-go/15 text-signal-go border-signal-go/30',
  danger: 'bg-signal-stop/15 text-signal-stop border-signal-stop/30',
  warning: 'bg-signal-caution/15 text-signal-caution border-signal-caution/30',
} as const;

/**
 * Panel variants
 */
export const panelVariants = {
  default: 'bg-carbon border-white/5',
  highlight: 'bg-carbon border-gold/30',
  danger: 'bg-carbon border-red-500/30',
  success: 'bg-carbon border-green-500/30',
  ghost: 'bg-transparent border-white/5',
} as const;

/**
 * Bar gauge color → classes mapping
 */
export const gaugeColorVariants = {
  gold: {
    bar: 'bg-gold',
    glow: 'shadow-[0_0_20px_rgba(207,163,73,0.6)]',
  },
  green: {
    bar: 'bg-signal-go',
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.6)]',
  },
  red: {
    bar: 'bg-signal-stop',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
  },
  white: {
    bar: 'bg-white',
    glow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]',
  },
} as const;

/**
 * Sector time comparison colors
 * purple = personal best, green = improved, yellow = same, red = slower
 */
export const sectorColors = {
  personalBest: 'text-signal-purple',
  improved: 'text-signal-go',
  neutral: 'text-white',
  slower: 'text-signal-caution',
  invalid: 'text-silver/50',
} as const;

export type MetricSize = keyof typeof metricSizeVariants;
export type MetricColor = keyof typeof metricColorVariants;
export type BadgeVariant = keyof typeof badgeVariants;
export type PanelVariant = keyof typeof panelVariants;
export type GaugeColor = keyof typeof gaugeColorVariants;
export type SectorStatus = keyof typeof sectorColors;

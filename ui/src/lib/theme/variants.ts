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
  green: 'text-green-500',
  silver: 'text-silver',
  yellow: 'text-yellow-400',
  blue: 'text-blue-400',
} as const;

/**
 * Badge/Status variant configs
 */
export const badgeVariants = {
  default: 'bg-white/10 text-silver border-white/10',
  gold: 'bg-gold/20 text-gold border-gold/30',
  success: 'bg-green-500/15 text-green-400 border-green-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
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
    bar: 'bg-green-500',
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.6)]',
  },
  red: {
    bar: 'bg-red-600',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
  },
  blue: {
    bar: 'bg-blue-500',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]',
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
  personalBest: 'text-purple-400',
  improved: 'text-green-400',
  neutral: 'text-white',
  slower: 'text-yellow-400',
  invalid: 'text-silver/50',
} as const;

export type MetricSize = keyof typeof metricSizeVariants;
export type MetricColor = keyof typeof metricColorVariants;
export type BadgeVariant = keyof typeof badgeVariants;
export type PanelVariant = keyof typeof panelVariants;
export type GaugeColor = keyof typeof gaugeColorVariants;
export type SectorStatus = keyof typeof sectorColors;

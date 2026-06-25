/**
 * APX IQ Design System - Color Palette
 * Central source of truth for all colors across the application
 */

export const apxColors = {
  // Base Colors
  black: '#0B0B0D',
  carbon: '#1C1F24',
  carbonLight: '#252930',
  carbonDark: '#16181C',
  
  // Metallic Gold (Primary Accent)
  gold: '#CFA349',
  goldDark: '#bf953f',
  goldMid: '#b38728',
  goldLight: '#fcf6ba',
  goldDim: '#8B7335',
  
  // Neutral Tones
  silver: '#9FA6B2',
  silverLight: '#C5CBD3',
  silverDark: '#6B7280',
  white: '#FFFFFF',
  
  // Alerts & Status
  alert: '#D72638',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6',
  
  // Tyre Temperature Colors
  tyreBlue: '#3b82f6',      // Cold
  tyreGreen: '#22c55e',     // Optimal
  tyreYellow: '#eab308',    // Hot
  tyreRed: '#ef4444',       // Critical
  
  // Chart Colors
  chartSpeed: '#CFA349',    // Gold
  chartRPM: '#FFFFFF',      // White
  chartThrottle: '#22c55e', // Green
  chartBrake: '#ef4444',    // Red
  chartDRS: '#3b82f6',      // Blue
} as const;

/**
 * Tyre Temperature Ranges & Associated Colors
 */
export const tyreTempRanges = {
  cold: {
    max: 80,
    color: apxColors.tyreBlue,
    label: 'Cold',
  },
  optimal: {
    min: 80,
    max: 105,
    color: apxColors.tyreGreen,
    label: 'Optimal',
  },
  hot: {
    min: 105,
    max: 115,
    color: apxColors.tyreYellow,
    label: 'Hot',
  },
  critical: {
    min: 115,
    color: apxColors.tyreRed,
    label: 'Critical',
  },
} as const;

/**
 * Get color for a given tyre temperature
 */
export function getTyreColor(temp: number): string {
  if (temp < tyreTempRanges.cold.max) return tyreTempRanges.cold.color;
  if (temp >= tyreTempRanges.optimal.min && temp < tyreTempRanges.optimal.max) {
    return tyreTempRanges.optimal.color;
  }
  if (temp >= tyreTempRanges.hot.min && temp < tyreTempRanges.hot.max) {
    return tyreTempRanges.hot.color;
  }
  return tyreTempRanges.critical.color;
}

/**
 * Get Tailwind CSS class for tyre temperature
 */
export function getTyreTempClass(temp: number): string {
  if (temp < tyreTempRanges.cold.max) return 'bg-blue-500';
  if (temp >= tyreTempRanges.optimal.min && temp < tyreTempRanges.optimal.max) {
    return 'bg-green-500';
  }
  if (temp >= tyreTempRanges.hot.min && temp < tyreTempRanges.hot.max) {
    return 'bg-yellow-500';
  }
  return 'bg-red-600 animate-pulse';
}

/**
 * Status Colors for Connection, Session, etc.
 */
export const statusColors = {
  connected: {
    border: 'border-green-500/50',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    icon: 'text-green-500',
  },
  disconnected: {
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    icon: 'text-red-500',
  },
  warning: {
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    icon: 'text-yellow-500',
  },
} as const;

export type ColorKey = keyof typeof apxColors;
export type StatusType = keyof typeof statusColors;

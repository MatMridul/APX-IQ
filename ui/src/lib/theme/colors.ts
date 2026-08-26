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
    
  // Tyre Temperature Colors
  tyreCold: '#c8ccd4',   // Cold - neutral metallic (palette rule)
  tyreGreen: '#22c55e',     // Optimal
  tyreYellow: '#eab308',    // Hot
  tyreRed: '#ef4444',       // Critical
  
  // Chart Colors
  chartSpeed: '#CFA349',    // Gold
  chartRPM: '#FFFFFF',      // White
  chartThrottle: '#22c55e', // Green
  chartBrake: '#ef4444',    // Red
  chartDRS: 'rgba(207,163,73,0.55)', // Gold-dim (palette rule)
} as const;

/**
 * Tyre Temperature Ranges & Associated Colors
 */
export const tyreTempRanges = {
  cold: {
    max: 80,
    color: apxColors.tyreCold,
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
  if (temp < tyreTempRanges.cold.max) return 'bg-signal-energy';
  if (temp >= tyreTempRanges.optimal.min && temp < tyreTempRanges.optimal.max) {
    return 'bg-signal-go';
  }
  if (temp >= tyreTempRanges.hot.min && temp < tyreTempRanges.hot.max) {
    return 'bg-signal-caution';
  }
  return 'bg-signal-stop animate-pulse';
}

/**
 * Status Colors for Connection, Session, etc.
 */
export const statusColors = {
  connected: {
    border: 'border-green-500/50',
    bg: 'bg-green-500/10',
    text: 'text-signal-go',
    icon: 'text-signal-go',
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
    text: 'text-signal-caution',
    icon: 'text-yellow-500',
  },
} as const;

export type ColorKey = keyof typeof apxColors;
export type StatusType = keyof typeof statusColors;

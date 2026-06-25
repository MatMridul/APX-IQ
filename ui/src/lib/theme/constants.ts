/**
 * APX IQ Design System - Design Tokens
 * Spacing, sizing, typography, and other constants
 */

/**
 * Spacing Scale
 */
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '3rem',   // 48px
  '4xl': '4rem',   // 64px
} as const;

/**
 * Border Radius
 */
export const radius = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  full: '9999px',
} as const;

/**
 * Typography Scale
 */
export const fontSize = {
  xs: '0.625rem',   // 10px
  sm: '0.75rem',    // 12px
  base: '0.875rem', // 14px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem',// 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
  '6xl': '4rem',    // 64px
  '7xl': '5rem',    // 80px
  '8xl': '6rem',    // 96px
  '9xl': '8rem',    // 128px
} as const;

/**
 * Font Weights
 */
export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
} as const;

/**
 * Z-Index Layers
 */
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  overlay: 40,
  toast: 50,
  tooltip: 60,
  intro: 100,
} as const;

/**
 * Animation Durations (ms)
 */
export const duration = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 1000,
} as const;

/**
 * Animation Easing Functions
 */
export const easing = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/**
 * Panel Styling Constants
 */
export const panel = {
  borderWidth: '1px',
  borderOpacity: 0.05,
  hoverBorderOpacity: 0.4,
  cornerSize: '0.125rem', // 2px accent corners
  glowBlur: '15px',
  glowSpread: '0px',
} as const;

/**
 * Grid Layout Breakpoints
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

/**
 * Telemetry Update Rates
 */
export const telemetryRates = {
  udpRate: 60,           // Hz - incoming from game
  uiUpdateRate: 60,      // Hz - UI refresh target
  historyBufferSize: 300, // points (~5s at 60Hz)
  socketThrottle: 16,    // ms between emissions (~60Hz)
} as const;

/**
 * Chart Configuration
 */
export const chartConfig = {
  strokeWidth: 3,
  animationDuration: 0, // Disabled for real-time
  gridOpacity: 0.1,
  axisOpacity: 0.3,
  tooltipDelay: 0,
} as const;

/**
 * Metric Thresholds
 */
export const thresholds = {
  fuel: {
    low: 2,       // laps remaining
    warning: 5,
  },
  rpm: {
    redline: 0.95, // % of maxRPM
    optimal: 0.85,
  },
  tyreTemp: {
    cold: 80,
    optimalMin: 85,
    optimalMax: 105,
    hot: 110,
    critical: 115,
  },
  speed: {
    drsMinimum: 250, // km/h
  },
} as const;

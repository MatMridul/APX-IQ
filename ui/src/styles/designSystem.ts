/**
 * APX IQ — Modular Design System Specification
 * ============================================
 * The single authoritative design file for the APX-IQ platform.
 * Every page and component imports tokens, layout templates, and visual
 * primitives directly from this file to ensure 100% aesthetic coherence.
 */

export const DESIGN_TOKENS = {
  // ── Palette & Materials ──────────────────────────────────────────────────
  colors: {
    // Carbon Composite Tones
    carbon: {
      void: "#08090C",
      base: "#0C0E13",
      twillDark: "#10131A",
      twillLight: "#181C26",
      surface: "#141720",
      border: "rgba(255, 255, 255, 0.08)",
      borderHighlight: "rgba(255, 255, 255, 0.18)",
    },
    // Titanium & Metallic Highlights
    titanium: {
      100: "#F8FAFC",
      300: "#CBD5E1",
      500: "#64748B",
      700: "#334155",
      border: "rgba(203, 213, 225, 0.12)",
      glow: "rgba(255, 255, 255, 0.05)",
    },
    // APX Monaco Gold Brand
    gold: {
      primary: "#D4AF37",
      dark: "#BF953F",
      light: "#FCF6BA",
      glow: "rgba(212, 175, 55, 0.35)",
      border: "rgba(212, 175, 55, 0.3)",
      gradient: "linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #B38728 100%)",
    },
    // Motorsport Telemetry Conventions
    telemetry: {
      aeroCyan: "#00F5D4",
      aeroGlow: "rgba(0, 245, 212, 0.35)",
      purpleDelta: "#A855F7",
      purpleGlow: "rgba(168, 85, 247, 0.35)",
      brakeRed: "#EF4444",
      throttleGreen: "#22C55E",
      cautionAmber: "#EAB308",
      drsBlue: "#3B82F6",
    },
  },

  // ── Surface Archetypes ───────────────────────────────────────────────────
  surfaces: {
    // Master Page Container
    pageBackground: "bg-carbon-twill text-slate-200 min-h-screen relative overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200",
    
    // Primary Monocoque Panel
    card: "carbon-panel border border-white/[0.08] hover:border-amber-500/30 transition-all duration-300 shadow-[0_12px_36px_rgba(0,0,0,0.8)]",
    
    // Interactive Titanium Glass
    glass: "bg-black/60 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.85)]",
    
    // High-Density Telemetry Viewport
    hudViewport: "bg-[#0A0C11] border border-white/[0.12] rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.9),0_0_40px_rgba(0,0,0,0.8)]",

    // Laser Accent Lines
    laserGold: "laser-beam-gold",
    laserCyan: "laser-beam-cyan",
    laserPurple: "laser-beam-purple",
  },

  // ── Typography Hierarchies ───────────────────────────────────────────────
  typography: {
    // Hero / Section Titles
    heroTitle: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black italic tracking-tighter uppercase",
    sectionTitle: "text-xl sm:text-2xl font-black italic tracking-tight uppercase text-white flex items-center gap-3",
    sectionSubtitle: "text-xs sm:text-sm font-mono text-neutral-400 tracking-wide mt-1",
    
    // Telemetry & Engineering Specs
    metricValue: "font-mono font-black tracking-tight text-white",
    metricLabel: "text-[10px] font-mono tracking-widest uppercase text-neutral-400 font-bold",
    codeLabel: "text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-neutral-300",
  },

  // ── Layout Standard Dimensions ───────────────────────────────────────────
  layout: {
    container: "max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8",
    containerWide: "max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8",
    sectionSpacing: "py-16 sm:py-20 md:py-24",
    gap: "gap-8 md:gap-10",
  },
} as const;

/**
 * Standard Telemetry Pill Formatter
 */
export function getTelemetryStatusColor(status: "LIVE" | "OPTIMAL" | "CAUTION" | "CRITICAL" | "PURPLE") {
  switch (status) {
    case "LIVE":
    case "OPTIMAL":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.25)]";
    case "PURPLE":
      return "text-purple-400 bg-purple-500/10 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.25)]";
    case "CAUTION":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]";
    case "CRITICAL":
      return "text-red-400 bg-red-500/10 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]";
  }
}

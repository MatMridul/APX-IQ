/**
 * DashboardHeader — Reference 3-Section Motorsport Cockpit Header
 * Geometry: top: 1.0%, left: 1.2%, width: 97.6%, height: 13.5%
 *
 * Left: APX IQ | TELEMETRY DASHBOARD
 * Center: APX IQ RACE CAR SIMULATION
 * Right: GAP (+1.84s HAM), AIR TEMP (18°C), TRACK TEMP (26°C), WEATHER (DRY)
 */

"use client";

import React from "react";

export const DashboardHeader: React.FC = () => {
  return (
    <header className="w-full h-full flex items-center justify-between px-4 py-1 text-silver border-b border-[#B7A06A]/30 select-none">
      
      {/* ── LEFT: Brand & Dashboard Subtitle ─────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none flex items-center gap-1.5"
          style={{ fontFamily: "var(--font-rajdhani)" }}
        >
          <span className="text-[#D4AF37]">APX</span>
          <span className="text-white">IQ</span>
        </div>
        <div className="flex flex-col justify-center leading-none border-l border-[#B7A06A]/45 pl-3 py-0.5">
          <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-[0.22em] font-bold">
            TELEMETRY
          </span>
          <span className="text-[9px] font-mono text-[#A09885] uppercase tracking-[0.16em] mt-0.5 font-medium">
            DASHBOARD
          </span>
        </div>
      </div>

      {/* ── CENTER: Platform Simulation Identity ─────────────────────────── */}
      <div className="flex flex-col items-center justify-center min-w-0">
        <div
          className="text-2xl font-black italic tracking-tight text-white uppercase leading-none flex items-center gap-1"
          style={{ fontFamily: "var(--font-rajdhani)" }}
        >
          <span className="text-[#D4AF37]">APX</span>
          <span className="text-white">IQ</span>
        </div>
        <span className="text-[9px] font-mono text-[#8E8675] uppercase tracking-[0.32em] font-semibold mt-1">
          RACE CAR SIMULATION
        </span>
      </div>

      {/* ── RIGHT: Live Ambient & Session Conditions ─────────────────────── */}
      <div className="flex items-center justify-end gap-4 font-mono text-[10px] min-w-0">
        {/* Gap */}
        <div className="flex flex-col items-center px-1">
          <span className="text-[8px] text-[#8E8675] uppercase font-bold tracking-wider">GAP</span>
          <span className="text-[12px] font-bold text-[#27F26A] font-mono tracking-tight leading-tight mt-0.5">
            +1.84s <span className="text-[8.5px] text-[#8E8675] font-normal">(HAM)</span>
          </span>
          <span className="text-[7px] text-[#6A6255] tracking-tight uppercase mt-0.5">SECTOR TIMES</span>
        </div>

        <div className="h-6 w-px bg-[#B7A06A]/25" />

        {/* Air Temp */}
        <div className="flex flex-col items-center px-1">
          <span className="text-[8px] text-[#8E8675] uppercase font-bold tracking-wider">AIR TEMP</span>
          <span className="text-[12px] font-bold text-white font-mono leading-tight mt-0.5">
            18°C
          </span>
        </div>

        <div className="h-6 w-px bg-[#B7A06A]/25" />

        {/* Track Temp */}
        <div className="flex flex-col items-center px-1">
          <span className="text-[8px] text-[#8E8675] uppercase font-bold tracking-wider">TRACK TEMP</span>
          <span className="text-[12px] font-bold text-[#D4AF37] font-mono leading-tight mt-0.5">
            26°C
          </span>
        </div>

        <div className="h-6 w-px bg-[#B7A06A]/25" />

        {/* Weather */}
        <div className="flex flex-col items-center px-1">
          <span className="text-[8px] text-[#8E8675] uppercase font-bold tracking-wider">WEATHER</span>
          <span className="text-[12px] font-bold text-[#00E5FF] font-mono leading-tight mt-0.5">
            DRY
          </span>
        </div>
      </div>

    </header>
  );
};

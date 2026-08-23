/**
 * DashboardHeader — Reference 3-Section Motorsport Cockpit Header
 * Geometry: top: 1.2%, left: 0.4%, width: 99.2%, height: 13.0%
 *
 * Left: APX IQ Telemetry Dashboard
 * Center: APX IQ Race Car Simulation
 * Right: Race Gap (+1.84s HAM), Air Temp (18°C), Track Temp (26°C), Weather (DRY)
 */

"use client";

import React from "react";

export const DashboardHeader: React.FC = () => {
  return (
    <header className="w-full h-full flex items-center justify-between px-4 py-1 text-silver border-b border-[#B7A06A]/30">
      
      {/* ── LEFT: Brand & Dashboard Subtitle ─────────────────────────────── */}
      <div className="flex items-center gap-2 w-1/4">
        <h1
          className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none"
          style={{ fontFamily: "var(--font-rajdhani)" }}
        >
          <span className="text-[#B7A06A]">APX</span> IQ
        </h1>
        <div className="flex flex-col leading-none border-l border-white/20 pl-2">
          <span className="text-[10px] font-mono text-silver/60 uppercase tracking-widest font-bold">
            TELEMETRY
          </span>
          <span className="text-[9px] font-mono text-silver/40 uppercase tracking-wider">
            DASHBOARD
          </span>
        </div>
      </div>

      {/* ── CENTER: Platform Simulation Identity ─────────────────────────── */}
      <div className="flex flex-col items-center justify-center w-2/4">
        <div
          className="text-xl font-black italic tracking-tight text-white uppercase leading-none"
          style={{ fontFamily: "var(--font-rajdhani)" }}
        >
          <span className="text-[#B7A06A]">APX</span> IQ
        </div>
        <span className="text-[9px] font-mono text-silver/50 uppercase tracking-[0.25em] font-semibold mt-0.5">
          RACE CAR SIMULATION
        </span>
      </div>

      {/* ── RIGHT: Live Ambient & Session Conditions ─────────────────────── */}
      <div className="flex items-center justify-end gap-5 w-1/4 font-mono text-[10px]">
        {/* Gap */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-silver/40 uppercase font-bold tracking-wider">GAP</span>
          <span className="text-[11px] font-black text-emerald-400 font-mono tracking-tight leading-tight">
            +1.84s <span className="text-[8px] text-silver/50 font-normal">(HAM)</span>
          </span>
          <span className="text-[7px] text-silver/30 tracking-tighter uppercase">SECTOR TIMES</span>
        </div>

        {/* Air Temp */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-silver/40 uppercase font-bold tracking-wider">AIR TEMP</span>
          <span className="text-[11px] font-bold text-white font-mono leading-tight">
            18°C
          </span>
        </div>

        {/* Track Temp */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-silver/40 uppercase font-bold tracking-wider">TRACK TEMP</span>
          <span className="text-[11px] font-bold text-[#B7A06A] font-mono leading-tight">
            26°C
          </span>
        </div>

        {/* Weather */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-silver/40 uppercase font-bold tracking-wider">WEATHER</span>
          <span className="text-[11px] font-bold text-cyan-400 font-mono leading-tight">
            DRY
          </span>
        </div>
      </div>

    </header>
  );
};

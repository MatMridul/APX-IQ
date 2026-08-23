/**
 * DashboardCanvas — Single 16:9 Motorsport Cockpit Canvas
 *
 * Source Coordinate Reference: 726 × 408 (16:9 Aspect Ratio)
 *
 * Spatial Map (Percentage-based for deterministic fluid scaling):
 *   - HEADER:          top: 1.2%,  left: 0.4%,  width: 99.2%, height: 13.0%
 *   - CAR:             top: 15.0%, left: 6.7%,  width: 20.8%, height: 65.4%
 *   - CENTRAL CLUSTER: top: 23.0%, left: 30.7%, width: 36.8%, height: 48.5%
 *   - TRACK MAP:       top: 26.2%, left: 69.5%, width: 29.0%, height: 41.9%
 *   - SPEED TRACE:     top: 74.5%, left: 56.0%, width: 43.0%, height: 24.3%
 *   - TYRE PRESSURE:   top: 87.2%, left: 2.3%,  width: 12.6%, height: 7.6%
 *   - BRAKE BIAS:      top: 87.2%, left: 15.7%, width: 13.5%, height: 7.6%
 */

"use client";

import React from "react";
import { DashboardHeader } from "./DashboardHeader";

export const DashboardCanvas: React.FC = () => {
  return (
    <div
      className="relative w-full h-full bg-[#08080A] text-silver overflow-hidden select-none border border-[#B7A06A]/40"
      style={{
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.9)",
      }}
    >
      {/* ── Background: Subtle Carbon Texture & Vignette ─────────────────── */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#B7A06A_0.75px,transparent_0.75px)] [background-size:6px_6px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      {/* ── Internal Framing Lines ───────────────────────────────────────── */}
      {/* Vertical subtle golden divider between left telemetry and right track */}
      <div className="absolute top-[15%] bottom-[5%] left-[50%] w-[1px] bg-[#B7A06A]/10 pointer-events-none" />

      {/* ── 01: HEADER LAYER (top: 1.2%, left: 0.4%, w: 99.2%, h: 13.0%) ── */}
      <div className="absolute top-[1.2%] left-[0.4%] w-[99.2%] h-[13.0%] z-20">
        <DashboardHeader />
      </div>

      {/* ── 02: CAR & WHEEL TELEMETRY REGION (top: 15.0%, left: 6.7%, w: 20.8%, h: 65.4%) ── */}
      <div className="absolute top-[15.0%] left-[6.7%] w-[20.8%] h-[65.4%] border border-dashed border-[#B7A06A]/30 flex flex-col items-center justify-center pointer-events-none z-10">
        <span className="text-[10px] font-mono text-[#B7A06A]/70 uppercase tracking-widest font-bold">
          [CAR & WHEEL REGION]
        </span>
        <span className="text-[8px] font-mono text-silver/40">
          x: 6.7%, y: 15.0%, w: 20.8%, h: 65.4%
        </span>
      </div>

      {/* ── 03: CENTRAL TELEMETRY CLUSTER HERO (top: 23.0%, left: 30.7%, w: 36.8%, h: 48.5%) ── */}
      <div className="absolute top-[23.0%] left-[30.7%] w-[36.8%] h-[48.5%] border-2 border-dashed border-[#B7A06A]/60 flex flex-col items-center justify-center pointer-events-none z-30 bg-black/40 backdrop-blur-[1px]">
        <span className="text-[11px] font-mono text-[#B7A06A] uppercase tracking-widest font-black">
          [CENTRAL TELEMETRY CLUSTER — HERO]
        </span>
        <span className="text-[8px] font-mono text-silver/50">
          x: 30.7%, y: 23.0%, w: 36.8%, h: 48.5%
        </span>
      </div>

      {/* ── 04: TRACK MAP & SECTORS REGION (top: 26.2%, left: 69.5%, w: 29.0%, h: 41.9%) ── */}
      <div className="absolute top-[26.2%] left-[69.5%] w-[29.0%] h-[41.9%] border border-dashed border-[#B7A06A]/30 flex flex-col items-center justify-center pointer-events-none z-10">
        <span className="text-[10px] font-mono text-[#B7A06A]/70 uppercase tracking-widest font-bold">
          [TRACK MAP & SECTORS REGION]
        </span>
        <span className="text-[8px] font-mono text-silver/40">
          x: 69.5%, y: 26.2%, w: 29.0%, h: 41.9%
        </span>
      </div>

      {/* ── 05: SPEED TELEMETRY TRACE REGION (top: 74.5%, left: 56.0%, w: 43.0%, h: 24.3%) ── */}
      <div className="absolute top-[74.5%] left-[56.0%] w-[43.0%] h-[24.3%] border border-dashed border-[#B7A06A]/30 flex flex-col items-center justify-center pointer-events-none z-10">
        <span className="text-[10px] font-mono text-[#B7A06A]/70 uppercase tracking-widest font-bold">
          [SPEED TRACE REGION]
        </span>
        <span className="text-[8px] font-mono text-silver/40">
          x: 56.0%, y: 74.5%, w: 43.0%, h: 24.3%
        </span>
      </div>

      {/* ── 06: TYRE PRESSURE REGION (top: 87.2%, left: 2.3%, w: 12.6%, h: 7.6%) ── */}
      <div className="absolute top-[87.2%] left-[2.3%] w-[12.6%] h-[7.6%] border border-dashed border-[#B7A06A]/30 flex flex-col items-center justify-center pointer-events-none z-10">
        <span className="text-[8px] font-mono text-[#B7A06A]/70 uppercase font-bold">
          [TYRE PRESS]
        </span>
      </div>

      {/* ── 07: BRAKE BIAS REGION (top: 87.2%, left: 15.7%, w: 13.5%, h: 7.6%) ── */}
      <div className="absolute top-[87.2%] left-[15.7%] w-[13.5%] h-[7.6%] border border-dashed border-[#B7A06A]/30 flex flex-col items-center justify-center pointer-events-none z-10">
        <span className="text-[8px] font-mono text-[#B7A06A]/70 uppercase font-bold">
          [BRAKE BIAS]
        </span>
      </div>

    </div>
  );
};

/**
 * DashboardCanvas — Single 16:9 Motorsport Cockpit Canvas
 *
 * Source Coordinate Reference: 726 × 408 (16:9 Aspect Ratio)
 *
 * Spatial Map (Deterministic Percentage-based Fluid Scaling):
 *   - HEADER:              top: 1.0%,  left: 1.2%,  width: 97.6%, height: 13.5%
 *   - CAR & WHEELS:        top: 15.5%, left: 2.2%,  width: 28.5%, height: 63.5%
 *   - BOTTOM INSTRUMENTS:  top: 80.5%, left: 2.2%,  width: 28.5%, height: 17.0%
 *   - CENTRAL CLUSTER:     top: 19.5%, left: 31.5%, width: 37.0%, height: 51.5%
 *   - TRACK MAP:           top: 20.5%, left: 69.5%, width: 28.5%, height: 49.0%
 *   - SPEED TRACE:         top: 72.0%, left: 50.5%, width: 47.5%, height: 25.5%
 */

"use client";

import React from "react";
import { DashboardHeader } from "./DashboardHeader";
import { RaceCarTelemetry } from "./RaceCarTelemetry";
import { CentralTelemetry } from "./CentralTelemetry";
import { BottomInstruments } from "./BottomInstruments";

export const DashboardCanvas: React.FC = () => {
  return (
    <div
      className="relative w-full h-full bg-[#070709] text-silver overflow-hidden select-none border border-[#B7A06A]/45 rounded-xl"
      style={{
        boxShadow: "inset 0 0 35px rgba(0,0,0,0.95), 0 0 45px rgba(0,0,0,0.9)",
      }}
    >
      {/* ── Background: Subtle Carbon Weave Texture & Vignette ───────────── */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#B7A06A_0.75px,transparent_0.75px)] [background-size:6px_6px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.85)_100%)]" />

      {/* ── Internal Framing Lines ───────────────────────────────────────── */}
      {/* Vertical golden divider in bottom-center dividing Tyre/Brake and Speed Trace */}
      <div className="absolute top-[71.5%] bottom-[2.5%] left-[50.0%] w-[1px] bg-[#B7A06A]/25 pointer-events-none" />

      {/* ── 01: HEADER LAYER (top: 1.0%, left: 1.2%, w: 97.6%, h: 13.5%) ── */}
      <div className="absolute top-[1.0%] left-[1.2%] w-[97.6%] h-[13.5%] z-20">
        <DashboardHeader />
      </div>

      {/* ── 02: CAR & WHEEL TELEMETRY REGION (top: 15.5%, left: 2.2%, w: 28.5%, h: 63.5%) ── */}
      <div className="absolute top-[15.5%] left-[2.2%] w-[28.5%] h-[63.5%] z-10 flex items-center justify-center">
        <RaceCarTelemetry />
      </div>

      {/* ── 03: BOTTOM-LEFT INSTRUMENTS (top: 80.5%, left: 2.2%, w: 28.5%, h: 17.0%) ── */}
      <div className="absolute top-[80.5%] left-[2.2%] w-[28.5%] h-[17.0%] z-10">
        <BottomInstruments />
      </div>

      {/* ── 04: CENTRAL TELEMETRY CLUSTER HERO (top: 19.5%, left: 31.5%, w: 37.0%, h: 51.5%) ── */}
      <div className="absolute top-[19.5%] left-[31.5%] w-[37.0%] h-[51.5%] z-30 flex items-center justify-center">
        <CentralTelemetry />
      </div>

      {/* ── 05: TRACK MAP & SECTORS REGION (top: 20.5%, left: 69.5%, w: 28.5%, h: 49.0%) ── */}
      <div className="absolute top-[20.5%] left-[69.5%] w-[28.5%] h-[49.0%] border border-dashed border-[#B7A06A]/25 rounded-lg flex flex-col items-center justify-center pointer-events-none z-10 bg-black/20">
        <span className="text-[10px] font-mono text-[#D4AF37]/80 uppercase tracking-widest font-bold">
          [TRACK MAP & SECTORS REGION]
        </span>
        <span className="text-[8px] font-mono text-silver/40 mt-1">
          x: 69.5%, y: 20.5%, w: 28.5%, h: 49.0%
        </span>
      </div>

      {/* ── 06: SPEED TELEMETRY TRACE REGION (top: 72.0%, left: 50.5%, w: 47.5%, h: 25.5%) ── */}
      <div className="absolute top-[72.0%] left-[50.5%] w-[47.5%] h-[25.5%] border border-dashed border-[#B7A06A]/25 rounded-lg flex flex-col items-center justify-center pointer-events-none z-10 bg-black/20">
        <span className="text-[10px] font-mono text-[#D4AF37]/80 uppercase tracking-widest font-bold">
          [SPEED TRACE REGION]
        </span>
        <span className="text-[8px] font-mono text-silver/40 mt-1">
          x: 50.5%, y: 72.0%, w: 47.5%, h: 25.5%
        </span>
      </div>

    </div>
  );
};

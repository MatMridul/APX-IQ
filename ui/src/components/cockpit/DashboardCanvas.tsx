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
import { TrackMap } from "./TrackMap";
import { SpeedTrace } from "./SpeedTrace";

export const DashboardCanvas: React.FC = () => {
  return (
    <div
      className="relative w-full h-full bg-[#070709] text-silver overflow-hidden select-none border border-[#B7A06A]/45 rounded-xl"
      style={{
        boxShadow: "inset 0 0 35px rgba(0,0,0,0.95), 0 0 45px rgba(0,0,0,0.9)",
      }}
    >
      {/* ── Background Circuit / Carbon Texture ────────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111115] via-[#08080A] to-[#040405] opacity-90" />

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
      <div className="absolute top-[20.5%] left-[69.5%] w-[28.5%] h-[49.0%] z-10 flex items-center justify-center">
        <TrackMap />
      </div>

      {/* ── 06: SPEED TELEMETRY TRACE REGION (top: 72.0%, left: 50.5%, w: 47.5%, h: 25.5%) ── */}
      <div className="absolute top-[72.0%] left-[50.5%] w-[47.5%] h-[25.5%] z-10 flex items-center justify-center">
        <SpeedTrace />
      </div>

    </div>
  );
};

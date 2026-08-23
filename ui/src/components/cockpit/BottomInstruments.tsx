/**
 * BottomInstruments — Phase 2B/Micro-Polish: Tyre Pressure & Brake Bias
 *
 * Reference: Nano Banana APX IQ cockpit (media_1787442062666.png)
 *
 * Micro-instruments positioned beneath the race car (bottom-left quadrant):
 *   1. TYRE PRESS: Multi-point pressure distribution curve with gradient fill and Low / 1st / High axis
 *   2. BRAKE BIAS: Precision horizontal split bar with 58.0% cursor and 0% / 58 / High axis
 *
 * Static Reference Mode.
 */

"use client";

import React from "react";

export const BottomInstruments: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center gap-2.5 select-none font-mono">
      {/* ── 1. TYRE PRESSURE MICRO-INSTRUMENT ───────────────────────────── */}
      <div
        className="flex-1 h-full rounded flex flex-col justify-between p-2 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0F0E0C 0%, #060607 100%)",
          border: "1px solid rgba(183, 160, 106, 0.4)",
          boxShadow: "inset 0 1px 0 rgba(215, 192, 138, 0.15), 0 2px 12px rgba(0,0,0,0.85)",
        }}
      >
        {/* Header Label */}
        <span className="text-[8px] uppercase tracking-[0.16em] text-[#8E8675] font-semibold">
          TYRE PRESS
        </span>

        {/* Pressure Distribution SVG Curve */}
        <div className="flex-1 w-full my-1 relative">
          <svg viewBox="0 0 120 30" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="press-curve-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Baseline */}
            <line x1="0" y1="26" x2="120" y2="26" stroke="#262420" strokeWidth="0.9" />

            {/* Continuous Pressure Waveform (smooth envelope) */}
            <path
              d="
                M 0 26
                L 0 17
                C 18 17, 32 7, 48 14
                C 64 21, 78 8, 94 12
                C 106 15, 114 16, 120 18
                L 120 26
                Z
              "
              fill="url(#press-curve-grad)"
            />
            <path
              d="
                M 0 17
                C 18 17, 32 7, 48 14
                C 64 21, 78 8, 94 12
                C 106 15, 114 16, 120 18
              "
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1.3"
            />
          </svg>
        </div>

        {/* Axis Ticks & Scale */}
        <div className="flex items-center justify-between text-[7px] text-[#7A7264] tracking-wider uppercase font-medium">
          <span>Low</span>
          <span>1st</span>
          <span>High</span>
        </div>
      </div>

      {/* ── 2. BRAKE BIAS MICRO-INSTRUMENT ─────────────────────────────── */}
      <div
        className="flex-1 h-full rounded flex flex-col justify-between p-2 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0F0E0C 0%, #060607 100%)",
          border: "1px solid rgba(183, 160, 106, 0.4)",
          boxShadow: "inset 0 1px 0 rgba(215, 192, 138, 0.15), 0 2px 12px rgba(0,0,0,0.85)",
        }}
      >
        {/* Header Label + Percentage Value */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] uppercase tracking-[0.16em] text-[#8E8675] font-semibold">
            BRAKE BIAS
          </span>
          <span className="text-[9.5px] font-bold text-[#E8E2D5] font-mono">
            58.0%
          </span>
        </div>

        {/* Horizontal Bias Slider Bar */}
        <div className="flex-1 w-full my-1 relative flex items-center">
          <svg viewBox="0 0 120 18" className="w-full h-full" preserveAspectRatio="none">
            {/* Background Track */}
            <rect x="0" y="4" width="120" height="10" rx="1.5" fill="#121110" stroke="#28241C" strokeWidth="0.8" />

            {/* Active Front Bias Bar (up to 58% = x=69.6) */}
            <rect
              x="0"
              y="4"
              width="69.6"
              height="10"
              rx="1.5"
              fill="linear-gradient(90deg, #5A4418, #A68430)"
              fillOpacity="0.4"
            />

            {/* Center Reference Mark (50% = x=60) */}
            <line x1="60" y1="2" x2="60" y2="16" stroke="#3E382C" strokeWidth="0.8" strokeDasharray="1.5 1.5" />

            {/* 58% Cursor Needle / Marker */}
            <rect x="68" y="2" width="3.2" height="14" rx="1" fill="#FFE890" />
            <line x1="69.6" y1="0" x2="69.6" y2="18" stroke="#D4AF37" strokeWidth="1.3" />
          </svg>
        </div>

        {/* Axis Ticks & Scale */}
        <div className="flex items-center justify-between text-[7px] text-[#7A7264] tracking-wider uppercase font-medium">
          <span>0%</span>
          <span>58</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

/**
 * SetupMatrixSliders — Interactive Mechanical Car Setup Adjustment Matrix
 * Features gold-embossed vertical click sliders and vehicle dynamics rationale for:
 * Front Wing Flap, Anti-Roll Bars (ARB), Differential %, and Brake Bias Balance %.
 */

"use client";

import React, { useState } from "react";
import { Sliders, Wrench, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupMatrixSlidersProps {
  initialFrontWing?: number;
  initialArb?: number;
  initialDiff?: number;
  initialBrakeBias?: number;
  className?: string;
}

export const SetupMatrixSliders: React.FC<SetupMatrixSlidersProps> = ({
  initialFrontWing = 3,
  initialArb = 10,
  initialDiff = 55,
  initialBrakeBias = 58,
  className,
}) => {
  const [frontWing, setFrontWing] = useState(initialFrontWing);
  const [arb, setArb] = useState(initialArb);
  const [diff, setDiff] = useState(initialDiff);
  const [brakeBias, setBrakeBias] = useState(initialBrakeBias);

  return (
    <div
      className={cn(
        "relative rounded-3xl p-5 bg-gradient-to-b from-[#151518] to-[#0A0A0C] border-2 border-gold/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-4",
        className
      )}
    >
      {/* ── TOP: Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-gold" />
          <h3 className="text-xs font-black text-gold uppercase tracking-widest font-mono">
            INTERACTIVE MECHANICAL CAR SETUP ADJUSTMENT MATRIX
          </h3>
        </div>
        <span className="text-[10px] font-mono text-signal-go font-bold uppercase">
          AI CALIBRATED
        </span>
      </div>

      {/* ── 4 VERTICAL CLICK SLIDERS ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 py-2 items-end">
        
        {/* 1. Front Wing Flap */}
        <div className="flex flex-col items-center gap-2 font-mono">
          <span className="text-[10px] text-silver/60 uppercase font-bold text-center h-7 flex items-center">
            Front Wing Flap
          </span>
          {/* Digital Readout Box */}
          <div className="w-12 h-9 rounded-lg bg-black border border-gold/40 flex items-center justify-center text-sm font-black text-gold shadow-[0_0_10px_rgba(207,163,73,0.2)]">
            +{frontWing}
          </div>
          {/* Vertical Slider Track */}
          <div className="h-36 w-4 bg-black/80 rounded-full border border-white/10 relative flex justify-center p-0.5">
            <div
              className="w-full bg-gradient-to-t from-gold/40 to-gold rounded-full transition-all"
              style={{ height: `${(frontWing / 10) * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-silver/40 uppercase">CLICKS</span>
        </div>

        {/* 2. Anti-Roll Bars (ARB) */}
        <div className="flex flex-col items-center gap-2 font-mono">
          <span className="text-[10px] text-silver/60 uppercase font-bold text-center h-7 flex items-center">
            Anti-Roll Bars
          </span>
          <div className="w-12 h-9 rounded-lg bg-black border border-gold/40 flex items-center justify-center text-sm font-black text-gold shadow-[0_0_10px_rgba(207,163,73,0.2)]">
            {arb}
          </div>
          <div className="h-36 w-4 bg-black/80 rounded-full border border-white/10 relative flex justify-center p-0.5">
            <div
              className="w-full bg-gradient-to-t from-gold/40 to-gold rounded-full transition-all"
              style={{ height: `${(arb / 11) * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-silver/40 uppercase">STIFFNESS</span>
        </div>

        {/* 3. Differential Lock % */}
        <div className="flex flex-col items-center gap-2 font-mono">
          <span className="text-[10px] text-silver/60 uppercase font-bold text-center h-7 flex items-center">
            Differential %
          </span>
          <div className="w-12 h-9 rounded-lg bg-black border border-gold/40 flex items-center justify-center text-sm font-black text-gold shadow-[0_0_10px_rgba(207,163,73,0.2)]">
            {diff}%
          </div>
          <div className="h-36 w-4 bg-black/80 rounded-full border border-white/10 relative flex justify-center p-0.5">
            <div
              className="w-full bg-gradient-to-t from-gold/40 to-gold rounded-full transition-all"
              style={{ height: `${((diff - 40) / 60) * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-silver/40 uppercase">ON-THROTTLE</span>
        </div>

        {/* 4. Brake Bias Balance % */}
        <div className="flex flex-col items-center gap-2 font-mono">
          <span className="text-[10px] text-silver/60 uppercase font-bold text-center h-7 flex items-center">
            Brake Bias
          </span>
          <div className="w-12 h-9 rounded-lg bg-black border border-gold/40 flex items-center justify-center text-sm font-black text-gold shadow-[0_0_10px_rgba(207,163,73,0.2)]">
            {brakeBias}%
          </div>
          <div className="h-36 w-4 bg-black/80 rounded-full border border-white/10 relative flex justify-center p-0.5">
            <div
              className="w-full bg-gradient-to-t from-gold/40 to-gold rounded-full transition-all"
              style={{ height: `${((brakeBias - 50) / 20) * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-silver/40 uppercase">FRONT SPLIT</span>
        </div>
      </div>

      {/* ── VEHICLE DYNAMICS RATIONALE CALLOUT ────────────────────────────── */}
      <div className="flex flex-col gap-1.5 p-3 bg-black/50 rounded-2xl border border-white/5 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-gold font-bold text-[11px] uppercase">
          <Sparkles size={12} />
          Race Engineer Setup Notes
        </div>
        <p className="text-silver/80 text-[11px] leading-relaxed font-sans">
          Increasing front wing by <strong>+1 click</strong> cures mid-corner understeer in Turn 3. Softening front ARB to <strong>{arb}</strong> improves mechanical compliance over apex kerbs without compromising straight-line downforce.
        </p>
      </div>
    </div>
  );
};

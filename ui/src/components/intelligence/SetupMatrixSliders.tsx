/**
 * SetupMatrixSliders — Interactive Mechanical Car Setup Adjustment Matrix
 * Features gold-embossed vertical click/drag sliders and vehicle dynamics rationale for:
 * Front Wing Flap, Anti-Roll Bars (ARB), Differential %, and Brake Bias Balance %.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Wrench, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { SourceBadge } from "../cockpit/primitives";

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
  const { source } = useLiveOrDemo();
  const carSetups = useTelemetryStore((s) => s.carSetups);
  const isLive = source === "LIVE" && carSetups !== null;

  const [userWing, setUserWing] = useState<number | null>(null);
  const [userArb, setUserArb] = useState<number | null>(null);
  const [userDiff, setUserDiff] = useState<number | null>(null);
  const [userBrakeBias, setUserBrakeBias] = useState<number | null>(null);

  const frontWing = userWing ?? carSetups?.frontWing ?? initialFrontWing;
  const arb = userArb ?? carSetups?.frontAntiRollBar ?? initialArb;
  const diff = userDiff ?? carSetups?.onThrottle ?? initialDiff;
  const brakeBias = userBrakeBias ?? carSetups?.brakeBias ?? initialBrakeBias;

  // Dynamic vehicle dynamics physics estimation
  const frontAeroPercent = (41.5 + frontWing * 0.45).toFixed(1);
  const rearAeroPercent = (100 - parseFloat(frontAeroPercent)).toFixed(1);
  const estDeltaSec = (-(frontWing * 0.012 + (11 - arb) * 0.005 + (60 - diff) * 0.003 + (58 - brakeBias) * 0.004)).toFixed(3);
  const balanceState = frontWing > 4 ? "SHARP TURN-IN / MINOR OVERSTEER" : frontWing < 2 ? "STABLE / HIGH-SPEED UNDERSTEER" : "NEUTRAL ROTATIONAL BALANCE";

  return (
    <div
      className={cn(
        "relative rounded-xl p-5 bg-neutral-950/90 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm flex flex-col justify-between gap-4",
        className
      )}
    >
      {/* ── TOP: Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-[3px] h-3.5 rounded-sm bg-gold shadow-[0_0_8px_rgba(207,163,73,0.8)]" />
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono">
            CAR SETUP MATRIX
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
            EST. DELTA: {parseFloat(estDeltaSec) <= 0 ? estDeltaSec : `+${estDeltaSec}`}s
          </span>
          <SourceBadge source={isLive ? "LIVE" : "SIM"} />
        </div>
      </div>

      {/* ── 4 VERTICAL CLICK/DRAG SLIDERS ───────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2.5 py-1 items-end">
        
        {/* 1. Front Wing Flap */}
        <div className="flex flex-col items-center gap-1.5 font-mono">
          <span className="text-[9px] text-neutral-400 uppercase font-bold text-center h-5 flex items-center">
            Front Wing
          </span>
          <div className="w-12 h-8 rounded bg-black border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)] transition-all">
            +{frontWing}
          </div>
          <div
            className="h-28 w-4 bg-black/90 rounded-full border border-white/15 relative flex justify-center p-0.5 cursor-pointer hover:border-amber-400/60 transition-colors shadow-inner"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const frac = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
              setUserWing(Math.round(frac * 10));
            }}
          >
            <div
              className="w-full bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 rounded-full transition-all shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              style={{ height: `${Math.max(8, (frontWing / 10) * 100)}%` }}
            />
          </div>
          <span className="text-[8px] text-neutral-400 uppercase">CLICKS</span>
        </div>

        {/* 2. Anti-Roll Bars (ARB) */}
        <div className="flex flex-col items-center gap-1.5 font-mono">
          <span className="text-[9px] text-neutral-400 uppercase font-bold text-center h-5 flex items-center">
            Anti-Roll
          </span>
          <div className="w-12 h-8 rounded bg-black border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)] transition-all">
            {arb}
          </div>
          <div
            className="h-28 w-4 bg-black/90 rounded-full border border-white/15 relative flex justify-center p-0.5 cursor-pointer hover:border-amber-400/60 transition-colors shadow-inner"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const frac = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
              setUserArb(Math.round(frac * 11));
            }}
          >
            <div
              className="w-full bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 rounded-full transition-all shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              style={{ height: `${Math.max(8, (arb / 11) * 100)}%` }}
            />
          </div>
          <span className="text-[8px] text-neutral-400 uppercase">STIFFNESS</span>
        </div>

        {/* 3. Differential Lock % */}
        <div className="flex flex-col items-center gap-1.5 font-mono">
          <span className="text-[9px] text-neutral-400 uppercase font-bold text-center h-5 flex items-center">
            Diff Lock
          </span>
          <div className="w-12 h-8 rounded bg-black border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)] transition-all">
            {diff}%
          </div>
          <div
            className="h-28 w-4 bg-black/90 rounded-full border border-white/15 relative flex justify-center p-0.5 cursor-pointer hover:border-amber-400/60 transition-colors shadow-inner"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const frac = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
              setUserDiff(Math.round(40 + frac * 60));
            }}
          >
            <div
              className="w-full bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 rounded-full transition-all shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              style={{ height: `${Math.max(8, ((diff - 40) / 60) * 100)}%` }}
            />
          </div>
          <span className="text-[8px] text-neutral-400 uppercase">ON-THROT</span>
        </div>

        {/* 4. Brake Bias Balance % */}
        <div className="flex flex-col items-center gap-1.5 font-mono">
          <span className="text-[9px] text-neutral-400 uppercase font-bold text-center h-5 flex items-center">
            Brake Bias
          </span>
          <div className="w-12 h-8 rounded bg-black border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)] transition-all">
            {brakeBias}%
          </div>
          <div
            className="h-28 w-4 bg-black/90 rounded-full border border-white/15 relative flex justify-center p-0.5 cursor-pointer hover:border-amber-400/60 transition-colors shadow-inner"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const frac = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
              setUserBrakeBias(Math.round(50 + frac * 20));
            }}
          >
            <div
              className="w-full bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 rounded-full transition-all shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              style={{ height: `${Math.max(8, ((brakeBias - 50) / 20) * 100)}%` }}
            />
          </div>
          <span className="text-[8px] text-neutral-400 uppercase">FRONT</span>
        </div>
      </div>

      {/* ── VEHICLE DYNAMICS RATIONALE & AERO BALANCE ─────────────────────── */}
      <div className="flex flex-col gap-2 p-3 bg-black/60 rounded-lg border border-white/[0.08] font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase">
            <Sparkles size={12} className="animate-pulse" />
            <span>Dynamic Balance: {balanceState}</span>
          </div>
          <span className="text-[9px] text-neutral-400">
            AERO: <strong className="text-white">{frontAeroPercent}% F</strong> / {rearAeroPercent}% R
          </span>
        </div>
        <p className="text-neutral-300 text-[11px] leading-relaxed font-sans">
          Front wing <strong>+{frontWing}</strong> with ARB stiffness <strong>{arb}</strong> yields optimal apex bite on entry. Differential lock at <strong>{diff}%</strong> protects rear traction off hairpin exits with <strong>{brakeBias}%</strong> front bias.
        </p>
      </div>
    </div>
  );
};


"use client";

import React from "react";
import { Gauge, Zap, Disc, ArrowRight } from "lucide-react";
import { PanelHeader } from "@/components/cockpit/PanelHeader";
import { cn } from "@/lib/utils";

interface PedalDynamicsProfileProps {
  className?: string;
}

export const PedalDynamicsProfile: React.FC<PedalDynamicsProfileProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "rounded-xl bg-neutral-950/90 border border-white/[0.08] p-5 flex flex-col justify-between gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm",
        className
      )}
    >
      <PanelHeader
        label="04 // Braking & Pedal Dynamics Efficiency"
        right={
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold uppercase">
            96.8% EFFICIENCY SCORE
          </span>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 flex-1 items-stretch">
        {/* 1. Threshold Braking */}
        <div className="p-3.5 rounded-lg bg-black/60 border border-white/[0.06] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
            BRAKING DECELERATION
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-black font-mono text-rose-400 tabular-nums">
              -4.82
            </span>
            <span className="text-xs font-mono text-neutral-400 font-semibold">PEAK G</span>
          </div>
          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
            <span>T1 THRESHOLD:</span>
            <span className="text-emerald-400 font-bold">98.4%</span>
          </div>
        </div>

        {/* 2. Throttle Pickup */}
        <div className="p-3 rounded-lg bg-black/50 border border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
            THROTTLE PICKUP LAG
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
              +14
            </span>
            <span className="text-xs font-mono text-neutral-400 font-semibold">MS</span>
          </div>
          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
            <span>VS GHOST APEX:</span>
            <span className="text-amber-400 font-bold">LATE PICKUP</span>
          </div>
        </div>

        {/* 3. Trail-Braking Compliance */}
        <div className="p-3 rounded-lg bg-black/50 border border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
            TRAIL-BRAKING DECAY
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-black font-mono text-cyan-400 tabular-nums">
              86%
            </span>
            <span className="text-xs font-mono text-neutral-400 font-semibold">ELLIPSE</span>
          </div>
          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
            <span>MU FRICTION:</span>
            <span className="text-emerald-400 font-bold">OPTIMAL</span>
          </div>
        </div>

        {/* 4. ERS Recovery */}
        <div className="p-3 rounded-lg bg-black/50 border border-white/[0.04] flex flex-col justify-between">
          <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
            MGU-K ENERGY HARVEST
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-black font-mono text-white tabular-nums">
              3.42
            </span>
            <span className="text-xs font-mono text-neutral-400 font-semibold">MJ / LAP</span>
          </div>
          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
            <span>HARVEST QUOTA:</span>
            <span className="text-emerald-400 font-bold">92% SOC</span>
          </div>
        </div>
      </div>
    </div>
  );
};

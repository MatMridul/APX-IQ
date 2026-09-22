"use client";

import React from "react";
import { Activity, Clock, Layers, DollarSign, Cpu, ShieldCheck } from "lucide-react";

interface MetricItem {
  label: string;
  value: string;
  unit: string;
  sublabel: string;
  icon: React.ElementType;
  accent: string;
}

const METRICS: MetricItem[] = [
  {
    label: "UDP INGESTION RATE",
    value: "60",
    unit: "Hz",
    sublabel: "16.6ms Target Frame Budget",
    icon: Activity,
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    label: "F1 ERA COMPATIBILITY",
    value: "6",
    unit: "ERAS",
    sublabel: "F1 2020 through F1 2025 Auto-Decode",
    icon: Layers,
    accent: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    label: "DISTANCE NORMALIZATION",
    value: "1,000",
    unit: "PTS",
    sublabel: "Cubic Spline Spatial Resampling",
    icon: Cpu,
    accent: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    label: "IDLE RUNNING COST",
    value: "$0.00",
    unit: "/ MO",
    sublabel: "Scale-to-Zero Serverless Edge",
    icon: DollarSign,
    accent: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
];

export function EngineeringTicker() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
      {METRICS.map((m, idx) => {
        const Icon = m.icon;
        return (
          <div
            key={idx}
            className="rounded-xl bg-neutral-950/80 border border-white/[0.08] p-4 flex flex-col justify-between gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-sm group hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-neutral-400 uppercase font-bold tracking-wider">
                {m.label}
              </span>
              <div className={`p-1.5 rounded-lg border ${m.accent}`}>
                <Icon size={13} />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 my-1">
              <span className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
                {m.value}
              </span>
              <span className="font-mono text-xs text-neutral-400 font-bold uppercase">
                {m.unit}
              </span>
            </div>

            <span className="font-mono text-[9px] text-neutral-400 tracking-wider">
              {m.sublabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

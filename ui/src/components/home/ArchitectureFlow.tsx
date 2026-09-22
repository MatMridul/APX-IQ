"use client";

import React, { useState } from "react";
import { Cpu, Radio, Zap, Sparkles, Activity, Terminal, ArrowRight, ShieldCheck, Database, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { soundFx } from "@/lib/cockpit/soundFx";

interface ArchitectureStage {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  description: string;
  specs: string[];
}

const STAGES: ArchitectureStage[] = [
  {
    id: "01",
    step: "STAGE 01",
    title: "EA SPORTS F1 ENGINE",
    subtitle: "HIGH-FREQUENCY UDP TELEMETRY",
    icon: Radio,
    color: "amber",
    badge: "60Hz · PORT 20777",
    description: "Broadcasts raw 60Hz binary telemetry packets (Motion, Car Telemetry, Lap Data, Car Status, Car Damage) over local UDP socket without game performance impact.",
    specs: ["F1 2020-2025 Era Auto-Detect", "16.6ms Target Ingestion Frame", "1,347-byte Max Datagram Size", "Zero Game Modding Required"],
  },
  {
    id: "02",
    step: "STAGE 02",
    title: "ASYNCIO INGESTION BRIDGE",
    subtitle: "CIRCULAR RING BUFFER & DECODE",
    icon: Cpu,
    color: "cyan",
    badge: "PYTHON ASYNCIO",
    description: "High-performance Python asyncio daemon with struct-based binary unpacking, CRC32 packet validation, and high-watermark drop mitigation under heavy CPU load.",
    specs: ["Zero-Drop Circular Ring Buffer", "Bitmask Flag Extraction", "Socket.IO Multi-Client Broadcast", "SIM Fallback Synthesis Engine"],
  },
  {
    id: "03",
    step: "STAGE 03",
    title: "FASTF1 FIA BENCHMARKING",
    subtitle: "SPATIAL DISTANCE NORMALIZATION",
    icon: Database,
    color: "emerald",
    badge: "FASTF1 API V2",
    description: "Fetches official FIA Grand Prix benchmark ghost laps (e.g. Verstappen, Hamilton, Leclerc) and aligns them against driver telemetry using cubic spline spatial distance interpolation (1,000 grid points).",
    specs: ["1,000-Point Distance Grid", "Cubic Spline Speed Normalization", "Sub-20ms Delta Computation", "Track-Indexed Apex Slicing"],
  },
  {
    id: "04",
    step: "STAGE 04",
    title: "RATG & FFT SIGNAL PROFILING",
    subtitle: "AI RACE ENGINEERING HEURISTICS",
    icon: Sparkles,
    color: "purple",
    badge: "5-STAGE RATG",
    description: "Real-Time Analytical Telemetry Generation (RATG) pipeline coupled with Fast Fourier Transform (FFT) hardware profiling to detect direct drive wheels vs gamepads and synthesize tailored coaching debriefs.",
    specs: ["FFT Steering Noise Profiler", "5-Stage Setup Balancing Matrix", "Dynamic Voice Radio Synthesizer", "Actionable Apex Takeaways"],
  },
  {
    id: "05",
    step: "STAGE 05",
    title: "DIGITAL PIT WALL HUD",
    subtitle: "SCALE-TO-ZERO SERVERLESS EDGE",
    icon: Layers,
    color: "gold",
    badge: "$0 IDLE COST",
    description: "Next.js 15 static export deployed to Cloudflare Pages edge network, consuming zero cloud billing during idle periods while providing 60Hz DOM-direct cockpit instruments and strategy debriefs.",
    specs: ["Zero-Render DOM Pointer Writes", "AMOLED High-Contrast Cockpit", "Web Audio API Sound Synthesizer", "Full Mobile/Desktop Responsive"],
  },
];

export function ArchitectureFlow() {
  const [activeStage, setActiveStage] = useState<string>("01");

  const current = STAGES.find((s) => s.id === activeStage) ?? STAGES[0];

  return (
    <div className="w-full rounded-2xl bg-neutral-950/90 border border-white/[0.08] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-md flex flex-col gap-5">
      
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-[3px] h-3.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
            END-TO-END TELEMETRY ARCHITECTURE & SIGNAL TOPOLOGY
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded font-bold self-start sm:self-auto">
          INTERVIEW ARCHITECTURAL BLUEPRINT
        </span>
      </div>

      {/* ── INTERACTIVE 5-STAGE PIPELINE SWITCHER ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {STAGES.map((s, idx) => {
          const Icon = s.icon;
          const isSelected = s.id === activeStage;

          let colorStyles = "border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04]";
          if (isSelected) {
            if (s.color === "amber") colorStyles = "border-amber-500/60 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
            else if (s.color === "cyan") colorStyles = "border-cyan-500/60 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]";
            else if (s.color === "emerald") colorStyles = "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]";
            else if (s.color === "purple") colorStyles = "border-purple-500/60 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]";
            else colorStyles = "border-amber-400/60 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
          }

          return (
            <button
              key={s.id}
              onClick={() => {
                soundFx.playButtonClick();
                setActiveStage(s.id);
              }}
              className={cn(
                "p-3 rounded-xl border flex flex-col text-left justify-between gap-2 transition-all cursor-pointer",
                colorStyles
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-[9px] font-bold tracking-widest">{s.step}</span>
                <Icon size={14} className={isSelected ? "animate-pulse" : ""} />
              </div>
              <div>
                <span className="font-mono text-[11px] font-black tracking-wider block text-white">
                  {s.title}
                </span>
                <span className="font-mono text-[8px] text-neutral-400 tracking-wider block mt-0.5">
                  {s.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── STAGE DEEP DIVE CARD ──────────────────────────────────────────── */}
      <div className="rounded-xl bg-black/70 border border-white/[0.08] p-4 sm:p-5 flex flex-col md:flex-row items-stretch justify-between gap-5 shadow-inner">
        <div className="flex-1 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                {current.step} · {current.subtitle}
              </span>
              <span className="font-mono text-[8px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-300">
                {current.badge}
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white tracking-wide font-mono">
              {current.title}
            </h4>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans mt-2">
              {current.description}
            </p>
          </div>

          {/* Key Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
            {current.specs.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px] font-mono text-neutral-300 bg-white/[0.03] px-2.5 py-1.5 rounded border border-white/[0.04]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>{spec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

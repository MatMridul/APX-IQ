"use client";

import React, { useState } from "react";
import { ChevronDown, Cpu, Sparkles, Database, Terminal, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { soundFx } from "@/lib/cockpit/soundFx";

interface SectionItem {
  id: string;
  title: string;
  badge: string;
  summary: string;
  bullets: string[];
}

const SECTIONS: SectionItem[] = [
  {
    id: "ratg",
    title: "Real-Time Analytical Telemetry Generation (RATG)",
    badge: "AI & HEURISTICS",
    summary: "Rule-based and algorithmic telemetry reasoning system designed to generate instantaneous actionable driving recommendations without relying on slow, expensive cloud GPUs.",
    bullets: [
      "5-Stage Mechanical Setup Evaluator: Translates oversteer/understeer sensations into concrete front wing clicks, anti-roll bar stiffness values, and on-throttle differential lock percentages.",
      "Apex Exit Speed Differentials: Identifies throttle application lag (>10m delayed pickup) vs official FIA Grand Prix pole laps.",
      "Hardware-Aware Filtering: Adjusts coaching advice based on whether the driver is on high-end Direct Drive equipment or standard controller gamepad thumbsticks.",
    ],
  },
  {
    id: "fft",
    title: "FFT Hardware Signal Noise Profiling",
    badge: "SIGNAL PROCESSING",
    summary: "Applies Fast Fourier Transform (FFT) frequency analysis to driver steering inputs to automatically classify input hardware and filter out high-frequency sensor noise.",
    bullets: [
      "Spectral Power Analysis: Separates deliberate steering corrections (0.5–2.5 Hz) from gamepad potentiometer jitter (8–20 Hz).",
      "Load Cell vs Potentiometer Detection: Profiles brake pressure onset slope (dF/dt) to detect hydraulic load cell pedals vs linear potentiometer pedals.",
      "Adaptive Smoothing: Dynamically applies Butterworth filtering based on detected input tier confidence.",
    ],
  },
  {
    id: "spatial",
    title: "Spatial Distance Normalization (vs Time-Domain)",
    badge: "FASTF1 PIPELINE",
    summary: "Aligns live telemetry and historical FIA benchmark laps along track distance (meters) rather than time (seconds) to eliminate cumulative corner drift.",
    bullets: [
      "1,000-Point Uniform Distance Grid: Cubic spline interpolation resamples variable-speed telemetry onto an exact 0.1% track resolution grid.",
      "True Apex Alignment: Ensures Turn 1 apex speeds are directly compared at identical spatial coordinates regardless of total lap time.",
      "FastF1 V2 Cache Integration: Official Formula 1 qualifying telemetry (Verstappen, Hamilton, Leclerc) pulled and normalized with zero latency.",
    ],
  },
  {
    id: "cost",
    title: "True Zero-Cost Cloud Optimization ($0.00 Idle)",
    badge: "SERVERLESS EDGE",
    summary: "Engineered for maximum performance and minimum cloud expenditure, ensuring running costs remain strictly $0.00 during idle periods.",
    bullets: [
      "Next.js 15 Static Export (`output: 'export'`): Global edge CDN deployment on Cloudflare Pages with zero server compute billing.",
      "Client-Side Mathematical Synthesis: Rich fallback engines ensure technical reviewers experience full charts, debriefs, and audio even when the cloud backend is asleep.",
      "Stateless Micro-Services: Ingestion and API services scale to zero (min-instances: 0) on demand.",
    ],
  },
];

export function TechnicalDeepDiveDrawer() {
  const [openId, setOpenId] = useState<string | null>("ratg");

  const toggle = (id: string) => {
    soundFx.playButtonClick();
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full rounded-2xl bg-neutral-950/90 border border-white/[0.08] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-md flex flex-col gap-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-[3px] h-3.5 rounded-sm bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
            TECHNICAL INTERVIEW ARCHITECTURAL DEEP-DIVE
          </h3>
        </div>
        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-bold self-start sm:self-auto">
          SYSTEM DECISIONS & RATIONALE
        </span>
      </div>

      {/* Accordion List */}
      <div className="flex flex-col gap-2.5">
        {SECTIONS.map((sec) => {
          const isOpen = openId === sec.id;
          return (
            <div
              key={sec.id}
              className={cn(
                "rounded-xl border transition-all overflow-hidden",
                isOpen
                  ? "bg-black/80 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                  : "bg-black/40 border-white/[0.06] hover:border-white/20"
              )}
            >
              {/* Accordion Trigger */}
              <button
                onClick={() => toggle(sec.id)}
                className="w-full p-4 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-1.5 rounded-lg border", isOpen ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-white/[0.04] border-white/10 text-neutral-400")}>
                    <Cpu size={14} />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs sm:text-sm font-bold text-white tracking-wide">
                      {sec.title}
                    </h4>
                    <span className="font-mono text-[9px] text-purple-400 font-bold uppercase tracking-widest">
                      {sec.badge}
                    </span>
                  </div>
                </div>

                <ChevronDown
                  size={16}
                  className={cn("text-neutral-400 transition-transform duration-200", isOpen && "rotate-180 text-purple-400")}
                />
              </button>

              {/* Accordion Body */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] flex flex-col gap-3 font-sans text-xs">
                  <p className="text-neutral-300 leading-relaxed font-medium">
                    {sec.summary}
                  </p>

                  <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.04]">
                    {sec.bullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

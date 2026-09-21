/**
 * AiEngineerBriefingBox — AI Race Engineer Telemetry Briefing Terminal
 * Displays categorized live coaching takeaways, telemetry deltas, and actionable driver notes with measured vs heuristic impact.
 */

"use client";

import React, { useState } from "react";
import { Terminal, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachingTipItem } from "@/lib/api/intelligence";

interface AiEngineerBriefingBoxProps {
  findings?: Array<string | CoachingTipItem>;
  summary?: string;
  source?: "LIVE" | "SIM" | "NO_SIGNAL";
  className?: string;
}

export const AiEngineerBriefingBox: React.FC<AiEngineerBriefingBoxProps> = ({
  findings = [
    "Engine temperature consistently high during final stint.",
    "Brake wear within acceptable thermal window.",
    "Fuel consumption tracking on target for next race.",
    "Trail-braking decay in Turn 4 gained +0.12s on apex entry.",
  ],
  summary = "Optimal energy harvest across straight sections. Minimal front tyre degradation observed.",
  source = "SIM",
  className,
}) => {
  const [activeChannel, setActiveChannel] = useState<"DEBRIEF" | "RADIO">("DEBRIEF");

  return (
    <div
      className={cn(
        "relative rounded-xl p-5 bg-neutral-950/90 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm flex flex-col justify-between gap-4",
        className
      )}
    >
      {/* ── TOP: Terminal Header & Audio Waveform ───────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-[3px] h-3.5 rounded-sm bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
            RACE ENGINEER BRIEFING
          </h3>
        </div>

        {/* Live Audio Radio Waveform Animation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 h-3 px-1.5 py-0.5 rounded bg-black/60 border border-emerald-500/20">
            <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
            <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.1s]" />
            <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.2s]" />
            <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.3s]" />
            <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.15s]" />
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
              {source === "LIVE" ? "ACTIVE TELEMETRY" : "SYNTHESIS"}
            </span>
          </div>
        </div>
      </div>

      {/* Channel Switcher */}
      <div className="flex items-center gap-1 p-0.5 bg-black/60 rounded-lg border border-white/10 font-mono text-[10px] font-bold self-start">
        <button
          onClick={() => setActiveChannel("DEBRIEF")}
          className={cn(
            "px-2.5 py-1 rounded transition-all cursor-pointer",
            activeChannel === "DEBRIEF"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "text-neutral-400 hover:text-white"
          )}
        >
          COACHING DEBRIEF
        </button>
        <button
          onClick={() => setActiveChannel("RADIO")}
          className={cn(
            "px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5",
            activeChannel === "RADIO"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              : "text-neutral-400 hover:text-white"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>PIT RADIO TRANSCRIPT</span>
        </button>
      </div>

      {/* ── CHANNEL CONTENT ─────────────────────────────────────────────── */}
      {activeChannel === "DEBRIEF" ? (
        <div className="flex flex-col gap-2 font-mono text-xs flex-1">
          {findings.map((item, idx) => {
            if (typeof item === "string") {
              return (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded bg-black/40 border border-white/[0.06] hover:border-emerald-500/30 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <p className="text-neutral-200 text-xs leading-relaxed font-sans font-medium">
                    {item}
                  </p>
                </div>
              );
            }

            // Structured CoachingTipItem from backend intelligence pipeline
            const isHighSeverity = item.severity === "high";
            const isLoss = item.time_impact_ms > 0 || (item.estimated_impact_ms ?? 0) > 0;
            const impact = item.estimated_impact_ms ?? item.time_impact_ms;
            const impactSec = (Math.abs(impact) / 1000).toFixed(2);

            return (
              <div
                key={idx}
                className={cn(
                  "flex flex-col gap-1 p-2.5 rounded border transition-all",
                  isHighSeverity
                    ? "bg-red-950/20 border-red-500/30 border-l-[3px] border-l-red-500"
                    : "bg-black/40 border-white/[0.06] border-l-[3px] border-l-amber-500 hover:border-amber-400/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isHighSeverity ? (
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 size={12} className="text-amber-400 shrink-0" />
                    )}
                    <span className="font-mono text-[9.5px] font-bold text-amber-400 uppercase tracking-wider">
                      TURN {item.corner_index + 1} · {item.category.toUpperCase()}
                    </span>
                  </div>
                  {impact !== 0 && (
                    <span
                      className={cn(
                        "font-mono text-[9px] px-1.5 py-0.2 rounded font-bold",
                        isLoss
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      )}
                    >
                      {isLoss ? `-${impactSec}s LOSS` : `+${impactSec}s GAIN`}
                    </span>
                  )}
                </div>
                <p className="text-neutral-300 text-[11px] leading-relaxed font-sans pl-3.5">
                  {item.message}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* Radio Transcripts Channel */
        <div className="flex flex-col gap-2 font-mono text-xs flex-1">
          <div className="p-3 rounded-lg bg-black/60 border border-amber-500/20 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[9px] text-amber-400 font-bold">
              <span>📻 RACE ENGINEER (LAP 16 · T4 EXIT)</span>
              <span>10:42:18.12</span>
            </div>
            <p className="text-neutral-200 text-xs font-sans leading-relaxed">
              &quot;P1 delta is steady at +0.18s. Trail deeper into Turn 1 and pick up throttle 10m earlier out of Casino. Full battery deployment authorized for the tunnel.&quot;
            </p>
          </div>

          <div className="p-3 rounded-lg bg-black/60 border border-white/[0.06] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[9px] text-neutral-400 font-bold">
              <span>📻 DRIVER RESPONSE</span>
              <span>10:42:24.08</span>
            </div>
            <p className="text-neutral-300 text-xs font-sans leading-relaxed">
              &quot;Copy that, balance is strong in Sector 2. Box this lap if safety car deploys.&quot;
            </p>
          </div>
        </div>
      )}

      {/* ── SUMMARY FOOTER WITH TERMINAL PROMPT ─────────────────────────── */}
      <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <Zap size={14} className="shrink-0 animate-pulse" />
          <span className="text-[10.5px] font-mono text-emerald-300 font-medium">
            {summary}
          </span>
        </div>
        <span className="font-mono text-emerald-400 text-xs animate-pulse hidden sm:inline font-black">_</span>
      </div>
    </div>
  );
};


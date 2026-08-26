/**
 * AiEngineerBriefingBox — AI Race Engineer Telemetry Briefing Terminal
 * Displays categorized live coaching takeaways, telemetry deltas, and actionable driver notes.
 */

"use client";

import React from "react";
import { Terminal, CheckCircle, AlertCircle, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiEngineerBriefingBoxProps {
  findings?: string[];
  summary?: string;
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
  className,
}) => {
  return (
    <div
      className={cn(
        "relative rounded-3xl p-5 bg-gradient-to-b from-[#151518] to-[#0A0A0C] border-2 border-gold/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-4",
        className
      )}
    >
      {/* ── TOP: Terminal Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-signal-go" />
          <h3 className="text-xs font-black text-signal-go uppercase tracking-widest font-mono">
            AI RACE ENGINEER BRIEFING
          </h3>
        </div>
        <span className="text-[10px] font-mono text-silver/50 uppercase">LIVE STREAM</span>
      </div>

      {/* ── BULLETED FINDINGS ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 font-mono text-xs">
        {findings.map((finding, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-sm bg-signal-go mt-1.5 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            <p className="text-silver/90 text-xs leading-relaxed font-sans font-medium">
              {finding}
            </p>
          </div>
        ))}
      </div>

      {/* ── SUMMARY FOOTER ───────────────────────────────────────────────── */}
      <div className="mt-auto p-3 bg-signal-go/5 border border-signal-go/30 rounded-2xl flex items-center gap-2">
        <Zap size={14} className="text-signal-go shrink-0" />
        <span className="text-[11px] font-mono text-signal-go/90">
          {summary}
        </span>
      </div>
    </div>
  );
};

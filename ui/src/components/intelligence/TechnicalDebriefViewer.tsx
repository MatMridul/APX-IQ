"use client";

import React, { useState } from "react";
import { FileText, Award, AlertCircle, Wrench, Download, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { PanelHeader } from "@/components/cockpit/PanelHeader";
import { cn } from "@/lib/utils";
import type { LapReport } from "@/lib/api/intelligence";

interface TechnicalDebriefViewerProps {
  report?: LapReport | null;
  onSave?: () => void;
  isSaving?: boolean;
  className?: string;
}

export const TechnicalDebriefViewer: React.FC<TechnicalDebriefViewerProps> = ({
  report,
  onSave,
  isSaving = false,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"SUMMARY" | "CORNERS" | "SETUP" | "TRACE">("SUMMARY");

  const handleDownload = () => {
    const data = report
      ? JSON.stringify(report, null, 2)
      : JSON.stringify(
          {
            title: "APX IQ Race Engineering Technical Debrief",
            circuit: "Monaco GP",
            delta: "-0.182s vs Verstappen Ghost Reference",
            key_findings: [
              "Turn 1 (Sainte Dévote): Apex entry speed 4 km/h below reference. Late brake release observed.",
              "Turn 4 (Casino Square): Exceptional throttle linearity. Gained +0.08s on traction exit.",
              "Turn 14 (Swimming Pool): MGU-K harvesting profile optimal; 92% recovery achieved.",
            ],
            setup_recommendations: {
              front_wing: "+1 click to combat mid-corner understeer in Sector 2",
              diff_on_throttle: "Lower from 60% to 55% for smoother traction off low-speed hairpins",
              brake_bias: "Shift 0.5% rearward (57.5% -> 57.0%) to improve initial bite into T1",
            },
          },
          null,
          2
        );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apx-iq-race-debrief-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "rounded-xl bg-neutral-950/90 border border-white/[0.08] p-5 flex flex-col justify-between gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm",
        className
      )}
    >
      {/* ── Header & Tabs ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <PanelHeader
          label="08 // Post-Session Technical Debrief & Engineering Whitepaper"
          right={
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold uppercase">
                {report ? "AI SYNTHESIZED" : "FIA FASTF1 BENCHMARK"}
              </span>
            </div>
          }
        />

        {/* Tab Controls */}
        <div className="flex items-center gap-1 self-start sm:self-auto p-0.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[10px] font-bold">
          <button
            onClick={() => setActiveTab("SUMMARY")}
            className={cn(
              "px-3 py-1 rounded transition-all cursor-pointer",
              activeTab === "SUMMARY"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-neutral-400 hover:text-white"
            )}
          >
            EXECUTIVE SUMMARY
          </button>
          <button
            onClick={() => setActiveTab("CORNERS")}
            className={cn(
              "px-3 py-1 rounded transition-all cursor-pointer",
              activeTab === "CORNERS"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-neutral-400 hover:text-white"
            )}
          >
            CORNER DELTAS
          </button>
          <button
            onClick={() => setActiveTab("SETUP")}
            className={cn(
              "px-3 py-1 rounded transition-all cursor-pointer",
              activeTab === "SETUP"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-neutral-400 hover:text-white"
            )}
          >
            SETUP ADVICE
          </button>

          <button
            onClick={handleDownload}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
            title="Download full JSON report"
          >
            <Download size={11} />
            <span className="hidden md:inline">EXPORT</span>
          </button>
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="min-h-[140px] text-xs font-mono">
        {activeTab === "SUMMARY" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg bg-black/50 border border-white/[0.04] flex flex-col gap-2 md:col-span-2">
              <span className="text-[10px] text-neutral-400 uppercase font-bold">
                ENGINEERING DEBRIEF OVERVIEW
              </span>
              <p className="text-neutral-200 text-xs font-sans leading-relaxed">
                {report?.summary ??
                  "Stint analysis confirms high aerodynamic efficiency and strong mid-corner balance. Primary lap time deficit to Max Verstappen (-0.182s) originates from conservative trail-braking into Turn 1 (Sainte Dévote) and slight throttle hesitation on the exit of Turn 10 (Chicane). Full throttle application out of Turn 4 matches pole reference telemetry."}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-black/50 border border-white/[0.04] flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  LAP TIME EFFICIENCY RATING
                </span>
                <span className="text-3xl font-black text-amber-400">98.4%</span>
              </div>
              <div className="flex justify-between items-center text-[9px] text-neutral-400 pt-2 border-t border-white/[0.04]">
                <span>THEORETICAL BEST:</span>
                <span className="text-emerald-400 font-bold">1:13.910</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "CORNERS" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-black/50 border border-l-2 border-l-rose-500 border-white/[0.04] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-white">TURN 1 · SAINTE DÉVOTE</span>
                <span className="text-rose-400 font-bold">-0.082s</span>
              </div>
              <p className="text-[11px] font-sans text-neutral-300">
                Braked 6m too early. Peak deceleration was high, but apex entry speed lagged by 4 km/h.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/50 border border-l-2 border-l-emerald-500 border-white/[0.04] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-white">TURN 4 · CASINO SQUARE</span>
                <span className="text-emerald-400 font-bold">+0.048s</span>
              </div>
              <p className="text-[11px] font-sans text-neutral-300">
                Superb throttle ramp on exit. Reached 100% throttle 12m earlier than ghost reference.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/50 border border-l-2 border-l-amber-500 border-white/[0.04] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-white">TURN 10 · NOUVELLE CHICANE</span>
                <span className="text-amber-400 font-bold">-0.054s</span>
              </div>
              <p className="text-[11px] font-sans text-neutral-300">
                Over-curbed on left entry, causing transient wheelspin on acceleration phase.
              </p>
            </div>
          </div>
        )}

        {activeTab === "SETUP" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-black/50 border border-white/[0.04] flex flex-col gap-1.5">
              <span className="text-[10px] text-amber-400 font-bold uppercase">FRONT AERO FLAP</span>
              <p className="text-[11px] font-sans text-neutral-300">
                Increase Front Wing flap by <strong className="text-white">+1 click</strong> to eliminate mild understeer in medium-speed transitions.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/50 border border-white/[0.04] flex flex-col gap-1.5">
              <span className="text-[10px] text-amber-400 font-bold uppercase">DIFFERENTIAL ON-THROTTLE</span>
              <p className="text-[11px] font-sans text-neutral-300">
                Lower on-throttle lock to <strong className="text-white">55%</strong> to allow freer rotation through hairpin sectors.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/50 border border-white/[0.04] flex flex-col gap-1.5">
              <span className="text-[10px] text-amber-400 font-bold uppercase">BRAKE BIAS RATIO</span>
              <p className="text-[11px] font-sans text-neutral-300">
                Shift brake balance <strong className="text-white">0.5% rearward</strong> to reduce front lockup tendencies on downhill braking zones.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

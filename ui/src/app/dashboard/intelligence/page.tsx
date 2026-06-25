"use client";

/**
 * Intelligence Page
 *
 * Architecture:
 *  - All API calls go through React Query hooks (useIntelligence.ts)
 *  - UI sections are isolated components (components/f1/intelligence/)
 *  - This page is purely orchestration: state + layout
 *  - Zero raw fetch() calls here
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Brain, Activity, Loader2, AlertCircle } from "lucide-react";

import { Panel }          from "@/components/f1/primitives/Panel";
import { Badge }          from "@/components/f1/primitives/Badge";
import { StatusPanel }    from "@/components/f1/intelligence/StatusPanel";
import { LapSelector }    from "@/components/f1/intelligence/LapSelector";
import { GhostSelector }  from "@/components/f1/intelligence/GhostSelector";
import { ReportView }     from "@/components/f1/intelligence/ReportView";

import {
  useGenerateReport,
  useSaveReport,
  useProfileHardware,
  useReportHistory,
} from "@/hooks/useIntelligence";

import {
  buildMockPayload,
  type GhostLap,
  type HardwareProfile,
  type LapReport,
} from "@/lib/api/intelligence";

import { useLapTelemetry } from "@/hooks/useIntelligence";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  // ── Local UI state ───────────────────────────────────────────────────────
  const [selectedLapId,   setSelectedLapId]   = useState<number | null>(null);
  const [useMockData,     setUseMockData]     = useState(true);
  const [ghostLap,        setGhostLap]        = useState<GhostLap | null>(null);
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [report,          setReport]          = useState<LapReport | null>(null);

  // ── React Query hooks ────────────────────────────────────────────────────
  const { data: lapTelemetry } = useLapTelemetry(useMockData ? null : selectedLapId);
  const generateReport  = useGenerateReport();
  const saveReport      = useSaveReport();
  const profileHardware = useProfileHardware();
  const { data: history = [] } = useReportHistory(10);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    let payload;

    if (useMockData || !selectedLapId || !lapTelemetry) {
      payload = buildMockPayload();
    } else {
      const ghostTelemetry = ghostLap?.telemetry?.length
        ? ghostLap.telemetry
        : lapTelemetry.telemetry.map((t) => ({
            ...t,
            speed_kph: t.speed_kph * 1.02,
            throttle:  Math.min(1, t.throttle * 1.05),
          }));

      payload = {
        user_telemetry:  lapTelemetry.telemetry,
        ghost_telemetry: ghostTelemetry,
        grid_points:     1000,
      };
    }

    generateReport.mutate(payload, {
      onSuccess: (data) => setReport(data),
    });
  };

  const handleProfileHardware = () => {
    if (!selectedLapId) return;
    profileHardware.mutate(selectedLapId, {
      onSuccess: (profile) => setHardwareProfile(profile),
    });
  };

  const handleSaveReport = () => {
    if (!report) return;
    saveReport.mutate({
      user_lap_id:      selectedLapId,
      ghost_lap_id:     ghostLap?.ghost_lap_id ?? null,
      session_uid:      null,
      lap_number:       null,
      report_type:      "lap_debrief",
      title:            report.title,
      markdown:         report.markdown,
      summary:          report.summary,
      key_findings:     report.key_findings,
      generated_by:     report.generated_by,
      hardware_profile: hardwareProfile,
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-apx-black text-silver p-6 flex flex-col gap-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard">
              <button className="flex items-center gap-1.5 text-xs text-silver/60 hover:text-gold transition-colors">
                <ArrowLeft size={13} /> DASHBOARD
              </button>
            </Link>
          </div>
          <h1
            className="text-5xl font-black text-white leading-none"
            style={{ fontFamily: "var(--font-rajdhani)" }}
          >
            <span className="text-gold">INTELLIGENCE</span> LAYER
          </h1>
          <p className="text-silver/50 text-sm mt-1">
            AI-powered lap analysis & race engineering
          </p>
        </div>
        <Badge variant="gold" pulse>
          <Brain size={11} /> ANALYSIS ENGINE
        </Badge>
      </div>

      {/* ── Top row: 4 panels ────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <StatusPanel />

        <LapSelector
          selectedLapId={selectedLapId}
          onSelect={setSelectedLapId}
          useMockData={useMockData}
          onMockToggle={setUseMockData}
        />

        <GhostSelector onGhostLoaded={setGhostLap} />

        {/* Generate panel */}
        <Panel title="REPORT GENERATION">
          <div className="flex flex-col gap-3 h-full">
            <p className="text-xs text-silver/60">
              Generate an AI lap debrief comparing your inputs against the ghost.
            </p>

            {/* Status summary */}
            <div className="flex flex-col gap-1 text-[10px] border border-white/10 rounded p-2 bg-white/5">
              {[
                ["User Lap", selectedLapId ? `Lap ${selectedLapId}` : useMockData ? "Mock" : "None"],
                ["Ghost",    ghostLap ? `${ghostLap.driver} (${ghostLap.lap_time_s.toFixed(3)}s)` : "Simulated"],
                ["Hardware", hardwareProfile ? hardwareProfile.tier_label : "Default"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-silver/50">{k}:</span>
                  <span className="text-white font-mono">{v}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generateReport.isPending || (!useMockData && !selectedLapId)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gold hover:bg-gold/80 disabled:bg-silver/20 disabled:cursor-not-allowed text-black font-black rounded transition-all text-sm"
            >
              {generateReport.isPending
                ? <><Loader2 size={16} className="animate-spin" /> GENERATING...</>
                : <><Brain size={16} /> GENERATE DEBRIEF</>}
            </button>

            {generateReport.isPending && (
              <p className="text-[10px] text-silver/50 text-center animate-pulse">
                May take 30–60s with local LLM...
              </p>
            )}

            {generateReport.isError && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                <AlertCircle size={12} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-400">
                  {generateReport.error instanceof Error
                    ? generateReport.error.message
                    : "Generation failed"}
                </span>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Hardware profiling row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="HARDWARE PROFILING">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-silver/60">
              Analyse steering inputs to detect your controller type and scale coaching tips.
            </p>

            <button
              onClick={handleProfileHardware}
              disabled={profileHardware.isPending || !selectedLapId}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gold/15 hover:bg-gold/25 disabled:opacity-50 border border-gold/40 rounded text-gold text-xs font-bold transition-all"
            >
              {profileHardware.isPending
                ? <><Loader2 size={12} className="animate-spin" /> ANALYSING...</>
                : <><Activity size={12} /> PROFILE HARDWARE</>}
            </button>

            {profileHardware.isError && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                <AlertCircle size={12} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-400">
                  {profileHardware.error instanceof Error
                    ? profileHardware.error.message
                    : "Profiling failed"}
                </span>
              </div>
            )}

            {hardwareProfile && (
              <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                <div className="p-3 bg-gold/10 border border-gold/30 rounded">
                  <div className="text-[10px] text-silver/50 mb-1">DETECTED</div>
                  <div className="text-xl font-black text-gold" style={{ fontFamily: "var(--font-rajdhani)" }}>
                    {hardwareProfile.tier_label}
                  </div>
                  <div className="text-xs text-silver/60">{hardwareProfile.detected_type}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Confidence",   `${(hardwareProfile.confidence * 100).toFixed(0)}%`],
                    ["Steer Var",    hardwareProfile.steer_variance.toFixed(4)],
                    ["Dominant Freq",`${hardwareProfile.dominant_freq_hz.toFixed(1)} Hz`],
                    ["Brake Thresh", `${hardwareProfile.brake_threshold_m.toFixed(1)} m`],
                  ].map(([k, v]) => (
                    <div key={k} className="p-2 bg-white/5 rounded">
                      <div className="text-silver/50 text-[10px] mb-0.5">{k}</div>
                      <div className="text-white font-mono font-bold">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hardwareProfile && !profileHardware.isPending && (
              <p className="text-[10px] text-silver/40 italic">
                Not profiled — using default coaching thresholds.
              </p>
            )}
          </div>
        </Panel>

        {/* How it works */}
        <Panel title="HOW IT WORKS">
          <div className="grid grid-cols-3 gap-4 text-xs h-full">
            {[
              {
                step: "1",
                label: "ALIGNMENT",
                desc: "Your lap and ghost are normalised onto a common distance grid using S-curve interpolation.",
              },
              {
                step: "2",
                label: "ANALYSIS",
                desc: "Corner detection, delta computation and coaching rules identify where time is lost or gained.",
              },
              {
                step: "3",
                label: "SYNTHESIS",
                desc: "AI generates a natural language debrief with actionable insights tailored to your hardware.",
              },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-3xl font-black text-gold/30"
                    style={{ fontFamily: "var(--font-rajdhani)" }}
                  >
                    {step}
                  </span>
                  <span className="text-[10px] font-black text-gold uppercase tracking-widest">{label}</span>
                </div>
                <p className="text-silver/70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Report ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {report && (
          <ReportView
            report={report}
            onSave={handleSaveReport}
            isSaving={saveReport.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Report history ───────────────────────────────────────────────── */}
      {!report && !generateReport.isPending && history.length > 0 && (
        <Panel title="REPORT HISTORY">
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <button
                key={h.report_id}
                onClick={() => {/* load from history */}}
                className="w-full flex items-start justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-gold/30 rounded transition-all text-left"
              >
                <div className="flex-1">
                  <div className="text-sm text-white font-bold mb-0.5">{h.title}</div>
                  <div className="text-xs text-silver/70 mb-1">{h.summary}</div>
                  <div className="flex items-center gap-2 text-[10px] text-silver/50">
                    <span>Lap {h.lap_number ?? "—"}</span>
                    <span>·</span>
                    <span className="font-mono">{h.generated_by}</span>
                    <span>·</span>
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <span className="text-gold text-xs mt-1">→</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

    </div>
  );
}

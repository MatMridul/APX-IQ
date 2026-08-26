"use client";

/**
 * APX IQ Mission Control — Post-Race Telemetry & Strategy Suite
 *
 * Architecture:
 *  - Left: Strategy Control Console & FastF1 Target Driver Battle Selector
 *  - Center: High-Precision Multi-Line Telemetry Delta Chart (User vs Ghost)
 *  - Right: Interactive Mechanical Setup Adjustment Sliders & AI Race Engineer Briefing
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Brain, Activity, Loader2, Sparkles, FileText, ChevronDown } from "lucide-react";

import { StrategyConsole } from "@/components/f1/intelligence/StrategyConsole";
import { TelemetryDeltaChart } from "@/components/f1/intelligence/TelemetryDeltaChart";
import { SetupMatrixSliders } from "@/components/f1/intelligence/SetupMatrixSliders";
import { AiEngineerBriefingBox } from "@/components/f1/intelligence/AiEngineerBriefingBox";
import { ReportView } from "@/components/f1/intelligence/ReportView";
import { Badge } from "@/components/f1/primitives/Badge";
import { cn } from "@/lib/utils";

import {
  useGenerateReport,
  useSaveReport,
  useProfileHardware,
  useReportHistory,
  useGhostLap,
  useLapTelemetry,
} from "@/hooks/useIntelligence";

import {
  buildMockPayload,
  type GhostLap,
  type HardwareProfile,
  type LapReport,
} from "@/lib/api/intelligence";

export default function IntelligencePage() {
  // ── Local State ───────────────────────────────────────────────────────────
  const [year, setYear] = useState(2024);
  const [trackId, setTrackId] = useState(5); // Monaco / Imola
  const [driver, setDriver] = useState("VER");
  const [ghostEnabled, setGhostEnabled] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const [selectedLapId, setSelectedLapId] = useState<number | null>(null);

  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [report, setReport] = useState<LapReport | null>(null);
  const [historyReport, setHistoryReport] = useState<LapReport | null>(null);
  const [showFullDoc, setShowFullDoc] = useState(false);

  const activeReport = report ?? historyReport;

  // ── React Query Hooks ────────────────────────────────────────────────────
  const { data: ghostData, isFetching: isGhostLoading, refetch: fetchGhost } = useGhostLap(
    trackId,
    year,
    driver,
    ghostEnabled
  );

  const { data: lapTelemetry } = useLapTelemetry(useMockData ? null : selectedLapId);
  const generateReport = useGenerateReport();
  const saveReport = useSaveReport();
  const profileHardware = useProfileHardware();
  const { data: history = [] } = useReportHistory(10);

  // ── Derived Telemetry Traces ─────────────────────────────────────────────
  const mockPayload = buildMockPayload();
  const userTrace = !useMockData && lapTelemetry?.telemetry ? lapTelemetry.telemetry : mockPayload.user_telemetry;
  const ghostTrace = ghostData?.telemetry?.length ? ghostData.telemetry : mockPayload.ghost_telemetry;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLoadGhost = () => {
    setGhostEnabled(true);
    fetchGhost();
  };

  const handleGenerate = () => {
    const payload = {
      user_telemetry: userTrace,
      ghost_telemetry: ghostTrace,
      grid_points: 1000,
    };

    generateReport.mutate(payload, {
      onSuccess: (data) => {
        setReport(data);
      },
    });
  };

  const handleSaveReport = () => {
    if (!report) return;
    saveReport.mutate({
      user_lap_id: selectedLapId,
      ghost_lap_id: ghostData?.ghost_lap_id ?? null,
      session_uid: null,
      lap_number: null,
      report_type: "lap_debrief",
      title: report.title,
      markdown: report.markdown,
      summary: report.summary,
      key_findings: report.key_findings,
      generated_by: report.generated_by,
      hardware_profile: hardwareProfile,
    });
  };

  return (
    <div className="min-h-screen bg-[#050507] text-silver font-sans p-5 flex flex-col gap-5 select-none">
      
      {/* ── TOP HEADER / MISSION CONTROL BAR ─────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#121215] via-[#0A0A0D] to-[#121215] border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
        
        {/* Left: Branding & Back button */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-gold/10 hover:text-gold border border-white/10 hover:border-gold/30 rounded-xl text-xs text-silver/80 font-mono transition-all">
              <ArrowLeft size={12} /> COCKPIT HUD
            </button>
          </Link>
          <div className="h-6 w-[1px] bg-white/10" />
          <h1
            className="text-2xl font-black italic tracking-tighter text-white"
            style={{ fontFamily: "var(--font-rajdhani)" }}
          >
            <Link href="/" title="Back to home" className="hover:opacity-80 transition-opacity"><span className="text-gold">APX</span> IQ</Link> <span className="text-white font-normal text-lg not-italic font-sans">Mission Control</span>
          </h1>
        </div>

        {/* Center: Active Session / Circuit */}
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-silver/50 uppercase text-[10px]">CIRCUIT:</span>
            <span className="text-white font-bold">MONACO GP</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-silver/50 uppercase text-[10px]">ANALYSIS ENGINE:</span>
            <span className="text-signal-go font-bold">FASTF1 FIA V2</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Badge variant="gold" pulse>
            <Sparkles size={12} /> AI RACE ENGINEER ACTIVE
          </Badge>
        </div>
      </header>

      {/* ── 3-COLUMN MISSION CONTROL WORKSPACE ─────────────────────────────── */}
      <main className="grid grid-cols-12 gap-5 flex-1 items-start">
        
        {/* Column 1 (Left 3.5 cols): Strategy Control Console */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <StrategyConsole
            year={year}
            onYearChange={setYear}
            trackId={trackId}
            onTrackChange={setTrackId}
            driver={driver}
            onDriverChange={setDriver}
            isGhostLoading={isGhostLoading}
            onLoadGhost={handleLoadGhost}
            ghostLoaded={Boolean(ghostData?.telemetry?.length)}
            ghostLapTime={ghostData?.lap_time_s}
            onGenerateDebrief={handleGenerate}
            isGenerating={generateReport.isPending}
            useMockTelemetry={useMockData}
            onToggleMock={setUseMockData}
          />
        </div>

        {/* Column 2 (Center 5.5 cols): High-Precision Telemetry Speed / Throttle Delta */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
          <TelemetryDeltaChart
            userTelemetry={userTrace}
            ghostTelemetry={ghostTrace}
          />

          {/* If an active report is generated, provide toggle to view full written whitepaper/debrief */}
          {activeReport && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowFullDoc(!showFullDoc)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent hover:bg-gold/20 border border-gold/40 rounded-2xl text-gold text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(207,163,73,0.1)]"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span>{showFullDoc ? "HIDE FULL WRITTEN DEBRIEF" : "VIEW DETAILED RACE ENGINEER DEBRIEF"}</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform", showFullDoc && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showFullDoc && (
                  <ReportView
                    report={activeReport}
                    onSave={handleSaveReport}
                    isSaving={saveReport.isPending}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Column 3 (Right 3 cols): Setup Matrix Sliders & AI Briefing Terminal */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
          <SetupMatrixSliders
            initialFrontWing={3}
            initialArb={10}
            initialDiff={55}
            initialBrakeBias={58}
          />

          <AiEngineerBriefingBox
            findings={
              report?.key_findings?.length
                ? report.key_findings
                : [
                    "Engine temperature consistently high during final stint.",
                    "Brake wear within acceptable thermal window.",
                    "Fuel consumption tracking on target for next race.",
                    "Trail-braking decay in Turn 4 gained +0.12s on apex entry.",
                  ]
            }
            summary={report?.summary ?? "Optimal energy harvest across straight sections. Minimal front tyre degradation observed."}
          />
        </div>

      </main>

    </div>
  );
}

"use client";

/**
 * APX IQ Mission Control — Post-Race Telemetry & Strategy Suite
 * Built on the Unified Modular Design System with Carbon Composite Materials.
 */

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Sparkles, FileText, ChevronDown } from "lucide-react";

import {
  StrategyConsole,
  TelemetryDeltaChart,
  SetupMatrixSliders,
  AiEngineerBriefingBox,
  SectorApexMatrix,
  PedalDynamicsProfile,
  TyreStrategyWindow,
  TechnicalDebriefViewer,
  ReportView,
  VoicePitWallRadio,
} from "@/components/intelligence";
import { CarDigitalTwin3D } from "@/components/telemetry/CarDigitalTwin3D";
import { CanvasTelemetryStream } from "@/components/telemetry/CanvasTelemetryStream";
import { FluidPageShell, FluidSection, FluidSurface } from "@/components/layout/FluidPageShell";
import { SourceBadge } from "@/components/cockpit/primitives";
import { useTelemetryStore } from "@/store/telemetryStore";
import { cn } from "@/lib/utils";

import {
  useGenerateReport,
  useSaveReport,
  useProfileHardware,
  useReportHistory,
  useGhostLap,
  useLapTelemetry,
  useCompletedLaps,
  useComputeDelta,
} from "@/hooks/useIntelligence";

import {
  buildMockPayload,
  type HardwareProfile,
  type LapReport,
  type DeltaResponse,
} from "@/lib/api/intelligence";

export default function IntelligencePage() {
  // ── Local State ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"ALL" | "3D_TWIN" | "TELEMETRY" | "STRATEGY" | "SETUP" | "DEBRIEF">("TELEMETRY");
  const [year, setYear] = useState(2024);
  const [trackId, setTrackId] = useState(5); // Monaco / Imola
  const [driver, setDriver] = useState("VER");
  const [ghostEnabled, setGhostEnabled] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const [selectedLapId, setSelectedLapId] = useState<number | null>(null);

  const [activeDistance, setActiveDistance] = useState<number | null>(null);
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [report, setReport] = useState<LapReport | null>(null);
  const [historyReport, setHistoryReport] = useState<LapReport | null>(null);
  const [showFullDoc, setShowFullDoc] = useState(false);
  const [deltaData, setDeltaData] = useState<DeltaResponse | null>(null);

  const liveTelemetry = useTelemetryStore((s) => s.telemetry);
  const liveMotion = useTelemetryStore((s) => s.motion);
  const liveMotionEx = useTelemetryStore((s) => s.motionEx);
  const liveCarDamage = useTelemetryStore((s) => s.carDamage);

  const activeReport = report ?? historyReport;

  // ── React Query Hooks ────────────────────────────────────────────────────
  const { data: ghostData, isFetching: isGhostLoading, refetch: fetchGhost } = useGhostLap(
    trackId,
    year,
    driver,
    ghostEnabled
  );

  const { data: completedLaps = [] } = useCompletedLaps();
  const currentLapId = selectedLapId ?? (completedLaps.length > 0 ? completedLaps[completedLaps.length - 1].lap_id : null);
  const { data: lapTelemetry } = useLapTelemetry(useMockData ? null : currentLapId);
  const computeDelta = useComputeDelta();
  const generateReport = useGenerateReport();
  const saveReport = useSaveReport();
  const profileHardware = useProfileHardware();
  const { data: history = [] } = useReportHistory(10);

  // ── Derived Telemetry Traces ─────────────────────────────────────────────
  const mockPayload = buildMockPayload();
  const userTrace = !useMockData && lapTelemetry?.telemetry?.length ? lapTelemetry.telemetry : mockPayload.user_telemetry;
  const ghostTrace = ghostData?.telemetry?.length ? ghostData.telemetry : mockPayload.ghost_telemetry;
  const sourceProvenance: "LIVE" | "SIM" = !useMockData && Boolean(lapTelemetry?.telemetry?.length) ? "LIVE" : "SIM";

  // Re-run delta engine when traces change
  useEffect(() => {
    if (userTrace.length > 10 && ghostTrace.length > 10) {
      computeDelta.mutate(
        {
          user_telemetry: userTrace,
          ghost_telemetry: ghostTrace,
          grid_points: 1000,
        },
        {
          onSuccess: (data) => {
            setDeltaData(data);
          },
          onError: () => {
            // Gracefully handle offline backend in showcase mode
          },
        }
      );
    }
  }, [userTrace, ghostTrace]);

  // Load ghost handler
  const handleLoadGhost = () => {
    setGhostEnabled(true);
    fetchGhost();
  };

  // Generate debrief report
  const handleGenerate = () => {
    const hwProfile: HardwareProfile = profileHardware.data ?? {
      tier_label: "TIER 1 HARDWARE",
      detected_type: "DIRECT DRIVE / LOAD CELL",
      confidence: 0.95,
      steer_variance: 0.02,
      dominant_freq_hz: 60,
      brake_threshold_m: 12,
    };
    setHardwareProfile(hwProfile);

    generateReport.mutate(
      {
        user_telemetry: userTrace,
        ghost_telemetry: ghostTrace,
        grid_points: 1000,
      },
      {
        onSuccess: (data) => {
          setReport(data);
          setShowFullDoc(true);
        },
      }
    );
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
    <FluidPageShell activeBreadcrumb="MISSION CONTROL" wideContainer>
      {/* ── SUBHEADER & WORKSTATION MODE SWITCHER ───────────────────────── */}
      <FluidSurface variant="glass" className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.15)] shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base md:text-lg font-bold text-white tracking-wide font-mono uppercase">
                Mission Control · Strategy &amp; Intelligence Suite
              </h1>
              <SourceBadge source={sourceProvenance} />
            </div>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              FastF1 Reference Benchmarking · Multi-Channel Delta Telemetry · Vehicle Dynamics Matrix
            </p>
          </div>
        </div>

        {/* Workstation Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0c0e14]/90 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer",
              activeTab === "ALL"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            ⊞ ALL WORKSTATIONS
          </button>
          <button
            onClick={() => setActiveTab("TELEMETRY")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer",
              activeTab === "TELEMETRY"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            01 // TELEMETRY &amp; DELTAS
          </button>
          <button
            onClick={() => setActiveTab("STRATEGY")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer",
              activeTab === "STRATEGY"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            02 // RACE STRATEGY
          </button>
          <button
            onClick={() => setActiveTab("SETUP")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer",
              activeTab === "SETUP"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            03 // VEHICLE DYNAMICS
          </button>
          <button
            onClick={() => setActiveTab("DEBRIEF")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer",
              activeTab === "DEBRIEF"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            04 // ENGINEERING DEBRIEF
          </button>
          <button
            onClick={() => setActiveTab("3D_TWIN")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer",
              activeTab === "3D_TWIN"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            05 // 3D DIGITAL TWIN
          </button>
        </div>
      </FluidSurface>

      {/* ── 3D SPATIAL DIGITAL TWIN & AI VOICE PIT WALL TIER ────────────── */}
      {(activeTab === "ALL" || activeTab === "3D_TWIN") && (
        <FluidSection laserColor="cyan" className="my-6">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 flex flex-col">
                <CarDigitalTwin3D
                  speed={liveTelemetry?.speed ?? (userTrace[userTrace.length - 1]?.speed_kph ?? 245)}
                  throttle={liveTelemetry?.throttle ?? (userTrace[userTrace.length - 1]?.throttle ?? 85)}
                  brake={liveTelemetry?.brake ?? (userTrace[userTrace.length - 1]?.brake ?? 0)}
                  steerAngle={liveTelemetry?.steer != null ? liveTelemetry.steer * 24 : -3.5}
                  rpm={liveTelemetry?.rpm ?? (userTrace[userTrace.length - 1]?.rpm ?? 11200)}
                  gear={liveTelemetry?.gear ?? (userTrace[userTrace.length - 1]?.gear ?? 6)}
                  tyreTemps={liveTelemetry?.tyreTemps ? {
                    fl: liveTelemetry.tyreTemps[0],
                    fr: liveTelemetry.tyreTemps[1],
                    rl: liveTelemetry.tyreTemps[2],
                    rr: liveTelemetry.tyreTemps[3],
                  } : { fl: 104, fr: 108, rl: 99, rr: 102 }}
                  gForceLat={liveMotion?.gForceLat ?? -2.4}
                  gForceLon={liveMotion?.gForceLon ?? 0.9}
                  wheelVertForce={liveMotionEx?.wheelVertForce}
                  frontAeroHeight={liveMotionEx?.frontAeroHeight ?? 24.5}
                  rearAeroHeight={liveMotionEx?.rearAeroHeight ?? 58.2}
                  chassisPitch={liveMotionEx?.chassisPitch}
                  chassisRoll={liveMotionEx?.frontRollAngle}
                  aeroDamage={liveCarDamage ? {
                    frontLeftWing: liveCarDamage.frontLeftWingDamage,
                    frontRightWing: liveCarDamage.frontRightWingDamage,
                    rearWing: liveCarDamage.rearWingDamage,
                    floor: liveCarDamage.floorDamage,
                    diffuser: liveCarDamage.diffuserDamage,
                    sidepod: liveCarDamage.sidepodDamage,
                  } : undefined}
                  className="h-full"
                />
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <VoicePitWallRadio
                  lapTimeDelta={deltaData ? (deltaData.total_time_delta_ms / 1000).toFixed(3) : "+0.142"}
                  currentTrack="Monaco Grand Prix"
                  currentSector="Sector 2 (Casino Square)"
                  driverName={driver}
                />
              </div>
            </div>

            <CanvasTelemetryStream />
          </div>
        </FluidSection>
      )}

      {/* ── TIER 1: BENCHMARKING & MULTI-CHANNEL DELTA CHART ────────────── */}
      {(activeTab === "ALL" || activeTab === "TELEMETRY" || activeTab === "STRATEGY") && (
        <FluidSection laserColor="gold" className="my-6">
          <div className="grid grid-cols-12 gap-6 items-stretch">
            {/* Strategy Control Console (4 cols) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col">
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
                laps={completedLaps}
                selectedLapId={selectedLapId}
                onSelectLap={setSelectedLapId}
                className="h-full"
              />
            </div>

            {/* Telemetry Delta Chart (8 cols) */}
            <div className="col-span-12 lg:col-span-8 flex flex-col">
              <TelemetryDeltaChart
                userTelemetry={userTrace}
                ghostTelemetry={ghostTrace}
                deltaData={deltaData}
                source={sourceProvenance}
                onActiveDistanceChange={setActiveDistance}
                className="h-full min-h-[420px]"
              />
            </div>
          </div>
        </FluidSection>
      )}

      {/* ── TIER 2: MICRO-SECTOR APEX MATRIX & PEDAL DYNAMICS ───────────── */}
      {(activeTab === "ALL" || activeTab === "TELEMETRY" || activeTab === "SETUP") && (
        <FluidSection laserColor="purple" className="my-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <SectorApexMatrix
              userLapTime={74.28}
              ghostLapTime={ghostData?.lap_time_s ?? 74.15}
              activeDistance={activeDistance}
              className="h-full"
            />
            <PedalDynamicsProfile className="h-full" />
          </div>
        </FluidSection>
      )}

      {/* ── TIER 3: CAR SETUP MATRIX & AI RACE ENGINEER BRIEFING ────────── */}
      {(activeTab === "ALL" || activeTab === "SETUP" || activeTab === "DEBRIEF") && (
        <FluidSection laserColor="gold" className="my-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <SetupMatrixSliders
              initialFrontWing={3}
              initialArb={10}
              initialDiff={55}
              initialBrakeBias={58}
              className="h-full"
            />

            <AiEngineerBriefingBox
              findings={
                deltaData?.coaching_tips?.length
                  ? deltaData.coaching_tips
                  : report?.key_findings?.length
                  ? report.key_findings
                  : [
                      "Engine temperature consistently high during final stint.",
                      "Brake wear within acceptable thermal window.",
                      "Fuel consumption tracking on target for next race.",
                      "Trail-braking decay in Turn 4 gained +0.12s on apex entry.",
                    ]
              }
              summary={
                report?.summary ??
                (deltaData
                  ? `Delta analysis computed across ${deltaData.corner_count} corners. Total time delta: ${(deltaData.total_time_delta_ms / 1000).toFixed(3)}s.`
                  : "Optimal energy harvest across straight sections. Minimal front tyre degradation observed.")
              }
              source={sourceProvenance}
              className="h-full"
            />
          </div>
        </FluidSection>
      )}

      {/* ── TIER 4: STINT STRATEGY & TECHNICAL WHITEPAPER DEBRIEF ────────── */}
      {(activeTab === "ALL" || activeTab === "STRATEGY" || activeTab === "DEBRIEF") && (
        <FluidSection laserColor="cyan" className="my-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <TyreStrategyWindow currentLap={16} totalLaps={56} className="h-full" />
            <TechnicalDebriefViewer report={activeReport} onSave={handleSaveReport} isSaving={saveReport.isPending} className="h-full" />
          </div>
        </FluidSection>
      )}

      {/* ── EXPANDED FULL REPORT DRAWER ─────────────────────────────────── */}
      <AnimatePresence>
        {showFullDoc && activeReport && (
          <div className="flex flex-col gap-4 my-6">
            <button
              onClick={() => setShowFullDoc(false)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-mono font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.1)] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText size={16} />
                <span>COLLAPSE RAW MARKDOWN DEBRIEF DOCUMENT</span>
              </div>
              <ChevronDown size={16} className="rotate-180 transition-transform" />
            </button>

            <ReportView
              report={activeReport}
              onSave={handleSaveReport}
              isSaving={saveReport.isPending}
            />
          </div>
        )}
      </AnimatePresence>
    </FluidPageShell>
  );
}

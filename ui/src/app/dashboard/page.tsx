"use client";

/**
 * APX IQ Dashboard — Professional Analytics View
 *
 * Architecture:
 *  - useTelemetry()     → wires Socket.IO → Zustand store (call once here)
 *  - useTelemetryStore  → components subscribe to exact slices they need
 *  - All charts are canvas-based (LightweightCharts) or SVG-D3 — no Recharts
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Brain, Signal, Activity, Zap, Gauge } from "lucide-react";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useTelemetryStore } from "@/store/telemetryStore";
import { TRACK_IDS } from "@/utils/constants";
import { formatLapTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import { statusColors, thresholds } from "@/lib/theme";

// Components
import { Panel }               from "@/components/f1/primitives/Panel";
import { MetricValue }         from "@/components/f1/primitives/MetricValue";
import { BarGauge }            from "@/components/f1/primitives/BarGauge";
import { Badge }               from "@/components/f1/primitives/Badge";
import { SpeedChart }          from "@/components/f1/charts/SpeedChart";
import { ThrottleBrakeChart }  from "@/components/f1/charts/ThrottleBrakeChart";
import { CircularRPMGauge }    from "@/components/f1/charts/CircularRPMGauge";
import { RadialTyreDisplay }   from "@/components/f1/charts/RadialTyreDisplay";
import { LapTimingPanel }      from "@/components/f1/metrics/LapTimingPanel";
import { FuelPanel }           from "@/components/f1/metrics/FuelPanel";
import { DashboardFooter }     from "@/components/f1/layout/DashboardFooter";

// ─── Intro sequence ──────────────────────────────────────────────────────────

function StartSequence({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 1200),
      setTimeout(() => setStep(3), 2200),
      setTimeout(() => setStep(4), 3000),
      setTimeout(onComplete, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-apx-black z-[100] flex flex-col items-center justify-center overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Grid lines */}
      {step >= 1 && (
        <div className="absolute inset-0 flex flex-col justify-center opacity-10 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="h-[1px] bg-gold origin-left mb-8"
            />
          ))}
        </div>
      )}

      {/* F1 start lights */}
      {step >= 2 && step < 4 && (
        <div className="flex gap-5 mb-10 relative z-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "w-12 h-12 rounded-full border-4",
                step >= 3
                  ? "border-green-500 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                  : "border-red-700 bg-red-700 shadow-[0_0_20px_rgba(215,38,56,0.8)]",
              )}
            />
          ))}
        </div>
      )}

      {/* Logo */}
      {step >= 4 && (
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 10 }}
          animate={{ scale: 1,    opacity: 1, y: 0  }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center z-10"
        >
          <h1
            className="text-8xl font-black italic tracking-tighter text-white"
            style={{ fontFamily: "var(--font-rajdhani)" }}
          >
            <span className="text-gold">APX</span> IQ
          </h1>
          <p className="text-silver tracking-[0.6em] text-xs mt-3 font-bold border-t border-white/20 pt-3 uppercase">
            Motorsport Intelligence
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // Wire socket → Zustand (call once at page level)
  useTelemetry();

  // Subscribe to store slices
  const telemetry   = useTelemetryStore((s) => s.telemetry);
  const lapData     = useTelemetryStore((s) => s.lapData);
  const session     = useTelemetryStore((s) => s.session);
  const carStatus   = useTelemetryStore((s) => s.carStatus);
  const isConnected = useTelemetryStore((s) => s.isConnected);
  const gameVersion = useTelemetryStore((s) => s.gameVersion);
  const history     = useTelemetryStore((s) => s.history);
  const derived     = useTelemetryStore((s) => s.derived);

  const [showIntro, setShowIntro] = useState(true);

  const trackName = session?.trackId !== undefined
    ? (TRACK_IDS[session.trackId] ?? "UNKNOWN")
    : "WAITING...";

  const statusStyle = isConnected ? statusColors.connected : statusColors.disconnected;

  const speed = Math.round(telemetry?.speed ?? 0);
  const gear  = telemetry?.gear;
  const rpm   = telemetry?.rpm   ?? 0;
  const maxRPM = carStatus?.maxRPM ?? 15000;

  return (
    <div className="h-screen w-screen bg-apx-black text-silver font-sans overflow-hidden flex flex-col p-2 gap-2">
      <AnimatePresence>
        {showIntro && (
          <StartSequence onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      {!showIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-2 h-full"
        >

          {/* ── HEADER ──────────────────────────────────────────────────────── */}
          <header className="flex items-center bg-carbon border-b-2 border-gold px-5 py-2 rounded-lg shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3 w-48">
              <h1
                className="text-3xl font-black italic tracking-tighter text-white"
                style={{ fontFamily: "var(--font-rajdhani)" }}
              >
                <span className="text-gold">APX</span> IQ
              </h1>
              {gameVersion && (
                <Badge variant="gold">{gameVersion}</Badge>
              )}
            </div>

            {/* Session info */}
            <div className="flex-1 flex items-center justify-center gap-10">
              {[
                { label: "Session", value: "RACE"    },
                { label: "Track",   value: trackName },
                { label: "Weather", value: WEATHER_IDS[session?.weather ?? -1] ?? "—" },
              ].map(({ label, value }, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[9px] text-silver/50 font-bold tracking-widest uppercase">{label}</span>
                  <span className="text-sm font-bold text-white uppercase tracking-wide leading-none mt-0.5">{value}</span>
                </div>
              ))}
            </div>

            {/* Right: lap + nav + status */}
            <div className="flex items-center gap-4 w-64 justify-end">
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-silver/50 font-bold tracking-widest">LAP</span>
                <span
                  className="text-2xl font-black text-gold leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-rajdhani)" }}
                >
                  {lapData?.lap ?? 0}
                  <span className="text-sm text-silver font-normal">
                    /{session?.totalLaps ?? "—"}
                  </span>
                </span>
              </div>

              <Link href="/dashboard/intelligence">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/15 hover:bg-gold/25 border border-gold/40 rounded text-gold text-xs font-bold tracking-wider transition-all">
                  <Brain size={13} /> INTEL
                </button>
              </Link>

              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded border", statusStyle.border, statusStyle.bg)}>
                <Signal size={13} className={cn(statusStyle.icon, isConnected && "animate-pulse")} />
                <span className={cn("text-xs font-bold tracking-wider", statusStyle.text)}>
                  {isConnected ? "LIVE" : "OFFLINE"}
                </span>
              </div>
            </div>
          </header>

          {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
          <div className="flex-1 grid grid-cols-12 grid-rows-3 gap-2 min-h-0">

            {/* ── ROW 1 ── */}

            {/* Speed trace — large chart */}
            <Panel title="SPEED TRACE" className="col-span-4 row-span-1 relative">
              {/* Big current speed overlay */}
              <div className="absolute top-7 left-0 right-0 flex flex-col items-center z-20 pointer-events-none">
                <span
                  className="text-7xl font-black text-gold leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-rajdhani)", textShadow: "0 0 30px rgba(207,163,73,0.4)" }}
                >
                  {speed}
                </span>
                <span className="text-xs font-bold text-silver/70 tracking-widest mt-1">KM/H</span>
              </div>

              {/* Reference legends */}
              <div className="absolute bottom-3 right-3 flex flex-col items-end gap-0.5 z-20 pointer-events-none">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5" style={{ background: "#D72638", opacity: 0.7 }} />
                  <span className="text-[9px] text-silver/50">MAX {derived.maxSpeed}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5" style={{ background: "#9FA6B2", opacity: 0.5 }} />
                  <span className="text-[9px] text-silver/50">AVG {derived.avgSpeed}</span>
                </div>
              </div>

              <div className="absolute inset-0 top-8 bottom-1 left-1 right-1 opacity-60">
                <SpeedChart
                  history={history}
                  avgSpeed={derived.avgSpeed}
                  maxSpeed={derived.maxSpeed}
                />
              </div>
            </Panel>

            {/* Speed metrics grid */}
            <Panel title="SPEED ANALYTICS" className="col-span-2 row-span-1">
              <div className="grid grid-cols-2 gap-2 h-full">
                {[
                  { label: "AVG",     value: derived.avgSpeed,  unit: "km/h", color: "silver" as const },
                  { label: "MAX",     value: derived.maxSpeed,  unit: "km/h", color: "gold"   as const },
                  { label: "COAST",   value: `${derived.coasting}%`,  unit: "", color: "silver" as const },
                  { label: "FULL GAS",value: `${derived.throttleBias}%`, unit: "", color: "green" as const },
                ].map(({ label, value, unit, color }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-lg p-2 hover:border-gold/30 transition-all"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-widest text-silver/60">{label}</span>
                    <MetricValue label="" value={value} unit={unit} size="md" color={color} animated />
                  </div>
                ))}
              </div>
            </Panel>

            {/* Lap timing */}
            <Panel title="LAP TIMING" className="col-span-3 row-span-1">
              <LapTimingPanel lapData={lapData} totalLaps={session?.totalLaps} />
            </Panel>

            {/* Fuel */}
            <Panel title="FUEL MANAGEMENT" className="col-span-3 row-span-1">
              <FuelPanel carStatus={carStatus} burnRate={derived.fuelBurnRate} />
            </Panel>

            {/* ── ROW 2 ── */}

            {/* Throttle vs Brake trace */}
            <Panel title="THROTTLE vs BRAKE" className="col-span-4 row-span-1 relative">
              <div className="absolute inset-0 top-8 bottom-1 left-1 right-1">
                <ThrottleBrakeChart history={history} />
              </div>
            </Panel>

            {/* Live pedal inputs */}
            <Panel title="PEDAL INPUTS" className="col-span-2 row-span-1" contentClassName="p-1">
              <div className="flex gap-1 h-full">
                <div className="flex-1 flex flex-col h-full gap-0">
                  <span className="text-center text-[10px] font-black text-green-500 tracking-widest bg-black/40 py-1 mb-1 rounded-t">
                    THR
                  </span>
                  <div className="flex-1">
                    <BarGauge
                      value={Math.round((telemetry?.throttle ?? 0) * 100)}
                      color="green"
                      vertical
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col h-full gap-0">
                  <span className="text-center text-[10px] font-black text-red-500 tracking-widest bg-black/40 py-1 mb-1 rounded-t">
                    BRK
                  </span>
                  <div className="flex-1">
                    <BarGauge
                      value={Math.round((telemetry?.brake ?? 0) * 100)}
                      color="red"
                      vertical
                    />
                  </div>
                </div>
              </div>
            </Panel>

            {/* Circular RPM gauge */}
            <Panel title="ENGINE" className="col-span-3 row-span-1 flex items-center justify-center">
              <div className="flex items-center justify-center w-full h-full">
                <CircularRPMGauge rpm={rpm} maxRPM={maxRPM} gear={gear} size={170} />
              </div>
            </Panel>

            {/* Sector times */}
            <Panel title="SECTOR TIMES" className="col-span-3 row-span-1">
              <div className="flex flex-col gap-2 justify-center h-full">
                {[
                  { label: "SECTOR 1", time: lapData?.sector1 },
                  { label: "SECTOR 2", time: lapData?.sector2 },
                  { label: "SECTOR 3", time: undefined        },
                ].map(({ label, time }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center bg-white/5 px-3 py-2.5 rounded border border-white/5"
                  >
                    <span className="text-[10px] font-bold text-silver/70 uppercase tracking-wider">{label}</span>
                    <span className={cn(
                      "font-mono font-bold text-lg tabular-nums",
                      time ? "text-white" : "text-silver/30"
                    )}>
                      {time ? (time / 1000).toFixed(3) : "-.---"}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* ── ROW 3 ── */}

            {/* Radial tyre display */}
            <Panel title="TYRE TEMPERATURES" className="col-span-3 row-span-1">
              <div className="flex items-center justify-center h-full">
                <RadialTyreDisplay temps={telemetry?.tyreTemps ?? [0, 0, 0, 0]} size={160} />
              </div>
            </Panel>

            {/* DRS + ERS status */}
            <Panel title="CAR SYSTEMS" className="col-span-2 row-span-1">
              <div className="flex flex-col gap-3 justify-center h-full">
                {/* DRS */}
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 rounded border",
                  telemetry?.drs
                    ? "border-blue-500/40 bg-blue-500/10"
                    : "border-white/10 bg-white/5"
                )}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-silver/70">DRS</span>
                  <span className={cn(
                    "text-xs font-black tracking-widest",
                    telemetry?.drs === 1 ? "text-blue-400" : "text-silver/40"
                  )}>
                    {telemetry?.drs === 1 ? "OPEN" : carStatus?.drsAllowed ? "AVAIL" : "CLOSED"}
                  </span>
                </div>

                {/* Lap progress */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-silver/60 uppercase tracking-wider">LAP PROGRESS</span>
                    <span className="text-xs font-mono text-white">{Math.round(derived.lapProgress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gold rounded-full transition-all duration-300"
                      style={{ width: `${derived.lapProgress}%` }}
                    />
                  </div>
                </div>

                {/* Tyre stress */}
                <div className="flex items-center justify-between px-3 py-2 rounded border border-white/10 bg-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-silver/70">TYRE STRESS</span>
                  <span className={cn(
                    "text-xs font-black tabular-nums",
                    derived.tyreStress > 20 ? "text-red-400" :
                    derived.tyreStress > 10 ? "text-yellow-400" : "text-green-400"
                  )}>
                    ±{derived.tyreStress}°C
                  </span>
                </div>
              </div>
            </Panel>

            {/* Analytics stat cards */}
            <Panel title="SESSION ANALYTICS" className="col-span-4 row-span-1">
              <div className="grid grid-cols-3 gap-2 h-full">
                {[
                  { label: "BRAKE BIAS",  value: `${derived.brakeBias}%`,  icon: <Gauge   size={11} className="text-red-400"    /> },
                  { label: "FULL GAS",    value: `${derived.throttleBias}%`,icon: <Zap    size={11} className="text-green-400"  /> },
                  { label: "COASTING",    value: `${derived.coasting}%`,   icon: <Activity size={11} className="text-silver/60" /> },
                  { label: "AVG SPEED",   value: `${derived.avgSpeed}`,    icon: <Gauge   size={11} className="text-gold"       /> },
                  { label: "MAX SPEED",   value: `${derived.maxSpeed}`,    icon: <Zap    size={11} className="text-gold"        /> },
                  { label: "G-FORCE EST", value: derived.gForceProxy.toFixed(2), icon: <Activity size={11} className="text-blue-400" /> },
                ].map(({ label, value, icon }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center gap-1 bg-white/5 border border-white/10 rounded-lg p-2 hover:border-gold/30 transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      {icon}
                      <span className="text-[9px] font-bold uppercase tracking-widest text-silver/60">{label}</span>
                    </div>
                    <span
                      className="text-2xl font-black text-white tabular-nums"
                      style={{ fontFamily: "var(--font-rajdhani)" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Position + gap */}
            <Panel title="RACE POSITION" className="col-span-3 row-span-1">
              <div className="flex flex-col items-center justify-center gap-3 h-full">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-silver/50">POSITION</span>
                    <span
                      className="text-8xl font-black text-gold leading-none tabular-nums"
                      style={{ fontFamily: "var(--font-rajdhani)", textShadow: "0 0 30px rgba(207,163,73,0.3)" }}
                    >
                      {lapData?.position ?? "—"}
                    </span>
                  </div>
                  <div className="w-[1px] h-16 bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-silver/50">GAP AHEAD</span>
                    <span
                      className="text-4xl font-black text-white tabular-nums leading-none"
                      style={{ fontFamily: "var(--font-rajdhani)" }}
                    >
                      {lapData?.deltaToFront !== undefined
                        ? `+${lapData.deltaToFront.toFixed(3)}`
                        : "-.---"}
                    </span>
                    <span className="text-[9px] text-silver/40 font-bold mt-0.5">SECONDS</span>
                  </div>
                </div>
              </div>
            </Panel>

          </div>{/* end main grid */}

          {/* ── FOOTER ──────────────────────────────────────────────────────── */}
          <div className="shrink-0 h-8">
            <DashboardFooter derived={derived} isConnected={isConnected} />
          </div>

        </motion.div>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEATHER_IDS: Record<number, string> = {
  0: "CLEAR", 1: "LT CLOUD", 2: "OVERCAST",
  3: "LT RAIN", 4: "HVY RAIN", 5: "STORM",
};

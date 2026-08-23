"use client";

/**
 * APX IQ Dashboard — Professional F1 Cockpit HUD
 *
 * Architecture:
 *  - useTelemetry()     → wires Socket.IO → Zustand store (called once)
 *  - 3-Column Layout:
 *      1. Left: 4-Corner Decoupled Tyre Thermal & Brake Heat Car Chassis
 *      2. Center: F1 Steering Wheel Digital MFD Display with 15-LED Shift Lights
 *      3. Right: Virtual Circuit Ribbon & 60Hz Canvas Speed Telemetry Stream
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

// Components
import { MfdDisplay } from "@/components/f1/cockpit/MfdDisplay";
import { TyreThermalCar } from "@/components/f1/cockpit/TyreThermalCar";
import { LiveSpeedAndTrack } from "@/components/f1/cockpit/LiveSpeedAndTrack";
import { useTrackLayout } from "@/hooks/useIntelligence";
import { Badge } from "@/components/f1/primitives/Badge";

// ─── Intro sequence ──────────────────────────────────────────────────────────

function StartSequence({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 900),
      setTimeout(() => setStep(3), 1600),
      setTimeout(() => setStep(4), 2200),
      setTimeout(onComplete, 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-[#050507] z-[100] flex flex-col items-center justify-center overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Start lights */}
      {step >= 1 && step < 4 && (
        <div className="flex gap-4 mb-8 relative z-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "w-10 h-10 rounded-full border-2",
                step >= 3
                  ? "border-emerald-500 bg-emerald-500 shadow-[0_0_20px_#00E676]"
                  : "border-red-600 bg-red-600 shadow-[0_0_20px_#E10600]"
              )}
            />
          ))}
        </div>
      )}

      {/* Logo */}
      {step >= 4 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center z-10"
        >
          <h1
            className="text-7xl font-black italic tracking-tighter text-white"
            style={{ fontFamily: "var(--font-rajdhani)" }}
          >
            <span className="text-gold">APX</span> IQ
          </h1>
          <p className="text-silver tracking-[0.5em] text-xs mt-2 font-bold uppercase">
            FORMULA 1 TELEMETRY SYSTEM
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  useTelemetry();

  const telemetry   = useTelemetryStore((s) => s.telemetry);
  const lapData     = useTelemetryStore((s) => s.lapData);
  const session     = useTelemetryStore((s) => s.session);
  const carStatus   = useTelemetryStore((s) => s.carStatus);
  const isConnected = useTelemetryStore((s) => s.isConnected);
  const history     = useTelemetryStore((s) => s.history);
  const gameVersion = useTelemetryStore((s) => s.gameVersion);

  const [showIntro, setShowIntro] = useState(true);

  const trackId = session?.trackId ?? 5; // Default Monaco/Imola
  
  // Fetch real track geometry if available
  const { data: trackLayoutData } = useTrackLayout(trackId);

  const speed = Math.round(telemetry?.speed ?? 0);
  const gear  = telemetry?.gear;
  const rpm   = telemetry?.rpm ?? 0;
  const maxRPM = carStatus?.maxRPM ?? 15000;

  // Build tyre data for the thermal model
  const tyresThermal = {
    fl: {
      surfaceTemp: telemetry?.tyreTemps?.[0] ?? 94,
      innerTemp:   (telemetry?.tyreTemps?.[0] ?? 94) + 8,
      brakeTemp:   780,
      pressurePsi: 23.5,
    },
    fr: {
      surfaceTemp: telemetry?.tyreTemps?.[1] ?? 96,
      innerTemp:   (telemetry?.tyreTemps?.[1] ?? 96) + 8,
      brakeTemp:   812,
      pressurePsi: 23.6,
    },
    rl: {
      surfaceTemp: telemetry?.tyreTemps?.[2] ?? 98,
      innerTemp:   (telemetry?.tyreTemps?.[2] ?? 98) + 10,
      brakeTemp:   650,
      pressurePsi: 21.8,
    },
    rr: {
      surfaceTemp: telemetry?.tyreTemps?.[3] ?? 101,
      innerTemp:   (telemetry?.tyreTemps?.[3] ?? 101) + 10,
      brakeTemp:   678,
      pressurePsi: 22.0,
    },
  };

  return (
    <div className="h-screen w-screen bg-[#050507] text-silver font-sans overflow-hidden flex flex-col p-4 gap-4 select-none">
      <AnimatePresence>
        {showIntro && <StartSequence onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>

      {!showIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 h-full"
        >
          {/* ── TOP HEADER / TELEMETRY STATUS BAR ───────────────────────────── */}
          <header className="flex items-center justify-between px-6 py-3 rounded-2xl bg-gradient-to-r from-[#121215] via-[#0A0A0D] to-[#121215] border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            
            {/* Left: Branding */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-2xl font-black italic tracking-tighter text-white"
                  style={{ fontFamily: "var(--font-rajdhani)" }}
                >
                  <span className="text-gold">APX</span> IQ
                </span>
                <span className="text-[10px] font-mono text-silver/40 uppercase tracking-widest border-l border-white/10 pl-3">
                  TELEMETRY DASHBOARD
                </span>
              </div>
            </div>

            {/* Center: Live Sector Gaps & Race Conditions */}
            <div className="flex items-center gap-8 font-mono text-xs">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-silver/50 uppercase font-bold">GAP TO LEADER</span>
                <span className="text-sm font-black text-emerald-400">+1.84s (HAM)</span>
              </div>

              <div className="h-6 w-[1px] bg-white/10" />

              <div className="flex flex-col items-center">
                <span className="text-[9px] text-silver/50 uppercase font-bold">AIR TEMP</span>
                <span className="text-sm font-bold text-white">18°C</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] text-silver/50 uppercase font-bold">TRACK TEMP</span>
                <span className="text-sm font-bold text-gold">26°C</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] text-silver/50 uppercase font-bold">WEATHER</span>
                <span className="text-sm font-bold text-cyan-400">DRY</span>
              </div>
            </div>

            {/* Right: Actions & Switchers */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/10">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#00E676]" : "bg-red-500"
                  )}
                />
                <span className="text-[11px] font-mono text-silver/70 font-bold uppercase">
                  {isConnected ? "UDP 60HZ LIVE" : "SIMULATING"}
                </span>
              </div>

              <Link href="/dashboard/intelligence">
                <button className="flex items-center gap-2 px-4 py-1.5 bg-gold text-black hover:bg-gold/90 font-bold font-mono text-xs rounded-xl shadow-[0_0_15px_rgba(207,163,73,0.3)] transition-all">
                  <Brain size={13} /> MISSION CONTROL →
                </button>
              </Link>
            </div>
          </header>

          {/* ── 3-COLUMN COCKPIT HUD MATRIX ─────────────────────────────────── */}
          <main className="grid grid-cols-12 gap-4 flex-1 items-stretch overflow-hidden">
            
            {/* Column 1 (Left 4 cols): 4-Corner Decoupled Tyre & Brake Model */}
            <div className="col-span-12 lg:col-span-4 h-full">
              <TyreThermalCar
                tyres={tyresThermal}
                brakeBiasPercent={58.0}
                className="h-full"
              />
            </div>

            {/* Column 2 (Center 4 cols): F1 Steering Wheel Digital MFD Display */}
            <div className="col-span-12 lg:col-span-4 h-full">
              <MfdDisplay
                speed={speed}
                gear={gear}
                rpm={rpm}
                maxRpm={maxRPM}
                lapNumber={lapData?.lap ?? 48}
                totalLaps={session?.totalLaps ?? 56}
                position={lapData?.position ?? 2}
                bestLapTime={formatLapTime(lapData?.lastLapTime ? lapData.lastLapTime * 1000 : 89843)}
                drsAvailable={Boolean(carStatus?.drsAllowed)}
                drsActive={Boolean(telemetry?.drs)}
                ersPercentage={85}
                fuelRemainingKg={carStatus?.fuelInTank ?? 22.4}
                className="h-full"
              />
            </div>

            {/* Column 3 (Right 4 cols): Virtual Track Ribbon & Live Canvas Speed Trace */}
            <div className="col-span-12 lg:col-span-4 h-full">
              <LiveSpeedAndTrack
                history={history}
                avgSpeed={245}
                maxSpeed={338}
                trackLayout={trackLayoutData}
                sectorTimes={{
                  s1: formatLapTime((lapData?.sector1 ?? 34.24) * 1000),
                  s2: formatLapTime((lapData?.sector2 ?? 51.50) * 1000),
                  s3: "29.320",
                }}
                className="h-full"
              />
            </div>

          </main>
        </motion.div>
      )}
    </div>
  );
}

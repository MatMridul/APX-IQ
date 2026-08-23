/**
 * MfdDisplay — Formula 1 Steering Wheel Digital Multi-Function Display (MFD)
 * Features 15-LED sequential shift lights, digital gear readout, RPM arc, and telemetry metrics.
 */

"use client";

import React, { useMemo } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MfdDisplayProps {
  speed: number;
  gear: number | undefined;
  rpm: number;
  maxRpm?: number;
  lapNumber?: number;
  totalLaps?: number;
  position?: number;
  bestLapTime?: string;
  drsAvailable?: boolean;
  drsActive?: boolean;
  ersPercentage?: number;
  ersDeployMode?: string;
  fuelRemainingKg?: number;
  className?: string;
}

export const MfdDisplay: React.FC<MfdDisplayProps> = ({
  speed,
  gear,
  rpm,
  maxRpm = 15000,
  lapNumber = 48,
  totalLaps = 56,
  position = 2,
  bestLapTime = "1:29.843",
  drsAvailable = true,
  drsActive = false,
  ersPercentage = 85,
  ersDeployMode = "MIX 2",
  fuelRemainingKg = 22.4,
  className,
}) => {
  // RPM ratio (0.0 to 1.0)
  const rpmRatio = Math.min(1.0, Math.max(0.0, rpm / maxRpm));

  // Shift Light Array: 15 LEDs total
  // 5 Green (50% - 75% RPM), 5 Red (75% - 92% RPM), 5 Purple/Cyan (92% - 100% RPM limiter)
  const leds = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const threshold = 0.5 + (i / 15) * 0.5;
      const isActive = rpmRatio >= threshold;
      let colorType: "green" | "red" | "purple" = "green";
      if (i >= 5 && i < 10) colorType = "red";
      if (i >= 10) colorType = "purple";

      return { index: i, isActive, colorType };
    });
  }, [rpmRatio]);

  const isLimiter = rpmRatio >= 0.96;

  // Format gear
  const gearDisplay = gear === undefined || gear === 0
    ? "N"
    : gear === -1
    ? "R"
    : String(gear);

  // RPM Sweep percentage for the arc (0 - 100%)
  const rpmPercentage = Math.round(rpmRatio * 100);

  return (
    <div
      className={cn(
        "relative rounded-3xl p-4 bg-gradient-to-b from-[#151518] to-[#0A0A0C] border-2 border-[#CFA349]/40 shadow-[0_0_35px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(207,163,73,0.1)] flex flex-col justify-between overflow-hidden",
        className
      )}
      style={{
        boxShadow: "0 0 25px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 0 20px rgba(207,163,73,0.08)",
      }}
    >
      {/* Carbon fiber subtle pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#CFA349_0.5px,transparent_0.5px)] [background-size:8px_8px]" />

      {/* ── TOP: 15-LED Sequential Shift Light Array ────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pt-1 pb-3 px-4 bg-black/50 rounded-2xl border border-white/10 mx-2">
        {leds.map((led) => {
          let activeBg = "bg-emerald-400 shadow-[0_0_12px_#00E676]";
          if (led.colorType === "red") activeBg = "bg-red-500 shadow-[0_0_12px_#FF1744]";
          if (led.colorType === "purple") {
            activeBg = isLimiter
              ? "bg-fuchsia-400 shadow-[0_0_16px_#E040FB] animate-pulse"
              : "bg-fuchsia-500 shadow-[0_0_12px_#D500F9]";
          }

          const inactiveBg = led.colorType === "green"
            ? "bg-emerald-950/40 border border-emerald-800/30"
            : led.colorType === "red"
            ? "bg-red-950/40 border border-red-800/30"
            : "bg-fuchsia-950/40 border border-fuchsia-800/30";

          return (
            <div
              key={led.index}
              className={cn(
                "w-3.5 h-3.5 rounded-full transition-all duration-75",
                led.isActive ? activeBg : inactiveBg
              )}
            />
          );
        })}
      </div>

      {/* ── CENTER: Core Multi-Function Telemetry Matrix ───────────────────── */}
      <div className="relative z-10 grid grid-cols-12 gap-2 items-center my-auto px-4 py-2">
        
        {/* Left Stats Column: LAP / POS / FUEL */}
        <div className="col-span-3 flex flex-col gap-3 font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] text-silver/50 uppercase tracking-widest font-bold">LAP</span>
            <div className="text-xl font-black text-white">
              <span className="text-white">{lapNumber}</span>
              <span className="text-silver/40 text-sm"> / {totalLaps}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-silver/50 uppercase tracking-widest font-bold">POS</span>
            <span className="text-2xl font-black text-gold">P{position}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-silver/50 uppercase tracking-widest font-bold">FUEL</span>
            <span className="text-lg font-bold text-white tracking-tight">{fuelRemainingKg.toFixed(1)} <span className="text-xs text-silver/50 font-normal">KG</span></span>
          </div>
        </div>

        {/* Center: Massive Gear Box & Speedometer */}
        <div className="col-span-6 flex flex-col items-center justify-center">
          <span className="text-[10px] tracking-widest uppercase font-bold text-silver/60 mb-[-6px]">
            GEAR
          </span>
          <div
            className="text-8xl font-black text-white tracking-tighter leading-none select-none drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            style={{ fontFamily: "var(--font-rajdhani)" }}
          >
            {gearDisplay}
          </div>

          {/* Speed Digital Readout */}
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className="text-4xl font-black text-white tracking-tight font-mono"
            >
              {Math.round(speed)}
            </span>
            <span className="text-xs font-bold text-silver/50 font-mono uppercase">KM/H</span>
          </div>
        </div>

        {/* Right Stats Column: BEST LAP / ERS / MIX */}
        <div className="col-span-3 flex flex-col gap-3 font-mono items-end text-right">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-silver/50 uppercase tracking-widest font-bold">BEST LAP</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{bestLapTime}</span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-silver/50 uppercase tracking-widest font-bold">ENGINE MAP</span>
            <span className="text-sm font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              {ersDeployMode}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-silver/50 uppercase tracking-widest font-bold">ERS BUFFER</span>
            <span className="text-lg font-bold text-cyan-400 tracking-tight font-mono">
              {ersPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Curved Dynamic RPM Sweep & Status Indicators ───────────── */}
      <div className="relative z-10 flex flex-col gap-2 pt-2 border-t border-white/10 px-4">
        {/* RPM Bar Meter with Redline */}
        <div className="w-full h-3 bg-black/80 rounded-full border border-white/10 overflow-hidden p-0.5 relative">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-75",
              rpmRatio > 0.9
                ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 shadow-[0_0_10px_#FF1744]"
                : rpmRatio > 0.65
                ? "bg-gradient-to-r from-emerald-500 to-amber-400"
                : "bg-emerald-500"
            )}
            style={{ width: `${rpmPercentage}%` }}
          />
          {/* Redline tick at 85% */}
          <div className="absolute right-[15%] top-0 bottom-0 w-[2px] bg-red-500/80" />
        </div>

        {/* Bottom Auxiliary Indicators */}
        <div className="flex justify-between items-center text-xs font-mono">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all",
                drsActive
                  ? "bg-cyan-500 text-black shadow-[0_0_10px_#00D2BE]"
                  : drsAvailable
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                  : "bg-white/5 text-silver/30 border border-white/5"
              )}
            >
              <Zap size={11} />
              {drsActive ? "DRS OPEN" : drsAvailable ? "DRS AVAIL" : "DRS CLOSED"}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-silver/60">
            <span>RPM <strong className="text-white font-mono">{rpm.toLocaleString()}</strong></span>
            <span>/</span>
            <span>ERS <strong className="text-cyan-400 font-mono">{ersPercentage}%</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

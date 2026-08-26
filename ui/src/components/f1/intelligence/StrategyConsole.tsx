/**
 * StrategyConsole — F1 Post-Race Strategy Control Console
 * Allows FastF1 ghost selection, head-to-head driver battle preview, and one-click debrief generation.
 */

"use client";

import React from "react";
import { Brain, Loader2, Sparkles, User, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyConsoleProps {
  year: number;
  onYearChange: (y: number) => void;
  trackId: number;
  onTrackChange: (t: number) => void;
  driver: string;
  onDriverChange: (d: string) => void;
  isGhostLoading: boolean;
  onLoadGhost: () => void;
  ghostLoaded: boolean;
  ghostLapTime?: number;
  onGenerateDebrief: () => void;
  isGenerating: boolean;
  useMockTelemetry: boolean;
  onToggleMock: (v: boolean) => void;
  className?: string;
}

const DRIVERS = [
  { code: "VER", name: "Max Verstappen", team: "Red Bull Racing", num: 1 },
  { code: "HAM", name: "Lewis Hamilton", team: "Mercedes-AMG", num: 44 },
  { code: "NOR", name: "Lando Norris", team: "McLaren F1", num: 4 },
  { code: "LEC", name: "Charles Leclerc", team: "Scuderia Ferrari", num: 16 },
  { code: "PIA", name: "Oscar Piastri", team: "McLaren F1", num: 81 },
  { code: "RUS", name: "George Russell", team: "Mercedes-AMG", num: 63 },
  { code: "SAI", name: "Carlos Sainz", team: "Scuderia Ferrari", num: 55 },
  { code: "ALO", name: "Fernando Alonso", team: "Aston Martin", num: 14 },
];

export const StrategyConsole: React.FC<StrategyConsoleProps> = ({
  year,
  onYearChange,
  trackId,
  onTrackChange,
  driver,
  onDriverChange,
  isGhostLoading,
  onLoadGhost,
  ghostLoaded,
  ghostLapTime,
  onGenerateDebrief,
  isGenerating,
  useMockTelemetry,
  onToggleMock,
  className,
}) => {
  const selectedDriver = DRIVERS.find((d) => d.code === driver) ?? DRIVERS[0];

  return (
    <div
      className={cn(
        "relative rounded-3xl p-5 bg-gradient-to-b from-[#151518] to-[#0A0A0C] border-2 border-gold/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-5",
        className
      )}
    >
      {/* ── TOP: Strategy Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <h3 className="text-xs font-black text-gold uppercase tracking-widest font-mono">
            STRATEGY CONTROL CONSOLE
          </h3>
        </div>
        <span className="text-[10px] font-mono text-silver/60">FASTF1 FIA API</span>
      </div>

      {/* ── FASTF1 SELECTION DROPDOWNS ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-silver/50 font-bold uppercase">YEAR</label>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="w-full bg-black/80 border border-gold/40 text-white text-xs p-2 rounded-lg font-mono focus:outline-none focus:border-gold"
          >
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
            <option value={2022}>2022</option>
          </select>
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[10px] text-silver/50 font-bold uppercase">DRIVER TARGET</label>
          <select
            value={driver}
            onChange={(e) => onDriverChange(e.target.value)}
            className="w-full bg-black/80 border border-gold/40 text-white text-xs p-2 rounded-lg font-mono focus:outline-none focus:border-gold"
          >
            {DRIVERS.map((d) => (
              <option key={d.code} value={d.code}>
                #{d.num} {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Load Ghost Button */}
      <button
        onClick={onLoadGhost}
        disabled={isGhostLoading}
        className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-gold/15 disabled:opacity-40 border border-white/10 hover:border-gold/40 rounded-lg text-gold font-mono text-xs font-bold transition-all"
      >
        {isGhostLoading ? (
          <><Loader2 size={12} className="animate-spin" /> FETCHING FASTF1 GHOST...</>
        ) : ghostLoaded ? (
          <span className="text-signal-go font-bold">✓ GHOST LOADED ({ghostLapTime ? `${ghostLapTime.toFixed(3)}s` : "VER"})</span>
        ) : (
          <><Sparkles size={12} /> LOAD FASTF1 GHOST LAP</>
        )}
      </button>

      {/* ── HEAD-TO-HEAD DRIVER COMPARISON CARDS ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ghost Driver Card */}
        <div className="flex flex-col gap-2 p-3 bg-gradient-to-b from-[#1A1A22] to-[#101014] rounded-2xl border border-gold/30 shadow-[0_0_15px_rgba(207,163,73,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-gold bg-gold/10 px-1.5 py-0.5 rounded border border-gold/30">
              TARGET GHOST
            </span>
            <span className="text-xs font-black text-gold font-mono">#{selectedDriver.num}</span>
          </div>

          {/* Driver Avatar & Name */}
          <div className="flex items-center gap-2 my-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center text-black font-black text-sm shadow-[0_0_10px_rgba(207,163,73,0.4)]">
              {selectedDriver.code}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-black text-white">{selectedDriver.name}</span>
              <span className="text-[10px] text-silver/60">{selectedDriver.team}</span>
            </div>
          </div>

          <div className="text-[10px] text-silver/50 font-mono pt-1 border-t border-white/5 flex justify-between">
            <span>REFERENCE:</span>
            <span className="text-signal-go font-bold">QUALIFYING POLE</span>
          </div>
        </div>

        {/* User Driver Card */}
        <div className="flex flex-col gap-2 p-3 bg-gradient-to-b from-[#1A1A22] to-[#101014] rounded-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-silver/60 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              USER STINT
            </span>
            <span className="text-xs font-black text-white font-mono">#11</span>
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-2 my-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/20 flex items-center justify-center text-white font-black text-sm">
              <User size={18} className="text-silver" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-black text-white">Player Stint</span>
              <span className="text-[10px] text-silver/60">APX Racing Sim</span>
            </div>
          </div>

          <div className="text-[10px] text-silver/50 font-mono pt-1 border-t border-white/5 flex justify-between">
            <span>SOURCE:</span>
            <span className="text-gold font-bold">{useMockTelemetry ? "SYNTHETIC" : "LIVE UDP"}</span>
          </div>
        </div>
      </div>

      {/* ── BIG GLOWING ACTION BUTTON ──────────────────────────────────────── */}
      <button
        onClick={onGenerateDebrief}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-signal-go via-gold to-signal-go hover:opacity-90 disabled:opacity-40 text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(207,163,73,0.4)] transition-all transform active:scale-[0.98]"
      >
        {isGenerating ? (
          <><Loader2 size={18} className="animate-spin" /> RUNNING TELEMETRY SYNTHESIS...</>
        ) : (
          <><Brain size={20} /> GENERATE RACE DEBRIEF</>
        )}
      </button>

      {/* Mock Telemetry Toggle */}
      <div className="flex items-center justify-between text-xs font-mono pt-1">
        <span className="text-silver/60">Use Synthetic Lap if No Game:</span>
        <input
          type="checkbox"
          checked={useMockTelemetry}
          onChange={(e) => onToggleMock(e.target.checked)}
          className="accent-gold w-4 h-4 rounded cursor-pointer"
        />
      </div>
    </div>
  );
};

/**
 * StrategyConsole — Broadcast & Esports F1 Strategy Control Console
 * Allows FastF1 ghost selection, head-to-head driver battle preview, and one-click debrief generation.
 */

"use client";

import React from "react";
import { Brain, Loader2, Sparkles, User } from "lucide-react";
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
  laps?: Array<{ lap_id: number; lap_number: number; lap_time_ms: number | null }>;
  selectedLapId?: number | null;
  onSelectLap?: (id: number) => void;
  className?: string;
}

const DRIVERS = [
  { code: "VER", name: "Max Verstappen", team: "Red Bull Racing", num: 1, teamColor: "#3671C6" },
  { code: "HAM", name: "Lewis Hamilton", team: "Mercedes-AMG", num: 44, teamColor: "#27F4D2" },
  { code: "NOR", name: "Lando Norris", team: "McLaren F1", num: 4, teamColor: "#FF8000" },
  { code: "LEC", name: "Charles Leclerc", team: "Scuderia Ferrari", num: 16, teamColor: "#E8002D" },
  { code: "PIA", name: "Oscar Piastri", team: "McLaren F1", num: 81, teamColor: "#FF8000" },
  { code: "RUS", name: "George Russell", team: "Mercedes-AMG", num: 63, teamColor: "#27F4D2" },
  { code: "SAI", name: "Carlos Sainz", team: "Scuderia Ferrari", num: 55, teamColor: "#E8002D" },
  { code: "ALO", name: "Fernando Alonso", team: "Aston Martin", num: 14, teamColor: "#229971" },
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
  laps = [],
  selectedLapId,
  onSelectLap,
  className,
}) => {
  const selectedDriver = DRIVERS.find((d) => d.code === driver) ?? DRIVERS[0];

  return (
    <div
      className={cn(
        "relative rounded-xl p-5 bg-neutral-950/90 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm flex flex-col justify-between gap-4",
        className
      )}
    >
      {/* ── TOP: Strategy Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-[3px] h-3.5 rounded-sm bg-gold shadow-[0_0_8px_rgba(207,163,73,0.8)]" />
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono">
            STRATEGY CONTROL CONSOLE
          </h3>
        </div>
        <span className="text-[10px] font-mono text-neutral-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">FASTF1 FIA API</span>
      </div>

      {/* ── FASTF1 SELECTION DROPDOWNS ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] text-neutral-400 font-bold uppercase font-mono">SEASON</label>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="w-full bg-black/80 border border-white/[0.12] text-white text-xs p-1.5 rounded font-mono focus:outline-none focus:border-amber-400"
          >
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
            <option value={2022}>2022</option>
          </select>
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[9px] text-neutral-400 font-bold uppercase font-mono">TARGET BENCHMARK</label>
          <select
            value={driver}
            onChange={(e) => onDriverChange(e.target.value)}
            className="w-full bg-black/80 border border-white/[0.12] text-white text-xs p-1.5 rounded font-mono focus:outline-none focus:border-amber-400"
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
        className="w-full flex items-center justify-center gap-2 py-2 bg-white/[0.04] hover:bg-amber-500/15 disabled:opacity-40 border border-white/[0.1] hover:border-amber-500/40 rounded text-amber-400 font-mono text-xs font-bold transition-all"
      >
        {isGhostLoading ? (
          <><Loader2 size={12} className="animate-spin" /> FETCHING FASTF1 GHOST...</>
        ) : ghostLoaded ? (
          <span className="text-emerald-400 font-bold">✓ GHOST LOADED ({ghostLapTime ? `${ghostLapTime.toFixed(3)}s` : selectedDriver.code})</span>
        ) : (
          <><Sparkles size={12} /> LOAD FASTF1 GHOST LAP</>
        )}
      </button>

      {/* ── RECORDED LAP SELECTOR (WHEN NOT USING MOCK) ───────────────────── */}
      {!useMockTelemetry && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded bg-black/50 border border-amber-500/20">
          <label className="text-[9px] text-amber-400 font-bold uppercase font-mono flex justify-between">
            <span>RECORDED USER LAPS</span>
            <span className="text-neutral-400">{laps.length} available</span>
          </label>
          {laps.length > 0 ? (
            <select
              value={selectedLapId ?? ""}
              onChange={(e) => onSelectLap?.(Number(e.target.value))}
              className="w-full bg-black border border-white/[0.12] text-white text-xs p-1.5 rounded font-mono focus:outline-none focus:border-amber-400"
            >
              <option value="" disabled>Select a completed lap</option>
              {laps.map((lap) => (
                <option key={lap.lap_id} value={lap.lap_id}>
                  Lap {lap.lap_number} {lap.lap_time_ms ? `(${(lap.lap_time_ms / 1000).toFixed(3)}s)` : ""}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[9px] text-neutral-400 italic font-mono py-1">
              No recorded laps in active session. Complete a lap in-game or enable synthetic mode.
            </p>
          )}
        </div>
      )}

      {/* ── HEAD-TO-HEAD DRIVER COMPARISON CARDS ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Ghost Driver Card */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-gradient-to-b from-neutral-900/60 to-black/80 rounded border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
              TARGET GHOST
            </span>
            <span className="text-xs font-bold text-amber-400 font-mono">#{selectedDriver.num}</span>
          </div>

          {/* Driver Avatar & Name */}
          <div className="flex items-center gap-2 my-0.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-black font-black text-xs shadow-sm"
              style={{ background: selectedDriver.teamColor }}
            >
              {selectedDriver.code}
            </div>
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-xs font-bold text-white truncate">{selectedDriver.name}</span>
              <span className="text-[9px] text-neutral-400 truncate">{selectedDriver.team}</span>
            </div>
          </div>

          <div className="text-[9px] text-neutral-400 font-mono pt-1 border-t border-white/[0.06] flex justify-between">
            <span>REFERENCE:</span>
            <span className="text-emerald-400 font-bold">POLE LAP</span>
          </div>
        </div>

        {/* User Driver Card */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-gradient-to-b from-neutral-900/60 to-black/80 rounded border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold uppercase text-neutral-400 bg-white/[0.05] px-1 py-0.2 rounded border border-white/10">
              USER STINT
            </span>
            <span className="text-xs font-bold text-white font-mono">#11</span>
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-2 my-0.5">
            <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/20 flex items-center justify-center text-white font-black text-xs">
              <User size={14} className="text-neutral-300" />
            </div>
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-xs font-bold text-white truncate">Player Stint</span>
              <span className="text-[9px] text-neutral-400 truncate">APX Racing Sim</span>
            </div>
          </div>

          <div className="text-[9px] text-neutral-400 font-mono pt-1 border-t border-white/[0.06] flex justify-between">
            <span>SOURCE:</span>
            <span className="text-amber-400 font-bold">{useMockTelemetry ? "SYNTHETIC" : "LIVE UDP"}</span>
          </div>
        </div>
      </div>

      {/* ── BIG GLOWING ACTION BUTTON ──────────────────────────────────────── */}
      <button
        onClick={onGenerateDebrief}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 hover:opacity-95 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider rounded shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all transform active:scale-[0.99]"
      >
        {isGenerating ? (
          <><Loader2 size={15} className="animate-spin" /> RUNNING TELEMETRY SYNTHESIS...</>
        ) : (
          <><Brain size={16} /> GENERATE RACE DEBRIEF</>
        )}
      </button>

      {/* Mock Telemetry Toggle */}
      <div className="flex items-center justify-between text-[10px] font-mono pt-0.5 border-t border-white/[0.06]">
        <span className="text-neutral-400">Use Synthetic Lap if No Live Game:</span>
        <input
          type="checkbox"
          checked={useMockTelemetry}
          onChange={(e) => onToggleMock(e.target.checked)}
          className="accent-amber-400 w-3.5 h-3.5 rounded cursor-pointer"
        />
      </div>
    </div>
  );
};


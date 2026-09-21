"use client";

import React from "react";
import { useUxStore, GpScenario } from "@/store/uxStore";
import { cn } from "@/lib/utils";

const CORNERS = [
  { name: "T1", dist: 340, desc: "Sainte Dévote" },
  { name: "T4", dist: 1240, desc: "Casino Square" },
  { name: "T7", dist: 2230, desc: "Mirabeau Haute" },
  { name: "T11", dist: 3320, desc: "Nouvelle Chicane" },
  { name: "T14", dist: 4040, desc: "La Rascasse" },
];

const SCENARIOS: { id: GpScenario; label: string; flag: string }[] = [
  { id: "monaco", label: "Monaco Q3 Pole", flag: "🇲🇨" },
  { id: "silverstone", label: "Silverstone Deg", flag: "🇬🇧" },
  { id: "spa", label: "Spa Wet Battle", flag: "🇧🇪" },
  { id: "monza", label: "Monza Slipstream", flag: "🇮🇹" },
];

export function PlaybackControls() {
  const isPlaying = useUxStore((s) => s.isPlaying);
  const togglePlay = useUxStore((s) => s.togglePlay);
  const speed = useUxStore((s) => s.playbackSpeed);
  const setSpeed = useUxStore((s) => s.setPlaybackSpeed);
  const manualScrubDist = useUxStore((s) => s.manualScrubDist);
  const activeCorner = useUxStore((s) => s.activeCornerTarget);
  const seekTo = useUxStore((s) => s.seekToDistance);
  const soundEnabled = useUxStore((s) => s.soundEnabled);
  const toggleSound = useUxStore((s) => s.toggleSound);
  const scenario = useUxStore((s) => s.scenario);
  const setScenario = useUxStore((s) => s.setScenario);

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] select-none">
      {/* Scenario Selector Dropdown */}
      <div className="flex items-center gap-1 rounded bg-black/60 border border-white/15 px-2 py-0.5">
        <span className="text-[11px]">
          {SCENARIOS.find((sc) => sc.id === scenario)?.flag}
        </span>
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value as GpScenario)}
          className="bg-transparent text-white font-bold text-[9px] outline-none cursor-pointer tracking-wider"
        >
          {SCENARIOS.map((sc) => (
            <option key={sc.id} value={sc.id} className="bg-neutral-900 text-white">
              {sc.label}
            </option>
          ))}
        </select>
      </div>

      {/* Play / Pause Toggle Button */}
      <button
        onClick={togglePlay}
        className={cn(
          "px-2.5 py-0.8 rounded font-bold border transition-all flex items-center gap-1 cursor-pointer",
          isPlaying
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30"
            : "bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30 animate-pulse"
        )}
        title="Play / Pause Replay (Spacebar)"
      >
        <span>{isPlaying ? "⏸ PAUSE" : "▶ PLAY"}</span>
      </button>

      {/* Speed Multipliers */}
      <div className="flex items-center rounded bg-black/60 border border-white/15 p-0.5">
        {[0.5, 1, 2, 5].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={cn(
              "px-1.5 py-0.2 rounded text-[8.5px] font-bold transition-colors cursor-pointer",
              speed === s
                ? "bg-gold text-black shadow-[0_0_6px_rgba(207,163,73,0.6)]"
                : "text-neutral-400 hover:text-white"
            )}
            title={`Playback Speed ${s}x`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Quick Corner Apex Jump Pills */}
      <div className="hidden lg:flex items-center gap-1 rounded bg-black/60 border border-white/15 p-0.5">
        <span className="text-[8px] text-neutral-500 uppercase px-1 font-bold">SEEK:</span>
        {CORNERS.map((c) => (
          <button
            key={c.name}
            onClick={() => seekTo(c.dist, c.name)}
            className={cn(
              "px-1.5 py-0.2 rounded text-[8.5px] font-bold transition-all cursor-pointer",
              activeCorner === c.name
                ? "bg-cyan-500 text-black shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                : "text-neutral-300 hover:text-cyan-400 hover:bg-white/5"
            )}
            title={`Jump to ${c.name} (${c.desc})`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Return to Live Sweep button when scrubbed */}
      {manualScrubDist !== null && (
        <button
          onClick={() => seekTo(null)}
          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 text-[8.5px] font-black animate-pulse cursor-pointer"
          title="Resume Continuous Lap Sweep"
        >
          ↺ RESUME LIVE
        </button>
      )}

      {/* Master Sound FX Toggle */}
      <button
        onClick={toggleSound}
        className={cn(
          "px-2 py-0.8 rounded border transition-colors flex items-center gap-1 cursor-pointer",
          soundEnabled
            ? "bg-white/10 text-neutral-200 border-white/20 hover:text-white"
            : "bg-red-500/20 text-red-400 border-red-500/40"
        )}
        title={soundEnabled ? "Mute Motorsport Audio FX" : "Unmute Motorsport Audio FX"}
      >
        <span>{soundEnabled ? "🔊 SFX" : "🔇 MUTED"}</span>
      </button>
    </div>
  );
}

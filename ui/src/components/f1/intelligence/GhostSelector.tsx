/**
 * GhostSelector — Load a real F1 ghost lap via FastF1
 */

"use client";

import { useState } from "react";
import { Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Panel } from "@/components/f1/primitives/Panel";
import { useGhostLap } from "@/hooks/useIntelligence";
import { TRACK_IDS } from "@/utils/constants";
import type { GhostLap } from "@/lib/api/intelligence";

const DRIVERS = [
  "VER","PER","HAM","RUS","LEC","SAI","NOR","PIA",
  "ALO","STR","OCO","GAS","TSU","RIC","BOT","ZHO",
  "MAG","HUL","ALB","SAR","BEA","LAW",
];

interface GhostSelectorProps {
  onGhostLoaded: (ghost: GhostLap | null) => void;
}

export function GhostSelector({ onGhostLoaded }: GhostSelectorProps) {
  const [year,    setYear]    = useState(2024);
  const [trackId, setTrackId] = useState(5); // Monaco
  const [driver,  setDriver]  = useState("VER");
  const [enabled, setEnabled] = useState(false);

  const { data: ghost, isFetching, error, refetch } = useGhostLap(
    trackId, year, driver, enabled,
  );

  // Sync to parent when data arrives
  if (ghost && !isFetching) onGhostLoaded(ghost);

  const load = () => {
    onGhostLoaded(null);
    setEnabled(true);
    refetch();
  };

  const Select = ({
    label, value, onChange, children,
  }: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="text-[10px] text-silver/50 uppercase tracking-wider mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black border border-gold/40 text-white text-xs p-1.5 rounded font-mono"
      >
        {children}
      </select>
    </div>
  );

  return (
    <Panel title="GHOST LAP">
      <div className="flex flex-col gap-3 h-full">
        <p className="text-[10px] text-silver/60">
          Compare against real F1 data fetched from FastF1.
        </p>

        <Select label="Year" value={year} onChange={(v) => setYear(Number(v))}>
          {[2024,2023,2022,2021,2020].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>

        <Select label="Track" value={trackId} onChange={(v) => setTrackId(Number(v))}>
          {Object.entries(TRACK_IDS).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </Select>

        <Select label="Driver" value={driver} onChange={setDriver}>
          {DRIVERS.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>

        <button
          onClick={load}
          disabled={isFetching}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gold/15 hover:bg-gold/25 disabled:opacity-50 border border-gold/40 rounded text-gold text-xs font-bold tracking-wider transition-all"
        >
          {isFetching
            ? <><Loader2 size={12} className="animate-spin" /> FETCHING...</>
            : <><Download size={12} /> LOAD GHOST</>}
        </button>

        {isFetching && (
          <p className="text-[10px] text-silver/50 text-center animate-pulse">
            Downloading from FastF1 — may take 30–60s on first load...
          </p>
        )}

        {ghost && (
          <div className="border-t border-white/10 pt-2 flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle size={12} className="text-green-500" />
              <span className="text-green-400 font-bold text-[10px]">LOADED</span>
            </div>
            {[
              ["Driver",  ghost.driver],
              ["Track",   ghost.track_name],
              ["Lap",     `${ghost.lap_time_s.toFixed(3)}s`],
              ["Points",  String(ghost.telemetry_points)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-silver/50">{k}:</span>
                <span className="font-mono text-white">{v}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
            <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
            <span className="text-[10px] text-red-400">
              {error instanceof Error ? error.message : "Failed to load"}
            </span>
          </div>
        )}

        {!ghost && !error && !isFetching && (
          <p className="text-[10px] text-silver/40 italic mt-auto">
            No ghost loaded — will use simulated lap (2% faster).
          </p>
        )}
      </div>
    </Panel>
  );
}

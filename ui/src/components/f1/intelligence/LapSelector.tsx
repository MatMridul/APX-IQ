/**
 * LapSelector — Select a recorded lap to analyse
 */

"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Panel } from "@/components/f1/primitives/Panel";
import { useCompletedLaps } from "@/hooks/useIntelligence";
import type { LapInfo } from "@/lib/api/intelligence";
import { formatLapTime } from "@/utils/format";
import { cn } from "@/lib/utils";

interface LapSelectorProps {
  selectedLapId: number | null;
  onSelect:      (id: number) => void;
  useMockData:   boolean;
  onMockToggle:  (v: boolean) => void;
}

export function LapSelector({
  selectedLapId,
  onSelect,
  useMockData,
  onMockToggle,
}: LapSelectorProps) {
  const { data: laps = [], isFetching, refetch } = useCompletedLaps();

  // Best lap by time
  const bestLapId = laps
    .filter((l) => l.lap_time_ms)
    .reduce<LapInfo | null>(
      (best, lap) =>
        !best || lap.lap_time_ms! < best.lap_time_ms! ? lap : best,
      null,
    )?.lap_id ?? null;

  const selected = laps.find((l) => l.lap_id === selectedLapId);

  return (
    <Panel title="LAP SELECTION">
      <div className="flex flex-col gap-3 h-full">
        {isFetching && (
          <div className="flex items-center gap-2 text-xs text-silver/60">
            <Loader2 size={12} className="animate-spin" /> Refreshing laps...
          </div>
        )}

        {laps.length === 0 && !isFetching ? (
          <p className="text-xs text-silver/60">
            No recorded laps yet. Complete a lap in-game to analyse.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {laps.map((lap) => (
              <button
                key={lap.lap_id}
                onClick={() => onSelect(lap.lap_id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded border text-xs font-mono transition-all",
                  lap.lap_id === selectedLapId
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-white/10 bg-white/5 text-silver hover:border-gold/30",
                )}
              >
                <span>Lap {lap.lap_number}</span>
                <div className="flex items-center gap-2">
                  <span>{lap.lap_time_ms ? formatLapTime(lap.lap_time_ms) : "–"}</span>
                  {lap.lap_id === bestLapId && (
                    <span className="text-[9px] text-gold">★ BEST</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="border-t border-white/10 pt-2 text-xs flex flex-col gap-1">
            <div className="flex justify-between text-silver/60">
              <span>Telemetry points:</span>
              <span className="text-white font-mono">{selected.telemetry_points}</span>
            </div>
            <div className="flex justify-between text-silver/60">
              <span>Distance:</span>
              <span className="text-white font-mono">{selected.max_distance_m.toFixed(0)} m</span>
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-[10px] text-gold hover:text-gold/80 transition-colors"
          >
            <RefreshCw size={10} /> Refresh
          </button>

          <label className="flex items-center gap-2 text-[10px] text-silver/60 cursor-pointer">
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => onMockToggle(e.target.checked)}
              className="rounded"
            />
            Mock data
          </label>
        </div>
      </div>
    </Panel>
  );
}

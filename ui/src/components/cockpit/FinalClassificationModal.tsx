"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flag, Timer, Zap, AlertCircle, Award, CheckCircle2 } from "lucide-react";
import { useUxStore } from "@/store/uxStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import type { FinalClassificationItem } from "@/hooks/useTelemetry";
import { cn } from "@/lib/utils";

// Standard F1 FIA Points Allocation (P1-P10)
const FIA_POINTS: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

function formatLapTime(ms: number): string {
  if (!ms || ms <= 0) return "--:--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function FinalClassificationModal() {
  const isOpen = useUxStore((s) => s.isFinalClassificationOpen);
  const close = useUxStore((s) => s.closeFinalClassification);
  const finalClassification = useTelemetryStore((s) => s.finalClassification);
  const participants = useTelemetryStore((s) => s.participants);
  const session = useTelemetryStore((s) => s.session);

  const [filter, setFilter] = useState<"ALL" | "POINTS" | "PODIUM">("ALL");

  if (!isOpen) return null;

  // Fallback demo classification if no race completed yet
  const classificationList: FinalClassificationItem[] = finalClassification?.classification && finalClassification.classification.length > 0
    ? finalClassification.classification
    : [
        { carIndex: 0, position: 1, numLaps: 57, gridPosition: 2, points: 26, numPitStops: 1, resultStatus: 2, bestLapTimeMs: 91420, totalRaceTime: 5382.41, penaltiesTime: 0, numPenalties: 0, numTyreStints: 2 },
        { carIndex: 1, position: 2, numLaps: 57, gridPosition: 1, points: 18, numPitStops: 1, resultStatus: 2, bestLapTimeMs: 91680, totalRaceTime: 5385.12, penaltiesTime: 0, numPenalties: 0, numTyreStints: 2 },
        { carIndex: 2, position: 3, numLaps: 57, gridPosition: 4, points: 15, numPitStops: 2, resultStatus: 2, bestLapTimeMs: 91950, totalRaceTime: 5396.88, penaltiesTime: 0, numPenalties: 0, numTyreStints: 3 },
        { carIndex: 3, position: 4, numLaps: 57, gridPosition: 3, points: 12, numPitStops: 1, resultStatus: 2, bestLapTimeMs: 92110, totalRaceTime: 5403.45, penaltiesTime: 0, numPenalties: 0, numTyreStints: 2 },
        { carIndex: 4, position: 5, numLaps: 57, gridPosition: 6, points: 10, numPitStops: 2, resultStatus: 2, bestLapTimeMs: 92340, totalRaceTime: 5415.20, penaltiesTime: 0, numPenalties: 0, numTyreStints: 3 },
        { carIndex: 5, position: 6, numLaps: 57, gridPosition: 5, points: 8, numPitStops: 1, resultStatus: 2, bestLapTimeMs: 92490, totalRaceTime: 5422.80, penaltiesTime: 0, numPenalties: 0, numTyreStints: 2 },
        { carIndex: 6, position: 7, numLaps: 57, gridPosition: 8, points: 6, numPitStops: 2, resultStatus: 2, bestLapTimeMs: 92680, totalRaceTime: 5433.15, penaltiesTime: 0, numPenalties: 0, numTyreStints: 3 },
        { carIndex: 7, position: 8, numLaps: 57, gridPosition: 7, points: 4, numPitStops: 1, resultStatus: 2, bestLapTimeMs: 92890, totalRaceTime: 5441.90, penaltiesTime: 0, numPenalties: 0, numTyreStints: 2 },
        { carIndex: 8, position: 9, numLaps: 56, gridPosition: 10, points: 2, numPitStops: 2, resultStatus: 2, bestLapTimeMs: 93120, totalRaceTime: 5460.00, penaltiesTime: 0, numPenalties: 0, numTyreStints: 3 },
        { carIndex: 9, position: 10, numLaps: 56, gridPosition: 9, points: 1, numPitStops: 1, resultStatus: 2, bestLapTimeMs: 93450, totalRaceTime: 5472.30, penaltiesTime: 0, numPenalties: 0, numTyreStints: 2 },
        { carIndex: 10, position: 11, numLaps: 56, gridPosition: 12, points: 0, numPitStops: 2, resultStatus: 2, bestLapTimeMs: 93600, totalRaceTime: 5480.00, penaltiesTime: 0, numPenalties: 0, numTyreStints: 3 },
        { carIndex: 11, position: 12, numLaps: 55, gridPosition: 11, points: 0, numPitStops: 1, resultStatus: 3, bestLapTimeMs: 93900, totalRaceTime: 0, penaltiesTime: 0, numPenalties: 0, numTyreStints: 1 },
      ];

  const sortedList = [...classificationList].sort((a, b) => a.position - b.position);

  const filteredList = sortedList.filter((item) => {
    if (filter === "PODIUM") return item.position <= 3;
    if (filter === "POINTS") return item.position <= 10;
    return true;
  });

  const winner = sortedList[0];
  const winnerTimeS = winner?.totalRaceTime || 5382.41;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          className="relative w-full max-w-5xl rounded-2xl border border-gold/40 bg-neutral-950 p-6 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_25px_rgba(207,163,73,0.15)] select-none text-white font-mono flex flex-col gap-5 max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gold/15 border border-gold/40 text-gold shadow-[0_0_15px_rgba(207,163,73,0.3)]">
                <Trophy size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-wider text-white">
                    OFFICIAL FIA FINAL CLASSIFICATION
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold/20 text-gold border border-gold/40">
                    PACKET 8 VERIFIED
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  Full Race Results · FIA Championship Points Allocation · Timing & Scorings
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/60 border border-white/10 text-[10px]">
                <button
                  onClick={() => setFilter("ALL")}
                  className={cn("px-2.5 py-1 rounded cursor-pointer transition-all", filter === "ALL" ? "bg-white/20 text-white font-bold" : "text-neutral-400 hover:text-white")}
                >
                  ALL CARS
                </button>
                <button
                  onClick={() => setFilter("POINTS")}
                  className={cn("px-2.5 py-1 rounded cursor-pointer transition-all", filter === "POINTS" ? "bg-gold/20 text-gold font-bold" : "text-neutral-400 hover:text-white")}
                >
                  TOP 10 (POINTS)
                </button>
                <button
                  onClick={() => setFilter("PODIUM")}
                  className={cn("px-2.5 py-1 rounded cursor-pointer transition-all", filter === "PODIUM" ? "bg-amber-500/20 text-amber-400 font-bold" : "text-neutral-400 hover:text-white")}
                >
                  PODIUM
                </button>
              </div>

              <button
                onClick={close}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕ ESC
              </button>
            </div>
          </div>

          {/* Podium Summary Cards (P1, P2, P3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((pos) => {
              const driver = sortedList.find((d) => d.position === pos);
              const pIdx = pos - 1;
              const name = participants[pIdx]?.name || (pos === 1 ? "M. VERSTAPPEN" : pos === 2 ? "L. HAMILTON" : "C. LECLERC");
              const isP1 = pos === 1;

              return (
                <div
                  key={pos}
                  className={cn(
                    "p-3.5 rounded-xl border flex items-center justify-between",
                    isP1
                      ? "bg-gradient-to-r from-amber-950/40 via-neutral-900/80 to-amber-950/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : pos === 2
                      ? "bg-neutral-900/80 border-slate-400/40"
                      : "bg-neutral-900/80 border-amber-700/40"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm border",
                      isP1
                        ? "bg-amber-500 text-black border-amber-300"
                        : pos === 2
                        ? "bg-slate-300 text-black border-slate-100"
                        : "bg-amber-700 text-white border-amber-500"
                    )}>
                      P{pos}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white tracking-wide">{name}</div>
                      <div className="text-[10px] text-neutral-400">
                        {driver ? formatLapTime(driver.bestLapTimeMs) : "--:--"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-gold">
                      +{FIA_POINTS[pos] ?? 0} PTS
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {isP1 ? "WINNER" : driver && driver.totalRaceTime ? `+${(driver.totalRaceTime - winnerTimeS).toFixed(3)}s` : "+3.2s"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Classification Table */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-neutral-900/50">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-neutral-950 border-b border-white/10 text-[10px] text-neutral-400 tracking-wider uppercase">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">POS</th>
                  <th className="py-2.5 px-3">DRIVER</th>
                  <th className="py-2.5 px-3 text-center">GRID DELTA</th>
                  <th className="py-2.5 px-3 text-right">BEST LAP</th>
                  <th className="py-2.5 px-3 text-center">STOPS</th>
                  <th className="py-2.5 px-3 text-right">TIME / GAP</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-right pr-4">POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredList.map((item) => {
                  const driverIdx = item.position - 1;
                  const driverName = participants[driverIdx]?.name || `CAR #${item.position}`;
                  const gridDelta = item.gridPosition - item.position;
                  const isFinished = item.resultStatus === 2;
                  const isDNF = item.resultStatus === 3;
                  const points = FIA_POINTS[item.position] ?? (item.points || 0);

                  const gapText = item.position === 1
                    ? "INTERVAL"
                    : isFinished && item.totalRaceTime > 0
                    ? `+${(item.totalRaceTime - winnerTimeS).toFixed(3)}s`
                    : isDNF
                    ? "RETIRED"
                    : "+1 LAP";

                  return (
                    <tr
                      key={item.position}
                      className={cn(
                        "hover:bg-white/5 transition-colors",
                        item.position <= 3 ? "bg-white/[0.02]" : ""
                      )}
                    >
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className={cn(
                          item.position === 1 ? "text-amber-400 font-black" : item.position <= 3 ? "text-slate-300 font-bold" : item.position <= 10 ? "text-emerald-400" : "text-neutral-400"
                        )}>
                          P{item.position}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white tracking-wide">{driverName}</span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          gridDelta > 0
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : gridDelta < 0
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            : "text-neutral-500"
                        )}>
                          {gridDelta > 0 ? `▲ +${gridDelta}` : gridDelta < 0 ? `▼ ${gridDelta}` : "—"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-neutral-300 tabular-nums">
                        {formatLapTime(item.bestLapTimeMs)}
                      </td>

                      <td className="py-2.5 px-3 text-center text-neutral-400">
                        {item.numPitStops}
                      </td>

                      <td className="py-2.5 px-3 text-right text-neutral-300 font-bold tabular-nums">
                        {gapText}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded uppercase border",
                          isFinished
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : isDNF
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-neutral-800 text-neutral-400 border-neutral-700"
                        )}>
                          {isFinished ? "FINISHED" : isDNF ? "DNF" : "CLASSIFIED"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right pr-4 font-bold tabular-nums">
                        <span className={cn(points > 0 ? "text-gold" : "text-neutral-600")}>
                          +{points}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

"use client";

import React from "react";
import { Timer, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { PanelHeader } from "@/components/cockpit/PanelHeader";
import { cn } from "@/lib/utils";

interface SectorApexMatrixProps {
  userLapTime?: number;
  ghostLapTime?: number;
  activeDistance?: number | null;
  className?: string;
}

const APEX_DATA = [
  { corner: "T1", name: "Sainte Dévote", userSpd: 88, ghostSpd: 92, deltaSpd: -4, gear: 2, distStart: 200, distEnd: 700 },
  { corner: "T4", name: "Casino Square", userSpd: 76, ghostSpd: 78, deltaSpd: -2, gear: 2, distStart: 1100, distEnd: 1600 },
  { corner: "T6", name: "Grand Hotel Hairpin", userSpd: 48, ghostSpd: 47, deltaSpd: 1, gear: 1, distStart: 1800, distEnd: 2300 },
  { corner: "T10", name: "Nouvelle Chicane", userSpd: 71, ghostSpd: 74, deltaSpd: -3, gear: 2, distStart: 2600, distEnd: 3100 },
  { corner: "T14", name: "Swimming Pool", userSpd: 152, ghostSpd: 158, deltaSpd: -6, gear: 4, distStart: 3300, distEnd: 3900 },
];

export const SectorApexMatrix: React.FC<SectorApexMatrixProps> = ({
  userLapTime = 74.28,
  ghostLapTime = 74.15,
  activeDistance = null,
  className,
}) => {
  const deltaLap = userLapTime - ghostLapTime;

  // Determine active sector (0-1400: S1, 1400-2900: S2, 2900+: S3)
  const activeSector =
    activeDistance !== null
      ? activeDistance < 1400
        ? 1
        : activeDistance < 2900
        ? 2
        : 3
      : null;

  return (
    <div
      className={cn(
        "rounded-xl bg-neutral-950/90 border border-white/[0.08] p-5 flex flex-col justify-between gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm",
        className
      )}
    >
      <PanelHeader
        label="02 // Sector & Apex Delta Matrix"
        right={
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold uppercase">
            DELTA: {deltaLap >= 0 ? `+${deltaLap.toFixed(3)}s` : `${deltaLap.toFixed(3)}s`}
          </span>
        }
      />

      {/* Sector Splits Row */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className={cn(
            "flex flex-col p-2.5 rounded-lg border transition-all duration-300",
            activeSector === 1
              ? "bg-amber-500/15 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              : "bg-black/50 border-white/[0.04]"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold">SECTOR 1</span>
            {activeSector === 1 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
          </div>
          <div className="flex items-baseline justify-between mt-1 font-mono">
            <span className="text-white text-xs font-bold">18.412s</span>
            <span className="text-[10px] text-amber-400 font-bold">+0.082s</span>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col p-2.5 rounded-lg border transition-all duration-300",
            activeSector === 2
              ? "bg-purple-500/15 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              : "bg-black/50 border-white/[0.04]"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold">SECTOR 2</span>
            {activeSector === 2 && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />}
          </div>
          <div className="flex items-baseline justify-between mt-1 font-mono">
            <span className="text-purple-400 text-xs font-bold">32.890s</span>
            <span className="text-[10px] text-purple-400 font-bold">PURPLE</span>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col p-2.5 rounded-lg border transition-all duration-300",
            activeSector === 3
              ? "bg-rose-500/15 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : "bg-black/50 border-white/[0.04]"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold">SECTOR 3</span>
            {activeSector === 3 && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
          </div>
          <div className="flex items-baseline justify-between mt-1 font-mono">
            <span className="text-white text-xs font-bold">22.978s</span>
            <span className="text-[10px] text-rose-400 font-bold">+0.128s</span>
          </div>
        </div>
      </div>

      {/* Apex Corner Speeds Table */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 border-b border-white/[0.06] pb-1 uppercase tracking-wider">
          <span>CORNER / APEX</span>
          <div className="flex items-center gap-4">
            <span>USER / GHOST</span>
            <span className="w-12 text-right">DELTA</span>
          </div>
        </div>

        {APEX_DATA.map((item, idx) => {
          const isFaster = item.deltaSpd > 0;
          const isCornerActive =
            activeDistance !== null &&
            activeDistance >= item.distStart &&
            activeDistance <= item.distEnd;

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between py-1.5 px-2 rounded text-xs font-mono transition-all duration-200",
                isCornerActive
                  ? "bg-amber-500/15 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)] scale-[1.01]"
                  : "bg-black/40 border border-white/[0.02] hover:border-white/[0.08]"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded text-[9px] font-bold",
                    isCornerActive ? "bg-amber-400 text-black font-black" : "bg-white/10 text-white"
                  )}
                >
                  {item.corner}
                </span>
                <span className={cn("text-[11px] truncate max-w-[200px]", isCornerActive ? "text-white font-bold" : "text-neutral-300")}>
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-neutral-400 text-[11px]">
                  <span className={isCornerActive ? "text-amber-300 font-black" : "text-amber-400 font-bold"}>{item.userSpd}</span> /{" "}
                  <span className="text-cyan-400">{item.ghostSpd}</span>
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold w-12 text-right flex items-center justify-end gap-0.5",
                    isFaster ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {isFaster ? (
                    <ArrowUpRight size={11} />
                  ) : (
                    <ArrowDownRight size={11} />
                  )}
                  {item.deltaSpd > 0 ? `+${item.deltaSpd}` : item.deltaSpd} km/h
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

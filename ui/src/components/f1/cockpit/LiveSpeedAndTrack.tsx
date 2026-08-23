/**
 * LiveSpeedAndTrack — F1 Virtual Track Ribbon & Live Canvas Speed Trace
 * Displays dynamic 2D circuit geometry with sector splits and real-time telemetry speed streaming.
 */

"use client";

import React, { useMemo } from "react";
import { SpeedChart } from "@/components/f1/charts/SpeedChart";
import { LiveTrackMap, type TrackLayoutData } from "@/components/f1/charts/LiveTrackMap";
import { Gauge, MapPin } from "lucide-react";
import type { HistoryPoint } from "@/hooks/useTelemetry";

interface LiveSpeedAndTrackProps {
  history: HistoryPoint[];
  avgSpeed?: number;
  maxSpeed?: number;
  trackLayout?: TrackLayoutData | null;
  sectorTimes?: {
    s1?: string;
    s2?: string;
    s3?: string;
  };
  className?: string;
}

export const LiveSpeedAndTrack: React.FC<LiveSpeedAndTrackProps> = ({
  history,
  avgSpeed = 245,
  maxSpeed = 338,
  trackLayout,
  sectorTimes = { s1: "34.24s", s2: "51.50s", s3: "29.32s" },
  className,
}) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── TOP: Virtual Track Ribbon & Sector Splits ─────────────────────── */}
      <div className="relative rounded-3xl p-4 bg-gradient-to-b from-[#121215] to-[#08080A] border border-white/10 shadow-[0_0_25px_rgba(0,0,0,0.8)] flex-1 flex flex-col justify-between overflow-hidden min-h-[260px]">
        {/* Carbon fiber subtle pattern */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#CFA349_0.5px,transparent_0.5px)] [background-size:10px_10px]" />

        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-gold" />
            <span className="text-[11px] font-black text-gold uppercase tracking-widest font-mono">
              VIRTUAL CIRCUIT RIBBON
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
            SECTOR 1 ACTIVE
          </span>
        </div>

        {/* Track Geometry & Sector Times */}
        <div className="relative z-10 grid grid-cols-12 items-center flex-1 my-1">
          {/* Sector Times Box */}
          <div className="col-span-4 flex flex-col gap-2 font-mono">
            <span className="text-[10px] text-silver/50 uppercase font-bold tracking-wider">SECTOR TIMESTAMPS</span>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center p-1.5 bg-white/5 rounded border border-white/5">
                <span className="text-silver/60">S1:</span>
                <span className="text-white font-bold">{sectorTimes.s1}</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-white/5 rounded border border-white/5">
                <span className="text-silver/60">S2:</span>
                <span className="text-emerald-400 font-bold">{sectorTimes.s2}</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-white/5 rounded border border-white/5">
                <span className="text-silver/60">S3:</span>
                <span className="text-white font-bold">{sectorTimes.s3}</span>
              </div>
            </div>
          </div>

          {/* Virtual Track Map SVG / Canvas */}
          <div className="col-span-8 h-48 flex items-center justify-center relative">
            <LiveTrackMap trackLayout={trackLayout} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Real-time 60Hz Canvas Speed Trace ─────────────────────── */}
      <div className="relative rounded-3xl p-4 bg-gradient-to-b from-[#121215] to-[#08080A] border border-white/10 shadow-[0_0_25px_rgba(0,0,0,0.8)] h-44 flex flex-col justify-between overflow-hidden">
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Gauge size={13} className="text-gold" />
            <span className="text-[11px] font-black text-gold uppercase tracking-widest font-mono">
              REAL-TIME SPEED TELEMETRY TRACE (KM/H)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-silver/60">
            <span>AVG <strong className="text-white">{avgSpeed}</strong></span>
            <span>·</span>
            <span>PEAK <strong className="text-gold">{maxSpeed}</strong></span>
          </div>
        </div>

        {/* Canvas Speed Chart */}
        <div className="relative z-10 w-full flex-1 pt-2">
          <SpeedChart history={history} avgSpeed={avgSpeed} maxSpeed={maxSpeed} />
        </div>
      </div>
    </div>
  );
};

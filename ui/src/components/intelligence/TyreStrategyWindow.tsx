"use client";

import React, { useState } from "react";
import { Disc, TrendingDown, Clock, ShieldAlert, ArrowRight } from "lucide-react";
import { PanelHeader } from "@/components/cockpit/PanelHeader";
import { SourceBadge } from "@/components/cockpit/primitives";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useTelemetryStore } from "@/store/telemetryStore";
import { cn } from "@/lib/utils";

interface TyreStrategyWindowProps {
  currentLap?: number;
  totalLaps?: number;
  className?: string;
}

export const TyreStrategyWindow: React.FC<TyreStrategyWindowProps> = ({
  currentLap = 16,
  totalLaps = 56,
  className,
}) => {
  const [compound, setCompound] = useState<"SOFT" | "MEDIUM" | "HARD">("SOFT");
  const { source } = useLiveOrDemo();
  const isLive = source === "LIVE";

  const tyreSetsData = useTelemetryStore((s) => s.tyreSets);
  const carStatus = useTelemetryStore((s) => s.carStatus);
  const lapData = useTelemetryStore((s) => s.lapData);
  const session = useTelemetryStore((s) => s.session);

  const fittedSet = tyreSetsData?.tyreSets?.[tyreSetsData.fittedIdx] ??
    tyreSetsData?.tyreSets?.find((s) => s.fitted);

  const curLap = lapData?.lap ?? currentLap;
  const tyreAge = carStatus?.tyresAgeLaps ?? 16;
  const wearPct = fittedSet ? fittedSet.wear : 34;
  const lifeSpan = fittedSet?.lifeSpan ?? 24;
  const usableLife = fittedSet?.usableLife ?? 28;

  return (
    <div
      className={cn(
        "rounded-xl bg-neutral-950/90 border border-white/[0.08] p-5 flex flex-col justify-between gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <PanelHeader
          label="07 // Stint Degradation & Pit Strategy Window"
          right={
            <div className="flex items-center gap-1.5">
              <SourceBadge source={isLive && fittedSet ? "LIVE" : "SIM"} />
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold uppercase">
                {isLive && fittedSet ? `FITTED SET: ${wearPct}% WEAR` : "PIT WINDOW: LAP 18–22"}
              </span>
            </div>
          }
        />


        {/* Compound Selector Pills */}
        <div className="flex items-center gap-1 self-start sm:self-auto p-0.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[9px] font-bold">
          <button
            onClick={() => setCompound("SOFT")}
            className={cn(
              "px-2 py-0.5 rounded transition-all cursor-pointer",
              compound === "SOFT"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "text-neutral-400 hover:text-white"
            )}
          >
            C4 SOFT
          </button>
          <button
            onClick={() => setCompound("MEDIUM")}
            className={cn(
              "px-2 py-0.5 rounded transition-all cursor-pointer",
              compound === "MEDIUM"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-neutral-400 hover:text-white"
            )}
          >
            C3 MEDIUM
          </button>
          <button
            onClick={() => setCompound("HARD")}
            className={cn(
              "px-2 py-0.5 rounded transition-all cursor-pointer",
              compound === "HARD"
                ? "bg-white/20 text-white border border-white/40"
                : "text-neutral-400 hover:text-white"
            )}
          >
            C2 HARD
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* 1. Degradation Index */}
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-black/50 border border-white/[0.04]">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-neutral-400 uppercase font-bold">TYRE LIFE PROJECTION</span>
            <span className="text-amber-400 font-bold">STINT LAP {tyreAge} / {lifeSpan}</span>
          </div>

          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden my-1">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, wearPct))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
            <span>WEAR CLIFF: ~LAP {usableLife}</span>
            <span className="text-rose-400 font-bold">-{wearPct > 40 ? "0.145s" : "0.085s"} / LAP DECAY</span>
          </div>
        </div>


        {/* 2. Undercut vs Overcut Probability */}
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-black/50 border border-white/[0.04]">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-neutral-400 uppercase font-bold">TACTICAL PIT DELTA</span>
            <span className="text-emerald-400 font-bold">+1.84s UNDERCUT</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-0.5">
            <div className="p-1.5 rounded bg-black/60 border border-emerald-500/20">
              <span className="text-[9px] text-neutral-400 block">UNDERCUT GAIN</span>
              <span className="text-emerald-400 font-bold">+1.84s</span>
            </div>
            <div className="p-1.5 rounded bg-black/60 border border-white/[0.06]">
              <span className="text-[9px] text-neutral-400 block">OVERCUT DEFENSE</span>
              <span className="text-neutral-300 font-bold">-0.42s</span>
            </div>
          </div>
        </div>

        {/* 3. Track Conditions & Crossover */}
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-black/50 border border-white/[0.04]">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-neutral-400 uppercase font-bold">OPTIMAL PIT STOP</span>
            <span className="text-white font-bold">PLAN A (1-STOP)</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-white/[0.04]">
            <span className="text-neutral-400 text-[11px]">TARGET STINT 2:</span>
            <span className="text-white font-bold text-[11px] px-2 py-0.5 rounded bg-white/10 border border-white/20">
              C2 HARD (38 LAPS)
            </span>
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
            <span>PIT LANE DELTA LOSS:</span>
            <span className="text-amber-400 font-bold">22.4s UNDER GREEN</span>
          </div>
        </div>
      </div>

      {/* 4. Live 60-Minute Weather Radar & Tyre Crossover Horizon (Packet 1 Session Telemetry) */}
      <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06] flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-neutral-300 font-bold tracking-wider uppercase">
              LIVE METEOROLOGICAL RADAR & TYRE CROSSOVER HORIZON
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">AIR: <strong className="text-white">{session?.airTemp ?? 24}°C</strong></span>
            <span className="text-white/20">|</span>
            <span className="text-neutral-400">TRACK: <strong className="text-amber-400">{session?.trackTemp ?? 36}°C</strong></span>
          </div>
        </div>

        {/* Forecast Timeline Horizon */}
        <div className="grid grid-cols-5 gap-2 pt-1 font-mono text-[9px]">
          {(session?.weatherForecastSamples && session.weatherForecastSamples.length > 0
            ? session.weatherForecastSamples.slice(0, 5)
            : [
                { sessionType: 0, timeOffset: 5, weather: 0, trackTemp: 36, trackTempChange: 2, airTemp: 24, airTempChange: 2, rainPercentage: 0 },
                { sessionType: 0, timeOffset: 15, weather: 1, trackTemp: 35, trackTempChange: 2, airTemp: 24, airTempChange: 2, rainPercentage: 5 },
                { sessionType: 0, timeOffset: 30, weather: 2, trackTemp: 33, trackTempChange: 1, airTemp: 23, airTempChange: 1, rainPercentage: 15 },
                { sessionType: 0, timeOffset: 45, weather: 3, trackTemp: 30, trackTempChange: 1, airTemp: 22, airTempChange: 1, rainPercentage: 45 },
                { sessionType: 0, timeOffset: 60, weather: 4, trackTemp: 28, trackTempChange: 1, airTemp: 21, airTempChange: 1, rainPercentage: 70 },
              ]
          ).map((sample, idx) => {
            const isRainLikely = sample.rainPercentage >= 40;
            const weatherDesc = sample.weather === 0 ? "CLEAR" : sample.weather === 1 ? "LIGHT CLOUD" : sample.weather === 2 ? "OVERCAST" : sample.weather === 3 ? "LIGHT RAIN" : sample.weather === 4 ? "HEAVY RAIN" : "STORM";
            const weatherIcon = sample.weather >= 3 ? "🌧️" : sample.weather === 2 ? "☁️" : sample.weather === 1 ? "⛅" : "☀️";

            return (
              <div
                key={idx}
                className={cn(
                  "p-2 rounded-lg border flex flex-col justify-between gap-1.5 transition-all",
                  isRainLikely
                    ? "bg-blue-950/40 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                    : "bg-neutral-900/60 border-white/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-bold">+{sample.timeOffset}m</span>
                  <span>{weatherIcon}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-neutral-400 truncate">{weatherDesc}</span>
                  <div className="flex items-center justify-between">
                    <span className={cn("font-bold text-[10px]", isRainLikely ? "text-cyan-300" : "text-neutral-300")}>
                      {sample.rainPercentage}% RAIN
                    </span>
                    <span className="text-neutral-400 text-[8px]">{sample.trackTemp}°C</span>
                  </div>
                </div>
                {/* Visual probability bar */}
                <div className="w-full h-1 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isRainLikely ? "bg-cyan-400" : "bg-neutral-500"
                    )}
                    style={{ width: `${Math.max(5, sample.rainPercentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

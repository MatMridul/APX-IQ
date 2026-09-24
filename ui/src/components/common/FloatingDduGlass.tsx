"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Gauge, Maximize2, X, ChevronUp, ChevronDown, Radio, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useTelemetryStore } from "@/store/telemetryStore";

export function FloatingDduGlass() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { source, isConnected } = useLiveOrDemo();
  const liveTelemetry = useTelemetryStore((s) => s.telemetry);
  const isLive = isConnected && liveTelemetry !== null;

  // Demo telemetry simulation when live not connected
  const [simRpm, setSimRpm] = useState(11400);
  const [simSpeed, setSimSpeed] = useState(268);
  const [simGear, setSimGear] = useState<number | string>(7);

  useEffect(() => {
    if (isLive) return;
    const interval = setInterval(() => {
      setSimRpm(9000 + Math.floor(Math.sin(Date.now() / 400) * 2800));
      setSimSpeed(180 + Math.floor(Math.sin(Date.now() / 800) * 110));
    }, 150);
    return () => clearInterval(interval);
  }, [isLive]);

  const currentSpeed = isLive && liveTelemetry ? Math.round(liveTelemetry.speed) : simSpeed;
  const currentRpm = isLive && liveTelemetry ? liveTelemetry.rpm : simRpm;
  const currentGear = isLive && liveTelemetry ? (liveTelemetry.gear === 0 ? "N" : liveTelemetry.gear) : simGear;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 font-mono select-none">
      <div
        className={cn(
          "rounded-2xl bg-black/85 border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 overflow-hidden flex flex-col",
          isMinimized ? "w-64 p-3" : "w-80 sm:w-96 p-4"
        )}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full animate-pulse", isLive ? "bg-emerald-400" : "bg-amber-400")} />
            <span className="font-bold text-white uppercase tracking-wider">
              {isLive ? "LIVE 60Hz DDU CLUSTER" : "DDU SIMULATOR DOCK"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] uppercase font-bold flex items-center gap-1"
              title="Open Full Cockpit"
            >
              <Maximize2 size={10} />
              <span className="hidden sm:inline">EXPAND</span>
            </Link>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06]"
              title={isMinimized ? "Expand DDU" : "Minimize DDU"}
            >
              {isMinimized ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-white/[0.06]"
              title="Close Floating DDU"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* 15-LED Shift Light Array */}
        <div className="pt-2 flex flex-col gap-1">
          <div className="grid grid-cols-15 gap-0.5 p-1 rounded-lg bg-neutral-950 border border-white/10">
            {Array.from({ length: 15 }).map((_, i) => {
              const frac = (currentRpm - 5000) / (12500 - 5000);
              const active = i < Math.round(frac * 15);
              const isGreen = i < 5;
              const isRed = i >= 5 && i < 10;
              let color = "bg-neutral-800 opacity-20";
              if (active) {
                if (isGreen) color = "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] opacity-100";
                else if (isRed) color = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] opacity-100";
                else color = "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.95)] opacity-100";
              }
              return <div key={i} className={cn("h-2 rounded-xs transition-all duration-75", color)} />;
            })}
          </div>
        </div>

        {/* Instrument Readout Body */}
        {!isMinimized && (
          <div className="grid grid-cols-3 items-center gap-3 pt-3">
            {/* Speed */}
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-400 uppercase">SPEED</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white tabular-nums">{currentSpeed}</span>
                <span className="text-[9px] text-neutral-400 font-bold">KM/H</span>
              </div>
            </div>

            {/* Gear */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-neutral-400 uppercase">GEAR</span>
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <span className="text-2xl font-black text-amber-400">{currentGear}</span>
              </div>
            </div>

            {/* RPM / Delta */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-neutral-400 uppercase">RPM</span>
              <span className="text-sm font-black text-amber-400 tabular-nums">
                {currentRpm.toLocaleString()}
              </span>
              <span className="text-[9px] text-emerald-400 font-bold mt-0.5">
                -0.082s VER
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

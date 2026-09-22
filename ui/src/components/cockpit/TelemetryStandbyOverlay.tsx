"use client";

import React, { useState } from "react";
import {
  Gamepad2,
  Play,
  HelpCircle,
  Radio,
  X,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUxStore } from "@/store/uxStore";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";

interface TelemetryStandbyOverlayProps {
  onOpenConnect: () => void;
  onOpenGuide: () => void;
}

export function TelemetryStandbyOverlay({
  onOpenConnect,
  onOpenGuide,
}: TelemetryStandbyOverlayProps) {
  const isPlaying = useUxStore((s) => s.isPlaying);
  const setPlaying = useUxStore((s) => s.setPlaying);
  const { source } = useLiveOrDemo();
  const [isDismissed, setIsDismissed] = useState(false);

  // If live telemetry is streaming or playing actively and dismissed, hide the full card
  if (source === "LIVE") return null;

  if (isDismissed || isPlaying) {
    return (
      <div className="absolute bottom-2 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setIsDismissed(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 border border-gold/40 shadow-[0_0_15px_rgba(0,0,0,0.8)] text-gold font-mono text-[10px] font-bold hover:bg-gold/15 transition-all cursor-pointer backdrop-blur-md"
        >
          <Radio size={12} className="text-gold animate-pulse" />
          <span>F1 LINK & GUIDE</span>
          <ChevronUp size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto px-4">
      <div className="p-4 rounded-2xl bg-[#090A0E]/95 border border-gold/50 shadow-[0_0_35px_rgba(0,0,0,0.95)] backdrop-blur-xl flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <div className="font-mono text-xs font-black tracking-widest text-white uppercase flex items-center gap-2">
              <span>PIT WALL STANDBY</span>
              <span className="text-gold">·</span>
              <span className="text-[10px] text-neutral-400 font-bold">READY FOR TELEMETRY</span>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
            title="Minimize to Corner"
          >
            <ChevronDown size={15} />
          </button>
        </div>

        {/* Descriptive Body */}
        <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
          The workstation is waiting for an incoming <strong className="text-gold">UDP 20777</strong> telemetry stream from your F1 game. You can connect your simulator or press play to explore the Monaco benchmark lap.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenConnect}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-gold/30 to-gold/20 hover:from-gold/40 hover:to-gold/30 border border-gold/50 text-gold font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 shadow-[0_0_12px_rgba(207,163,73,0.2)] transition-all cursor-pointer active:scale-95"
            >
              <Gamepad2 size={13} />
              <span>Connect F1 Game</span>
            </button>

            <button
              onClick={onOpenGuide}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-neutral-200 font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <HelpCircle size={13} />
              <span>Platform Guide</span>
            </button>
          </div>

          <button
            onClick={() => setPlaying(true)}
            className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)] active:scale-95"
          >
            <Play size={12} className="fill-current" />
            <span>Play Benchmark Lap</span>
          </button>
        </div>
      </div>
    </div>
  );
}

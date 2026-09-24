"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Activity,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  Maximize2,
  Radio,
  Sliders,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { soundFx } from "@/lib/cockpit/soundFx";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";

/**
 * Monaco Pole Reference Telemetry Points (Distance 0m to 3,340m)
 */
const TELEMETRY_FRAMES = [
  { dist: 0, spd: 285, ghostSpd: 290, thr: 100, brk: 0, gear: 7, rpm: 11800, delta: -0.05, corner: "Main Straight" },
  { dist: 280, spd: 110, ghostSpd: 118, thr: 0, brk: 95, gear: 2, rpm: 7600, delta: 0.12, corner: "T1 Sainte Dévote" },
  { dist: 650, spd: 255, ghostSpd: 252, thr: 100, brk: 0, gear: 6, rpm: 11200, delta: 0.08, corner: "Beau Rivage" },
  { dist: 1100, spd: 135, ghostSpd: 140, thr: 15, brk: 60, gear: 3, rpm: 8400, delta: 0.18, corner: "T4 Casino Square" },
  { dist: 1550, spd: 82, ghostSpd: 85, thr: 5, brk: 80, gear: 2, rpm: 6900, delta: 0.22, corner: "Mirabeau Haute" },
  { dist: 1850, spd: 48, ghostSpd: 46, thr: 20, brk: 35, gear: 1, rpm: 5600, delta: -0.04, corner: "T6 Grand Hotel Hairpin" },
  { dist: 2250, spd: 220, ghostSpd: 228, thr: 100, brk: 0, gear: 5, rpm: 10800, delta: 0.15, corner: "Tunnel Exit" },
  { dist: 2650, spd: 74, ghostSpd: 78, thr: 0, brk: 100, gear: 2, rpm: 7200, delta: 0.28, corner: "T10 Nouvelle Chicane" },
  { dist: 3050, spd: 185, ghostSpd: 192, thr: 85, brk: 0, gear: 4, rpm: 9800, delta: 0.14, corner: "T12 Tabac" },
  { dist: 3340, spd: 160, ghostSpd: 168, thr: 40, brk: 45, gear: 4, rpm: 8900, delta: -0.14, corner: "T14 Swimming Pool" },
];

export function HeroTelemetrySandbox() {
  const { isConnected } = useLiveOrDemo();
  const liveTelemetry = useTelemetryStore((s) => s.telemetry);
  const isLive = isConnected && liveTelemetry !== null;

  const [frameIdx, setFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMult, setSpeedMult] = useState<number>(1);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1200 / speedMult;
    const timer = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % TELEMETRY_FRAMES.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speedMult]);

  const lapData = useTelemetryStore((s) => s.lapData);
  const f = TELEMETRY_FRAMES[frameIdx];

  const currentSpeed = isLive && liveTelemetry ? Math.round(liveTelemetry.speed) : f.spd;
  const currentGhost = f.ghostSpd;
  const currentGear = isLive && liveTelemetry ? (liveTelemetry.gear === 0 ? "N" : liveTelemetry.gear) : f.gear;
  const currentRpm = isLive && liveTelemetry ? liveTelemetry.rpm : f.rpm;
  const currentDelta = isLive && lapData?.deltaToFrontMs != null ? (lapData.deltaToFrontMs / 1000).toFixed(3) : (f.delta > 0 ? `+${f.delta.toFixed(3)}` : `${f.delta.toFixed(3)}`);
  const isPurpleDelta = parseFloat(String(currentDelta)) <= 0;

  // Sound sync
  const toggleSound = () => {
    const next = !audioEnabled;
    soundFx.enabled = next;
    setAudioEnabled(next);
    if (next) {
      soundFx.playButtonClick();
      soundFx.setEngineRpm(currentRpm, f.thr > 50 ? 1.0 : 0.3);
    } else {
      soundFx.stopEngine();
    }
  };

  useEffect(() => {
    if (audioEnabled) {
      soundFx.setEngineRpm(currentRpm, f.thr > 50 ? 1.0 : 0.3);
    }
  }, [currentRpm, f.thr, audioEnabled]);

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-[#0F1117] via-[#090A0E] to-[#040507] border border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col overflow-hidden relative group">
      
      {/* Carbon weave overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(207,163,73,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(207,163,73,0.4) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── WORKSTATION TOP BAR ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.08] bg-black/40 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-mono text-xs font-bold text-white tracking-widest uppercase">
              LIVE TELEMETRY STREAM
            </span>
          </div>
          <span className="text-neutral-500 font-mono">/</span>
          <span className="font-mono text-[11px] text-amber-400 font-bold uppercase">
            MONACO GP · QUALIFYING Q3
          </span>
          <span className="hidden sm:inline-block font-mono text-[10px] text-neutral-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/10">
            BENCHMARK: VERSTAPPEN (1:11.365)
          </span>
        </div>

        {/* Right Quick Controls */}
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={toggleSound}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              audioEnabled
                ? "bg-amber-500/20 border border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-400"
            )}
            title="Toggle Engine Audio Synthesis"
          >
            {audioEnabled ? <Volume2 size={12} className="animate-pulse" /> : <VolumeX size={12} />}
            <span>{audioEnabled ? "AUDIO ACTIVE" : "SFX MUTED"}</span>
          </button>

          <Link
            href="/dashboard"
            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
          >
            <Maximize2 size={11} />
            <span>FULL COCKPIT</span>
          </Link>
        </div>
      </div>

      {/* ── WORKSTATION INTERACTIVE GRID ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 sm:p-6 relative z-10">
        
        {/* Left: Speed, Gear & DDU Cluster (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 p-4 rounded-xl bg-black/60 border border-white/[0.08] shadow-inner">
          
          {/* Shift Light Strip */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-400 uppercase">RPM TACHOMETER</span>
              <span className="text-amber-400 font-bold tabular-nums">{currentRpm.toLocaleString()} RPM</span>
            </div>
            <div className="grid grid-cols-15 gap-1 p-1 rounded-lg bg-neutral-950 border border-white/10">
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
                return <div key={i} className={cn("h-2.5 rounded-sm transition-all duration-100", color)} />;
              })}
            </div>
          </div>

          {/* Center Instrument Display */}
          <div className="grid grid-cols-3 items-center gap-3 py-2 border-y border-white/[0.06]">
            {/* Speed */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">SPEED</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-4xl sm:text-5xl font-black text-white tabular-nums">
                  {currentSpeed}
                </span>
                <span className="text-[10px] font-mono text-neutral-400 font-bold">KM/H</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 tabular-nums">
                Ghost: {currentGhost} km/h
              </span>
            </div>

            {/* Gear */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">GEAR</span>
              <div className="w-16 h-16 rounded-2xl bg-neutral-900/90 border border-amber-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <span className="font-mono text-4xl font-black text-amber-400">
                  {currentGear}
                </span>
              </div>
            </div>

            {/* Delta */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">DELTA vs GHOST</span>
              <span className={cn("font-mono text-2xl font-black tabular-nums mt-1", isPurpleDelta ? "text-emerald-400" : "text-rose-400")}>
                {currentDelta}s
              </span>
              <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border mt-1", isPurpleDelta ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10")}>
                {isPurpleDelta ? "PURPLE SPLIT" : "TIME LOSS"}
              </span>
            </div>
          </div>

          {/* Current Track Location */}
          <div className="flex items-center justify-between font-mono text-[11px] text-neutral-300">
            <span className="text-neutral-400 uppercase">SECTOR LOCATION:</span>
            <span className="text-white font-bold">{f.corner} ({f.dist}m)</span>
          </div>
        </div>

        {/* Right: Multi-Channel Telemetry Traces & Scrubbing (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4 p-4 rounded-xl bg-black/60 border border-white/[0.08] shadow-inner">
          
          {/* Header */}
          <div className="flex items-center justify-between text-[10px] font-mono border-b border-white/[0.06] pb-2">
            <span className="text-neutral-400 uppercase font-bold">
              MULTI-CHANNEL TELEMETRY ALIGNMENT
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <span className="w-2 h-0.5 bg-amber-400" /> Player Speed
              </span>
              <span className="flex items-center gap-1 text-cyan-400 font-bold">
                <span className="w-2 h-0.5 bg-cyan-400" /> Ghost (Verstappen)
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-0.5 bg-emerald-400" /> Throttle
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-bold">
                <span className="w-2 h-0.5 bg-rose-500" /> Brake
              </span>
            </div>
          </div>

          {/* Telemetry Waveform Visualizer (SVG) */}
          <div className="relative h-32 w-full flex items-center justify-center bg-neutral-950/80 rounded-lg p-2 border border-white/[0.04]">
            <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />

              {/* Ghost Speed Curve (Cyan) */}
              <polyline
                fill="none"
                stroke="#06B6D4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,15 50,85 100,25 150,75 200,95 250,110 300,30 350,98 400,55 450,65 500,20"
              />

              {/* Player Speed Curve (Amber) */}
              <polyline
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,18 50,90 100,22 150,70 200,98 250,112 300,35 350,102 400,58 450,62 500,22"
              />

              {/* Throttle Trace (Emerald) */}
              <polyline
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
                points="0,105 40,105 50,118 90,118 100,105 140,105 150,115 190,115 200,118 240,118 250,115 290,115 300,105 340,105 350,118 390,118 400,108 450,112 500,105"
              />

              {/* Current Distance Playhead Cursor */}
              {(() => {
                const cursorX = (frameIdx / (TELEMETRY_FRAMES.length - 1)) * 500;
                return (
                  <g>
                    <line x1={cursorX} y1="0" x2={cursorX} y2="120" stroke="#FACC15" strokeWidth="2" />
                    <circle cx={cursorX} cy="30" r="4" fill="#FACC15" stroke="#000" strokeWidth="1.5" />
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Interactive Playback Scrubber */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 font-mono">
              <button
                onClick={() => {
                  soundFx.playButtonClick();
                  setIsPlaying((p) => !p);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              >
                {isPlaying ? <Pause size={13} className="fill-current" /> : <Play size={13} className="fill-current" />}
                <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
              </button>

              <button
                onClick={() => {
                  soundFx.playButtonClick();
                  setFrameIdx(0);
                }}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white cursor-pointer"
                title="Reset to Lap Start"
              >
                <RotateCcw size={13} />
              </button>

              {/* Speed Multipliers */}
              <div className="flex items-center p-0.5 rounded-lg bg-black/60 border border-white/10 text-[10px]">
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => {
                      soundFx.playButtonClick();
                      setSpeedMult(spd);
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                      speedMult === spd ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scrubber slider */}
            <div className="flex-1 max-w-xs flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={TELEMETRY_FRAMES.length - 1}
                value={frameIdx}
                onChange={(e) => {
                  setIsPlaying(false);
                  setFrameIdx(Number(e.target.value));
                }}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <span className="font-mono text-[10px] text-neutral-400 tabular-nums w-10 text-right">
                {Math.round((frameIdx / (TELEMETRY_FRAMES.length - 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── WORKSTATION FOOTER STRIP ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-t border-white/[0.08] bg-black/40 text-[10px] font-mono text-neutral-400 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold">F1 2020 – 2025 COMPLIANT</span>
          <span>·</span>
          <span>60Hz ZERO-ALLOC BUFFER</span>
          <span>·</span>
          <span>DETERMINISTIC FIA DELTA ENGINE</span>
        </div>
        <span className="text-amber-400/90 font-bold">
          LATENCY: &lt; 0.8ms (LOCAL UDP LOOPBACK)
        </span>
      </div>
    </div>
  );
}

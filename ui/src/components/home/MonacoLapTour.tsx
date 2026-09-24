"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Activity,
  Sparkles,
  Zap,
  ArrowRight,
  Flame,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { v6EngineSynth } from "@/lib/cockpit/v6EngineSynth";

const MONACO_MAP_COORDS: Record<string, { x: number; y: number; label: string }> = {
  straight: { x: 250, y: 195, label: "S/F" },
  t1: { x: 330, y: 195, label: "T1" },
  t2: { x: 305, y: 130, label: "T2" },
  t4: { x: 230, y: 65, label: "T4" },
  t6: { x: 155, y: 95, label: "T6" },
  tunnel: { x: 245, y: 145, label: "TUN" },
  t10: { x: 205, y: 190, label: "T10" },
  t12: { x: 150, y: 205, label: "T12" },
  t14: { x: 95, y: 195, label: "T14" },
};

interface MonacoCorner {
  id: string;
  distM: number;
  name: string;
  number: string;
  type: string;
  driverSpeed: number;
  ghostSpeed: number;
  gear: number;
  rpm: number;
  throttle: number;
  brake: number;
  deltaMs: number;
  gForceLat: number;
  racingTip: string;
}

const MONACO_CORNER_STAGES: MonacoCorner[] = [
  {
    id: "straight",
    distM: 0,
    name: "Boulevard Albert 1er (Main Straight)",
    number: "START / FINISH",
    type: "DRS HIGH-SPEED ACCELERATION",
    driverSpeed: 285,
    ghostSpeed: 290,
    gear: 7,
    rpm: 11800,
    throttle: 100,
    brake: 0,
    deltaMs: -0.05,
    gForceLat: 0.1,
    racingTip: "DRS wide open. Deploy ERS overtake battery charge 150m before Turn 1 braking board.",
  },
  {
    id: "t1",
    distM: 280,
    name: "Sainte Dévote",
    number: "TURN 1",
    type: "HEAVY 100% BRAKING ZONE",
    driverSpeed: 105,
    ghostSpeed: 114,
    gear: 2,
    rpm: 7600,
    throttle: 0,
    brake: 100,
    deltaMs: 0.12,
    gForceLat: 3.2,
    racingTip: "Brake at the 100m marker. Trail-brake deep to the inside curb, then snap to 100% throttle over the exit rise.",
  },
  {
    id: "t2",
    distM: 650,
    name: "Beau Rivage",
    number: "SECTOR 1 UPHILL",
    type: "BLIND FULL-THROTTLE SWEEP",
    driverSpeed: 255,
    ghostSpeed: 252,
    gear: 6,
    rpm: 11200,
    throttle: 100,
    brake: 0,
    deltaMs: 0.08,
    gForceLat: 1.8,
    racingTip: "Keep the car glued to the right armco before flicking left into Massenet. Minimal steering input preserves front tires.",
  },
  {
    id: "t4",
    distM: 1100,
    name: "Casino Square",
    number: "TURN 4",
    type: "OFF-CAMBER BLIND CREST",
    driverSpeed: 135,
    ghostSpeed: 140,
    gear: 3,
    rpm: 8400,
    throttle: 25,
    brake: 55,
    deltaMs: 0.18,
    gForceLat: 2.8,
    racingTip: "Car gets light over the road bump. Avoid early curb clipping or the car will skip wide into the barrier.",
  },
  {
    id: "t6",
    distM: 1850,
    name: "Grand Hotel Hairpin",
    number: "TURN 6",
    type: "SLOWEST CORNER ON F1 CALENDAR",
    driverSpeed: 48,
    ghostSpeed: 46,
    gear: 1,
    rpm: 5600,
    throttle: 15,
    brake: 40,
    deltaMs: -0.04,
    gForceLat: 1.4,
    racingTip: "Full maximum steering lock. Gentle throttle application in 1st gear to prevent rear axle wheelspin.",
  },
  {
    id: "tunnel",
    distM: 2250,
    name: "The Tunnel",
    number: "HIGH-SPEED SWEEP",
    type: "DARK TRANSITION & COMPRESSION",
    driverSpeed: 280,
    ghostSpeed: 288,
    gear: 7,
    rpm: 11900,
    throttle: 100,
    brake: 0,
    deltaMs: 0.15,
    gForceLat: 2.2,
    racingTip: "High aerodynamic downforce compression. Watch the lighting change exiting into the heavy braking for Turn 10.",
  },
  {
    id: "t10",
    distM: 2650,
    name: "Nouvelle Chicane",
    number: "TURN 10 & 11",
    type: "VIOLENT DOWNHILL BRAKING",
    driverSpeed: 74,
    ghostSpeed: 78,
    gear: 2,
    rpm: 7200,
    throttle: 0,
    brake: 100,
    deltaMs: 0.28,
    gForceLat: 3.5,
    racingTip: "Brutal 5G deceleration from 280 km/h to 74 km/h. Clip both kerbs aggressively without unsettling chassis.",
  },
  {
    id: "t12",
    distM: 3050,
    name: "Tabac",
    number: "TURN 12",
    type: "HARBOUR-SIDE COMMITTED APEX",
    driverSpeed: 185,
    ghostSpeed: 192,
    gear: 4,
    rpm: 9800,
    throttle: 85,
    brake: 10,
    deltaMs: 0.14,
    gForceLat: 3.8,
    racingTip: "Carry high 4th-gear momentum with a brief tap of the brake. Brush the inside armco to maximize exit speed.",
  },
  {
    id: "t14",
    distM: 3340,
    name: "Swimming Pool Chicane (Louis Chiron)",
    number: "TURN 14 – 16",
    type: "HIGH-SPEED KERB STRIKE",
    driverSpeed: 160,
    ghostSpeed: 168,
    gear: 4,
    rpm: 8900,
    throttle: 45,
    brake: 40,
    deltaMs: -0.14,
    gForceLat: 4.1,
    racingTip: "Launch car over the sausage kerb. Land straight and prepare for the tight Rascasse hairpin.",
  },
];

export function MonacoLapTour() {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const activeCorner = MONACO_CORNER_STAGES[selectedIdx];

  // Auto progression timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedIdx((prev) => (prev + 1) % MONACO_CORNER_STAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Audio synthesis sync
  useEffect(() => {
    if (audioEnabled && activeCorner) {
      v6EngineSynth.setTelemetry(
        activeCorner.rpm,
        activeCorner.throttle,
        activeCorner.brake,
        activeCorner.gear
      );
    }
  }, [activeCorner, audioEnabled]);

  const toggleSound = () => {
    const next = !audioEnabled;
    v6EngineSynth.enabled = next;
    setAudioEnabled(next);
    if (!next) v6EngineSynth.stop();
  };

  const isPurpleDelta = activeCorner.deltaMs <= 0;

  return (
    <div className="w-full flex flex-col gap-6 py-6 relative z-10">
      
      {/* ── SECTION HEADER ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <Compass size={18} />
          </div>
          <div>
            <h2 className="font-mono text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              MONACO Q3 POLE LAP · INTERACTIVE APEX SCROLLYTELLING TOUR
            </h2>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              Circuit de Monaco · 3,340m Spatial Distance Progression · Verstappen Pole Benchmark
            </p>
          </div>
        </div>

        {/* Playback & Sound Controls */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <button
            onClick={toggleSound}
            className={cn(
              "px-3 py-1.5 rounded-xl border font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer",
              audioEnabled
                ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-white/[0.04] border-white/10 text-neutral-400 hover:text-white"
            )}
            title="Toggle V6 Turbo-Hybrid Synthesizer Audio"
          >
            {audioEnabled ? <Volume2 size={13} className="animate-pulse" /> : <VolumeX size={13} />}
            <span>{audioEnabled ? "ENGINE AUDIO ON" : "AUDIO MUTED"}</span>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? "PAUSE TOUR" : "AUTO TOUR"}</span>
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE 19-CORNER CIRCUIT STEPPER ─────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {MONACO_CORNER_STAGES.map((c, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedIdx(idx);
                setIsPlaying(false);
              }}
              className="relative p-2.5 rounded-xl border border-white/10 flex flex-col text-left justify-between gap-1.5 transition-colors cursor-pointer overflow-hidden group"
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCornerHighlight"
                  className="absolute inset-0 bg-amber-500/20 border border-amber-500/80 rounded-xl shadow-[0_0_16px_rgba(245,158,11,0.3)] z-0"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center justify-between w-full">
                <span className={cn("font-mono text-[9px] font-bold", isSelected ? "text-amber-400" : "text-neutral-400")}>{c.number}</span>
                <span className="text-[8px] font-mono opacity-70 text-neutral-400">{c.distM}m</span>
              </div>
              <span className={cn("relative z-10 font-mono text-[10px] font-bold truncate transition-colors", isSelected ? "text-white" : "text-neutral-300 group-hover:text-white")}>
                {c.name.split("(")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── ACTIVE CORNER FLUID TELEMETRY SPOTLIGHT ───────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-black/80 via-[#0A0B0E]/90 to-black/80 border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        
        {/* Left: Corner Info, Technique Tip & Circuit Minimap */}
        <div className="flex flex-col gap-4 max-w-xl flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
              {activeCorner.number}
            </span>
            <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              {activeCorner.type}
            </span>
          </div>

          <h3 className="font-mono text-2xl sm:text-3xl font-black text-white">
            {activeCorner.name}
          </h3>

          {/* Interactive Monaco Spline Minimap */}
          <div className="relative w-full h-32 rounded-2xl bg-black/60 border border-white/[0.08] p-2 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 380 240" className="w-full h-full max-h-28">
              <defs>
                <filter id="glow-dot" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Circuit Road Outline */}
              <path
                d="M 95,195 C 70,180 80,135 105,115 C 125,95 140,88 155,95 C 170,102 190,70 230,65 C 275,55 300,95 305,130 C 310,165 320,185 330,195 C 335,200 295,205 250,195 C 215,190 170,205 150,205 C 130,205 110,210 95,195 Z"
                fill="none"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 95,195 C 70,180 80,135 105,115 C 125,95 140,88 155,95 C 170,102 190,70 230,65 C 275,55 300,95 305,130 C 310,165 320,185 330,195 C 335,200 295,205 250,195 C 215,190 170,205 150,205 C 130,205 110,210 95,195 Z"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {/* Static Landmark Corner Dots */}
              {Object.entries(MONACO_MAP_COORDS).map(([id, pt]) => (
                <circle
                  key={id}
                  cx={pt.x}
                  cy={pt.y}
                  r="2.5"
                  fill="rgba(255, 255, 255, 0.4)"
                />
              ))}
              {/* Active Corner Animated Telemetry Marker */}
              {MONACO_MAP_COORDS[activeCorner.id] && (
                <g>
                  {/* Expanding Sonar Beacon Wave */}
                  <motion.circle
                    cx={MONACO_MAP_COORDS[activeCorner.id].x}
                    cy={MONACO_MAP_COORDS[activeCorner.id].y}
                    r="12"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    initial={{ scale: 0.6, opacity: 1 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  />
                  {/* Center Solid Telemetry Marker */}
                  <motion.circle
                    cx={MONACO_MAP_COORDS[activeCorner.id].x}
                    cy={MONACO_MAP_COORDS[activeCorner.id].y}
                    r="5"
                    fill="#F59E0B"
                    filter="url(#glow-dot)"
                    animate={{
                      cx: MONACO_MAP_COORDS[activeCorner.id].x,
                      cy: MONACO_MAP_COORDS[activeCorner.id].y,
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                </g>
              )}
            </svg>
            <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[9px] font-mono text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>CIRCUIT DE MONACO · {activeCorner.distM}m APEX MARKER</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
            <Zap size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-neutral-400 uppercase font-bold">
                RACE ENGINEER APEX TELEMETRY TIP:
              </span>
              <p className="font-sans text-xs sm:text-sm text-neutral-200 leading-relaxed">
                {activeCorner.racingTip}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Live Telemetry Gauges Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto font-mono text-xs">
          
          {/* Speed vs Ghost */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col gap-1">
            <span className="text-[9px] text-neutral-400 uppercase font-bold">APEX SPEED</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-400 tabular-nums">{activeCorner.driverSpeed}</span>
              <span className="text-[10px] text-neutral-400 font-bold">KM/H</span>
            </div>
            <span className="text-[9px] text-cyan-400">Ghost: {activeCorner.ghostSpeed} km/h</span>
          </div>

          {/* Delta */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col gap-1">
            <span className="text-[9px] text-neutral-400 uppercase font-bold">DELTA TO VER</span>
            <span className={cn("text-2xl font-black tabular-nums", isPurpleDelta ? "text-emerald-400" : "text-rose-400")}>
              {activeCorner.deltaMs > 0 ? `+${activeCorner.deltaMs.toFixed(3)}s` : `${activeCorner.deltaMs.toFixed(3)}s`}
            </span>
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border self-start", isPurpleDelta ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10")}>
              {isPurpleDelta ? "PURPLE GAIN" : "TIME LOSS"}
            </span>
          </div>

          {/* Gear & RPM */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col gap-1">
            <span className="text-[9px] text-neutral-400 uppercase font-bold">GEAR &amp; RPM</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">G{activeCorner.gear}</span>
              <span className="text-[10px] text-neutral-400 font-bold">/ 8</span>
            </div>
            <span className="text-[9px] text-amber-400">{activeCorner.rpm.toLocaleString()} RPM</span>
          </div>

          {/* Pedals */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col gap-1">
            <span className="text-[9px] text-neutral-400 uppercase font-bold">PEDAL TRACE</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[8px] text-emerald-400">THR {activeCorner.throttle}%</span>
                <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${activeCorner.throttle}%` }} />
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[8px] text-rose-400">BRK {activeCorner.brake}%</span>
                <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${activeCorner.brake}%` }} />
                </div>
              </div>
            </div>
            <span className="text-[9px] text-neutral-400 mt-1">Lat G: {activeCorner.gForceLat}G</span>
          </div>

        </div>

      </div>
    </div>
  );
}

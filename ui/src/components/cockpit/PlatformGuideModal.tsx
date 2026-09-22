"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  X,
  Gauge,
  Sparkles,
  Gamepad2,
  Keyboard,
  Layers,
  Activity,
  Flame,
  Radio,
  Sliders,
  Play,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenConnect?: () => void;
}

type GuideTab = "HUD" | "MISSION" | "TELEMETRY" | "SHORTCUTS";

export function PlatformGuideModal({
  isOpen,
  onClose,
  onOpenConnect,
}: PlatformGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>("HUD");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-[#0B0C10] border border-gold/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-silver flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-black via-[#111218] to-black">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shadow-[0_0_15px_rgba(207,163,73,0.3)]">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider text-white uppercase font-mono">
                APX-IQ Platform Guide & Architecture
              </h2>
              <p className="text-[11px] text-neutral-400">
                Next-generation F1 telemetry ingestion, ghost benchmarking, and race intelligence workstation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/10 bg-black/40">
          {[
            { id: "HUD", label: "Cockpit HUD", icon: <Gauge size={13} /> },
            { id: "MISSION", label: "Mission Control", icon: <Sparkles size={13} /> },
            { id: "TELEMETRY", label: "F1 UDP Link", icon: <Gamepad2 size={13} /> },
            { id: "SHORTCUTS", label: "Keyboard & Hotkeys", icon: <Keyboard size={13} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as GuideTab)}
              className={cn(
                "px-3.5 py-2 rounded-t-lg font-mono text-[11px] font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                activeTab === tab.id
                  ? "text-gold border-gold bg-white/[0.04]"
                  : "text-neutral-400 border-transparent hover:text-white hover:bg-white/[0.02]"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs text-neutral-300">
          {activeTab === "HUD" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="font-mono text-gold font-bold text-xs flex items-center gap-1.5">
                    <Gauge size={13} />
                    AMOLED Steering Wheel MFD
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Interactive multi-function display featuring gear position, RPM rev limiter, delta LEDs, DRS flap status, and interactive buttons (+10/+1, STRAT, HPP, DRS, OT, Radio).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="font-mono text-gold font-bold text-xs flex items-center gap-1.5">
                    <Flame size={13} />
                    4-Corner Chassis & Tyre Thermals
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Physical simulation of Pirelli tyre surface vs inner carcass temperatures, brake disc saturation glow, tyre pressure windows (PSI), and dynamic wear curves.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="font-mono text-gold font-bold text-xs flex items-center gap-1.5">
                    <Activity size={13} />
                    MoTeC Distance-Domain Ribbon
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Continuous multi-channel telemetry ribbon (speed, throttle, brake, gear) synced to track distance with real-time scrub cursor and corner markers.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="font-mono text-gold font-bold text-xs flex items-center gap-1.5">
                    <Radio size={13} />
                    Battle Radar & Replay Controller
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Live overtake predictor, DRS train detection, GPS track map, and playback speed controller (0.5x, 1x, 2x, 5x) with preset Grand Prix scenarios.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "MISSION" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-b from-[#13141C] to-[#0A0B0E] border border-gold/30 space-y-2">
                <div className="font-mono text-gold font-bold text-xs flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Post-Session Race Strategy & Ghost Benchmarking
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Mission Control enables deep post-session telemetry comparison using official FIA FastF1 reference sessions. Benchmark your throttle application, braking points, and apex speeds against pole-position reference laps.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-1">
                  <span className="font-mono font-bold text-white text-xs">Ghost Lap Benchmarks</span>
                  <p className="text-[11px] text-neutral-400">
                    Compare your lap directly against Verstappen, Hamilton, or Leclerc reference traces.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-1">
                  <span className="font-mono font-bold text-white text-xs">Mechanical Setup Tuning</span>
                  <p className="text-[11px] text-neutral-400">
                    Adjust front/rear wing angles, anti-roll bars, camber, and tyre pressures with instant delta feedback.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "TELEMETRY" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2">
                <span className="font-mono text-gold font-bold text-xs">
                  How Live Telemetry Flow Works:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-neutral-300 font-sans">
                  <li>
                    <strong className="text-white">EA Sports F1 (PC / PS5 / Xbox)</strong> broadcasts raw binary telemetry packets over UDP port <code className="text-gold bg-black/50 px-1 rounded">20777</code> at 60Hz.
                  </li>
                  <li>
                    <strong className="text-white">APX-IQ Ingestion Service</strong> receives the packets, decodes them via ctypes structs for F1 2020 through 2025, and pushes them to the local Socket.IO server (<code className="text-gold bg-black/50 px-1 rounded">:3001</code>).
                  </li>
                  <li>
                    <strong className="text-white">APX-IQ Workstation</strong> ingests the stream into a high-performance Zustand store with 60 FPS requestAnimationFrame rendering.
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gold/10 border border-gold/30">
                <span className="text-[11px] text-gold font-mono font-bold">
                  Need to configure your game or test the connection?
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onOpenConnect?.();
                  }}
                  className="px-3 py-1 rounded-lg bg-gold text-black font-mono font-bold text-[10px] hover:bg-gold/90 transition-all cursor-pointer"
                >
                  OPEN F1 CONNECTION WIZARD
                </button>
              </div>
            </div>
          )}

          {activeTab === "SHORTCUTS" && (
            <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                <span className="text-neutral-400">Play / Pause Telemetry</span>
                <span className="text-gold font-bold bg-white/10 px-1.5 py-0.5 rounded">Space</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                <span className="text-neutral-400">Open Command Palette</span>
                <span className="text-gold font-bold bg-white/10 px-1.5 py-0.5 rounded">⌘K / Ctrl+K</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                <span className="text-neutral-400">Open Platform Guide</span>
                <span className="text-gold font-bold bg-white/10 px-1.5 py-0.5 rounded">? / F1</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                <span className="text-neutral-400">F1 Connect Wizard</span>
                <span className="text-gold font-bold bg-white/10 px-1.5 py-0.5 rounded">C</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                <span className="text-neutral-400">Switch Views (HUD/Mission/Debug)</span>
                <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">⇧1 · ⇧2 · ⇧3</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                <span className="text-neutral-400">Cycle DDU Modes</span>
                <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">1 · 2 · 3 · 4</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                <span className="text-neutral-400">Cycle Motion Level</span>
                <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">M</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                <span className="text-neutral-400">Toggle UI Density</span>
                <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">D</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-black/60">
          <span className="font-mono text-[10px] text-neutral-500">
            APX-IQ Motorsport Intelligence · Release v1.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono font-bold text-[11px] transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Activity, Sparkles, Terminal, Gauge, Radio, Cpu, ArrowRight, ShieldCheck, Gamepad2, HelpCircle, Volume2, VolumeX } from "lucide-react";
import { TRACK_IDS } from "@/utils/constants";
import { useTelemetryStore } from "@/store/telemetryStore";
import { SourceBadge } from "@/components/cockpit/primitives";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useUxStore } from "@/store/uxStore";
import { soundFx } from "@/lib/cockpit/soundFx";
import { cn } from "@/lib/utils";

import { HeroTelemetrySandbox } from "@/components/home/HeroTelemetrySandbox";
import { EngineeringTicker } from "@/components/home/EngineeringTicker";
import { ArchitectureFlow } from "@/components/home/ArchitectureFlow";
import { TechnicalDeepDiveDrawer } from "@/components/home/TechnicalDeepDiveDrawer";
import { GameConnectModal } from "@/components/cockpit/GameConnectModal";
import { PlatformGuideModal } from "@/components/cockpit/PlatformGuideModal";

/**
 * Digital Pit Wall — Motorsport Intelligence & Telemetry Workstation Portal
 * Serves as the high-impact portfolio entry point into APX IQ:
 *   1. Cockpit HUD (/dashboard) — 60Hz real-time telemetry & chassis diagnostics
 *   2. Mission Control (/dashboard/intelligence) — FastF1 ghost delta benchmarking & strategy debrief
 *   3. System Observability (/debug) — Raw Socket.IO transport & packet decode inspector
 */

const WORKSTATIONS = [
  {
    id: "01",
    role: "LIVE COCKPIT HUD",
    subrole: "DRIVER & TRACKSIDE TELEMETRY",
    href: "/dashboard",
    icon: Activity,
    badge: "60Hz REAL-TIME",
    description:
      "High-frequency cockpit HUD with AMOLED steering wheel MFD, 4-corner chassis thermals, MoTeC distance ribbon, GPS radar, and live overtake battle tracking.",
    capabilities: ["Steering Wheel MFD", "4-Corner Tyre Thermals", "Lap Domain Ribbon", "Tactical Battle Radar"],
    cta: "ENTER COCKPIT HUD",
    accent: "border-amber-500/30 hover:border-amber-500/60",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
  {
    id: "02",
    role: "MISSION CONTROL",
    subrole: "STRATEGY & PERFORMANCE ENGINE",
    href: "/dashboard/intelligence",
    icon: Sparkles,
    badge: "FASTF1 FIA V2",
    description:
      "Post-session strategy suite with official FastF1 reference ghost benchmarking, multi-channel speed/pedal delta curves, mechanical setup sliders, and AI debrief.",
    capabilities: ["FastF1 Ghost Benchmarking", "Speed & Throttle Deltas", "Mechanical Setup Matrix", "AI Race Engineer Debrief"],
    cta: "OPEN MISSION CONTROL",
    accent: "border-emerald-500/30 hover:border-emerald-500/60",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  },
  {
    id: "03",
    role: "SYSTEM OBSERVABILITY",
    subrole: "TELEMETRY TRANSPORT INSPECTOR",
    href: "/debug",
    icon: Terminal,
    badge: "SOCKET.IO & UDP",
    description:
      "Low-level diagnostic console for real-time socket transport health, 60Hz UDP frame buffers, packet decode status, and full Zustand store state inspection.",
    capabilities: ["Socket.IO Diagnostics", "Packet Ingestion Rate", "Frame Buffer Inspection", "Store State Tree"],
    cta: "INSPECT SYSTEM",
    accent: "border-cyan-500/30 hover:border-cyan-500/60",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  },
] as const;

export default function Home() {
  const session = useTelemetryStore((s) => s.session);
  const lapData = useTelemetryStore((s) => s.lapData);
  const { source, isConnected } = useLiveOrDemo();

  const isConnectOpen = useUxStore((s) => s.isConnectModalOpen);
  const openConnect = useUxStore((s) => s.openConnectModal);
  const closeConnect = useUxStore((s) => s.closeConnectModal);

  const isGuideOpen = useUxStore((s) => s.isGuideModalOpen);
  const openGuide = useUxStore((s) => s.openGuideModal);
  const closeGuide = useUxStore((s) => s.closeGuideModal);

  const soundEnabled = useUxStore((s) => s.soundEnabled);
  const toggleSound = useUxStore((s) => s.toggleSound);

  const isLive = isConnected && source === "LIVE";

  return (
    <main className="min-h-screen bg-black text-neutral-200 font-sans p-4 md:p-6 lg:p-8 select-none flex flex-col items-center">
      <div className="max-w-[1480px] w-full self-center flex flex-col gap-8 flex-1 justify-between">
        
        {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-neutral-950/90 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md w-full">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-black italic text-lg tracking-tighter text-amber-400 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-all">
                APX<span className="text-white">·IQ</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-signal-go shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:inline" />
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest hidden sm:inline font-semibold">
              MOTORSPORT INTELLIGENCE PLATFORM
            </span>
          </div>

          {/* Center Metadata Capsule */}
          <div className="hidden lg:flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-lg border border-white/[0.06]">
              <span className="text-neutral-400 uppercase text-[9px]">INGESTION:</span>
              <span className={cn("font-bold text-[10px]", isLive ? "text-emerald-400" : "text-amber-400")}>
                {isLive ? "UDP 60Hz ACTIVE" : "PORT 20777 STANDBY"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-lg border border-white/[0.06]">
              <span className="text-neutral-400 uppercase text-[9px]">TRACK:</span>
              <span className="text-amber-400 font-bold text-[10px]">
                {session?.trackId !== undefined ? TRACK_IDS[session.trackId] ?? "MONACO GP" : "MONACO GP"}
              </span>
            </div>
          </div>

          {/* Right Navigation, Radar, Guide & Audio */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Connect F1 Game Modal Trigger */}
            <button
              onClick={openConnect}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                isLive
                  ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)] hover:from-amber-500/30"
              )}
              title="Pair F1 Game Telemetry (Hotkey: C)"
            >
              <Gamepad2 size={12} />
              <span>{isLive ? "F1 LIVE" : "PAIR F1 GAME"}</span>
            </button>

            {/* Platform Guide Modal Trigger */}
            <button
              onClick={openGuide}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-500/40 text-neutral-300 hover:text-white text-[9px] font-mono tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
              title="Open Platform Guide (Hotkey: ?)"
            >
              <HelpCircle size={12} />
              <span className="hidden sm:inline">GUIDE</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer",
                soundEnabled
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-neutral-500"
              )}
              title={soundEnabled ? "Tactile Audio SFX Active (Click to Mute)" : "Audio Muted (Click to Enable SFX)"}
            >
              {soundEnabled ? <Volume2 size={12} className="text-amber-400 animate-pulse" /> : <VolumeX size={12} />}
              <span className="hidden sm:inline">{soundEnabled ? "SFX ON" : "SFX OFF"}</span>
            </button>

            {/* Workstation Quick Switcher Pill */}
            <div className="hidden xl:flex p-1 rounded-xl bg-black/60 border border-white/10 items-center gap-1 shadow-inner">
              <Link
                href="/dashboard"
                className="px-2.5 py-1 rounded-[8px] text-[10px] font-mono uppercase tracking-[0.14em] font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
              >
                <Gauge size={11} className="text-neutral-400" />
                <span>Cockpit HUD</span>
              </Link>
              <Link
                href="/dashboard/intelligence"
                className="px-2.5 py-1 rounded-[8px] text-[10px] font-mono uppercase tracking-[0.14em] font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
              >
                <Sparkles size={11} className="text-neutral-400" />
                <span>Mission Control</span>
              </Link>
            </div>

            <SourceBadge source={source} />
          </div>
        </header>

        {/* ── HERO HEADER & MISSION STATEMENT ─────────────────────────────── */}
        <div className="text-center max-w-4xl self-center flex flex-col items-center pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold tracking-widest mb-4 shadow-[0_0_16px_rgba(245,158,11,0.15)]">
            <Cpu size={13} className="animate-pulse" />
            <span>60Hz REAL-TIME MOTORSPORT INTELLIGENCE PLATFORM · F1 2020-2025</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase font-display leading-none">
            DIGITAL <span className="text-gold">PIT WALL</span>
          </h1>

          <p className="mt-4 text-xs sm:text-sm md:text-base text-neutral-300 leading-relaxed font-sans max-w-2xl">
            High-frequency Formula 1 telemetry ingestion, FastF1 official FIA reference ghost benchmarking,
            and predictive race engineering intelligence for EA Sports F1 2020 through 2025.
          </p>

          {/* Primary Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 font-mono text-xs font-bold">
            <Link
              href="/dashboard"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black shadow-[0_0_24px_rgba(245,158,11,0.4)] transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Gauge size={15} />
              <span>ENTER COCKPIT HUD</span>
            </Link>

            <Link
              href="/dashboard/intelligence"
              className="px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/15 hover:border-emerald-400/50 text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Sparkles size={15} className="text-emerald-400" />
              <span>OPEN MISSION CONTROL</span>
            </Link>

            <button
              onClick={openConnect}
              className="px-4 py-3 rounded-xl bg-black/60 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <Gamepad2 size={15} className="text-amber-400" />
              <span>PAIR F1 GAME</span>
            </button>
          </div>
        </div>

        {/* ── 1. INTERACTIVE TELEMETRY & COCKPIT SANDBOX ──────────────────── */}
        <HeroTelemetrySandbox />

        {/* ── 2. HIGH-CONTRAST ENGINEERING METRICS TICKER ─────────────────── */}
        <EngineeringTicker />

        {/* ── 3. INTERACTIVE 5-STAGE ARCHITECTURE PIPELINE ────────────────── */}
        <ArchitectureFlow />

        {/* ── 4. 3 OPERATIONAL WORKSTATION PORTALS ────────────────────────── */}
        <div className="grid w-full grid-cols-1 md:grid-cols-3 gap-5">
          {WORKSTATIONS.map((w) => {
            const Icon = w.icon;
            return (
              <Link
                key={w.id}
                href={w.href}
                className={`rounded-2xl bg-neutral-950/80 border p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.7)] backdrop-blur-sm group ${w.accent}`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-white/[0.04]">
                        <Icon size={17} className="text-amber-400" />
                      </div>
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        {w.role}
                      </span>
                    </div>
                    <span className={`font-mono text-[8.5px] font-bold px-2 py-0.5 rounded border ${w.badgeColor}`}>
                      {w.badge}
                    </span>
                  </div>

                  {/* Subtitle */}
                  <span className="font-mono text-[9.5px] text-neutral-400 uppercase tracking-wider block mb-2 font-semibold">
                    {w.subrole}
                  </span>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans mb-4">
                    {w.description}
                  </p>

                  {/* Capability Chips */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {w.capabilities.map((cap, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 text-[9.5px] font-mono text-neutral-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/[0.04]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA */}
                <div className="pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                  <span>{w.cta}</span>
                  <ArrowRight size={15} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── 5. TECHNICAL INTERVIEW ARCHITECTURAL DEEP-DIVE ──────────────── */}
        <TechnicalDeepDiveDrawer />

        {/* ── OPERATIONAL HONESTY & PROVENANCE BANNER ─────────────────────── */}
        <div className="w-full rounded-2xl bg-black/60 border border-white/[0.08] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-neutral-400 shadow-inner">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>APX IQ PLATFORM · OPERATIONAL HONESTY CONTRACT ENFORCED · SIM PROVENANCE PRESERVED</span>
          </div>
          <span className="text-neutral-400 uppercase text-[9px]">
            FIA FASTF1 API ENGINE & LOCAL UDP BRIDGE CONNECTED · SCALE-TO-ZERO
          </span>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="w-full py-4 text-center border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
          APX IQ · REAL-TIME MOTORSPORT INTELLIGENCE PLATFORM · STABLE V1.0.0
        </footer>

      </div>

      {/* Global Modals */}
      <GameConnectModal
        isOpen={isConnectOpen}
        onClose={closeConnect}
        onOpenGuide={openGuide}
      />

      <PlatformGuideModal
        isOpen={isGuideOpen}
        onClose={closeGuide}
        onOpenConnect={openConnect}
      />
    </main>
  );
}

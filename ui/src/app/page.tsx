"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, Sparkles, Terminal, Gauge, Radio, Cpu, ArrowRight, ShieldCheck } from "lucide-react";
import { TRACK_IDS } from "@/utils/constants";
import { formatLapTime } from "@/utils/format";
import { useTelemetryStore } from "@/store/telemetryStore";
import { SourceBadge, MicroLabel } from "@/components/cockpit/primitives";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { cn } from "@/lib/utils";

/**
 * Digital Pit Wall — Operational Engineering Workstation Portal
 * Serves as the primary operational entry point into APX IQ:
 *   1. Cockpit HUD (/dashboard) — 60Hz real-time telemetry & chassis diagnostics
 *   2. Mission Control (/dashboard/intelligence) — FastF1 ghost delta benchmarking & strategy debrief
 *   3. System Diagnostics (/debug) — Raw Socket.IO transport & packet decode inspector
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

function NoSignal({ label }: { label: string }) {
  return (
    <span className="text-neutral-500 font-mono text-xs italic tracking-wider">
      {label}
    </span>
  );
}

function LiveTelemetryPulse() {
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const lapData = useTelemetryStore((s) => s.lapData);
  const session = useTelemetryStore((s) => s.session);
  const carStatus = useTelemetryStore((s) => s.carStatus);
  const { source, isConnected } = useLiveOrDemo();

  const isLive = isConnected && telemetry;
  const displaySpeed = telemetry ? Math.round(telemetry.speed) : null;
  const displayRpm = telemetry ? telemetry.rpm : null;
  const displayGear = telemetry ? (telemetry.gear === 0 ? "N" : telemetry.gear === -1 ? "R" : telemetry.gear) : null;
  const displayLapTime = lapData?.lastLapTime ? formatLapTime(lapData.lastLapTime) : null;
  const hasDrs = telemetry ? Boolean(telemetry.drs) : null;

  return (
    <div className="w-full rounded-xl bg-neutral-950/90 border border-white/[0.08] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm flex flex-col gap-4">
      {/* Stream Status Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", isLive ? "bg-emerald-400 animate-ping" : "bg-amber-400/60")} />
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-neutral-300 font-bold">
            TELEMETRY INGESTION STREAM · {isLive ? "ACTIVE UDP (60Hz)" : "INGESTION STANDBY (PORT 20777)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold hidden sm:inline">
              60 FPS SYNC
            </span>
          )}
          <SourceBadge source={source} />
        </div>
      </div>

      {/* Numerical Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 py-1">
        {/* Speed */}
        <div className="flex flex-col bg-black/60 p-3.5 rounded-lg border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <MicroLabel>SPEED</MicroLabel>
            <span className="text-[9px] font-mono text-amber-400/80 font-bold">GPS RADAR</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            {displaySpeed !== null ? (
              <>
                <span className="text-amber-400 font-mono text-3xl sm:text-4xl font-black tabular-nums leading-none">
                  {displaySpeed}
                </span>
                <span className="text-neutral-400 font-mono text-xs font-semibold">KM/H</span>
              </>
            ) : (
              <NoSignal label="AWAITING STREAM" />
            )}
          </div>
        </div>

        {/* RPM */}
        <div className="flex flex-col bg-black/60 p-3.5 rounded-lg border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <MicroLabel>ENGINE SPEED</MicroLabel>
            <span className="text-[9px] font-mono text-neutral-400">ICE V6 T</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            {displayRpm !== null ? (
              <>
                <span className="text-white font-mono text-3xl sm:text-4xl font-black tabular-nums leading-none">
                  {displayRpm.toLocaleString()}
                </span>
                <span className="text-neutral-400 font-mono text-xs font-semibold">RPM</span>
              </>
            ) : (
              <NoSignal label="OFFLINE" />
            )}
          </div>
        </div>

        {/* Gear */}
        <div className="flex flex-col bg-black/60 p-3.5 rounded-lg border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <MicroLabel>ACTIVE GEAR</MicroLabel>
            {hasDrs !== null && (
              <span className={cn("text-[9px] font-mono font-bold px-1 py-0.2 rounded", hasDrs ? "bg-emerald-500/20 text-emerald-400" : "text-neutral-500")}>
                DRS {hasDrs ? "OPEN" : "OFF"}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            {displayGear !== null ? (
              <>
                <span className="text-cyan-400 font-mono text-3xl sm:text-4xl font-black tabular-nums leading-none">
                  {displayGear}
                </span>
                <span className="text-neutral-400 font-mono text-xs font-semibold">SEQ</span>
              </>
            ) : (
              <NoSignal label="N/A" />
            )}
          </div>
        </div>

        {/* Lap Time / Session */}
        {/* Lap Time / Session */}
        <div className="flex flex-col bg-black/60 p-3.5 rounded-lg border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <MicroLabel>LAST LAP TIME</MicroLabel>
          </div>
          <div className="flex items-baseline gap-1 mt-1.5">
            {displayLapTime !== null ? (
              <span className="text-white font-mono text-2xl sm:text-3xl font-black tabular-nums leading-none">
                {displayLapTime}
              </span>
            ) : (
              <NoSignal label="STANDBY" />
            )}
          </div>
        </div>
      </div>

      {/* Stream Context Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-t border-white/[0.06] pt-2">
        <span className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", isLive ? "bg-emerald-400" : "bg-neutral-500")} />
          <span>PORT 20777 · UDP INGESTION {isLive ? "60Hz ACTIVE" : "STANDBY"}</span>
        </span>
        <span className="text-neutral-400 uppercase">
          TRACK: {session?.trackId !== undefined ? TRACK_IDS[session.trackId] ?? "MONACO GP" : "MONACO GP"} · LAP {lapData?.lap ?? 1}/{session?.totalLaps ?? 56}
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const session = useTelemetryStore((s) => s.session);
  const lapData = useTelemetryStore((s) => s.lapData);
  const { source } = useLiveOrDemo();

  return (
    <main className="min-h-screen bg-black text-neutral-200 font-sans p-4 md:p-6 select-none flex flex-col items-center">
      <div className="max-w-[1400px] w-full self-center flex flex-col gap-6 flex-1 justify-between">
        
        {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-neutral-950/90 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md w-full">
          <div className="flex items-center gap-3">
            <span className="font-black italic text-lg tracking-tighter text-amber-400">
              APX<span className="text-white">·IQ</span>
            </span>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest hidden sm:inline font-semibold">
              MOTORSPORT INTELLIGENCE WORKSTATION · V1.0.0
            </span>
          </div>

          {/* Center Session Metadata */}
          <div className="hidden md:flex items-center gap-4 font-mono text-xs">
            <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded border border-white/[0.06]">
              <span className="text-neutral-400 uppercase text-[9px]">SESSION:</span>
              <span className="text-white font-bold text-[10px]">RACE</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded border border-white/[0.06]">
              <span className="text-neutral-400 uppercase text-[9px]">TRACK:</span>
              <span className="text-amber-400 font-bold text-[10px]">
                {session?.trackId !== undefined ? TRACK_IDS[session.trackId] ?? "MONACO GP" : "MONACO GP"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded border border-white/[0.06]">
              <span className="text-neutral-400 uppercase text-[9px]">LAP:</span>
              <span className="text-white font-bold text-[10px]">
                {lapData?.lap ?? 1} / {session?.totalLaps ?? 56}
              </span>
            </div>
          </div>

          {/* Right Navigation & Source Mode */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex p-1 rounded-xl bg-black/60 ring-1 ring-white/10 items-center gap-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
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
              <Link
                href="/debug"
                className="px-2.5 py-1 rounded-[8px] text-[10px] font-mono uppercase tracking-[0.14em] font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
              >
                <Terminal size={11} className="text-neutral-400" />
                <span>Observability</span>
              </Link>
            </div>
            <SourceBadge source={source} />
          </div>
        </header>

        {/* ── HERO & OPERATIONAL OVERVIEW ─────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6 w-full my-auto py-2">
          
          {/* Title & Mission Statement */}
          <div className="text-center max-w-3xl flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold tracking-wider mb-3 shadow-[0_0_12px_rgba(245,158,11,0.1)]">
              <Cpu size={12} />
              REAL-TIME MOTORSPORT ENGINEERING WORKSTATION
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase font-display">
              DIGITAL <span className="text-amber-400">PIT WALL</span>
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans max-w-2xl">
              High-frequency Formula 1 telemetry ingestion, FastF1 reference ghost benchmarking,
              and predictive race engineering intelligence for F1 2020 through 2025.
            </p>
          </div>

          {/* Operational Pulse */}
          <LiveTelemetryPulse />

          {/* ── 3 OPERATIONAL WORKSTATION PORTALS ──────────────────────────── */}
          <div className="grid w-full grid-cols-1 md:grid-cols-3 gap-4">
            {WORKSTATIONS.map((w) => {
              const Icon = w.icon;
              return (
                <Link
                  key={w.id}
                  href={w.href}
                  className={`rounded-xl bg-neutral-950/80 border p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-sm group ${w.accent}`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-white/[0.04]">
                          <Icon size={15} className="text-amber-400" />
                        </div>
                        <span className="font-mono text-xs font-bold text-white tracking-wider">
                          {w.role}
                        </span>
                      </div>
                      <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded border ${w.badgeColor}`}>
                        {w.badge}
                      </span>
                    </div>

                    {/* Subtitle */}
                    <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider block mb-2 font-semibold">
                      {w.subrole}
                    </span>

                    {/* Description */}
                    <p className="text-xs text-neutral-300 leading-relaxed font-sans mb-4">
                      {w.description}
                    </p>

                    {/* Capability Chips */}
                    <div className="grid grid-cols-2 gap-1.5 mb-4">
                      {w.capabilities.map((cap, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-400 bg-black/40 px-2 py-1 rounded border border-white/[0.04]"
                        >
                          <span className="w-1 h-1 rounded-full bg-amber-400" />
                          <span className="truncate">{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card CTA */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                    <span>{w.cta}</span>
                    <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Operational Security & Trust Banner */}
          <div className="w-full rounded-xl bg-black/50 border border-white/[0.06] p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-neutral-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>APX IQ V1.0.0 · OPERATIONAL HONESTY CONTRACT ENFORCED · SIM PROVENANCE PRESERVED</span>
            </div>
            <span className="text-neutral-400 uppercase text-[9px]">
              FIA FASTF1 API ENGINE & LOCAL UDP BRIDGE CONNECTED
            </span>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="w-full py-3 text-center border-t border-white/[0.06] text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
          APX IQ · REAL-TIME MOTORSPORT INTELLIGENCE PLATFORM · STABLE V1.0.0
        </footer>
      </div>
    </main>
  );
}

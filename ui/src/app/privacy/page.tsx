"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  FileText,
  ArrowLeft,
  Cpu,
  HardDrive,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { FluidPageShell, FluidSection, FluidSurface } from "@/components/layout/FluidPageShell";

export default function PrivacyPolicyPage() {
  return (
    <FluidPageShell activeBreadcrumb="PRIVACY &amp; DATA GOVERNANCE">
      {/* ── HEADER WITH BACK NAVIGATION ─────────────────────────────────── */}
      <FluidSurface variant="glass" className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white transition-all flex items-center gap-1.5 font-mono text-xs font-bold"
          >
            <ArrowLeft size={15} />
            <span>RETURN HOME</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <h1 className="text-lg md:text-xl font-bold text-white tracking-wide font-mono uppercase">
                PRIVACY POLICY &amp; DATA GOVERNANCE
              </h1>
            </div>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              LAST UPDATED: SEPTEMBER 2026 · APX-IQ MOTORSPORT INTELLIGENCE PLATFORM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
          <CheckCircle2 size={14} />
          <span>LOCAL-FIRST · ZERO AD TRACKERS</span>
        </div>
      </FluidSurface>

      {/* ── EXECUTIVE SUMMARY HIGHLIGHT ─────────────────────────────────── */}
      <FluidSurface
        variant="forged"
        glow="cyan"
        className="mb-8 border-l-4 border-l-emerald-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="flex flex-col gap-2 max-w-2xl">
          <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
            <EyeOff size={13} />
            RADICAL DATA TRANSPARENCY PROMISE
          </span>
          <h2 className="text-lg font-bold text-white font-mono">
            Your Telemetry Stays Yours. Period.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
            APX-IQ is built as a local-first engineering workstation. We do not sell your driving telemetry, embed third-party surveillance trackers, or collect personal identifiable information (PII).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-[10px] w-full md:w-auto shrink-0">
          <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col gap-1">
            <span className="text-emerald-400 font-bold text-base">0</span>
            <span className="text-neutral-400">Ad Trackers</span>
          </div>
          <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col gap-1">
            <span className="text-emerald-400 font-bold text-base">100%</span>
            <span className="text-neutral-400">Local UDP Control</span>
          </div>
        </div>
      </FluidSurface>

      {/* ── DETAILED POLICY SECTIONS ────────────────────────────────────── */}
      <FluidSection
        badge="GOVERNANCE ARTICLES"
        title="Telemetry Data Sovereignty & Storage"
        subtitle="Transparent specifications on local packet handling, browser cache, and algorithmic debriefs."
        laserColor="gold"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Section 1: Telemetry Data Ingestion */}
          <FluidSurface variant="card" className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Radio size={16} />
              </div>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                1. 60Hz UDP Telemetry Ingestion
              </h3>
            </div>
            <div className="text-xs text-neutral-300 leading-relaxed font-sans flex flex-col gap-2">
              <p>
                When you connect your EA Sports F1 game to APX-IQ over port <code className="text-amber-400 font-mono font-bold">20777</code>, raw binary packets stream directly from your game machine to your local bridge.
              </p>
              <ul className="list-disc list-inside text-neutral-400 space-y-1 font-mono text-[11px] pt-1">
                <li>Physics parameters (Speed, RPM, Throttle, Brake, Steer).</li>
                <li>Car dynamics (Tyre surface/carcass thermals, brake disc temps).</li>
                <li>Session metrics (Lap times, sector splits, tire degradation).</li>
              </ul>
              <p className="text-neutral-400 text-[11px] pt-1">
                This data streams locally and is never broadcasted to external marketing servers.
              </p>
            </div>
          </FluidSurface>

          {/* Section 2: Local Storage & Cookies */}
          <FluidSurface variant="card" className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <HardDrive size={16} />
              </div>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                2. Cookies &amp; Local Storage
              </h3>
            </div>
            <div className="text-xs text-neutral-300 leading-relaxed font-sans flex flex-col gap-2">
              <p>
                We do <strong className="text-white">not</strong> use tracking cookies, cross-site beacons, or commercial analytics scripts.
              </p>
              <p>
                Browser <code className="text-cyan-400 font-mono font-bold">localStorage</code> is used strictly for storing your personal workstation preferences:
              </p>
              <ul className="list-disc list-inside text-neutral-400 space-y-1 font-mono text-[11px] pt-1">
                <li>UI Density (Comfortable vs Compact mode).</li>
                <li>Motion preferences (Full animation vs Reduced motion).</li>
                <li>Audio SFX volume &amp; mute toggle states.</li>
                <li>Selected circuit scenario filter.</li>
              </ul>
            </div>
          </FluidSurface>

          {/* Section 3: AI Debrief & FastF1 Benchmark Data */}
          <FluidSurface variant="card" className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Cpu size={16} />
              </div>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                3. AI Debrief &amp; Benchmarking
              </h3>
            </div>
            <div className="text-xs text-neutral-300 leading-relaxed font-sans flex flex-col gap-2">
              <p>
                APX-IQ queries official FIA qualifying and race benchmarks using the open-source <strong className="text-white">FastF1</strong> public library.
              </p>
              <p>
                When generating automated race engineer debriefs:
              </p>
              <ul className="list-disc list-inside text-neutral-400 space-y-1 font-mono text-[11px] pt-1">
                <li>Analysis is computed deterministically via mathematical delta engines and the RATG heuristic pipeline.</li>
                <li>Your driving inputs are not used to train third-party public AI models.</li>
              </ul>
            </div>
          </FluidSurface>

          {/* Section 4: Data Retention & User Rights */}
          <FluidSurface variant="card" className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Lock size={16} />
              </div>
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                4. Data Ownership &amp; Deletion Rights
              </h3>
            </div>
            <div className="text-xs text-neutral-300 leading-relaxed font-sans flex flex-col gap-2">
              <p>
                You have complete sovereignty over your telemetry:
              </p>
              <ul className="list-disc list-inside text-neutral-400 space-y-1 font-mono text-[11px] pt-1">
                <li><strong className="text-white">Clear Session History:</strong> You can purge all saved laps and generated debriefs at any time.</li>
                <li><strong className="text-white">Zero Cloud Lock-in:</strong> Database storage runs locally or in your private isolated container.</li>
                <li><strong className="text-white">Browser Storage Reset:</strong> Clearing browser cache completely removes all saved preferences.</li>
              </ul>
            </div>
          </FluidSurface>

        </div>
      </FluidSection>

      {/* ── LEGAL DISCLAIMER & ATTRIBUTION NOTICE ───────────────────────── */}
      <FluidSurface variant="glass" className="my-8 flex flex-col gap-3 font-mono text-xs text-neutral-400">
        <div className="flex items-center gap-2 text-white font-bold uppercase">
          <FileText size={15} className="text-amber-400" />
          <span>Motorsport &amp; Trademarks Attribution</span>
        </div>
        <p className="font-sans leading-relaxed text-[11.5px]">
          Formula 1, F1, FIA, and related marks are trademarks of Formula One Licensing B.V. EA Sports is a trademark of Electronic Arts Inc. APX-IQ is an independent open-source educational telemetry platform and is not affiliated with, endorsed by, or connected to Formula One, EA Sports, or the FIA.
        </p>
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
          <span>OPEN SOURCE LICENSE: MIT</span>
          <Link href="https://github.com/MatMridul/APX-IQ" target="_blank" className="text-amber-400 hover:underline">
            GITHUB REPOSITORY
          </Link>
        </div>
      </FluidSurface>
    </FluidPageShell>
  );
}

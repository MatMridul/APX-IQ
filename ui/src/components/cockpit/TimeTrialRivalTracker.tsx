"use client";

import React, { useState, useEffect, useRef } from "react";
import { Flag, Trophy, User, Zap, AlertTriangle, ShieldCheck, Timer } from "lucide-react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useLiveOrDemo, getActiveFrame } from "@/hooks/useLiveOrDemo";
import { scheduler } from "@/lib/cockpit/scheduler";
import { cn } from "@/lib/utils";
import { MicroLabel } from "./primitives";

type TargetMode = "RIVAL" | "PB" | "SESSION_BEST";

interface SectorSplit {
  playerMs: number;
  targetMs: number;
  deltaMs: number;
  status: "purple" | "green" | "yellow" | "pending";
}

export function TimeTrialRivalTracker() {
  const { source, isConnected } = useLiveOrDemo();
  const isLive = source === "LIVE";

  const timeTrial = useTelemetryStore((s) => s.timeTrial);
  const lapData = useTelemetryStore((s) => s.lapData);

  const [targetMode, setTargetMode] = useState<TargetMode>("RIVAL");

  // DOM refs for zero-rerender 60fps delta readout
  const liveDeltaRef = useRef<HTMLSpanElement | null>(null);
  const projectedLapRef = useRef<HTMLSpanElement | null>(null);
  const deltaBarFillRef = useRef<HTMLDivElement | null>(null);

  // Benchmarks for Demo / Simulated Monaco Q3 Lap
  // Monaco Reference Lap: 1:11.890 (Rival Pole), PB: 1:12.042, Session Best: 1:11.954
  const demoRival = {
    carIdx: 1,
    teamId: 9, // Red Bull
    driverName: "M. VERSTAPPEN",
    teamName: "Red Bull Racing",
    lapTimeMs: 71890,
    sector1Ms: 18210,
    sector2Ms: 32440,
    sector3Ms: 21240,
    isValid: true,
  };

  const demoPB = {
    carIdx: 0,
    teamId: 1, // McLaren
    driverName: "L. NORRIS (PB)",
    teamName: "McLaren F1 Team",
    lapTimeMs: 72042,
    sector1Ms: 18320,
    sector2Ms: 32510,
    sector3Ms: 21212,
    isValid: true,
  };

  const demoSessionBest = {
    carIdx: 16,
    teamId: 0, // Ferrari
    driverName: "C. LECLERC (BEST)",
    teamName: "Ferrari",
    lapTimeMs: 71954,
    sector1Ms: 18190,
    sector2Ms: 32614,
    sector3Ms: 21150,
    isValid: true,
  };

  // Determine active target dataset from live store or demo
  const activeTarget = (() => {
    if (isLive && timeTrial) {
      if (targetMode === "RIVAL" && timeTrial.rival?.lapTimeMs) {
        return {
          driverName: "RIVAL GHOST",
          teamName: "P1 Benchmark",
          lapTimeMs: timeTrial.rival.lapTimeMs,
          sector1Ms: timeTrial.rival.sector1Ms ?? 0,
          sector2Ms: timeTrial.rival.sector2Ms ?? 0,
          sector3Ms: timeTrial.rival.sector3Ms ?? 0,
          isValid: timeTrial.rival.isValid ?? true,
        };
      }
      if (targetMode === "PB" && timeTrial.personalBest?.lapTimeMs) {
        return {
          driverName: "PERSONAL BEST",
          teamName: "All-Time PB",
          lapTimeMs: timeTrial.personalBest.lapTimeMs,
          sector1Ms: timeTrial.personalBest.sector1Ms ?? 0,
          sector2Ms: timeTrial.personalBest.sector2Ms ?? 0,
          sector3Ms: timeTrial.personalBest.sector3Ms ?? 0,
          isValid: timeTrial.personalBest.isValid ?? true,
        };
      }
      if (targetMode === "SESSION_BEST" && timeTrial.playerSessionBest?.lapTimeMs) {
        return {
          driverName: "SESSION BEST",
          teamName: "Session Lap",
          lapTimeMs: timeTrial.playerSessionBest.lapTimeMs,
          sector1Ms: timeTrial.playerSessionBest.sector1Ms ?? 0,
          sector2Ms: timeTrial.playerSessionBest.sector2Ms ?? 0,
          sector3Ms: timeTrial.playerSessionBest.sector3Ms ?? 0,
          isValid: timeTrial.playerSessionBest.isValid ?? true,
        };
      }
    }

    // Default to demo benchmarks
    if (targetMode === "PB") return demoPB;
    if (targetMode === "SESSION_BEST") return demoSessionBest;
    return demoRival;
  })();

  // 60FPS Micro-Split & Projected Lap Loop
  useEffect(() => {
    let lerpedDelta = 0;
    const unsub = scheduler.add((t, dt) => {
      const { data: f } = getActiveFrame(t);
      const rawDelta = (f?.deltaMs ?? 0) / 1000;
      const target = Number.isFinite(rawDelta) ? rawDelta : 0;
      const safeDt = Math.max(0.001, Math.min(0.2, Number.isFinite(dt) ? dt : 0.016));

      // Fast lerp
      lerpedDelta += (target - lerpedDelta) * (1 - Math.exp(-12 * safeDt));

      const isSlower = lerpedDelta >= 0;
      const isPurple = lerpedDelta < -0.15;
      const sign = isSlower ? "+" : "−";
      const absVal = Math.abs(lerpedDelta).toFixed(3);

      const color = isSlower
        ? "var(--color-signal-stop, #EF4444)"
        : isPurple
        ? "#C084FC"
        : "var(--color-signal-go, #22C55E)";

      if (liveDeltaRef.current) {
        liveDeltaRef.current.textContent = `${sign}${absVal}s`;
        liveDeltaRef.current.style.color = color;
      }

      if (deltaBarFillRef.current) {
        const frac = Math.min(1, Math.abs(lerpedDelta) / 1.5);
        deltaBarFillRef.current.style.width = `${(frac * 50).toFixed(1)}%`;
        deltaBarFillRef.current.style.transform = isSlower ? "translateX(0%)" : "translateX(-100%)";
        deltaBarFillRef.current.style.backgroundColor = color;
      }

      if (projectedLapRef.current && activeTarget.lapTimeMs) {
        const projectedMs = activeTarget.lapTimeMs + lerpedDelta * 1000;
        const totalSec = Math.max(0, projectedMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = (totalSec % 60).toFixed(3).padStart(6, "0");
        projectedLapRef.current.textContent = `${mins}:${secs}`;
      }
    });

    return unsub;
  }, [activeTarget]);

  const formatMs = (ms?: number) => {
    if (!ms || ms <= 0) return "--.---";
    const totalSec = ms / 1000;
    if (totalSec >= 60) {
      const mins = Math.floor(totalSec / 60);
      const secs = (totalSec % 60).toFixed(3).padStart(6, "0");
      return `${mins}:${secs}`;
    }
    return totalSec.toFixed(3);
  };

  // Sector Splits Computation
  const s1Player = isLive && lapData?.sector1 ? lapData.sector1 : 18274;
  const s2Player = isLive && lapData?.sector2 ? lapData.sector2 : 32398;
  const s3Player = isLive && lapData?.currentLapTime && lapData.sector1 && lapData.sector2
    ? Math.max(0, lapData.currentLapTime - lapData.sector1 - lapData.sector2)
    : 21190;

  const s1Delta = s1Player - activeTarget.sector1Ms;
  const s2Delta = s2Player - activeTarget.sector2Ms;
  const s3Delta = s3Player - activeTarget.sector3Ms;

  const getSplitBadge = (delta: number) => {
    if (delta < -80) {
      return {
        bg: "bg-purple-950/60 border-purple-500/50 text-purple-300",
        label: `${(delta / 1000).toFixed(3)}s`,
        status: "PURPLE",
      };
    }
    if (delta <= 0) {
      return {
        bg: "bg-emerald-950/60 border-emerald-500/50 text-emerald-300",
        label: `${(delta / 1000).toFixed(3)}s`,
        status: "GREEN",
      };
    }
    return {
      bg: "bg-red-950/60 border-red-500/50 text-red-300",
      label: `+${(delta / 1000).toFixed(3)}s`,
      status: "YELLOW",
    };
  };

  const s1Badge = getSplitBadge(s1Delta);
  const s2Badge = getSplitBadge(s2Delta);
  const s3Badge = getSplitBadge(s3Delta);

  return (
    <div className="w-full h-full flex flex-col justify-between font-mono text-[9px] select-none">
      {/* ── TARGET SELECTION TABS ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-1">
          {(["RIVAL", "PB", "SESSION_BEST"] as TargetMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTargetMode(mode)}
              className={cn(
                "px-2 py-0.5 rounded text-[8px] font-bold tracking-wider transition-colors cursor-pointer",
                targetMode === mode
                  ? "bg-gold text-black shadow-[0_0_8px_rgba(207,163,73,0.35)]"
                  : "bg-white/[0.04] text-silver/60 hover:text-white hover:bg-white/[0.08]"
              )}
            >
              {mode === "RIVAL" ? "RIVAL GHOST" : mode === "PB" ? "PERSONAL BEST" : "SESSION BEST"}
            </button>
          ))}
        </div>

        {/* Lap Validity Flag */}
        <div
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[7.5px] font-bold border",
            activeTarget.isValid
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300 animate-pulse"
          )}
        >
          {activeTarget.isValid ? (
            <>
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
              <span>VALID LAP</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
              <span>TRACK LIMITS CUT</span>
            </>
          )}
        </div>
      </div>

      {/* ── TARGET BENCHMARK HERO CARD ──────────────────────────────────── */}
      <div className="flex items-center justify-between rounded bg-gradient-to-r from-neutral-900/90 to-neutral-950/90 border border-white/[0.08] p-2 my-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-7 rounded-sm bg-gold" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-white tracking-wide">
              {activeTarget.driverName}
            </span>
            <span className="text-[7.5px] text-silver/50 uppercase">
              {activeTarget.teamName}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[7.5px] text-silver/50 tracking-wider">TARGET TIME</span>
          <span className="font-display text-sm font-black text-gold tabular-nums">
            {formatMs(activeTarget.lapTimeMs)}
          </span>
        </div>
      </div>

      {/* ── S1 / S2 / S3 MICRO-SPLIT COMPARISON MATRIX ─────────────────── */}
      <div className="grid grid-cols-3 gap-1.5 my-1">
        {/* Sector 1 */}
        <div className={cn("flex flex-col p-1.5 rounded border", s1Badge.bg)}>
          <div className="flex items-center justify-between text-[7.5px]">
            <span className="font-bold opacity-70">SECTOR 1</span>
            <span className="font-bold">{s1Badge.status}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[11px] font-bold tabular-nums text-white">
              {formatMs(s1Player)}
            </span>
            <span className="text-[9px] font-bold tabular-nums">
              {s1Badge.label}
            </span>
          </div>
          <div className="text-[7px] opacity-50 mt-0.5 text-right">
            TGT {formatMs(activeTarget.sector1Ms)}
          </div>
        </div>

        {/* Sector 2 */}
        <div className={cn("flex flex-col p-1.5 rounded border", s2Badge.bg)}>
          <div className="flex items-center justify-between text-[7.5px]">
            <span className="font-bold opacity-70">SECTOR 2</span>
            <span className="font-bold">{s2Badge.status}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[11px] font-bold tabular-nums text-white">
              {formatMs(s2Player)}
            </span>
            <span className="text-[9px] font-bold tabular-nums">
              {s2Badge.label}
            </span>
          </div>
          <div className="text-[7px] opacity-50 mt-0.5 text-right">
            TGT {formatMs(activeTarget.sector2Ms)}
          </div>
        </div>

        {/* Sector 3 */}
        <div className={cn("flex flex-col p-1.5 rounded border", s3Badge.bg)}>
          <div className="flex items-center justify-between text-[7.5px]">
            <span className="font-bold opacity-70">SECTOR 3</span>
            <span className="font-bold">{s3Badge.status}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[11px] font-bold tabular-nums text-white">
              {formatMs(s3Player)}
            </span>
            <span className="text-[9px] font-bold tabular-nums">
              {s3Badge.label}
            </span>
          </div>
          <div className="text-[7px] opacity-50 mt-0.5 text-right">
            TGT {formatMs(activeTarget.sector3Ms)}
          </div>
        </div>
      </div>

      {/* ── LIVE CENTER-ANCHORED DELTA BAR ──────────────────────────────── */}
      <div className="p-2 rounded bg-black/50 border border-white/[0.08] my-1">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[8px] text-silver/60 uppercase tracking-widest">
            LIVE CONTINUOUS SPLIT
          </span>
          <span
            ref={liveDeltaRef}
            className="font-display text-sm font-black tabular-nums tracking-tight text-emerald-400"
          >
            -0.000s
          </span>
        </div>

        {/* Center-zero split gauge */}
        <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30 z-10" />
          <div
            ref={deltaBarFillRef}
            className="absolute top-0 bottom-0 left-1/2 rounded-full transition-all duration-75"
            style={{ width: "0%" }}
          />
        </div>

        <div className="flex justify-between items-center text-[7px] text-silver/40 mt-1">
          <span>-1.500s (AHEAD)</span>
          <span>0.000</span>
          <span>+1.500s (BEHIND)</span>
        </div>
      </div>

      {/* ── PROJECTED LAP TIME & ASSISTS VALIDATION FOOTER ──────────────── */}
      <div className="pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[8px]">
        <div className="flex items-center gap-2">
          <span className="text-silver/50">PROJECTED:</span>
          <span
            ref={projectedLapRef}
            className="font-display text-[11px] font-bold text-white tabular-nums"
          >
            1:11.848
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[7px] text-silver/50">
          <span className="px-1 py-0.2 rounded bg-white/[0.05] border border-white/10 text-emerald-400 font-bold">
            TC: OFF
          </span>
          <span className="px-1 py-0.2 rounded bg-white/[0.05] border border-white/10 text-emerald-400 font-bold">
            ABS: OFF
          </span>
          <span className="px-1 py-0.2 rounded bg-white/[0.05] border border-white/10 text-amber-400 font-bold">
            EQUAL: ON
          </span>
        </div>
      </div>
    </div>
  );
}

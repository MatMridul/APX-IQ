"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Flag,
  Flame,
  Radio,
  Clock,
  CloudRain,
  Sun,
  Zap,
  AlertTriangle,
  ShieldAlert,
  Trophy,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  Disc,
  Sliders,
} from "lucide-react";
import { scheduler } from "@/lib/cockpit/scheduler";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useUxStore, GpScenario } from "@/store/uxStore";
import { useTelemetryRecorder } from "@/lib/cockpit/telemetryRecorder";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { SourceBadge } from "./primitives";
import { TRACK_IDS, WEATHER_TYPES } from "@/utils/constants";
import { cn } from "@/lib/utils";

const CORNERS = [
  { name: "T1", dist: 340, desc: "Sainte Dévote" },
  { name: "T4", dist: 1240, desc: "Casino Square" },
  { name: "T7", dist: 2230, desc: "Mirabeau Haute" },
  { name: "T11", dist: 3320, desc: "Nouvelle Chicane" },
  { name: "T14", dist: 4040, desc: "La Rascasse" },
];

const SCENARIOS: { id: GpScenario; label: string; flag: string }[] = [
  { id: "monaco", label: "Monaco Q3 Pole", flag: "🇲🇨" },
  { id: "silverstone", label: "Silverstone Deg", flag: "🇬🇧" },
  { id: "spa", label: "Spa Wet Battle", flag: "🇧🇪" },
  { id: "monza", label: "Monza Slipstream", flag: "🇮🇹" },
];

interface RaceIncident {
  id: string;
  type: "SPEED_TRAP" | "PENALTY" | "OVERTAKE" | "RETIREMENT" | "FASTEST_LAP" | "SAFETY_CAR" | "FLAG";
  headline: string;
  detail: string;
  severity: "info" | "warning" | "danger" | "purple" | "success";
  timestamp: string;
}

const DEMO_INCIDENTS: RaceIncident[] = [
  {
    id: "evt-1",
    type: "SPEED_TRAP",
    headline: "SPEED TRAP // S1",
    detail: "L. Norris clocked 342.1 km/h (Fastest in Session)",
    severity: "info",
    timestamp: "L14",
  },
  {
    id: "evt-2",
    type: "FASTEST_LAP",
    headline: "NEW OVERALL BEST",
    detail: "M. Verstappen · 1:12.482 (Sector 2 Purple)",
    severity: "purple",
    timestamp: "L15",
  },
  {
    id: "evt-3",
    type: "OVERTAKE",
    headline: "LEAD CHANGE // P2",
    detail: "C. Leclerc passed L. Hamilton into Nouvelle Chicane",
    severity: "success",
    timestamp: "L16",
  },
  {
    id: "evt-4",
    type: "PENALTY",
    headline: "FIA PENALTY // 5.0s",
    detail: "S. Perez — Exceeding Track Limits (Turn 4 Warnings)",
    severity: "warning",
    timestamp: "L17",
  },
  {
    id: "evt-5",
    type: "RETIREMENT",
    headline: "MECHANICAL RETIREMENT",
    detail: "O. Piastri STOPPED on track — ICE Turbo Loss",
    severity: "danger",
    timestamp: "L18",
  },
];

export function PitWallTelemetryRibbon() {
  const clockRef = useRef<HTMLSpanElement | null>(null);
  const { source, isConnected } = useLiveOrDemo();
  const isLive = isConnected && source === "LIVE";

  // Replay & transport store
  const isPlaying = useUxStore((s) => s.isPlaying);
  const togglePlay = useUxStore((s) => s.togglePlay);
  const playbackSpeed = useUxStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useUxStore((s) => s.setPlaybackSpeed);
  const activeCorner = useUxStore((s) => s.activeCornerTarget);
  const seekTo = useUxStore((s) => s.seekToDistance);
  const scenario = useUxStore((s) => s.scenario);
  const setScenario = useUxStore((s) => s.setScenario);
  const openPuModal = useUxStore((s) => s.openPuModal);
  const openTelemetrySession = useUxStore((s) => s.openTelemetrySessionModal);

  // Recorder store bindings
  const isRecording = useTelemetryRecorder((s) => s.isRecording);
  const recordingElapsed = useTelemetryRecorder((s) => s.elapsedS);
  const startRecording = useTelemetryRecorder((s) => s.startRecording);
  const stopRecording = useTelemetryRecorder((s) => s.stopRecording);

  // Telemetry values
  const session = useTelemetryStore((s) => s.session);
  const carStatus = useTelemetryStore((s) => s.carStatus);
  const currentEvent = useTelemetryStore((s) => s.event);

  // Live FIA Flag state
  const [flagState, setFlagState] = useState<{
    code: "none" | "yellow" | "red" | "blue" | "green";
    label: string;
  }>({ code: "none", label: "Track Clear" });

  // Ticker active incident state
  const [activeIncidentIndex, setActiveIncidentIndex] = useState(0);

  // High-precision scheduler for session clock (0 re-renders)
  useEffect(() => {
    let lastFlag = "none";
    const unsub = scheduler.add((t) => {
      const state = useTelemetryStore.getState();
      const live = state.isConnected && state.telemetry !== null;

      if (clockRef.current) {
        let elapsed = t;
        if (live && state.session?.sessionDuration && state.session?.sessionTimeLeft != null) {
          elapsed = Math.max(0, state.session.sessionDuration - state.session.sessionTimeLeft);
        }
        const m = Math.floor(elapsed / 60);
        const s = Math.floor(elapsed % 60);
        const cs = Math.floor((elapsed * 100) % 100);
        clockRef.current.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
      }

      if (live) {
        const fiaFlag = state.carStatus?.vehicleFiaFlags ?? 0;
        const scStatus = state.session?.safetyCarStatus ?? 0;

        let curFlag: "none" | "yellow" | "red" | "blue" | "green" = "none";
        let curLabel = "Track Clear";

        if (scStatus === 1) {
          curFlag = "yellow";
          curLabel = "Full Safety Car";
        } else if (scStatus === 2) {
          curFlag = "yellow";
          curLabel = "Virtual Safety Car";
        } else if (fiaFlag === 3) {
          curFlag = "yellow";
          curLabel = "Yellow Sector";
        } else if (fiaFlag === 4) {
          curFlag = "red";
          curLabel = "Red Flag";
        } else if (fiaFlag === 2) {
          curFlag = "blue";
          curLabel = "Blue Flag";
        } else if (fiaFlag === 1) {
          curFlag = "green";
          curLabel = "Green Flag";
        }

        if (curFlag !== lastFlag) {
          lastFlag = curFlag;
          setFlagState({ code: curFlag, label: curLabel });
        }
      } else {
        const f = t % 120 > 74 && t % 120 < 84 ? "yellow" : "none";
        if (f !== lastFlag) {
          lastFlag = f;
          setFlagState({
            code: f as "none" | "yellow",
            label: f === "yellow" ? "Yellow Sector (T4)" : "Track Clear",
          });
        }
      }
    });

    return unsub;
  }, []);

  // Incident ticker cycle timer (every 6 seconds if no persistent red flag)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIncidentIndex((prev) => (prev + 1) % DEMO_INCIDENTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Format track & weather names
  const trackName =
    session?.trackId !== undefined
      ? TRACK_IDS[session.trackId] ?? `TRACK ${session.trackId}`
      : "MONACO GP";

  const weatherName =
    session?.weather !== undefined
      ? WEATHER_TYPES[session.weather] ?? `CODE ${session.weather}`
      : "DRY";

  const tempDisplay =
    isLive && (session?.trackTemp != null || session?.airTemp != null)
      ? `${session?.trackTemp ?? "--"}°C TRK · ${session?.airTemp ?? "--"}°C AIR`
      : "28°C TRK · 24°C AIR";

  // Active incident item to render (prefer live UDP event if firing)
  const displayedIncident: RaceIncident =
    currentEvent && currentEvent.eventType !== "UNKNOWN"
      ? {
          id: "live-event",
          type: (currentEvent.eventType as RaceIncident["type"]) || "FLAG",
          headline:
            currentEvent.eventType === "FASTEST_LAP"
              ? "NEW FASTEST LAP"
              : currentEvent.eventType === "PENALTY"
              ? "FIA PENALTY"
              : currentEvent.eventType === "SPEED_TRAP"
              ? "SPEED TRAP"
              : currentEvent.eventType.replace(/_/g, " "),
          detail:
            currentEvent.eventType === "FASTEST_LAP"
              ? `Car #${currentEvent.vehicleIdx ?? 1} · ${currentEvent.lapTime ? `${currentEvent.lapTime.toFixed(3)}s` : "Fastest Lap"}`
              : currentEvent.eventType === "PENALTY"
              ? `Car #${currentEvent.vehicleIdx ?? 1} · ${currentEvent.time ? `+${currentEvent.time}s` : "Infringement Warning"}`
              : currentEvent.eventType === "SPEED_TRAP"
              ? `Car #${currentEvent.vehicleIdx ?? 1} · ${currentEvent.speed ? `${Math.round(currentEvent.speed)} km/h` : "Speed Trap"}`
              : `Event Code ${currentEvent.eventCode}`,
          severity:
            currentEvent.eventType === "PENALTY"
              ? "warning"
              : currentEvent.eventType === "FASTEST_LAP"
              ? "purple"
              : "info",
          timestamp: "LIVE",
        }
      : DEMO_INCIDENTS[activeIncidentIndex];

  return (
    <div className="w-full h-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-[#0b0d13]/95 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.7)] backdrop-blur-md select-none font-mono text-xs">
      
      {/* ── ZONE 1 (LEFT): Track & Session Telemetry Capsule ────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* FIA Track Flag Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10 shadow-inner">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                flagState.code === "red"
                  ? "bg-rose-500"
                  : flagState.code === "yellow"
                  ? "bg-amber-400"
                  : flagState.code === "blue"
                  ? "bg-cyan-400"
                  : "bg-emerald-400"
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                flagState.code === "red"
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                  : flagState.code === "yellow"
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                  : flagState.code === "blue"
                  ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                  : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
              )}
            />
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-white">
            {flagState.label}
          </span>
        </div>

        {/* Session Elapsed Timer */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10">
          <Clock size={11} className="text-amber-400" />
          <span className="text-[9px] text-neutral-400 tracking-wider uppercase">SESSION</span>
          <span ref={clockRef} className="font-bold text-white tabular-nums tracking-widest text-[11px]">
            00:00.00
          </span>
          <SourceBadge source={source} />
        </div>

        {/* Track & Meteorological Status */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[10px]">
          <span className="text-neutral-400 font-bold uppercase">{trackName}</span>
          <span className="text-white/20">/</span>
          <span className="text-emerald-400 font-bold uppercase">{weatherName}</span>
          <span className="text-neutral-400 text-[9px]">({tempDisplay})</span>
        </div>
      </div>

      {/* ── ZONE 2 (CENTER): FIA Race Control & Incident Ticker (Initiative B) ── */}
      <div className="flex-1 max-w-xl mx-2 flex items-center justify-center overflow-hidden">
        <div className="w-full flex items-center justify-between gap-2.5 px-3 py-1 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 min-w-0">
            {/* Severity Pill */}
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[8.5px] font-bold tracking-wider uppercase shrink-0 shadow-sm",
                displayedIncident.severity === "danger"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : displayedIncident.severity === "warning"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : displayedIncident.severity === "purple"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.25)]"
                  : displayedIncident.severity === "success"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              )}
            >
              {displayedIncident.headline}
            </span>

            {/* Incident Text Detail */}
            <span className="text-[10px] text-neutral-200 truncate font-sans font-medium">
              {displayedIncident.detail}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[9px] text-neutral-400">
            <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-neutral-400 font-bold">
              {displayedIncident.timestamp}
            </span>
          </div>
        </div>
      </div>

      {/* ── ZONE 3 (RIGHT): Transport Controls / Live Hardware Status ────── */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* If LIVE: Show High-Contrast UDP Stream Telemetry Bandwidth */}
        {isLive ? (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            <Radio size={12} className="animate-pulse text-emerald-400" />
            <span>60Hz UDP · PORT 20777</span>
          </div>
        ) : (
          /* If SIM: Authentic Replay Transport Scrubber Controls */
          <div className="flex items-center gap-1.5">
            {/* Scenario Selector */}
            <div className="flex items-center gap-1 rounded-lg bg-black/60 border border-white/15 px-2 py-1">
              <span className="text-[10px]">
                {SCENARIOS.find((sc) => sc.id === scenario)?.flag}
              </span>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as GpScenario)}
                className="bg-transparent text-white font-bold text-[9px] outline-none cursor-pointer tracking-wider"
              >
                {SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id} className="bg-neutral-900 text-white">
                    {sc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold border transition-all flex items-center gap-1 cursor-pointer text-[9px] active:scale-95",
                isPlaying
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30 animate-pulse"
              )}
              title="Play / Pause Telemetry Replay (Spacebar)"
            >
              <span>{isPlaying ? "⏸ PAUSE" : "▶ PLAY"}</span>
            </button>

            {/* Telemetry Recorder (● REC) */}
            <button
              onClick={async () => {
                if (!isRecording) {
                  startRecording("Monaco Benchmark Run", "Monaco GP");
                } else {
                  await stopRecording();
                  openTelemetrySession();
                }
              }}
              className={cn(
                "px-2 py-1 rounded-lg font-bold border transition-all flex items-center gap-1 cursor-pointer text-[9px] active:scale-95",
                isRecording
                  ? "bg-red-600 text-white border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse"
                  : "bg-red-600/15 text-red-400 border-red-500/40 hover:bg-red-600/25"
              )}
              title={isRecording ? "Click to Stop & Save Telemetry Recording" : "Start Session Telemetry Recording"}
            >
              <Disc className={cn("w-3 h-3", isRecording && "animate-spin")} />
              <span>
                {isRecording
                  ? `REC ${String(Math.floor(recordingElapsed / 60)).padStart(2, "0")}:${String(Math.floor(recordingElapsed % 60)).padStart(2, "0")}`
                  : "REC"}
              </span>
            </button>

            {/* Replay & Scrubbing Drawer Trigger */}
            <button
              onClick={openTelemetrySession}
              className="px-2 py-1 rounded-lg bg-gold/15 hover:bg-gold/25 text-gold border border-gold/40 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title="Open Session Telemetry Recorder, Scrubbing Engine & MoTeC Export"
            >
              <Sliders className="w-3 h-3 text-gold" />
              <span className="hidden xl:inline">REPLAY</span>
            </button>

            {/* Speed Multipliers */}
            <div className="hidden sm:flex items-center rounded-lg bg-black/60 border border-white/15 p-0.5">
              {[0.5, 1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[8.5px] font-bold transition-all cursor-pointer",
                    playbackSpeed === s
                      ? "bg-amber-400 text-black shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                      : "text-neutral-400 hover:text-white"
                  )}
                  title={`Speed ${s}x`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Corner Apex Seek */}
            <div className="hidden 2xl:flex items-center gap-0.5 rounded-lg bg-black/60 border border-white/15 p-0.5">
              <span className="text-[8px] text-neutral-500 uppercase px-1 font-bold">SEEK:</span>
              {CORNERS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => seekTo(c.dist, c.name)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[8.5px] font-bold transition-all cursor-pointer",
                    activeCorner === c.name
                      ? "bg-cyan-500 text-black shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                      : "text-neutral-300 hover:text-cyan-400 hover:bg-white/5"
                  )}
                  title={`${c.name} — ${c.desc}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PU Health Modal Direct Quick Trigger */}
        <button
          onClick={openPuModal}
          className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] uppercase font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
          title="Open FIA Power Unit & Mechanical Wear Diagnostics (Packet 10 / Hotkey: P)"
        >
          <Cpu size={11} className="text-amber-400" />
          <span className="hidden sm:inline">PU HEALTH</span>
        </button>
      </div>

    </div>
  );
}

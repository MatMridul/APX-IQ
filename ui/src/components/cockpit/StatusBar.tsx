"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Radio, Cpu, Sparkles, Gauge } from "lucide-react";
import { SourceBadge, NoSignal } from "./primitives";
import { scheduler } from "@/lib/cockpit/scheduler";
import { usePrefs, type MotionLevel, type Density } from "@/lib/cockpit/preferences";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useTelemetryStore } from "@/store/telemetryStore";
import { TRACK_IDS, WEATHER_TYPES } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { PlaybackControls } from "./PlaybackControls";
import { useWorkstationHotkeys } from "@/hooks/useWorkstationHotkeys";

/**
 * Luxury Command & Status Bar (Linear / Apple aesthetic):
 *  - High-precision telemetry capsules (Session timer, Flag state, Track/Weather)
 *  - Segmented double-bezel navigation switcher (Cockpit HUD <-> Mission Control)
 *  - Micro-toggles for Motion & Density with haptic feedback aesthetics
 *  - Scheduler ref writes for clock (0 re-renders)
 */

const MOTION_CYCLE: MotionLevel[] = ["full", "reduced", "off"];
const DENSITY_CYCLE: Density[] = ["comfortable", "compact"];

export function StatusBar({ demoTime = true }: { demoTime?: boolean }) {
  const pathname = usePathname();
  const clockRef = useRef<HTMLSpanElement | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [flagState, setFlagState] = useState<{
    code: "none" | "yellow" | "red" | "blue" | "green";
    label: string;
  }>({ code: "none", label: "Track clear" });

  const { motion, density, setMotion, setDensity } = usePrefs();
  const { source } = useLiveOrDemo();
  const isLive = source === "LIVE";

  // Global hotkeys
  useWorkstationHotkeys({
    onToggleCommandPalette: () => setIsCommandOpen((v) => !v),
  });

  const session = useTelemetryStore((s) => s.session);
  const carStatus = useTelemetryStore((s) => s.carStatus);
  const currentEvent = useTelemetryStore((s) => s.event);


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
        let curLabel = "Track clear";

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
            label: f === "yellow" ? "Yellow sector" : "Track clear",
          });
        }
      }
    });
    return unsub;
  }, []);

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
      : null;


  const isCockpit = pathname === "/dashboard" || pathname === "/";
  const isMissionControl = pathname === "/dashboard/intelligence";

  return (
    <div className="w-full h-full flex items-center justify-between px-3 py-1 bg-gradient-to-r from-[#0C0C0F]/95 via-[#09090C]/90 to-[#0C0C0F]/95 border-b border-white/[0.08] backdrop-blur-md select-none">
      
      {/* ── LEFT: Brand & Navigation Pill Switcher ─────────────────────── */}
      <div className="flex items-center gap-3.5">
        <Link href="/" className="flex items-center gap-2 group shrink-0" title="APX-IQ Home">
          <span className="font-black italic text-lg tracking-tighter transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(207,163,73,0.6)]">
            <span className="text-gold">APX</span>
            <span className="text-white">·IQ</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-signal-go shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
        </Link>

        {/* Double-Bezel Segmented Navigation Switcher */}
        <div className="p-0.5 rounded-xl bg-black/40 ring-1 ring-white/10 flex items-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <Link
            href="/dashboard"
            className={cn(
              "px-2.5 py-1 rounded-[10px] text-[10px] font-mono uppercase tracking-[0.14em] font-bold transition-all duration-200 flex items-center gap-1.5",
              isCockpit
                ? "bg-gradient-to-r from-gold/25 via-gold/15 to-gold/20 text-gold border border-gold/40 shadow-[0_0_12px_rgba(207,163,73,0.2)]"
                : "text-silver/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Gauge size={11} className={cn(isCockpit ? "text-gold" : "text-silver/50")} />
            <span>Cockpit HUD</span>
          </Link>

          <Link
            href="/dashboard/intelligence"
            className={cn(
              "px-2.5 py-1 rounded-[10px] text-[10px] font-mono uppercase tracking-[0.14em] font-bold transition-all duration-200 flex items-center gap-1.5",
              isMissionControl
                ? "bg-gradient-to-r from-gold/25 via-gold/15 to-gold/20 text-gold border border-gold/40 shadow-[0_0_12px_rgba(207,163,73,0.2)]"
                : "text-silver/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Sparkles size={11} className={cn(isMissionControl ? "text-gold" : "text-silver/50")} />
            <span>Mission Control</span>
          </Link>

          <Link
            href="/debug"
            className={cn(
              "px-2.5 py-1 rounded-[10px] text-[10px] font-mono uppercase tracking-[0.14em] font-bold transition-all duration-200 flex items-center gap-1.5",
              pathname === "/debug"
                ? "bg-gradient-to-r from-gold/25 via-gold/15 to-gold/20 text-gold border border-gold/40 shadow-[0_0_12px_rgba(207,163,73,0.2)]"
                : "text-silver/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Activity size={11} className={cn(pathname === "/debug" ? "text-gold" : "text-silver/50")} />
            <span>Observability</span>
          </Link>
        </div>
      </div>

      {/* ── CENTER: Telemetry & Session Status Capsule ─────────────────── */}
      <div className="flex items-center gap-3">
        {/* Race Flag & Session Timer Capsule */}
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
          <div className="relative flex items-center justify-center w-2.5 h-2.5">
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-60",
                flagState.code === "red"
                  ? "bg-red-500"
                  : flagState.code === "yellow"
                    ? "bg-signal-caution"
                    : flagState.code === "blue"
                      ? "bg-blue-500"
                      : "bg-signal-go"
              )}
            />
            <span
              className={cn(
                "relative w-2 h-2 rounded-full",
                flagState.code === "red"
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                  : flagState.code === "yellow"
                    ? "bg-signal-caution shadow-[0_0_8px_rgba(234,179,8,0.9)]"
                    : flagState.code === "blue"
                      ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]"
                      : "bg-signal-go shadow-[0_0_8px_rgba(34,197,94,0.9)]"
              )}
            />
          </div>

          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-white/90 font-bold whitespace-nowrap">
            {flagState.label}
          </span>

          <div className="h-3 w-px bg-white/10" />

          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[9px] tracking-[0.14em] text-silver/40 uppercase">
              SESSION
            </span>
            <span ref={clockRef} className="font-mono text-sm font-bold text-white tabular-nums leading-none">
              0:00
            </span>
          </div>

          <SourceBadge source={source} />
        </div>

        {/* Track & Weather Capsule */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[9px] tracking-[0.14em] text-silver/40 uppercase">
              TRACK
            </span>
            <span className="font-mono text-[10px] text-white/90 font-bold uppercase">
              {trackName}
            </span>
          </div>

          <div className="h-3 w-px bg-white/10" />

          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[9px] tracking-[0.14em] text-silver/40 uppercase">
              CONDITIONS
            </span>
            <span className="font-mono text-[10px] text-signal-go font-bold uppercase">
              {weatherName}
              {tempDisplay && <span className="text-silver/60 font-normal ml-1.5">({tempDisplay})</span>}
            </span>
          </div>
        </div>

        {/* Active Race Event Capsule (Wave 4) */}
        {currentEvent && currentEvent.eventType !== "UNKNOWN" && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 ring-1 ring-purple-500/30 text-purple-300 font-mono text-[9px] font-bold tracking-[0.14em] uppercase shadow-[0_0_12px_rgba(168,85,247,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>
              {currentEvent.eventType === "FASTEST_LAP"
                ? `FASTEST LAP: ${currentEvent.lapTime ? `${currentEvent.lapTime.toFixed(3)}s` : ""}`
                : currentEvent.eventType === "PENALTY"
                ? `PENALTY: ${currentEvent.time ? `+${currentEvent.time}s` : "WARNING"}`
                : currentEvent.eventType === "SPEED_TRAP"
                ? `SPEED TRAP: ${currentEvent.speed ? `${Math.round(currentEvent.speed)} KPH` : ""}`
                : currentEvent.eventType.replace(/_/g, " ")}
            </span>
          </div>
        )}

        {/* Interactive Playback & Scrubber Controls */}
        <PlaybackControls />
      </div>



      {/* ── RIGHT: System Preferences & Live Pit Wall Pill ─────────────── */}
      <div className="flex items-center gap-2">
        {/* Motion Preference Toggle */}
        <button
          onClick={() =>
            setMotion(MOTION_CYCLE[(MOTION_CYCLE.indexOf(motion) + 1) % MOTION_CYCLE.length])
          }
          className="px-2 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] ring-1 ring-white/[0.08] hover:ring-gold/30 text-silver/70 hover:text-gold text-[9px] font-mono tracking-[0.14em] uppercase transition-all duration-150 active:scale-95 cursor-pointer"
          title="Animation level (design/MOTION.md)"
        >
          MOTION: <span className="text-white font-bold">{motion.toUpperCase()}</span>
        </button>

        {/* Density Preference Toggle */}
        <button
          onClick={() =>
            setDensity(DENSITY_CYCLE[(DENSITY_CYCLE.indexOf(density) + 1) % DENSITY_CYCLE.length])
          }
          className="px-2 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] ring-1 ring-white/[0.08] hover:ring-gold/30 text-silver/70 hover:text-gold text-[9px] font-mono tracking-[0.14em] uppercase transition-all duration-150 active:scale-95 cursor-pointer"
          title="Panel density"
        >
          <span className="text-white font-bold">{density === "comfortable" ? "COMFORT" : "COMPACT"}</span>
        </button>

        {/* Command Palette Trigger Button */}
        <button
          onClick={() => setIsCommandOpen(true)}
          className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/[0.12] hover:ring-gold/40 text-silver/80 hover:text-white text-[9px] font-mono tracking-[0.14em] uppercase transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(0,0,0,0.5)]"
          title="Open Command Palette (Cmd+K / Ctrl+K)"
        >
          <span className="text-gold font-bold">⌘K</span>
          <span className="hidden sm:inline text-neutral-400">COMMAND</span>
        </button>

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* Pit Wall Radio Micro-Badge */}
        <div className="px-2.5 py-1 rounded-lg bg-gold/10 ring-1 ring-gold/30 text-gold text-[9px] font-mono font-black tracking-[0.2em] uppercase flex items-center gap-1.5 shadow-[0_0_10px_rgba(207,163,73,0.1)]">
          <Radio size={10} className="animate-pulse text-gold" />
          <span>PIT WALL</span>
        </div>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Gauge, Zap, Volume2, VolumeX, Flame, Radio, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { soundFx } from "@/lib/cockpit/soundFx";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { SourceBadge } from "@/components/cockpit/primitives";

/**
 * Gear ratios for Formula 1 8-Speed Seamless Shift Transmission
 * Speed (km/h) = (RPM / Max_RPM_in_gear) * Top_Speed_in_gear
 */
const GEAR_TOP_SPEEDS = [0, 105, 148, 192, 235, 275, 310, 338, 355]; // Gears 0 (N) to 8

export function HeroTelemetrySandbox() {
  const { isConnected } = useLiveOrDemo();
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const isLive = isConnected && telemetry !== null;

  // Sandbox local state
  const [rpm, setRpm] = useState(4200);
  const [gear, setGear] = useState(3);
  const [drs, setDrs] = useState(false);
  const [isThrottling, setIsThrottling] = useState(false);
  const [soundActive, setSoundActive] = useState(false);
  const [dduTab, setDduTab] = useState<"RACE" | "TYRES" | "ERS">("RACE");

  const animRef = useRef<number | null>(null);

  // Sound active sync
  const toggleAudio = () => {
    const next = !soundActive;
    soundFx.enabled = next;
    setSoundActive(next);
    if (next) {
      soundFx.playButtonClick();
      soundFx.setEngineRpm(rpm, isThrottling ? 1.0 : 0.2);
    } else {
      soundFx.stopEngine();
    }
  };

  // Throttle physics loop
  useEffect(() => {
    if (isLive) return; // If live telemetry is streaming, don't run sandbox physics loop

    let currentRpm = rpm;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isThrottling) {
        // Accelerate RPM towards 13,400 rev limiter
        const climbRate = gear === 0 ? 18000 : 7000 / Math.max(1, gear * 0.4);
        currentRpm = Math.min(13400, currentRpm + climbRate * dt);
        if (currentRpm >= 13350) {
          // Soft rev bounce
          currentRpm = 13150 + Math.random() * 200;
        }
      } else {
        // Decelerate RPM towards 4,200 idle
        currentRpm = Math.max(4200, currentRpm - 5500 * dt);
      }

      setRpm(Math.round(currentRpm));

      if (soundActive) {
        soundFx.setEngineRpm(currentRpm, isThrottling ? 1.0 : 0.2);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (soundActive) soundFx.stopEngine();
    };
  }, [isThrottling, gear, isLive, soundActive]);

  const handleUpshift = React.useCallback(() => {
    if (gear < 8) {
      soundFx.playGearShift(true);
      setGear((g) => g + 1);
      setRpm((r) => Math.max(5000, Math.round(r * 0.76)));
    }
  }, [gear]);

  const handleDownshift = React.useCallback(() => {
    if (gear > 0) {
      soundFx.playGearShift(false);
      setGear((g) => g - 1);
      setRpm((r) => Math.min(12500, Math.round(r * 1.25)));
    }
  }, [gear]);

  const handleToggleDrs = React.useCallback(() => {
    setDrs((prev) => {
      const next = !prev;
      soundFx.playDrsTone(next);
      return next;
    });
  }, []);

  // Keyboard controls listener (W/Up for throttle, E for upshift, Q for downshift, D for DRS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        setIsThrottling(true);
      } else if (e.key === "e" || e.key === "E") {
        handleUpshift();
      } else if (e.key === "q" || e.key === "Q") {
        handleDownshift();
      } else if (e.key === "d" || e.key === "D") {
        handleToggleDrs();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        setIsThrottling(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleUpshift, handleDownshift, handleToggleDrs]);

  // Display variables
  const displayRpm = isLive && telemetry ? telemetry.rpm : rpm;
  const displayGear = isLive && telemetry ? (telemetry.gear === 0 ? "N" : telemetry.gear) : (gear === 0 ? "N" : gear);
  const displayDrs = isLive && telemetry ? Boolean(telemetry.drs) : drs;

  const maxGearSpeed = GEAR_TOP_SPEEDS[gear] ?? 200;
  const computedSpeed = gear === 0 ? 0 : Math.round(((displayRpm - 3500) / (13500 - 3500)) * (maxGearSpeed - 40) + 40 + (displayDrs ? 18 : 0));
  const displaySpeed = isLive && telemetry ? Math.round(telemetry.speed) : Math.max(0, computedSpeed);
  const displayGForce = (1.2 + (displaySpeed / 350) * 3.4).toFixed(1);

  // Shift light calculation (15 LEDs: 5 Green, 5 Red, 5 Purple)
  const rpmFrac = Math.max(0, Math.min(1, (displayRpm - 6500) / (13200 - 6500)));
  const activeLeds = Math.round(rpmFrac * 15);
  const isShiftLimit = displayRpm >= 12800;

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-[#0E1015] via-[#090A0E] to-[#040507] border border-gold/40 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.9),0_0_24px_rgba(207,163,73,0.12)] backdrop-blur-md flex flex-col gap-5 relative overflow-hidden">
      
      {/* Carbon weave overlay hint */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, #FFF 0, #FFF 1px, transparent 0, transparent 8px)",
        }}
      />

      {/* ── CARD HEADER: Interactive Sandbox Badge & Audio Toggle ─────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-signal-go shadow-[0_0_8px_rgba(34,197,94,0.9)] animate-pulse" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-[0.16em]">
            INTERACTIVE COCKPIT TELEMETRY SANDBOX
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-bold hidden sm:inline">
            60Hz HARDWARE EMULATION
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Synthesizer Toggle */}
          <button
            onClick={toggleAudio}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[9px] font-mono tracking-wider font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer",
              soundActive
                ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white border border-white/10"
            )}
            title="Toggle Synthesized F1 V6 Turbo Engine Sound FX"
          >
            {soundActive ? <Volume2 size={12} className="text-black" /> : <VolumeX size={12} />}
            <span>{soundActive ? "V6 ENGINE SOUND ON" : "ENABLE AUDIO SFX"}</span>
          </button>

          <SourceBadge source={isLive ? "LIVE" : "SIM"} />
        </div>
      </div>

      {/* ── 15-LED RPM SHIFT LIGHT STRIP ──────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 relative z-10">
        <div className="flex items-center justify-between font-mono text-[9px] text-neutral-400">
          <span className="uppercase tracking-wider">ENGINE RPM TACHOMETER</span>
          <span className="font-bold text-amber-400 tabular-nums">
            {displayRpm.toLocaleString()} RPM {isShiftLimit && <span className="text-purple-400 animate-ping">· SHIFT!</span>}
          </span>
        </div>

        <div className={cn("grid grid-cols-15 gap-1 sm:gap-1.5 p-1.5 rounded-xl bg-black/80 border border-white/10 shadow-inner", isShiftLimit && "animate-pulse")}>
          {Array.from({ length: 15 }, (_, i) => {
            const isActive = i < activeLeds;
            const isGreen = i < 5;
            const isRed = i >= 5 && i < 10;
            const isPurple = i >= 10;

            let colorClass = "bg-neutral-800 opacity-30";
            if (isActive) {
              if (isGreen) colorClass = "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] opacity-100";
              else if (isRed) colorClass = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] opacity-100";
              else colorClass = "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.95)] opacity-100";
            }

            return (
              <div
                key={i}
                className={cn("h-3 sm:h-3.5 rounded-sm transition-all duration-75", colorClass)}
              />
            );
          })}
        </div>
      </div>

      {/* ── CENTRAL AMOLED DIGITAL MFD DISPLAY ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch relative z-10">
        
        {/* Main Display Unit (8 Cols) */}
        <div className="md:col-span-8 rounded-xl bg-[#060709] border border-gold/30 p-4 shadow-[inset_0_0_24px_rgba(0,0,0,0.95)] flex flex-col justify-between gap-4">
          
          {/* MFD Header */}
          <div className="flex items-center justify-between font-mono text-[9px] border-b border-white/10 pb-2">
            <span className="text-neutral-400 uppercase">
              GP STATUS: <strong className="text-white">MONACO · LAP 16/56</strong>
            </span>

            {/* MFD Tabs */}
            <div className="flex items-center gap-1">
              {(["RACE", "TYRES", "ERS"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    soundFx.playButtonClick();
                    setDduTab(tab);
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer",
                    dduTab === tab
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <span className="text-emerald-400 font-bold">DELTA: -0.182s</span>
          </div>

          {/* DDU Content Mode */}
          {dduTab === "RACE" && (
            <div className="grid grid-cols-3 items-center py-2">
              {/* Left Speed */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] text-neutral-400 tracking-wider">SPEED</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-4xl sm:text-5xl font-black text-amber-400 tabular-nums">
                    {displaySpeed}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400 font-bold">KM/H</span>
                </div>
              </div>

              {/* Massive Central Gear */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/80 border border-gold/50 flex items-center justify-center shadow-[0_0_20px_rgba(207,163,73,0.3)]">
                  <span className="font-mono text-4xl sm:text-5xl font-black text-white">
                    {displayGear}
                  </span>
                </div>
                <span className="font-mono text-[8px] text-neutral-400 mt-1 uppercase font-bold">GEAR</span>
              </div>

              {/* Right G-Force / Lateral */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] text-neutral-400 tracking-wider">G-FORCE</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-3xl sm:text-4xl font-black text-cyan-400 tabular-nums">
                    {displayGForce}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400 font-bold">G</span>
                </div>
              </div>
            </div>
          )}

          {dduTab === "TYRES" && (
            <div className="grid grid-cols-2 gap-2 py-2 font-mono text-xs">
              <div className="p-2 rounded bg-black/60 border border-white/10 flex justify-between items-center">
                <span className="text-gold font-bold">FL (SOFT)</span>
                <span className="text-emerald-400 font-bold">22.0 PSI · 98°C</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-white/10 flex justify-between items-center">
                <span className="text-gold font-bold">FR (SOFT)</span>
                <span className="text-emerald-400 font-bold">22.2 PSI · 101°C</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-white/10 flex justify-between items-center">
                <span className="text-gold font-bold">RL (SOFT)</span>
                <span className="text-amber-400 font-bold">20.4 PSI · 92°C</span>
              </div>
              <div className="p-2 rounded bg-black/60 border border-white/10 flex justify-between items-center">
                <span className="text-gold font-bold">RR (SOFT)</span>
                <span className="text-amber-400 font-bold">20.6 PSI · 90°C</span>
              </div>
            </div>
          )}

          {dduTab === "ERS" && (
            <div className="flex flex-col gap-2 py-2 font-mono text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>HYBRID BATTERY SOC</span>
                <span className="text-cyan-400 font-bold">84% DEPLOYABLE</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" style={{ width: "84%" }} />
              </div>
              <div className="flex justify-between text-[9px] text-neutral-400 pt-1">
                <span>MGU-K: HARVESTING</span>
                <span>MGU-H: ACTIVE BOOST</span>
              </div>
            </div>
          )}

          {/* DDU Footer: DRS & ERS Energy */}
          <div className="flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[9px]">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 uppercase">AERO:</span>
              <button
                onClick={handleToggleDrs}
                className={cn(
                  "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                  displayDrs
                    ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"
                    : "bg-white/10 text-neutral-400 hover:text-white"
                )}
              >
                DRS {displayDrs ? "OPEN (ACTIVE)" : "AVAILABLE (PRESS D)"}
              </button>
            </div>
            <span className="text-neutral-400 uppercase">
              THROTTLE: <strong className={isThrottling ? "text-emerald-400" : "text-neutral-500"}>{isThrottling ? "100% (W / HOLD)" : "0% IDLE"}</strong>
            </span>
          </div>
        </div>

        {/* Tactile Steering Actuators (4 Cols) */}
        <div className="md:col-span-4 rounded-xl bg-black/60 border border-white/[0.08] p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 font-mono text-[9px] text-neutral-400">
            <span className="uppercase font-bold text-white">TACTILE ACTUATORS</span>
            <span>HOTKEYS: W / Q / E / D</span>
          </div>

          {/* Interactive Throttle Hold Button */}
          <button
            onMouseDown={() => setIsThrottling(true)}
            onMouseUp={() => setIsThrottling(false)}
            onTouchStart={() => setIsThrottling(true)}
            onTouchEnd={() => setIsThrottling(false)}
            className={cn(
              "w-full py-3.5 rounded-xl font-mono text-xs font-black tracking-wider uppercase transition-all duration-100 flex items-center justify-center gap-2 cursor-pointer select-none",
              isThrottling
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.8)] scale-98"
                : "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/25 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            )}
          >
            <Flame size={15} className={isThrottling ? "animate-bounce" : ""} />
            <span>{isThrottling ? "ACCELERATING (100% REV)" : "PRESS & HOLD THROTTLE"}</span>
          </button>

          {/* Gear Shifting Paddles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownshift}
              disabled={gear <= 0}
              className="py-2.5 rounded-lg bg-black/80 hover:bg-white/10 disabled:opacity-30 border border-white/15 text-white font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ChevronDown size={14} className="text-amber-400" />
              <span>DOWNSHIFT (Q)</span>
            </button>

            <button
              onClick={handleUpshift}
              disabled={gear >= 8}
              className="py-2.5 rounded-lg bg-black/80 hover:bg-white/10 disabled:opacity-30 border border-white/15 text-white font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ChevronUp size={14} className="text-emerald-400" />
              <span>UPSHIFT (E)</span>
            </button>
          </div>

          {/* Quick Action DRS & Radio */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleToggleDrs}
              className={cn(
                "py-2 rounded-lg font-mono text-[9px] font-bold border transition-all cursor-pointer",
                displayDrs
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                  : "bg-black/50 border-white/10 text-neutral-300 hover:text-white"
              )}
            >
              DRS FLAP (D)
            </button>

            <button
              onClick={() => {
                soundFx.speakRadio("Radio check. Engine parameters optimal. Delta is green on Sector 2.");
              }}
              className="py-2 rounded-lg font-mono text-[9px] font-bold bg-black/50 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-amber-400 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Radio size={11} />
              <span>PIT RADIO</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER PROTOCOL PROVENANCE ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-neutral-400 pt-2 border-t border-white/[0.08] relative z-10">
        <span className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-gold" />
          <span>F1 2020-2025 BINARY PACKET PARSER · ZERO RENDER LATENCY · WEB AUDIO API ENGINE</span>
        </span>
        <span className="text-neutral-400 uppercase">
          UDP SOCKET: 127.0.0.1:20777 · SCALE-TO-ZERO SERVERLESS
        </span>
      </div>
    </div>
  );
}

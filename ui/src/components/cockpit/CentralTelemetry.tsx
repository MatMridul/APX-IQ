"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShiftLights } from "./ShiftLights";
import { DeltaBar } from "./DeltaBar";
import { SourceBadge } from "./primitives";
import { scheduler } from "@/lib/cockpit/scheduler";
import { getActiveFrame, useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useDur } from "@/lib/cockpit/preferences";
import { ACTIVE_ERA } from "@/lib/cockpit/era";
import { cn } from "@/lib/utils";
import { useWorkstationHotkeys } from "@/hooks/useWorkstationHotkeys";
import { useUxStore, DduMode } from "@/store/uxStore";
import { soundFx } from "@/lib/cockpit/soundFx";

/**
 * Authentic F1 Racing Steering Wheel — High-Precision Motorsport Monocoque
 *
 * Direct Tactile Motorsport Actuators:
 *  - Interactive pushbuttons: `N`, `RAD` (Radio check), `+10`/`+1`, `OT` (Overtake), `PC` (Pit confirm), `PL` (Pit Limiter), `DRK` (Drink), `BB−`/`BB+` (Brake Bias)
 *  - Machined titanium rotary switches: `STRAT` (1-12 Engine maps), `MFD` (Display mode), `HPP` (Hybrid diff)
 *  - DRS Trigger: Click to toggle DRS open/close with pneumatic audio tone
 *  - 15-LED RPM shift light array mounted in the recessed upper carbon bridge
 *  - Integrated anti-glare AMOLED digital cockpit display with 60Hz zero-render direct DOM updates
 */

/* ── SVG Wheel Button Component ────────────────────────────────────── */

function PushButton({
  x,
  y,
  label,
  color,
  textColor = "#FFFFFF",
  onClick,
  active = false,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  textColor?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <g
      onClick={onClick}
      pointerEvents="auto"
      className={cn(
        "cursor-pointer transition-transform duration-100 hover:scale-110 active:scale-90 origin-center select-none",
        active && "animate-pulse"
      )}
    >
      {/* CNC Aluminum Protective Bezel / Collar */}
      <circle cx={x} cy={y} r={12.5} fill="#0B0D12" stroke={active ? "#FACC15" : "#252936"} strokeWidth="1.6" />
      <circle cx={x} cy={y} r={10.8} fill="#141722" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />

      {/* Button Cap with Radial Lighting */}
      <circle cx={x} cy={y} r={9.2} fill={color} />
      <circle cx={x} cy={y} r={9.2} fill="url(#btn-specular)" />

      {/* Laser-etched Label */}
      <text
        x={x}
        y={y + 3.2}
        textAnchor="middle"
        fontSize="7.5"
        fontFamily="var(--font-mono), monospace"
        fontWeight="800"
        fill={textColor}
        style={{ letterSpacing: "0.02em" }}
      >
        {label}
      </text>
    </g>
  );
}

/* ── SVG Rotary Encoder Component ──────────────────────────────────── */

function RotarySwitch({
  x,
  y,
  label,
  dotAngle,
  valueText,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  dotAngle: number;
  valueText?: string | number;
  onClick?: () => void;
}) {
  const ticks = Array.from({ length: 11 }, (_, i) => i);
  return (
    <g
      onClick={onClick}
      pointerEvents="auto"
      className="cursor-pointer select-none group transition-transform active:scale-95 origin-center"
    >
      {/* Outer Knurled Ring Body */}
      <circle cx={x} cy={y} r={18} fill="#101217" stroke="#2B303D" strokeWidth="1.5" />
      <circle cx={x} cy={y} r={15} fill="url(#rotary-titanium)" stroke="rgba(207,163,73,0.45)" strokeWidth="1" />

      {/* Calibrated Detent Ticks */}
      {ticks.map((i) => {
        const rad = (i / 10) * Math.PI * 1.5 - Math.PI * 0.75;
        const isMajor = i === 0 || i === 5 || i === 10;
        return (
          <line
            key={i}
            x1={x + Math.cos(rad) * 11.5}
            y1={y + Math.sin(rad) * 11.5}
            x2={x + Math.cos(rad) * 14.5}
            y2={y + Math.sin(rad) * 14.5}
            stroke={isMajor ? "rgba(207,163,73,0.9)" : "rgba(255,255,255,0.3)"}
            strokeWidth={isMajor ? "1.4" : "0.8"}
          />
        );
      })}

      {/* Machined Gold Pointer Dot */}
      {(() => {
        const rad = (dotAngle / 300) * Math.PI * 1.5 - Math.PI * 0.75;
        return (
          <circle
            cx={x + Math.cos(rad) * 7.5}
            cy={y + Math.sin(rad) * 7.5}
            r={3}
            fill="#FACC15"
            stroke="#000000"
            strokeWidth="0.8"
          />
        );
      })()}

      {/* Center Cap */}
      <circle cx={x} cy={y} r={4.5} fill="#090A0D" stroke="#252936" strokeWidth="1" />

      {/* Rotary Legend */}
      <text
        x={x}
        y={y + 24}
        textAnchor="middle"
        fontSize="6.8"
        fontFamily="var(--font-mono), monospace"
        fontWeight="800"
        fill="rgba(207,163,73,0.9)"
        letterSpacing="0.8"
      >
        {label} {valueText !== undefined ? `· ${valueText}` : ""}
      </text>
    </g>
  );
}

/* ── Main Wheel Component ──────────────────────────────────────────── */

export function CentralTelemetry() {
  const [gear, setGear] = useState(1);
  const [drs, setDrs] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  
  // UX Store Bindings
  const dduMode = useUxStore((s) => s.mfdMode);
  const setDduMode = useUxStore((s) => s.setMfdMode);
  const cycleMfdMode = useUxStore((s) => s.cycleMfdMode);
  const stratMode = useUxStore((s) => s.stratMode);
  const cycleStrat = useUxStore((s) => s.cycleStrat);
  const hppMode = useUxStore((s) => s.hppMode);
  const cycleHpp = useUxStore((s) => s.cycleHpp);
  const adjustBrakeBias = useUxStore((s) => s.adjustBrakeBias);
  const toggleDrs = useUxStore((s) => s.toggleDrsOverride);
  const toggleOvertake = useUxStore((s) => s.toggleOvertake);
  const overtakeActive = useUxStore((s) => s.overtakeActive);
  const togglePitLimiter = useUxStore((s) => s.togglePitLimiter);
  const pitLimiterActive = useUxStore((s) => s.pitLimiterActive);
  const triggerRadio = useUxStore((s) => s.triggerRadio);

  const dur = useDur();
  const era = ACTIVE_ERA;
  const { source } = useLiveOrDemo();

  // Continuous Ref Pointers (60 Hz Zero-Render Direct DOM Writes)
  const speedRef = useRef<HTMLSpanElement | null>(null);
  const posRef = useRef<HTMLSpanElement | null>(null);
  const lapRef = useRef<HTMLSpanElement | null>(null);
  const fuelBarRef = useRef<HTMLDivElement | null>(null);
  const fuelTxtRef = useRef<HTMLSpanElement | null>(null);
  const socBarRef = useRef<HTMLDivElement | null>(null);
  const socTxtRef = useRef<HTMLSpanElement | null>(null);
  const deltaTxtRef = useRef<HTMLSpanElement | null>(null);
  const qualyS1Ref = useRef<HTMLSpanElement | null>(null);
  const qualyS2Ref = useRef<HTMLSpanElement | null>(null);
  const qualyS3Ref = useRef<HTMLSpanElement | null>(null);
  const qualyDeltaRef = useRef<HTMLSpanElement | null>(null);
  const edgeBloomRef = useRef<HTMLDivElement | null>(null);

  // Diagnostic Ignition Self-Test Boot Sequence (Task 2.1)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Global hotkeys (1, 2, 3, 4) for DDU mode switching
  useWorkstationHotkeys({
    onSelectDduMode: (m) => setDduMode(m),
  });

  useEffect(() => {
    let lastSpeedTxt = "";

    const unsub = scheduler.add((t) => {
      const state = useTelemetryStore.getState();
      const isLive = state.isConnected && state.telemetry !== null;

      const { data: f } = getActiveFrame(t);
      if (!f) return;

      setGear((prev) => (prev === f.gear ? prev : f.gear));
      setDrs((prev) => (prev === f.drs ? prev : f.drs));

      if (speedRef.current) {
        const s = String(Math.round(f.speed));
        if (s !== lastSpeedTxt) {
          speedRef.current.textContent = s;
          lastSpeedTxt = s;
        }
      }

      const totalCars = isLive && state.participants.length > 0 ? state.participants.length : 20;
      const totalLaps = isLive && state.session?.totalLaps ? state.session.totalLaps : 56;

      if (posRef.current) posRef.current.textContent = `${f.position}/${totalCars}`;
      if (lapRef.current) lapRef.current.textContent = `${f.lap}/${totalLaps}`;

      if (fuelBarRef.current)
        fuelBarRef.current.style.width = `${Math.min(100, Math.max(0, (f.fuelKg / 110) * 100))}%`;
      if (fuelTxtRef.current)
        fuelTxtRef.current.textContent = `${f.fuelKg.toFixed(1)}kg`;

      if (socBarRef.current)
        socBarRef.current.style.width = `${Math.min(100, Math.max(0, f.ersPct * 100))}%`;
      if (socTxtRef.current)
        socTxtRef.current.textContent = `${Math.round(f.ersPct * 100)}%`;

      if (deltaTxtRef.current) {
        const d = f.deltaMs / 1000;
        const sign = d <= 0 ? "-" : "+";
        const val = Math.abs(d).toFixed(3);
        deltaTxtRef.current.textContent = `${sign}${val}`;
        deltaTxtRef.current.style.color = d <= 0 ? "#22C55E" : "#EF4444";
      }

      if (qualyS1Ref.current && qualyS2Ref.current && qualyS3Ref.current) {
        const lap = state.lapData;
        if (isLive && lap) {
          if (lap.sector1) qualyS1Ref.current.textContent = `${(lap.sector1 / 1000).toFixed(3)}s`;
          if (lap.sector2) qualyS2Ref.current.textContent = `${(lap.sector2 / 1000).toFixed(3)}s`;
          if (lap.currentLapTime && lap.sector1 && lap.sector2) {
            const s3 = Math.max(0, lap.currentLapTime - lap.sector1 - lap.sector2);
            qualyS3Ref.current.textContent = `${(s3 / 1000).toFixed(3)}s`;
          }
        }
      }

      if (qualyDeltaRef.current) {
        const d = f.deltaMs / 1000;
        const sign = d <= 0 ? "−" : "+";
        qualyDeltaRef.current.textContent = `${sign}${Math.abs(d).toFixed(3)}s`;
        qualyDeltaRef.current.style.color = d <= 0 ? "#22C55E" : "#EF4444";
      }

      // RPM Limiter Strobe & Cockpit Edge Bloom (Task 2.2)
      if (edgeBloomRef.current) {
        const isLimiter = (f.rpmPct >= 0.94) || (isLive && (state.telemetry?.revLightsPercent ?? 0) >= 94);
        if (isLimiter) {
          const pulse = Math.floor(t * 30) % 2 === 0;
          edgeBloomRef.current.style.opacity = pulse ? "1" : "0.2";
          edgeBloomRef.current.style.boxShadow = pulse
            ? "inset 0 0 24px rgba(239,68,68,0.85), 0 0 16px rgba(239,68,68,0.7)"
            : "inset 0 0 8px rgba(239,68,68,0.2)";
        } else if (f.speed > 300) {
          const wave = (Math.sin(t * 10) + 1) * 0.5;
          edgeBloomRef.current.style.opacity = String(0.15 + wave * 0.25);
          edgeBloomRef.current.style.boxShadow = "inset 0 0 18px rgba(234,179,8,0.45)";
        } else {
          edgeBloomRef.current.style.opacity = "0";
          edgeBloomRef.current.style.boxShadow = "none";
        }
      }
    });

    return unsub;
  }, []);

  // Compute rotary visual dot angles
  const stratAngle = ((stratMode - 1) / 11) * 300;
  const mfdModes: DduMode[] = ["RACE", "QUALY", "TYRES", "CHASSIS"];
  const mfdAngle = (mfdModes.indexOf(dduMode) / 3) * 300;
  const hppAngle = ((hppMode - 1) / 7) * 300;

  return (
    <div className="w-full h-full flex items-center justify-center p-1 select-none">
      <div
        className="relative flex items-center justify-center"
        data-testid="wheel-cluster"
        style={{ aspectRatio: "520/348", height: "100%", maxWidth: "100%" }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            1. AUTHENTIC F1 STEERING WHEEL MONOCOQUE (SVG CHASSIS)
        ══════════════════════════════════════════════════════════════════ */}
        <svg
          viewBox="0 0 520 348"
          className="absolute inset-0 w-full h-full drop-shadow-[0_18px_36px_rgba(0,0,0,0.92)] z-20 pointer-events-auto"
          aria-label="F1 Racing Steering Wheel"
        >
          <defs>
            {/* Matte Twill Carbon Fiber Monocoque Gradient */}
            <linearGradient id="carbon-monocoque" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22252F" />
              <stop offset="25%" stopColor="#171922" />
              <stop offset="60%" stopColor="#0E1015" />
              <stop offset="100%" stopColor="#08090C" />
            </linearGradient>

            {/* Sculpted Alcantara Grip Gradient (Left) */}
            <linearGradient id="grip-alcantara-l" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0A0B0E" />
              <stop offset="45%" stopColor="#1B1E26" />
              <stop offset="85%" stopColor="#12141B" />
              <stop offset="100%" stopColor="#0B0C10" />
            </linearGradient>

            {/* Sculpted Alcantara Grip Gradient (Right) */}
            <linearGradient id="grip-alcantara-r" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#0A0B0E" />
              <stop offset="45%" stopColor="#1B1E26" />
              <stop offset="85%" stopColor="#12141B" />
              <stop offset="100%" stopColor="#0B0C10" />
            </linearGradient>

            {/* Knurled Titanium Rotary Shader */}
            <radialGradient id="rotary-titanium" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#303544" />
              <stop offset="55%" stopColor="#171922" />
              <stop offset="100%" stopColor="#0A0B0E" />
            </radialGradient>

            {/* Button Tactile Specular Glint */}
            <radialGradient id="btn-specular" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* LCD Screen Housing Inner Depth Shadow */}
            <filter id="lcd-housing-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.9" />
            </filter>
          </defs>

          {/* ── ERGONOMIC SCULPTED ALCANTARA GRIPS ───────────────────────── */}
          {/* Left Grip */}
          <path
            d="M 96 74 C 60 66 28 84 18 130 C 6 186 8 250 24 288 C 38 318 74 322 92 300 L 96 74 Z"
            fill="url(#grip-alcantara-l)"
            stroke="rgba(207,163,73,0.35)"
            strokeWidth="1.2"
          />
          {/* Right Grip */}
          <path
            d="M 424 74 C 460 66 492 84 502 130 C 514 186 512 250 496 288 C 482 318 446 322 428 300 L 424 74 Z"
            fill="url(#grip-alcantara-r)"
            stroke="rgba(207,163,73,0.35)"
            strokeWidth="1.2"
          />

          {/* Grip Tactile Contour Ridges */}
          {[96, 122, 148, 174, 200, 226, 252, 276].map((gy) => (
            <g key={gy}>
              <line x1={30} y1={gy} x2={88} y2={gy + 6} stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1={432} y1={gy + 6} x2={490} y2={gy} stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          ))}

          {/* ── CARBON FIBER CHASSIS MONOCOQUE ───────────────────────────── */}
          <path
            d="M 96 58 C 160 38 360 38 424 58 L 428 248 C 400 300 360 326 330 326 L 190 326 C 160 326 120 300 92 248 Z"
            fill="url(#carbon-monocoque)"
            stroke="rgba(207,163,73,0.45)"
            strokeWidth="1.4"
          />
          {/* Subtle Twill Weave Anisotropic Texture */}
          <path
            d="M 96 58 C 160 38 360 38 424 58 L 428 248 C 400 300 360 326 330 326 L 190 326 C 160 326 120 300 92 248 Z"
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="8"
            strokeDasharray="2 6"
          />

          {/* ── LCD SCREEN MACHINED BEZEL HOUSING ────────────────────────── */}
          <rect
            x="142"
            y="86"
            width="236"
            height="152"
            rx="8"
            fill="#030407"
            stroke="rgba(207,163,73,0.45)"
            strokeWidth="1.4"
            filter="url(#lcd-housing-shadow)"
          />

          {/* ── AUTHENTIC PIT WALL REMINDER TAPE STICKER ─────────────────── */}
          <rect
            x="180"
            y="244"
            width="160"
            height="14"
            rx="2"
            fill="rgba(230,228,220,0.92)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="0.5"
          />
          <text
            x="260"
            y="254"
            textAnchor="middle"
            fontSize="6.8"
            fontFamily="var(--font-mono), monospace"
            fontWeight="800"
            fill="#111827"
            letterSpacing="0.8"
          >
            STRAT {stratMode} = PIT · FLAP → MFD
          </text>

          {/* ── TACTILE PUSHBUTTONS (LEFT & RIGHT) ────────────────────────── */}
          {/* Left: N, RAD, +10, +1 */}
          <PushButton
            x={120}
            y={112}
            label="N"
            color="#EAB308"
            textColor="#000"
            onClick={() => {
              soundFx.playButtonClick();
              setGear(0);
            }}
          />
          <PushButton
            x={120}
            y={144}
            label="RAD"
            color="#475569"
            textColor="#FFF"
            onClick={() => triggerRadio()}
          />
          <PushButton
            x={120}
            y={176}
            label="+10"
            color="#181A20"
            textColor="#E2E8F0"
            onClick={() => adjustBrakeBias(1.0)}
          />
          <PushButton
            x={120}
            y={206}
            label="+1"
            color="#181A20"
            textColor="#E2E8F0"
            onClick={() => adjustBrakeBias(0.1)}
          />

          {/* Right: OT, PC, PL, DRK */}
          <PushButton
            x={400}
            y={112}
            label="OT"
            color="#EA580C"
            textColor="#FFF"
            active={overtakeActive}
            onClick={() => toggleOvertake()}
          />
          <PushButton
            x={400}
            y={144}
            label="PC"
            color="#CBD5E1"
            textColor="#0F172A"
            onClick={() => {
              triggerRadio("PIT CONFIRMED: Pit crew standing by for box this lap.");
            }}
          />
          <PushButton
            x={400}
            y={176}
            label="PL"
            color="#DC2626"
            textColor="#FFF"
            active={pitLimiterActive}
            onClick={() => togglePitLimiter()}
          />
          <PushButton
            x={400}
            y={206}
            label="DRK"
            color="#2563EB"
            textColor="#FFF"
            onClick={() => {
              triggerRadio("DRINK PUMP: 50ml isotonic hydration delivered.");
            }}
          />

          {/* Brake Bias Fast Triggers Under Screen */}
          <PushButton
            x={196}
            y={272}
            label="BB−"
            color="#DC2626"
            textColor="#FFF"
            onClick={() => adjustBrakeBias(-0.5)}
          />
          <PushButton
            x={324}
            y={272}
            label="BB+"
            color="#16A34A"
            textColor="#FFF"
            onClick={() => adjustBrakeBias(0.5)}
          />

          {/* ── MACHINED ROTARY SWITCHES (STRAT · MFD · HPP) ─────────────── */}
          <RotarySwitch
            x={144}
            y={272}
            label="STRAT"
            dotAngle={stratAngle}
            valueText={stratMode}
            onClick={() => cycleStrat()}
          />
          <RotarySwitch
            x={260}
            y={274}
            label="MFD"
            dotAngle={mfdAngle}
            valueText={dduMode}
            onClick={() => cycleMfdMode()}
          />
          <RotarySwitch
            x={376}
            y={272}
            label="HPP"
            dotAngle={hppAngle}
            valueText={hppMode}
            onClick={() => cycleHpp()}
          />

          {/* Quick-Release Center Boss */}
          <circle cx={260} cy={312} r={7.5} fill="#0C0E13" stroke="rgba(207,163,73,0.35)" strokeWidth="1" />
          <circle cx={260} cy={312} r={3.5} fill="none" stroke="rgba(207,163,73,0.35)" strokeWidth="0.8" />
        </svg>

        {/* ══════════════════════════════════════════════════════════════════
            2. 15-LED RPM SHIFT LIGHT ARRAY (Recessed Above Display)
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: "21%",
            top: "17.4%",
            width: "58%",
            height: "6.8%",
          }}
        >
          <ShiftLights fill />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. ERGONOMIC DRS BUTTON (Upper-Left Face Mount)
        ══════════════════════════════════════════════════════════════════ */}
        <div
          onClick={() => toggleDrs()}
          className={cn(
            "absolute z-30 font-mono text-[9px] tracking-[0.12em] font-bold border rounded px-1.5 py-0.5 transition-all duration-150 cursor-pointer select-none",
            drs
              ? "text-signal-go border-signal-go/60 bg-signal-go/20 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse"
              : "text-silver/70 border-white/20 bg-black/60 hover:border-gold/50"
          )}
          style={{ left: "16%", top: "27.5%" }}
          title="Click to toggle DRS (Drag Reduction System)"
        >
          {drs ? era.aero.chipLabels.active : era.aero.chipLabels.ready}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            4. INTEGRATED HIGH-CONTRAST AMOLED COCKPIT DISPLAY
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="absolute z-30 rounded-md overflow-hidden select-none pointer-events-auto"
          style={{
            left: "27.7%",
            top: "25.8%",
            width: "44.6%",
            height: "44.2%",
            background: "linear-gradient(180deg, #0C0E13 0%, #060709 100%)",
            border: isBooting ? "1px solid rgba(207,163,73,0.7)" : "1px solid rgba(120,140,180,0.22)",
            boxShadow: isBooting
              ? "inset 0 0 28px rgba(207,163,73,0.55), 0 0 24px rgba(207,163,73,0.6)"
              : "inset 0 0 18px rgba(207,163,73,0.08), 0 0 14px rgba(0,0,0,0.8)",
            transition: "border-color 400ms, box-shadow 400ms",
          }}
        >
          {/* Micro scanline raster hint */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(200,204,212,0.55) 0 1px, transparent 1px 3px)",
            }}
          />

          {/* RPM Limiter Peripheral Strobe & Cockpit Edge Bloom (Task 2.2) */}
          <div
            ref={edgeBloomRef}
            className="absolute inset-0 pointer-events-none rounded-md z-40 transition-opacity duration-75"
            style={{ opacity: 0 }}
          />

          {/* AMOLED Diagnostic Ignition Self-Test Boot Sequence (Task 2.1) */}
          <AnimatePresence>
            {isBooting && (
              <motion.div
                key="boot-screen"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute inset-0 z-50 bg-[#07090E] flex flex-col items-center justify-between p-2 font-mono select-none"
              >
                <div className="w-full flex items-center justify-between text-[7.5px] text-gold/90 border-b border-gold/30 pb-0.5">
                  <span className="tracking-widest font-bold">APX-IQ AVIONICS</span>
                  <span className="text-emerald-400 font-bold animate-pulse">BOOT // DIAGNOSTIC</span>
                </div>

                <div className="flex flex-col items-center my-auto">
                  <div className="text-[32px] font-black font-display tracking-widest text-white/90 drop-shadow-[0_0_12px_rgba(207,163,73,0.7)] animate-pulse leading-none">
                    888
                  </div>
                  <div className="text-[7px] tracking-widest text-silver/70 uppercase mt-1">
                    SYSTEM SELF-TEST · ALL BUSES OK
                  </div>
                </div>

                <div className="w-full grid grid-cols-3 gap-1 text-[6.5px] text-center text-silver/60 pt-0.5 border-t border-white/10">
                  <span className="text-emerald-400 font-bold">CAN 1M OK</span>
                  <span className="text-cyan-400 font-bold">IMU 60Hz</span>
                  <span className="text-amber-400 font-bold">ERS READY</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative h-full flex flex-col px-2.5 py-1.5 justify-between">
            {/* ── TOP HEADER: Lap | Mode Indicator | Position ─────────────── */}
            <div className="flex items-center justify-between font-mono text-[9.5px] tabular-nums text-silver/80">
              <span>
                LAP <span ref={lapRef} className="text-white font-bold">1/56</span>
              </span>

              {/* Mode indicator (Clickable or key 1-4 toggleable) */}
              <button
                onClick={() => cycleMfdMode()}
                className="text-[8.5px] tracking-[0.14em] text-gold border border-gold/50 rounded px-1.5 py-px hover:bg-gold/15 transition-colors cursor-pointer font-bold"
                title="Click or press 1-4 to cycle display mode"
              >
                {dduMode}
              </button>

              <span>
                POS <span ref={posRef} className="text-white font-bold">2/20</span>
              </span>
            </div>

            {/* ── MIDDLE CLUSTER: SPEED | CENTRAL GEAR | LIVE DELTA ───────── */}
            {dduMode === "RACE" && (
              <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1 min-h-0 py-0.5">
                {/* Speed column */}
                <div className="text-left flex flex-col justify-center">
                  <div className="font-mono text-[8px] tracking-[0.14em] text-silver/50">SPD</div>
                  <div className="flex items-baseline gap-1">
                    <span
                      ref={speedRef}
                      className="font-display text-[42px] leading-none text-white font-black tabular-nums tracking-tighter"
                    >
                      0
                    </span>
                    <span className="font-mono text-[9px] text-silver/50 font-bold">KMH</span>
                  </div>
                </div>

                {/* Massive Central Gear with Smooth Elevation Glow */}
                <div className="relative w-[64px] h-[64px] flex items-center justify-center">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={gear}
                      initial={{ scale: 1.15, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.88, opacity: 0 }}
                      transition={{ duration: dur.ui, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute font-display text-[64px] leading-none font-black text-white"
                      style={{ textShadow: "0 0 20px rgba(207,163,73,0.45)" }}
                    >
                      {gear === 0 ? "N" : gear === -1 ? "R" : gear}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Delta Column */}
                <div className="text-right flex flex-col items-end justify-center">
                  <div className="font-mono text-[8px] tracking-[0.14em] text-silver/50">DELTA</div>
                  <div className="w-[84px] my-0.5">
                    <DeltaBar compact />
                  </div>
                  <div className="font-mono text-[8px] text-silver/40">vs BEST</div>
                </div>
              </div>
            )}

            {/* ── QUALY / TIME TRIAL MODE ───────────────────────────────── */}
            {dduMode === "QUALY" && (
              <div className="flex-1 flex flex-col justify-around py-0.5 font-mono text-[8px]">
                <div className="flex items-center justify-between text-neutral-400">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="uppercase text-amber-400 font-bold tracking-wider">
                      RIVAL SPLIT // TT
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-silver/50">TGT:</span>
                    <span className="text-gold font-bold">1:11.890</span>
                    <span ref={qualyDeltaRef} className="font-bold text-emerald-400 ml-1">
                      -0.000s
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="p-1 rounded bg-black/60 border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[7px] text-purple-400 font-bold">S1</span>
                      <span className="text-[6.5px] text-purple-300 font-bold">-0.042</span>
                    </div>
                    <span ref={qualyS1Ref} className="font-bold text-[9px] text-white tabular-nums block mt-0.5">
                      18.274s
                    </span>
                  </div>
                  <div className="p-1 rounded bg-black/60 border border-emerald-500/50 shadow-[0_0_8px_rgba(34,197,94,0.15)]">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[7px] text-emerald-400 font-bold">S2</span>
                      <span className="text-[6.5px] text-emerald-300 font-bold">-0.021</span>
                    </div>
                    <span ref={qualyS2Ref} className="font-bold text-[9px] text-white tabular-nums block mt-0.5">
                      32.398s
                    </span>
                  </div>
                  <div className="p-1 rounded bg-black/60 border border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.15)]">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[7px] text-yellow-400 font-bold">S3</span>
                      <span className="text-[6.5px] text-yellow-300 font-bold">+0.018</span>
                    </div>
                    <span ref={qualyS3Ref} className="font-bold text-[9px] text-white tabular-nums block mt-0.5">
                      21.190s
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── TYRES MODE ────────────────────────────────────────────── */}
            {dduMode === "TYRES" && (
              <div className="flex-1 grid grid-cols-2 gap-1 p-0.5 font-mono text-[8px]">
                <div className="p-1 rounded bg-black/60 border border-white/10 flex justify-between items-center">
                  <span className="text-gold font-bold">FL</span>
                  <span className="text-emerald-400 font-bold">21.8 PSI · 98°C</span>
                </div>
                <div className="p-1 rounded bg-black/60 border border-white/10 flex justify-between items-center">
                  <span className="text-gold font-bold">FR</span>
                  <span className="text-emerald-400 font-bold">22.1 PSI · 101°C</span>
                </div>
                <div className="p-1 rounded bg-black/60 border border-white/10 flex justify-between items-center">
                  <span className="text-gold font-bold">RL</span>
                  <span className="text-amber-400 font-bold">20.4 PSI · 92°C</span>
                </div>
                <div className="p-1 rounded bg-black/60 border border-white/10 flex justify-between items-center">
                  <span className="text-gold font-bold">RR</span>
                  <span className="text-amber-400 font-bold">20.6 PSI · 90°C</span>
                </div>
              </div>
            )}

            {/* ── CHASSIS MODE ──────────────────────────────────────────── */}
            {dduMode === "CHASSIS" && (
              <div className="flex-1 flex flex-col justify-around py-0.5 font-mono text-[8px]">
                <div className="grid grid-cols-2 gap-1 text-center">
                  <div className="p-1 rounded bg-black/60 border border-white/10">
                    <span className="text-silver/50 text-[7px] block">SUSP TRAVEL</span>
                    <span className="text-cyan-400 font-bold">14.2 / 14.8 mm</span>
                  </div>
                  <div className="p-1 rounded bg-black/60 border border-white/10">
                    <span className="text-silver/50 text-[7px] block">SLIP RATIO</span>
                    <span className="text-emerald-400 font-bold">2.4% OPTIMAL</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── BOTTOM TELEMETRY: ERS SoC + FUEL ───────────────────────── */}
            <div className="grid grid-cols-2 gap-2 pb-0.5 pt-0.5 border-t border-white/10">
              <div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-[8px] tracking-[0.12em] text-silver/50">
                    {era.energy.systemName}
                  </span>
                  <span ref={socTxtRef} className="font-mono text-[9px] text-signal-energy tabular-nums">
                    0%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    ref={socBarRef}
                    className="h-full rounded-full"
                    style={{ width: "0%", background: "var(--color-signal-energy)" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-[8px] tracking-[0.12em] text-silver/50">
                    {era.fuelLabel}
                  </span>
                  <span ref={fuelTxtRef} className="font-mono text-[9px] text-gold tabular-nums">
                    0kg
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    ref={fuelBarRef}
                    className="h-full rounded-full"
                    style={{ width: "0%", background: "var(--color-gold)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── PANEL HEADER FLOATING MICRO LABELS ──────────────────────────── */}
        <div className="absolute -top-1 left-0 right-0 flex items-center justify-between text-[8px] font-mono text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            <span className="font-bold text-silver/80 uppercase tracking-widest">
              WHEEL · {era.label}
            </span>
          </div>
          <SourceBadge source={source} />
        </div>

      </div>
    </div>
  );
}

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
 * Professional Aerodynamic Carbon Fiber Monocoque:
 *  - Ergonomic Alcantara grips with molded thumb rests & tactile stitching
 *  - 14 precision CNC-machined aerospace pushbuttons with raised safety collars
 *  - 3 fluted titanium rotary encoders (STRAT, MFD, HPP) with laser-etched detents
 *  - Integrated 15-LED progressive RPM shift array with carbon glare eyebrow
 *  - Anti-glare AMOLED digital cockpit display with zero-render 60Hz DOM updates
 */

/* ── Precision SVG Pushbutton Component ────────────────────────────── */

function PushButton({
  x,
  y,
  label,
  color,
  textColor = "#FFFFFF",
  onClick,
  active = false,
  sublabel,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  textColor?: string;
  onClick?: () => void;
  active?: boolean;
  sublabel?: string;
}) {
  return (
    <g
      onClick={onClick}
      pointerEvents="auto"
      className={cn(
        "cursor-pointer transition-transform duration-75 hover:scale-105 active:scale-90 origin-center select-none",
        active && "animate-pulse"
      )}
    >
      {/* CNC Anodized Aluminum Outer Bezel Collar */}
      <circle cx={x} cy={y} r={12.5} fill="#090B10" stroke={active ? "#FACC15" : "#242A38"} strokeWidth="1.5" />
      <circle cx={x} cy={y} r={11.0} fill="#141722" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />

      {/* Recessed Button Cavity Depth Ring */}
      <circle cx={x} cy={y} r={9.5} fill="#06070A" />

      {/* Tactile Dome Button Cap with Specular Reflection */}
      <circle cx={x} cy={y} r={8.8} fill={color} />
      <circle cx={x} cy={y} r={8.8} fill="url(#btn-specular)" />

      {/* Active High-Energy Glow Halo */}
      {active && (
        <circle cx={x} cy={y} r={14} fill="none" stroke={color} strokeWidth="1.2" opacity="0.6" className="animate-ping origin-center" style={{ transformOrigin: `${x}px ${y}px` }} />
      )}

      {/* Laser-etched Actuator Label */}
      <text
        x={x}
        y={y + (sublabel ? 1.5 : 3.0)}
        textAnchor="middle"
        fontSize={label.length > 3 ? "5.8" : "6.8"}
        fontFamily="var(--font-mono), monospace"
        fontWeight="900"
        fill={textColor}
        style={{ letterSpacing: "0.04em" }}
      >
        {label}
      </text>

      {/* Optional Miniature Sub-Label */}
      {sublabel && (
        <text
          x={x}
          y={y + 6.2}
          textAnchor="middle"
          fontSize="4.2"
          fontFamily="var(--font-mono), monospace"
          fontWeight="700"
          fill="rgba(255,255,255,0.7)"
          style={{ letterSpacing: "0.02em" }}
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}

/* ── Machined Titanium Rotary Switch Component ─────────────────────── */

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
  const knurls = Array.from({ length: 24 }, (_, i) => i);

  return (
    <g
      onClick={onClick}
      pointerEvents="auto"
      className="cursor-pointer select-none group transition-transform active:scale-95 origin-center"
    >
      {/* Outer Fluted Knurling Teeth */}
      {knurls.map((i) => {
        const rad = (i / 24) * Math.PI * 2;
        return (
          <line
            key={`knurl-${i}`}
            x1={x + Math.cos(rad) * 16.5}
            y1={y + Math.sin(rad) * 16.5}
            x2={x + Math.cos(rad) * 18.5}
            y2={y + Math.sin(rad) * 18.5}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.9"
          />
        );
      })}

      {/* Outer Beveled Aluminum Body */}
      <circle cx={x} cy={y} r={17} fill="#0F1218" stroke="#2B3242" strokeWidth="1.2" />
      <circle cx={x} cy={y} r={14.5} fill="url(#rotary-titanium)" stroke="rgba(207,163,73,0.4)" strokeWidth="0.9" />

      {/* Calibrated Detent Ticks */}
      {ticks.map((i) => {
        const rad = (i / 10) * Math.PI * 1.5 - Math.PI * 0.75;
        const isMajor = i === 0 || i === 5 || i === 10;
        return (
          <line
            key={`tick-${i}`}
            x1={x + Math.cos(rad) * 10.5}
            y1={y + Math.sin(rad) * 10.5}
            x2={x + Math.cos(rad) * 13.5}
            y2={y + Math.sin(rad) * 13.5}
            stroke={isMajor ? "rgba(207,163,73,0.95)" : "rgba(255,255,255,0.3)"}
            strokeWidth={isMajor ? "1.4" : "0.8"}
          />
        );
      })}

      {/* Radial Pointer Notch Line */}
      {(() => {
        const rad = (dotAngle / 300) * Math.PI * 1.5 - Math.PI * 0.75;
        return (
          <g>
            <line
              x1={x + Math.cos(rad) * 4}
              y1={y + Math.sin(rad) * 4}
              x2={x + Math.cos(rad) * 9.5}
              y2={y + Math.sin(rad) * 9.5}
              stroke="#FACC15"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle
              cx={x + Math.cos(rad) * 9.5}
              cy={y + Math.sin(rad) * 9.5}
              r={2.2}
              fill="#FACC15"
              stroke="#000000"
              strokeWidth="0.6"
            />
          </g>
        );
      })()}

      {/* Center Titanium Hex-Socket Screw Cap */}
      <circle cx={x} cy={y} r={4.5} fill="#080A0D" stroke="#252A38" strokeWidth="1" />
      <polygon
        points={`${x},${y - 2} ${x + 1.8},${y - 1} ${x + 1.8},${y + 1} ${x},${y + 2} ${x - 1.8},${y + 1} ${x - 1.8},${y - 1}`}
        fill="#1A1E29"
      />

      {/* Rotary Legend */}
      <text
        x={x}
        y={y + 23}
        textAnchor="middle"
        fontSize="6.6"
        fontFamily="var(--font-mono), monospace"
        fontWeight="800"
        fill="rgba(207,163,73,0.92)"
        letterSpacing="0.6"
      >
        {label} {valueText !== undefined ? `· ${valueText}` : ""}
      </text>
    </g>
  );
}

/* ── Main Steering Wheel Component ─────────────────────────────────── */

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
  const brakeBiasPct = useUxStore((s) => s.brakeBiasPct);
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
  const bbTxtRef = useRef<HTMLSpanElement | null>(null);
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

      if (bbTxtRef.current) {
        bbTxtRef.current.textContent = `${brakeBiasPct.toFixed(1)}%`;
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
  }, [brakeBiasPct]);

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
          className="absolute inset-0 w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)] z-20 pointer-events-auto"
          aria-label="F1 Racing Steering Wheel"
        >
          <defs>
            {/* Matte Twill Carbon Fiber Monocoque Gradient */}
            <linearGradient id="carbon-monocoque" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#252834" />
              <stop offset="25%" stopColor="#181B24" />
              <stop offset="60%" stopColor="#0F1116" />
              <stop offset="100%" stopColor="#08090C" />
            </linearGradient>

            {/* Sculpted Alcantara Grip Gradient (Left) */}
            <linearGradient id="grip-alcantara-l" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#08090C" />
              <stop offset="35%" stopColor="#1E212B" />
              <stop offset="85%" stopColor="#12151D" />
              <stop offset="100%" stopColor="#0A0B0E" />
            </linearGradient>

            {/* Sculpted Alcantara Grip Gradient (Right) */}
            <linearGradient id="grip-alcantara-r" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#08090C" />
              <stop offset="35%" stopColor="#1E212B" />
              <stop offset="85%" stopColor="#12151D" />
              <stop offset="100%" stopColor="#0A0B0E" />
            </linearGradient>

            {/* Knurled Titanium Rotary Shader */}
            <radialGradient id="rotary-titanium" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#363C4E" />
              <stop offset="55%" stopColor="#181C25" />
              <stop offset="100%" stopColor="#0A0C10" />
            </radialGradient>

            {/* Button Tactile Specular Glint */}
            <radialGradient id="btn-specular" cx="35%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* LCD Screen Housing Inner Depth Shadow */}
            <filter id="lcd-housing-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.95" />
            </filter>
          </defs>

          {/* ── ERGONOMIC SCULPTED ALCANTARA GRIPS ───────────────────────── */}
          {/* Left Grip: Molded Thumb Pocket & Palm Contour */}
          <path
            d="M 96 68 C 64 58 24 78 16 124 C 6 182 8 252 24 290 C 38 322 76 324 92 302 L 96 68 Z"
            fill="url(#grip-alcantara-l)"
            stroke="rgba(207,163,73,0.38)"
            strokeWidth="1.2"
          />
          {/* Right Grip: Molded Thumb Pocket & Palm Contour */}
          <path
            d="M 424 68 C 456 58 496 78 504 124 C 514 182 512 252 496 290 C 482 322 444 324 428 302 L 424 68 Z"
            fill="url(#grip-alcantara-r)"
            stroke="rgba(207,163,73,0.38)"
            strokeWidth="1.2"
          />

          {/* Ergonomic Alcantara Grip Finger Ribs & Stitches */}
          {[92, 118, 144, 170, 196, 222, 248, 274].map((gy) => (
            <g key={gy}>
              <line x1={28} y1={gy} x2={86} y2={gy + 6} stroke="rgba(255,255,255,0.08)" strokeWidth="2.4" strokeLinecap="round" />
              <line x1={434} y1={gy + 6} x2={492} y2={gy} stroke="rgba(255,255,255,0.08)" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          ))}

          {/* ── CARBON FIBER CHASSIS MONOCOQUE ───────────────────────────── */}
          {/* Main Monocoque Body with Glare Visor Brow */}
          <path
            d="M 96 52 C 160 36 360 36 424 52 L 430 252 C 402 304 362 330 332 330 L 188 330 C 158 330 118 304 90 252 Z"
            fill="url(#carbon-monocoque)"
            stroke="rgba(207,163,73,0.5)"
            strokeWidth="1.4"
          />

          {/* Anti-Glare Visor Eyebrow Hood Above Shift Lights */}
          <path
            d="M 126 50 C 190 38 330 38 394 50 L 398 56 C 330 46 190 46 122 56 Z"
            fill="#090B10"
            stroke="rgba(207,163,73,0.3)"
            strokeWidth="0.8"
          />

          {/* Shift Light Recessed Channel Pocket */}
          <rect
            x="136"
            y="56"
            width="248"
            height="22"
            rx="4"
            fill="#050608"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* ── LCD SCREEN MACHINED BEZEL HOUSING ────────────────────────── */}
          <rect
            x="136"
            y="78"
            width="248"
            height="154"
            rx="7"
            fill="#030406"
            stroke="rgba(207,163,73,0.55)"
            strokeWidth="1.4"
            filter="url(#lcd-housing-shadow)"
          />

          {/* 4 Corner Precision Hex Torx Fasteners */}
          {[
            [142, 84],
            [378, 84],
            [142, 226],
            [378, 226],
          ].map(([fx, fy], idx) => (
            <g key={idx}>
              <circle cx={fx} cy={fy} r={2.2} fill="#141822" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
              <circle cx={fx} cy={fy} r={0.9} fill="#090B10" />
            </g>
          ))}

          {/* ── AUTHENTIC PIT WALL REMINDER TAPE STICKER ─────────────────── */}
          <rect
            x="175"
            y="238"
            width="170"
            height="13"
            rx="2"
            fill="rgba(235,232,224,0.94)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="0.5"
          />
          <text
            x="260"
            y="247.5"
            textAnchor="middle"
            fontSize="6.5"
            fontFamily="var(--font-mono), monospace"
            fontWeight="900"
            fill="#111827"
            letterSpacing="0.8"
          >
            STRAT {stratMode} = RACE · BB {brakeBiasPct.toFixed(1)}% · FLAP → MFD
          </text>

          {/* ── TACTILE PUSHBUTTONS — LEFT CONTROL WING ───────────────────── */}
          {/* DRS Trigger Button (Upper Horn) */}
          <PushButton
            x={108}
            y={80}
            label="DRS"
            sublabel="AERO"
            color={drs ? "#10B981" : "#0F382A"}
            textColor={drs ? "#000000" : "#34D399"}
            active={drs}
            onClick={() => {
              toggleDrs();
            }}
          />

          {/* RAD (Radio Check) Button */}
          <PushButton
            x={108}
            y={116}
            label="RAD"
            color="#475569"
            textColor="#FFFFFF"
            onClick={() => triggerRadio()}
          />

          {/* Guarded Neutral (N) Button */}
          <PushButton
            x={108}
            y={152}
            label="N"
            color="#EAB308"
            textColor="#000000"
            onClick={() => {
              soundFx.playButtonClick();
              setGear(0);
            }}
          />

          {/* Brake Bias Fast Toggles (BB- / BB+) */}
          <PushButton
            x={96}
            y={190}
            label="BB−"
            color="#DC2626"
            textColor="#FFFFFF"
            onClick={() => adjustBrakeBias(-0.5)}
          />
          <PushButton
            x={122}
            y={190}
            label="BB+"
            color="#16A34A"
            textColor="#FFFFFF"
            onClick={() => adjustBrakeBias(0.5)}
          />

          {/* Fine Tuning Detents (+10 / +1) */}
          <PushButton
            x={96}
            y={226}
            label="+10"
            color="#1A1E28"
            textColor="#E2E8F0"
            onClick={() => adjustBrakeBias(1.0)}
          />
          <PushButton
            x={122}
            y={226}
            label="+1"
            color="#1A1E28"
            textColor="#E2E8F0"
            onClick={() => adjustBrakeBias(0.1)}
          />

          {/* ── TACTILE PUSHBUTTONS — RIGHT CONTROL WING ──────────────────── */}
          {/* OT (Overtake Boost) Button (Upper Horn) */}
          <PushButton
            x={412}
            y={80}
            label="OT"
            sublabel="PUSH"
            color={overtakeActive ? "#F97316" : "#4A200B"}
            textColor={overtakeActive ? "#000000" : "#FB923C"}
            active={overtakeActive}
            onClick={() => toggleOvertake()}
          />

          {/* PC (Pit Confirm) Button */}
          <PushButton
            x={412}
            y={116}
            label="PC"
            color="#CBD5E1"
            textColor="#0F172A"
            onClick={() => {
              triggerRadio("PIT CONFIRMED: Standing by for box this lap.");
            }}
          />

          {/* PL (Pit Limiter) Button */}
          <PushButton
            x={412}
            y={152}
            label="PL"
            color="#DC2626"
            textColor="#FFFFFF"
            active={pitLimiterActive}
            onClick={() => togglePitLimiter()}
          />

          {/* DRK (Hydration Drink) Button */}
          <PushButton
            x={398}
            y={190}
            label="DRK"
            color="#2563EB"
            textColor="#FFFFFF"
            onClick={() => {
              triggerRadio("DRINK PUMP: 50ml isotonic hydration delivered.");
            }}
          />

          {/* MARK (Telemetry Marker) Button */}
          <PushButton
            x={424}
            y={190}
            label="MARK"
            color="#0891B2"
            textColor="#FFFFFF"
            onClick={() => {
              triggerRadio("TELEMETRY MARKER: Event tagged for debrief.");
            }}
          />

          {/* WET (Wet Engine Map) Button */}
          <PushButton
            x={398}
            y={226}
            label="WET"
            color="#3730A3"
            textColor="#A5B4FC"
            onClick={() => {
              triggerRadio("WET MAP: Intermediate throttle ramp configured.");
            }}
          />

          {/* ENG (Engine Map Cycle) Button */}
          <PushButton
            x={424}
            y={226}
            label="ENG"
            color="#B45309"
            textColor="#FEF3C7"
            onClick={() => cycleStrat()}
          />

          {/* ── MACHINED TITANIUM ROTARIES (STRAT · MFD · HPP) ────────────── */}
          <RotarySwitch
            x={150}
            y={282}
            label="STRAT"
            dotAngle={stratAngle}
            valueText={stratMode}
            onClick={() => cycleStrat()}
          />
          <RotarySwitch
            x={260}
            y={284}
            label="MFD"
            dotAngle={mfdAngle}
            valueText={dduMode}
            onClick={() => cycleMfdMode()}
          />
          <RotarySwitch
            x={370}
            y={282}
            label="HPP"
            dotAngle={hppAngle}
            valueText={hppMode}
            onClick={() => cycleHpp()}
          />

          {/* Center Quick-Release Boss */}
          <circle cx={260} cy={326} r={7.5} fill="#0B0D12" stroke="rgba(207,163,73,0.4)" strokeWidth="1" />
          <circle cx={260} cy={326} r={3.5} fill="none" stroke="rgba(207,163,73,0.3)" strokeWidth="0.8" />
        </svg>

        {/* ══════════════════════════════════════════════════════════════════
            2. 15-LED RPM SHIFT LIGHT ARRAY (Recessed in Visor Channel)
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: "26.5%",
            top: "16.4%",
            width: "47.0%",
            height: "6.2%",
          }}
        >
          <ShiftLights fill />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. INTEGRATED HIGH-CONTRAST AMOLED COCKPIT DISPLAY
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="absolute z-30 rounded-md overflow-hidden select-none pointer-events-auto"
          style={{
            left: "26.5%",
            top: "22.7%",
            width: "47.0%",
            height: "43.7%",
            background: "linear-gradient(180deg, #0C0E13 0%, #060709 100%)",
            border: isBooting ? "1px solid rgba(207,163,73,0.75)" : "1px solid rgba(120,140,180,0.25)",
            boxShadow: isBooting
              ? "inset 0 0 28px rgba(207,163,73,0.6), 0 0 24px rgba(207,163,73,0.65)"
              : "inset 0 0 18px rgba(207,163,73,0.08), 0 0 14px rgba(0,0,0,0.85)",
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
                  <div className="text-[34px] font-black font-display tracking-widest text-white/90 drop-shadow-[0_0_12px_rgba(207,163,73,0.7)] animate-pulse leading-none">
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
            {/* ── TOP HEADER: Lap | Mode Indicator | Position | Brake Bias ─── */}
            <div className="flex items-center justify-between font-mono text-[9px] tabular-nums text-silver/80">
              <span>
                LAP <span ref={lapRef} className="text-white font-bold">1/56</span>
              </span>

              {/* Mode indicator (Clickable or key 1-4 toggleable) */}
              <button
                onClick={() => cycleMfdMode()}
                className="text-[8px] tracking-[0.14em] text-gold border border-gold/50 rounded px-1.5 py-px hover:bg-gold/15 transition-colors cursor-pointer font-bold"
                title="Click or press 1-4 to cycle display mode"
              >
                {dduMode} · PUSH
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">BB</span>
                <span ref={bbTxtRef} className="text-amber-400 font-bold">
                  {brakeBiasPct.toFixed(1)}%
                </span>
                <span className="text-white/20">|</span>
                <span>
                  POS <span ref={posRef} className="text-white font-bold">2/20</span>
                </span>
              </div>
            </div>

            {/* ── MIDDLE CLUSTER: SPEED | CENTRAL GEAR | LIVE DELTA ───────── */}
            {dduMode === "RACE" && (
              <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1 min-h-0 py-0.5">
                {/* Speed column */}
                <div className="text-left flex flex-col justify-center">
                  <div className="font-mono text-[7.5px] tracking-[0.14em] text-silver/50">SPEED</div>
                  <div className="flex items-baseline gap-1">
                    <span
                      ref={speedRef}
                      className="font-display text-[44px] leading-none text-white font-black tabular-nums tracking-tighter"
                    >
                      0
                    </span>
                    <span className="font-mono text-[8.5px] text-silver/50 font-bold">KMH</span>
                  </div>
                  <div className="font-mono text-[7px] text-emerald-400 font-bold">
                    TRAP: 326 KMH
                  </div>
                </div>

                {/* Massive Central Gear with High-Contrast Ghost Segment */}
                <div className="relative w-[68px] h-[68px] flex items-center justify-center">
                  {/* Subtle 7-segment unlit backplate for authentic digital dash realism */}
                  <span className="absolute font-display text-[68px] leading-none font-black text-white/[0.04]">
                    8
                  </span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={gear}
                      initial={{ scale: 1.15, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.88, opacity: 0 }}
                      transition={{ duration: dur.ui, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute font-display text-[68px] leading-none font-black text-white"
                      style={{ textShadow: "0 0 20px rgba(207,163,73,0.45)" }}
                    >
                      {gear === 0 ? "N" : gear === -1 ? "R" : gear}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Delta Column */}
                <div className="text-right flex flex-col items-end justify-center">
                  <div className="font-mono text-[7px] tracking-[0.14em] text-silver/50 mb-0.5">DELTA // BEST</div>
                  <div className="w-[88px]">
                    <DeltaBar compact showSectors />
                  </div>
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
                  <span className="font-mono text-[7.5px] tracking-[0.12em] text-silver/50">
                    {era.energy.systemName} · 2.4MJ
                  </span>
                  <span ref={socTxtRef} className="font-mono text-[9px] text-signal-energy tabular-nums font-bold">
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
                  <span className="font-mono text-[7.5px] tracking-[0.12em] text-silver/50">
                    {era.fuelLabel} · +0.06 kg/l
                  </span>
                  <span ref={fuelTxtRef} className="font-mono text-[9px] text-gold tabular-nums font-bold">
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

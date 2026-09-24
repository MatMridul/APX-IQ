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
 * Widescreen FIA Formula 1 Steering Wheel Monocoque & High-Resolution DDU HUD
 *
 * Professional Motorsport Ergonomics (620×350 16:9 Aspect Ratio):
 *  - 25% wider monocoque geometry eliminating peripheral cockpit dead space
 *  - Dual vertical knurled thumbwheel encoders (DIFF IN / DIFF MID)
 *  - 3D chamfered twill carbon-fiber shift paddles (- Downshift / + Upshift)
 *  - Ergonomic sculpted Alcantara handgrips with thumb indentations & tactile ribbing
 *  - 14 precision CNC-machined aerospace pushbuttons with raised safety collars
 *  - 3 fluted titanium rotary encoders (STRAT, MFD, HPP) with engraved radial laser legends
 *  - High-resolution 310px anti-glare AMOLED digital cockpit display with zero-render 60Hz DOM updates
 *  - 15-LED progressive RPM shift array with generous bank separation & specular lenses
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
  radius = 13.5,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  textColor?: string;
  onClick?: () => void;
  active?: boolean;
  sublabel?: string;
  radius?: number;
}) {
  const capRadius = radius - 3.7;
  const fontSize = label.length > 3 ? (radius > 14 ? "6.8" : "6.2") : (radius > 14 ? "7.8" : "7.2");
  return (
    <g
      onClick={() => {
        soundFx.playButtonClick();
        onClick?.();
      }}
      pointerEvents="auto"
      className={cn(
        "cursor-pointer transition-transform duration-75 hover:scale-105 active:scale-90 origin-center select-none",
        active && "animate-pulse"
      )}
    >
      {/* CNC Anodized Aluminum Outer Bezel Collar */}
      <circle cx={x} cy={y} r={radius} fill="#090B10" stroke={active ? "#FACC15" : "#242A38"} strokeWidth="1.5" />
      <circle cx={x} cy={y} r={radius - 1.5} fill="#141722" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />

      {/* Recessed Button Cavity Depth Ring */}
      <circle cx={x} cy={y} r={radius - 3.0} fill="#06070A" />

      {/* Tactile Dome Button Cap with Specular Reflection */}
      <circle cx={x} cy={y} r={capRadius} fill={color} />
      <circle cx={x} cy={y} r={capRadius} fill="url(#btn-specular)" />

      {/* Active High-Energy Glow Halo */}
      {active && (
        <circle
          cx={x}
          cy={y}
          r={radius + 1.8}
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          opacity="0.75"
          className="animate-ping origin-center"
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}

      {/* Laser-etched Actuator Label */}
      <text
        x={x}
        y={y + (sublabel ? 1.5 : 3.0)}
        textAnchor="middle"
        fontSize={fontSize}
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
          fontSize="4.4"
          fontFamily="var(--font-mono), monospace"
          fontWeight="700"
          fill="rgba(255,255,255,0.75)"
          style={{ letterSpacing: "0.02em" }}
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}

/* ── Vertical Knurled Thumbwheel Component (F1 Differential Encoder) ─ */

function ThumbWheel({
  x,
  y,
  label,
  value,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  const ribs = [0, 4, 8, 12, 16, 20, 24, 28, 32];
  return (
    <g
      onClick={() => {
        soundFx.playRotaryClick();
        onClick?.();
      }}
      className="cursor-pointer select-none group transition-transform active:scale-95 origin-center"
      pointerEvents="auto"
    >
      {/* Outer Housing Slot */}
      <rect x={x - 5} y={y - 19} width={10} height={38} rx={3} fill="#080A0E" stroke="#252A38" strokeWidth="1" />
      {/* Cylinder Body */}
      <rect x={x - 4} y={y - 17} width={8} height={34} rx={2} fill="url(#thumbwheel-gradient)" />
      {/* Knurled Grip Ridges */}
      {ribs.map((ry) => (
        <line
          key={`rib-${ry}`}
          x1={x - 4}
          y1={y - 17 + ry}
          x2={x + 4}
          y2={y - 17 + ry}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.9"
        />
      ))}
      {/* Center Position Indicator Dot */}
      <circle cx={x} cy={y} r={1.6} fill="#FACC15" />
      {/* Label */}
      <text
        x={x}
        y={y + 26}
        textAnchor="middle"
        fontSize="5.2"
        fontFamily="var(--font-mono), monospace"
        fontWeight="800"
        fill="rgba(207,163,73,0.9)"
        letterSpacing="0.4"
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 32.5}
        textAnchor="middle"
        fontSize="5.2"
        fontFamily="var(--font-mono), monospace"
        fontWeight="900"
        fill="#FFFFFF"
      >
        {value}
      </text>
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
  options,
}: {
  x: number;
  y: number;
  label: string;
  dotAngle: number;
  valueText?: string | number;
  onClick?: () => void;
  options?: string[];
}) {
  const numSteps = options ? options.length : 11;
  const knurls = Array.from({ length: 24 }, (_, i) => i);

  return (
    <g
      onClick={() => {
        soundFx.playRotaryClick();
        onClick?.();
      }}
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

      {/* Calibrated Detent Ticks & Engraved Legends */}
      {Array.from({ length: numSteps }, (_, i) => {
        const rad = (i / Math.max(1, numSteps - 1)) * Math.PI * 1.5 - Math.PI * 0.75;
        const isSelected = options && String(options[i]) === String(valueText);
        return (
          <g key={`detent-${i}`}>
            <line
              x1={x + Math.cos(rad) * 10.5}
              y1={y + Math.sin(rad) * 10.5}
              x2={x + Math.cos(rad) * 13.5}
              y2={y + Math.sin(rad) * 13.5}
              stroke={isSelected ? "#FACC15" : "rgba(255,255,255,0.35)"}
              strokeWidth={isSelected ? "1.6" : "0.8"}
            />
            {options && (
              <text
                x={x + Math.cos(rad) * 19.5}
                y={y + Math.sin(rad) * 19.5 + 2}
                textAnchor="middle"
                fontSize="4.2"
                fontFamily="var(--font-mono), monospace"
                fontWeight={isSelected ? "900" : "600"}
                fill={isSelected ? "#FACC15" : "rgba(255,255,255,0.45)"}
              >
                {options.length <= 8 ? options[i] : i % 2 === 0 ? options[i] : ""}
              </text>
            )}
          </g>
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
              strokeWidth="2.0"
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
        y={y + 24}
        textAnchor="middle"
        fontSize="6.6"
        fontFamily="var(--font-mono), monospace"
        fontWeight="800"
        fill="rgba(207,163,73,0.95)"
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
  const [diffEntry, setDiffEntry] = useState(58);
  const [diffMid, setDiffMid] = useState(52);
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
  const bbTxtRef = useRef<HTMLSpanElement | null>(null);
  const qualyS1Ref = useRef<HTMLSpanElement | null>(null);
  const qualyS2Ref = useRef<HTMLSpanElement | null>(null);
  const qualyS3Ref = useRef<HTMLSpanElement | null>(null);
  const qualyDeltaRef = useRef<HTMLSpanElement | null>(null);
  const edgeBloomRef = useRef<HTMLDivElement | null>(null);

  // Diagnostic Ignition Self-Test Boot Sequence
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

      // RPM Limiter Strobe & Cockpit Edge Bloom
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
    <div className="w-full h-full flex items-center justify-center p-0.5 select-none">
      <div
        className="relative flex items-center justify-center"
        data-testid="wheel-cluster"
        style={{ aspectRatio: "720/350", width: "100%", height: "100%", maxWidth: "100%" }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            1. AUTHENTIC WIDESCREEN F1 STEERING WHEEL MONOCOQUE (SVG CHASSIS)
        ══════════════════════════════════════════════════════════════════ */}
        <svg
          viewBox="0 0 720 350"
          className="absolute inset-0 w-full h-full drop-shadow-[0_22px_45px_rgba(0,0,0,0.95)] z-20 pointer-events-auto"
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

            {/* Matte Twill Carbon Paddle Gradient */}
            <linearGradient id="paddle-carbon" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2A2F3D" />
              <stop offset="40%" stopColor="#141822" />
              <stop offset="100%" stopColor="#080A0E" />
            </linearGradient>

            {/* Thumbwheel Metallic Gradient */}
            <linearGradient id="thumbwheel-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1E2330" />
              <stop offset="50%" stopColor="#4B5568" />
              <stop offset="100%" stopColor="#0D1117" />
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

          {/* ── 3D REAR SHIFT PADDLES (Carbon Fiber Chamfered Actuators) ── */}
          {/* Left Downshift Paddle (-) */}
          <g
            onClick={() => {
              soundFx.playGearShift(false);
              setGear((g) => Math.max(1, g - 1));
            }}
            className="cursor-pointer group select-none"
            pointerEvents="auto"
          >
            <path
              d="M 38 72 C 8 96 2 152 8 196 C 10 210 22 218 36 212 L 64 200 L 68 82 Z"
              fill="url(#paddle-carbon)"
              stroke="rgba(207,163,73,0.5)"
              strokeWidth="1.4"
              className="group-hover:brightness-125 transition-all"
            />
            <path
              d="M 34 78 C 12 100 8 150 12 190 C 14 200 22 206 32 202 L 52 194"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1.2"
            />
            <line x1={12} y1={130} x2={28} y2={130} stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" />
            <line x1={12} y1={145} x2={28} y2={145} stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" />
            <line x1={12} y1={160} x2={28} y2={160} stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" />
            <text
              x={19}
              y={108}
              textAnchor="middle"
              fontSize="14"
              fontFamily="var(--font-mono), monospace"
              fontWeight="900"
              fill="#FFFFFF"
              style={{ textShadow: "0 0 8px rgba(0,0,0,0.8)" }}
            >
              −
            </text>
          </g>

          {/* Right Upshift Paddle (+) */}
          <g
            onClick={() => {
              soundFx.playGearShift(true);
              setGear((g) => Math.min(8, g + 1));
            }}
            className="cursor-pointer group select-none"
            pointerEvents="auto"
          >
            <path
              d="M 682 72 C 712 96 718 152 712 196 C 710 210 698 218 684 212 L 656 200 L 652 82 Z"
              fill="url(#paddle-carbon)"
              stroke="rgba(207,163,73,0.5)"
              strokeWidth="1.4"
              className="group-hover:brightness-125 transition-all"
            />
            <path
              d="M 686 78 C 708 100 712 150 708 190 C 706 200 698 206 688 202 L 668 194"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1.2"
            />
            <line x1={692} y1={130} x2={708} y2={130} stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" />
            <line x1={692} y1={145} x2={708} y2={145} stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" />
            <line x1={692} y1={160} x2={708} y2={160} stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" />
            <text
              x={701}
              y={108}
              textAnchor="middle"
              fontSize="14"
              fontFamily="var(--font-mono), monospace"
              fontWeight="900"
              fill="#FFFFFF"
              style={{ textShadow: "0 0 8px rgba(0,0,0,0.8)" }}
            >
              +
            </text>
          </g>

          {/* ── ERGONOMIC SCULPTED ALCANTARA GRIPS ───────────────────────── */}
          {/* Left Grip: Molded Thumb Pocket & Ergonomic Waist */}
          <path
            d="M 96 68 C 68 56 38 70 30 104 C 24 132 36 166 38 192 C 40 224 26 262 34 288 C 42 318 76 322 92 302 L 96 68 Z"
            fill="url(#grip-alcantara-l)"
            stroke="rgba(207,163,73,0.42)"
            strokeWidth="1.3"
          />
          {/* Right Grip: Molded Thumb Pocket & Ergonomic Waist */}
          <path
            d="M 624 68 C 652 56 682 70 690 104 C 696 132 684 166 682 192 C 680 224 694 262 686 288 C 678 318 644 322 628 302 L 624 68 Z"
            fill="url(#grip-alcantara-r)"
            stroke="rgba(207,163,73,0.42)"
            strokeWidth="1.3"
          />

          {/* Ergonomic Alcantara Grip Finger Ribs & Stitches */}
          {[96, 122, 148, 174, 200, 226, 252, 276].map((gy) => (
            <g key={gy}>
              <line x1={36} y1={gy} x2={90} y2={gy + 5} stroke="rgba(255,255,255,0.08)" strokeWidth="2.2" strokeLinecap="round" />
              <line x1={630} y1={gy + 5} x2={684} y2={gy} stroke="rgba(255,255,255,0.08)" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          ))}

          {/* ── CARBON FIBER CHASSIS MONOCOQUE ───────────────────────────── */}
          {/* Main Monocoque Body with Glare Visor Brow */}
          <path
            d="M 96 52 C 200 34 520 34 624 52 L 632 252 C 586 306 508 332 470 332 L 250 332 C 212 332 134 306 88 252 Z"
            fill="url(#carbon-monocoque)"
            stroke="rgba(207,163,73,0.5)"
            strokeWidth="1.4"
          />

          {/* Anti-Glare Visor Eyebrow Hood Above Shift Lights */}
          <path
            d="M 178 50 C 265 37 455 37 542 50 L 546 56 C 455 45 265 45 174 56 Z"
            fill="#090B10"
            stroke="rgba(207,163,73,0.3)"
            strokeWidth="0.8"
          />

          {/* Shift Light Recessed Channel Pocket (320px Wide) */}
          <rect
            x="200"
            y="54"
            width="320"
            height="22"
            rx="4"
            fill="#050608"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* ── LCD SCREEN MACHINED BEZEL HOUSING (320x156) ─────────────── */}
          <rect
            x="200"
            y="78"
            width="320"
            height="156"
            rx="7"
            fill="#030406"
            stroke="rgba(207,163,73,0.55)"
            strokeWidth="1.4"
            filter="url(#lcd-housing-shadow)"
          />

          {/* 4 Corner Precision Hex Torx Fasteners */}
          {[
            [207, 85],
            [513, 85],
            [207, 227],
            [513, 227],
          ].map(([fx, fy], idx) => (
            <g key={idx}>
              <circle cx={fx} cy={fy} r={2.2} fill="#141822" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
              <circle cx={fx} cy={fy} r={0.9} fill="#090B10" />
            </g>
          ))}

          {/* ── AUTHENTIC PIT WALL REMINDER TAPE STICKER ─────────────────── */}
          <rect
            x="245"
            y="240"
            width="230"
            height="13"
            rx="2"
            fill="rgba(235,232,224,0.94)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="0.5"
          />
          <text
            x="360"
            y="249.5"
            textAnchor="middle"
            fontSize="6.5"
            fontFamily="var(--font-mono), monospace"
            fontWeight="900"
            fill="#111827"
            letterSpacing="0.8"
          >
            STRAT {stratMode} - {dduMode} · BB {brakeBiasPct.toFixed(1)}% · FLAP +2
          </text>

          {/* ── TACTILE PUSHBUTTONS — LEFT CONTROL WING ───────────────────── */}
          {/* DRS Trigger Button (Upper Horn) */}
          <PushButton
            x={138}
            y={80}
            label="DRS"
            sublabel="AERO"
            color={drs ? "#10B981" : "#0F382A"}
            textColor={drs ? "#000000" : "#34D399"}
            active={drs}
            radius={14.5}
            onClick={() => {
              toggleDrs();
            }}
          />

          {/* RAD (Radio Check) Button */}
          <PushButton
            x={120}
            y={118}
            label="RAD"
            color="#475569"
            textColor="#FFFFFF"
            radius={13.5}
            onClick={() => triggerRadio()}
          />

          {/* Guarded Neutral (N) Button */}
          <PushButton
            x={152}
            y={118}
            label="N"
            color="#EAB308"
            textColor="#000000"
            radius={13.5}
            onClick={() => {
              setGear(0);
            }}
          />

          {/* Vertical Differential Entry Thumbwheel */}
          <ThumbWheel
            x={184}
            y={186}
            label="DIFF IN"
            value={`${diffEntry}%`}
            onClick={() => {
              setDiffEntry((prev) => (prev >= 68 ? 50 : prev + 2));
            }}
          />

          {/* Brake Bias Fast Toggles (BB- / BB+) */}
          <PushButton
            x={120}
            y={166}
            label="BB−"
            color="#DC2626"
            textColor="#FFFFFF"
            radius={13.5}
            onClick={() => adjustBrakeBias(-0.5)}
          />
          <PushButton
            x={152}
            y={166}
            label="BB+"
            color="#16A34A"
            textColor="#FFFFFF"
            radius={13.5}
            onClick={() => adjustBrakeBias(0.5)}
          />

          {/* Fine Tuning Detents (+10 / +1) */}
          <PushButton
            x={120}
            y={212}
            label="+10"
            color="#1A1E28"
            textColor="#E2E8F0"
            radius={13.5}
            onClick={() => adjustBrakeBias(1.0)}
          />
          <PushButton
            x={152}
            y={212}
            label="+1"
            color="#1A1E28"
            textColor="#E2E8F0"
            radius={13.5}
            onClick={() => adjustBrakeBias(0.1)}
          />

          {/* ── TACTILE PUSHBUTTONS — RIGHT CONTROL WING ──────────────────── */}
          {/* OT (Overtake Boost) Button (Upper Horn) */}
          <PushButton
            x={582}
            y={80}
            label="OT"
            sublabel="PUSH"
            color={overtakeActive ? "#F97316" : "#4A200B"}
            textColor={overtakeActive ? "#000000" : "#FB923C"}
            active={overtakeActive}
            radius={14.5}
            onClick={() => toggleOvertake()}
          />

          {/* PC (Pit Confirm) Button */}
          <PushButton
            x={568}
            y={118}
            label="PC"
            color="#CBD5E1"
            textColor="#0F172A"
            radius={13.5}
            onClick={() => {
              triggerRadio("PIT CONFIRMED: Standing by for box this lap.");
            }}
          />

          {/* PL (Pit Limiter) Button */}
          <PushButton
            x={600}
            y={118}
            label="PL"
            color="#DC2626"
            textColor="#FFFFFF"
            active={pitLimiterActive}
            radius={13.5}
            onClick={() => togglePitLimiter()}
          />

          {/* Vertical Differential Mid-Corner Thumbwheel */}
          <ThumbWheel
            x={536}
            y={186}
            label="DIFF MID"
            value={`${diffMid}%`}
            onClick={() => {
              setDiffMid((prev) => (prev >= 60 ? 46 : prev + 2));
            }}
          />

          {/* DRK (Hydration Drink) Button */}
          <PushButton
            x={568}
            y={166}
            label="DRK"
            color="#2563EB"
            textColor="#FFFFFF"
            radius={13.5}
            onClick={() => triggerRadio("DRINK SYSTEM: 250ml electrolyte dispensed.")}
          />

          {/* MARK (Telemetry Bookmark) Button */}
          <PushButton
            x={600}
            y={166}
            label="MARK"
            color="#0D9488"
            textColor="#FFFFFF"
            radius={13.5}
            onClick={() => triggerRadio("MARKER: Telemetry anomaly flagged for telemetry team.")}
          />

          {/* WET (Rain Weather Map) Button */}
          <PushButton
            x={568}
            y={212}
            label="WET"
            color="#4F46E5"
            textColor="#FFFFFF"
            radius={13.5}
            onClick={() => triggerRadio("MAP WET: Intermediate torque map active.")}
          />

          {/* ENG (Engine Map) Button */}
          <PushButton
            x={600}
            y={212}
            label="ENG"
            color="#D97706"
            textColor="#FFFFFF"
            radius={13.5}
            onClick={() => cycleStrat()}
          />

          {/* ── LOWER DECK TITANIUM ROTARIES (STRAT, MFD, HPP) ─────────────── */}
          <RotarySwitch
            x={230}
            y={286}
            label="STRAT"
            dotAngle={stratAngle}
            valueText={stratMode}
            options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]}
            onClick={() => cycleStrat()}
          />
          <RotarySwitch
            x={360}
            y={286}
            label="MFD"
            dotAngle={mfdAngle}
            valueText={dduMode}
            options={["RACE", "QUAL", "TYRE", "CHAS"]}
            onClick={() => cycleMfdMode()}
          />
          <RotarySwitch
            x={490}
            y={286}
            label="HPP"
            dotAngle={hppAngle}
            valueText={hppMode}
            options={["1", "2", "3", "4", "5", "6", "7", "8"]}
            onClick={() => cycleHpp()}
          />

          {/* Center Quick-Release Boss with PCD Bolt Pattern */}
          <circle cx={360} cy={330} r={8.0} fill="#0B0D12" stroke="rgba(207,163,73,0.5)" strokeWidth="1.2" />
          <circle cx={360} cy={330} r={4.0} fill="#141822" stroke="rgba(207,163,73,0.3)" strokeWidth="0.8" />
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <circle
                key={`boss-bolt-${deg}`}
                cx={360 + Math.cos(rad) * 6.2}
                cy={330 + Math.sin(rad) * 6.2}
                r={0.7}
                fill="#FACC15"
              />
            );
          })}
        </svg>

        {/* ══════════════════════════════════════════════════════════════════
            2. 15-LED RPM SHIFT LIGHT ARRAY (Recessed in Visor Channel)
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: "27.78%",
            top: "15.4%",
            width: "44.44%",
            height: "6.3%",
          }}
        >
          <ShiftLights fill />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. WIDESCREEN HIGH-CONTRAST AMOLED COCKPIT DISPLAY (320x156)
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="absolute z-30 rounded-md overflow-hidden select-none pointer-events-auto"
          style={{
            left: "27.78%",
            top: "22.3%",
            width: "44.44%",
            height: "44.6%",
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

          {/* RPM Limiter Peripheral Strobe & Cockpit Edge Bloom */}
          <div
            ref={edgeBloomRef}
            className="absolute inset-0 pointer-events-none rounded-md z-40 transition-opacity duration-75"
            style={{ opacity: 0 }}
          />

          {/* Pit Limiter Active Alert Overlay */}
          {pitLimiterActive && (
            <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-2 font-mono">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 text-black font-black text-[10px] tracking-widest animate-pulse">
                ⚠ PIT LIMITER ACTIVE // 60 KM/H
              </div>
              <div className="mt-1 text-white font-display text-[32px] font-black">
                60 <span className="text-[11px] font-mono text-silver/60">KM/H</span>
              </div>
              <div className="text-[7.5px] text-amber-300 font-bold mt-0.5 tracking-wider">
                SPEED RESTRICTED · HOLD GEAR 1 OR 2
              </div>
            </div>
          )}

          {/* AMOLED Diagnostic Ignition Self-Test Boot Sequence */}
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
                  <span className="text-gold font-bold">DDU 4.0</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════════════════════════════════════════════════════════════════
              ACTIVE AMOLED DISPLAY CONTENTS (Expanded Real Estate)
          ════════════════════════════════════════════════════════════════ */}
          <div className="relative w-full h-full flex flex-col justify-between p-2 font-sans z-10">
            {/* ── TOP STATUS BANNER ─────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-0.5 font-mono text-[8px]">
              {/* Lap indicator */}
              <div className="flex items-center gap-1">
                <span className="text-silver/50 tracking-wider">LAP</span>
                <span ref={lapRef} className="text-white font-bold tabular-nums">
                  1/56
                </span>
              </div>

              {/* Mode capsule */}
              <div className="flex items-center gap-1.5 px-2 py-0.2 rounded bg-black/60 border border-gold/30 text-gold text-[7px] tracking-widest font-black uppercase">
                <span>{dduMode}</span>
                <span className="text-silver/40">·</span>
                <span className="text-emerald-400">PUSH</span>
              </div>

              {/* Live Brake Bias & Position */}
              <div className="flex items-center gap-2">
                <span className="text-silver/50">
                  BB <span ref={bbTxtRef} className="text-amber-400 font-bold">{brakeBiasPct.toFixed(1)}%</span>
                </span>
                <span className="text-silver/40">|</span>
                <span className="text-silver/50">
                  POS <span ref={posRef} className="text-white font-bold">2/20</span>
                </span>
              </div>
            </div>

            {/* ── MODE 1: RACE COCKPIT TELEMETRY ────────────────────────── */}
            {dduMode === "RACE" && (
              <div className="flex-1 flex flex-col justify-between py-1 min-h-0">
                {/* Speed | Central Gear | Delta */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  {/* Speed column */}
                  <div className="text-left flex flex-col justify-center">
                    <div className="font-mono text-[7.5px] tracking-[0.14em] text-silver/50">SPEED</div>
                    <div className="flex items-baseline gap-1">
                      <span
                        ref={speedRef}
                        className="font-display text-[46px] leading-none text-white font-black tabular-nums tracking-tighter"
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
                  <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                    {/* Subtle 7-segment unlit backplate for authentic digital dash realism */}
                    <span className="absolute font-display text-[72px] leading-none font-black text-white/[0.04]">
                      8
                    </span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={gear}
                        initial={{ scale: 1.15, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.88, opacity: 0 }}
                        transition={{ duration: dur.ui, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute font-display text-[72px] leading-none font-black text-white"
                        style={{ textShadow: "0 0 20px rgba(207,163,73,0.45)" }}
                      >
                        {gear === 0 ? "N" : gear === -1 ? "R" : gear}
                      </motion.span>
                    </AnimatePresence>
                  </div>

                  {/* Delta Column */}
                  <div className="text-right flex flex-col items-end justify-center">
                    <div className="font-mono text-[7.5px] tracking-[0.14em] text-silver/50 mb-0.5">DELTA // BEST</div>
                    <div className="w-[100px]">
                      <DeltaBar compact showSectors />
                    </div>
                  </div>
                </div>

                {/* Micro Tyre Status Matrix (4-Corner Real-Time Thermals) */}
                <div className="flex items-center justify-between px-2 py-0.5 rounded bg-black/40 border border-white/[0.06] font-mono text-[7px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-silver/40 font-bold">F:</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 font-bold">FL 102°C</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 font-bold">FR 104°C</span>
                  </div>
                  <div className="text-silver/30">|</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-silver/40 font-bold">R:</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 font-bold">RL 99°C</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 font-bold">RR 101°C</span>
                  </div>
                  <div className="text-silver/30">|</div>
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <span>DIFF:</span>
                    <span>{diffEntry}% IN / {diffMid}% MID</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODE 2: QUALY / HOTLAP TARGET MATRIX ───────────────────── */}
            {dduMode === "QUALY" && (
              <div className="flex-1 flex flex-col justify-around py-0.5 font-mono text-[8px]">
                <div className="flex items-center justify-between text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="uppercase text-purple-400 font-black tracking-wider text-[8.5px]">
                      HOTLAP QUALY // PURPLE PACE
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-silver/50">TGT:</span>
                    <span className="text-gold font-bold">1:11.890</span>
                    <span ref={qualyDeltaRef} className="font-bold text-emerald-400 ml-1">
                      -0.000s
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-1 rounded bg-black/60 border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[7.5px] text-purple-400 font-bold">S1</span>
                      <span className="text-[7px] text-purple-300 font-bold">-0.042</span>
                    </div>
                    <span ref={qualyS1Ref} className="font-bold text-[10px] text-white tabular-nums block mt-0.5">
                      18.274s
                    </span>
                  </div>
                  <div className="p-1 rounded bg-black/60 border border-emerald-500/50 shadow-[0_0_8px_rgba(34,197,94,0.15)]">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[7.5px] text-emerald-400 font-bold">S2</span>
                      <span className="text-[7px] text-emerald-300 font-bold">-0.021</span>
                    </div>
                    <span ref={qualyS2Ref} className="font-bold text-[10px] text-white tabular-nums block mt-0.5">
                      32.398s
                    </span>
                  </div>
                  <div className="p-1 rounded bg-black/60 border border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.15)]">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[7.5px] text-yellow-400 font-bold">S3</span>
                      <span className="text-[7px] text-yellow-300 font-bold">+0.018</span>
                    </div>
                    <span ref={qualyS3Ref} className="font-bold text-[10px] text-white tabular-nums block mt-0.5">
                      21.190s
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1 text-[7.5px] text-silver/60">
                  <span>MIN APEX: T3 142 KM/H (+4)</span>
                  <span className="text-emerald-400 font-bold">THEORETICAL: 1:11.862</span>
                </div>
              </div>
            )}

            {/* ── MODE 3: TYRES & THERMAL DEGRADATION ─────────────────────── */}
            {dduMode === "TYRES" && (
              <div className="flex-1 flex flex-col justify-between py-0.5 font-mono text-[7.5px]">
                <div className="flex items-center justify-between pb-0.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-red-600 text-white font-black text-[7px]">C4 SOFT</span>
                    <span className="text-silver/60">AGE: 12 LAPS</span>
                  </div>
                  <span className="text-amber-400 font-bold">PIT WINDOW: LAP 18-21</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 my-auto">
                  {[
                    { corner: "FL", wear: 12, surf: 102, carc: 98, psi: 23.4 },
                    { corner: "FR", wear: 14, surf: 104, carc: 100, psi: 23.6 },
                    { corner: "RL", wear: 9, surf: 99, carc: 96, psi: 21.2 },
                    { corner: "RR", wear: 11, surf: 101, carc: 97, psi: 21.4 },
                  ].map((t) => (
                    <div key={t.corner} className="p-1 rounded bg-black/60 border border-white/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-gold font-bold">{t.corner} · {t.wear}% WEAR</span>
                        <span className="text-silver/70 font-bold text-[7px]">{t.psi} PSI</span>
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] mt-0.5">
                        <span className="text-emerald-400 font-bold">SURF {t.surf}°C</span>
                        <span className="text-emerald-400/80">CARC {t.carc}°C</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center text-[7px] text-emerald-400 font-bold">
                  THERMAL STABILITY: OPTIMAL // GRIP COEFFICIENT 1.02
                </div>
              </div>
            )}

            {/* ── MODE 4: CHASSIS & POWERTRAIN DIAGNOSTICS ───────────────── */}
            {dduMode === "CHASSIS" && (
              <div className="flex-1 flex flex-col justify-between py-0.5 font-mono text-[7.5px]">
                <div className="flex items-center justify-between pb-0.5 border-b border-white/[0.06]">
                  <span className="text-cyan-400 font-black">PU HYBRID TELEMETRY</span>
                  <span className="text-silver/50">MGU-K: 120 kW (MAX)</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 my-auto">
                  <div className="p-1 rounded bg-black/60 border border-white/10 flex flex-col justify-between">
                    <div className="text-silver/50 text-[6.5px] font-bold">COOLING THERMALS</div>
                    <div className="flex justify-between items-center mt-1">
                      <span>WATER: <b className="text-emerald-400 font-bold">98°C</b></span>
                      <span>OIL: <b className="text-emerald-400 font-bold">112°C</b></span>
                    </div>
                  </div>

                  <div className="p-1 rounded bg-black/60 border border-white/10 flex flex-col justify-between">
                    <div className="text-silver/50 text-[6.5px] font-bold">CARBON BRAKE ROTORS</div>
                    <div className="flex justify-between items-center mt-1 text-[7px]">
                      <span>FRONT: <b className="text-amber-400 font-bold">680°C</b></span>
                      <span>REAR: <b className="text-emerald-400 font-bold">590°C</b></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[7px] text-silver/60">
                  <span>MGU-H HARVEST: ACTIVE</span>
                  <span>DIFF ENTRY: {diffEntry}%</span>
                  <span>DIFF EXIT: {diffMid}%</span>
                </div>
              </div>
            )}

            {/* ── BOTTOM STATUS BAR (ERS & FUEL TELEMETRY) ──────────────── */}
            <div className="border-t border-white/[0.08] pt-1 flex items-center justify-between font-mono text-[7.5px] text-silver/60">
              {/* ERS Storage Bar */}
              <div className="flex items-center gap-1.5 w-[46%]">
                <span className="tracking-wider">ERS</span>
                <span className="text-[7px] text-silver/40">2.4MJ</span>
                <div className="flex-1 h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden relative">
                  <div
                    ref={socBarRef}
                    className="h-full rounded-full bg-gradient-to-r from-silver/70 to-white transition-all duration-75"
                    style={{ width: "60%" }}
                  />
                </div>
                <span ref={socTxtRef} className="font-bold text-white tabular-nums text-[7.5px]">
                  60%
                </span>
              </div>

              {/* Fuel Reserve & Burn Rate */}
              <div className="flex items-center gap-1.5 w-[48%] justify-end">
                <span className="tracking-wider">FUEL</span>
                <span className="text-[7px] text-emerald-400 font-bold">+0.06 kg/l</span>
                <div className="w-20 h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden relative">
                  <div
                    ref={fuelBarRef}
                    className="h-full rounded-full bg-gold transition-all duration-100"
                    style={{ width: "98%" }}
                  />
                </div>
                <span ref={fuelTxtRef} className="font-bold text-gold tabular-nums text-[7.5px]">
                  108.0kg
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

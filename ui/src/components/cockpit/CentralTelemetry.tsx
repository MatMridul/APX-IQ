"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShiftLights } from "./ShiftLights";
import { DeltaBar } from "./DeltaBar";
import { MicroLabel, SimBadge } from "./primitives";
import { scheduler } from "@/lib/cockpit/scheduler";
import { demoFrame } from "@/lib/cockpit/demo";
import { useDur } from "@/lib/cockpit/preferences";
import { ACTIVE_ERA } from "@/lib/cockpit/era";

/**
 * The wheel cluster — an F1 steering wheel face, built from the real
 * anatomy (Mercedes/Ferrari/VCARB wheel studies): carbon shell with two
 * sculpted grips, 15 LEDs arcing over the LCD, color-coded buttons
 * (N · RAD · +10/+1 · OT · PC · PL · DRINK · BB±), knurled rotaries
 * (STRAT · MFD · HPP), reminder sticker, DRS button on the upper-left
 * edge, quick-release boss.
 *
 * The LCD inset carries the LIVE data (era-labeled): gear huge center,
 * speed + delta flanking, lap/pos top, mode box, ERS SoC + fuel bars.
 * Continuous values are ref-written on the shared scheduler (Domain A);
 * gear/DRS are discrete state (Domain B).
 */

/* ── static anatomy data (labels/colors per real wheels) ─────────── */

const BUTTONS_LEFT = [
  { label: "N", color: "#eab308", y: 118 },
  { label: "RAD", color: "#5b6470", y: 152 },
  { label: "+10", color: "#1f2228", y: 186 },
  { label: "+1", color: "#1f2228", y: 214 },
];
const BUTTONS_RIGHT = [
  { label: "OT", color: "#f97316", y: 118 },
  { label: "PC", color: "#d7d7dc", y: 152 },
  { label: "PL", color: "#dc2626", y: 186 },
  { label: "DRK", color: "#2563eb", y: 214 },
];
const ROTARIES = [
  { label: "STRAT", x: 148, y: 276, dot: 40 },
  { label: "MFD", x: 260, y: 280, dot: 210 },
  { label: "HPP", x: 372, y: 276, dot: 120 },
];

function Button({ x, y, label, color }: { x: number; y: number; label: string; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={11} fill={color} stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
      <circle cx={x} cy={y} r={11} fill="url(#btn-shine)" />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fontSize="8"
        fontFamily="var(--font-mono), monospace"
        fontWeight="700"
        fill={color === "#1f2228" ? "#c8ccd4" : "#0b0b0d"}
      >
        {label}
      </text>
    </g>
  );
}

function Rotary({ x, y, label, dot }: { x: number; y: number; label: string; dot: number }) {
  const ticks = Array.from({ length: 10 }, (_, i) => i);
  return (
    <g>
      <circle cx={x} cy={y} r={16} fill="#191b20" stroke="rgba(207,163,73,0.55)" strokeWidth="1.2" />
      {ticks.map((i) => {
        const a = (i / 9) * Math.PI * 1.6 - Math.PI * 0.8;
        return (
          <line
            key={i}
            x1={x + Math.cos(a) * 12}
            y1={y + Math.sin(a) * 12}
            x2={x + Math.cos(a) * 15.5}
            y2={y + Math.sin(a) * 15.5}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
          />
        );
      })}
      {/* position indicator dot */}
      {(() => {
        const a = (dot / 300) * Math.PI * 1.6 - Math.PI * 0.8;
        return <circle cx={x + Math.cos(a) * 8} cy={y + Math.sin(a) * 8} r={3.4} fill="var(--color-gold)" />;
      })()}
      <text
        x={x}
        y={y + 30}
        textAnchor="middle"
        fontSize="8"
        fontFamily="var(--font-mono), monospace"
        fill="rgba(159,166,178,0.8)"
        letterSpacing="1"
      >
        {label}
      </text>
    </g>
  );
}

export function CentralTelemetry() {
  // Discrete state (Domain B)
  const [gear, setGear] = useState(1);
  const [drs, setDrs] = useState(false);
  const dur = useDur();
  const era = ACTIVE_ERA;

  // Continuous refs (Domain A)
  const speedRef = useRef<HTMLSpanElement | null>(null);
  const posRef = useRef<HTMLSpanElement | null>(null);
  const lapRef = useRef<HTMLSpanElement | null>(null);
  const fuelBarRef = useRef<HTMLDivElement | null>(null);
  const fuelTxtRef = useRef<HTMLSpanElement | null>(null);
  const socBarRef = useRef<HTMLDivElement | null>(null);
  const socTxtRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let lastSpeedTxt = "";
    const unsub = scheduler.add((t) => {
      const f = demoFrame(t);

      setGear((prev) => (prev === f.gear ? prev : f.gear));
      setDrs((prev) => (prev === f.drs ? prev : f.drs));

      if (speedRef.current) {
        const s = String(Math.round(f.speed));
        if (s !== lastSpeedTxt) {
          speedRef.current.textContent = s;
          lastSpeedTxt = s;
        }
      }
      if (posRef.current) posRef.current.textContent = `${f.position}/20`;
      if (lapRef.current) lapRef.current.textContent = `${f.lap}/56`;
      if (fuelBarRef.current)
        fuelBarRef.current.style.width = `${(f.fuelKg / 110) * 100}%`;
      if (fuelTxtRef.current)
        fuelTxtRef.current.textContent = `${f.fuelKg.toFixed(1)}kg`;
      if (socBarRef.current)
        socBarRef.current.style.width = `${f.ersPct * 100}%`;
      if (socTxtRef.current)
        socTxtRef.current.textContent = `${Math.round(f.ersPct * 100)}%`;
    });
    return unsub;
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="relative"
        data-testid="wheel-cluster"
        style={{ aspectRatio: "520/340", height: "100%", maxWidth: "100%" }}
      >
        {/* ═══ SHELL (SVG) ═══════════════════════════════════════════ */}
        <svg
          viewBox="0 0 520 340"
          className="absolute inset-0 w-full h-full"
          aria-label="Steering wheel (simulated)"
        >
          <defs>
            <linearGradient id="shell-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#23252c" />
              <stop offset="45%" stopColor="#17181d" />
              <stop offset="100%" stopColor="#0b0c0f" />
            </linearGradient>
            <linearGradient id="grip-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0d0e11" />
              <stop offset="100%" stopColor="#1a1c21" />
            </linearGradient>
            <radialGradient id="btn-shine" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="lcd-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e1420" />
              <stop offset="100%" stopColor="#070a10" />
            </linearGradient>
          </defs>

          {/* Grips */}
          <path
            d="M 96 74 C 60 66 28 84 18 130 C 6 186 8 250 24 288 C 38 318 74 322 92 300 L 96 74 Z"
            fill="url(#grip-grad)" stroke="rgba(207,163,73,0.4)" strokeWidth="1.2"
          />
          <path
            d="M 424 74 C 460 66 492 84 502 130 C 514 186 512 250 496 288 C 482 318 446 322 428 300 L 424 74 Z"
            fill="url(#grip-grad)" stroke="rgba(207,163,73,0.4)" strokeWidth="1.2"
          />
          {/* grip texture ridges */}
          {[96, 122, 148, 174, 200, 226, 252, 276].map((gy) => (
            <line key={gy} x1={30} y1={gy} x2={88} y2={gy + 6} stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
          ))}
          {[96, 122, 148, 174, 200, 226, 252, 276].map((gy) => (
            <line key={gy} x1={432} y1={gy + 6} x2={490} y2={gy} stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
          ))}

          {/* Face */}
          <path
            d="M 96 60 C 160 40 360 40 424 60 L 428 250 C 400 296 360 310 330 310 L 190 310 C 160 310 120 296 92 250 Z"
            fill="url(#shell-grad)" stroke="rgba(207,163,73,0.55)" strokeWidth="1.4"
          />
          {/* face carbon weave */}
          <path
            d="M 96 60 C 160 40 360 40 424 60 L 428 250 C 400 296 360 310 330 310 L 190 310 C 160 310 120 296 92 250 Z"
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="8"
            strokeDasharray="2 6"
          />

          {/* LCD bezel */}
          <rect x="142" y="86" width="236" height="152" rx="8" fill="#04050a" stroke="rgba(207,163,73,0.5)" strokeWidth="1.6" />

          {/* Reminder sticker above rotaries (the real 'STRAT 6' quirk) */}
          <rect x="182" y="246" width="156" height="14" rx="2" fill="rgba(230,228,220,0.92)" />
          <text
            x="260" y="256" textAnchor="middle" fontSize="6.5"
            fontFamily="var(--font-mono), monospace" fill="#111"
          >
            STRAT 6 = PIT · FLAP → MFD
          </text>

          {/* Buttons */}
          {BUTTONS_LEFT.map((b) => (
            <Button key={b.label} x={120} y={b.y} label={b.label} color={b.color} />
          ))}
          {BUTTONS_RIGHT.map((b) => (
            <Button key={b.label} x={400} y={b.y} label={b.label} color={b.color} />
          ))}
          {/* Brake balance pair under screen */}
          <Button x={196} y={278} label="BB−" color="#dc2626" />
          <Button x={324} y={278} label="BB+" color="#16a34a" />

          {/* Rotaries */}
          {ROTARIES.map((r) => (
            <Rotary key={r.label} {...r} />
          ))}

          {/* Quick-release boss between grips */}
          <circle cx="260" cy="322" r="9" fill="#101115" stroke="rgba(207,163,73,0.4)" strokeWidth="1" />
          <circle cx="260" cy="322" r="4" fill="none" stroke="rgba(207,163,73,0.4)" strokeWidth="0.8" />
        </svg>

        {/* ═══ LED STRIP (canvas — on the face, above the LCD bezel) ══ */}
        <div
          className="absolute"
          style={{
            left: "21%",
            top: "17.5%",
            width: "58%",
            height: "6.8%",
          }}
        >
          <ShiftLights fill />
        </div>

        {/* ═══ DRS button (upper-left edge, era-labeled) ═════════════ */}
        <div
          className={`absolute font-mono text-[9px] tracking-[0.12em] font-bold border rounded px-1.5 py-0.5 transition-colors duration-150 ${
            drs
              ? "text-signal-go border-signal-go/60 bg-signal-go/15 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
              : "text-silver/70 border-white/20 bg-black/40"
          }`}
          style={{ left: "16%", top: "28%" }}
          title={era.aero.system === "XZ" ? "Active aero request" : "Drag Reduction System"}
        >
          {drs ? era.aero.chipLabels.active : era.aero.chipLabels.ready}
        </div>

        {/* ═══ LCD (DOM overlay — the live data) ═════════════════════ */}
        <div
          className="absolute rounded-md overflow-hidden select-none"
          style={{
            left: "27.7%",
            top: "25.9%",
            width: "44.6%",
            height: "44.1%",
            background: "linear-gradient(180deg,#0e1420 0%,#070a10 100%)",
            border: "1px solid rgba(120,140,180,0.25)",
            boxShadow: "inset 0 0 18px rgba(40,80,160,0.15), 0 0 14px rgba(0,0,0,0.8)",
          }}
        >
          {/* scanline hint */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, #7fb0ff 0 1px, transparent 1px 3px)",
            }}
          />

          <div className="relative h-full flex flex-col px-2.5 py-1.5">
            {/* Top row */}
            <div className="flex items-center justify-between font-mono text-[10px] tabular-nums text-silver/80">
              <span>
                LAP <span ref={lapRef} className="text-white font-bold">1/56</span>
              </span>
              <span
                className="text-[9px] tracking-[0.14em] text-gold border border-gold/50 rounded px-1.5 py-px"
              >
                RACE
              </span>
              <span>
                POS <span ref={posRef} className="text-white font-bold">2/20</span>
              </span>
            </div>

            {/* Middle: SPEED | GEAR | DELTA */}
            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1 min-h-0">
              <div className="text-left">
                <div className="font-mono text-[8px] tracking-[0.14em] text-silver/50">SPD</div>
                <div className="flex items-baseline gap-1">
                  <span
                    ref={speedRef}
                    className="font-display text-[44px] leading-none text-white tabular-nums"
                  >
                    0
                  </span>
                  <span className="font-mono text-[10px] text-silver/50">KMH</span>
                </div>
                <div className="font-mono text-[9px] text-silver/40 mt-0.5">
                  {era.energy.systemName}
                </div>
              </div>

              <div className="relative w-[64px] h-[64px] flex items-center justify-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={gear}
                    initial={{ scale: 1.14, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.88, opacity: 0 }}
                    transition={{ duration: dur.ui, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute font-display text-[64px] leading-none text-white"
                    style={{ textShadow: "0 0 18px rgba(207,163,73,0.4)" }}
                  >
                    {gear === 0 ? "N" : gear}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="text-right flex flex-col items-end justify-center">
                <div className="font-mono text-[8px] tracking-[0.14em] text-silver/50">DELTA</div>
                <DeltaBar compact />
                <div className="font-mono text-[8px] text-silver/40 mt-1">vs BEST</div>
              </div>
            </div>

            {/* Delta micro-bar removed — DeltaBar lives in the DELTA column */}

            {/* Bottom: SOC + FUEL (era-labeled) */}
            <div className="grid grid-cols-2 gap-2 pb-0.5">
              <div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-[8px] tracking-[0.12em] text-silver/50">
                    {era.energy.systemName}
                  </span>
                  <span ref={socTxtRef} className="font-mono text-[9px] text-signal-info tabular-nums">
                    0%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    ref={socBarRef}
                    className="h-full rounded-full"
                    style={{ width: "0%", background: "#3b82f6" }}
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

        {/* Panel header floats above the wheel */}
        <div className="absolute -top-1 left-0 right-0 flex items-center justify-between">
          <MicroLabel>Wheel · {era.label}</MicroLabel>
          <SimBadge />
        </div>
      </div>
    </div>
  );
}

/**
 * CentralTelemetry — Phase 2B: Central Telemetry Instrument Cluster
 *
 * Reference Authority: Nano Banana APX IQ Cockpit (media_1787442062666.png)
 *
 * Reconstructed as an authentic physical motorsport steering-wheel / MFD instrument:
 *   - Custom molded carbon-fiber outer housing with lateral button pods and arched brow
 *   - 14-LED shift light array (5 Green → 5 Red → 4 Magenta/Purple - all vibrant)
 *   - Upper telemetry section: LAP, POS, FUEL (left), dominant GEAR 7 (center), KIWQ MIX 2 & BEST LAP (right)
 *   - Perfectly contained arched RPM tachometer rainbow spanning over the central 312 KM/H speed readout
 *   - Clean lower status layout: DRS AVAIL (bottom left), MIX 2 & ERS 85% (bottom right)
 *   - Strict geometric containment inside OLED display screen boundary (zero bezel breach)
 *
 * Static Reference Mode.
 */

"use client";

import React from "react";

/* ─── Static Reference Telemetry Data ────────────────────────────────────── */
const REF = {
  lap: 48,
  totalLaps: 56,
  position: 2,
  fuel: "22.4 KG",
  gear: 7,
  bestLap: "1:29.843",
  speed: 312,
  mix: 2,
  drsAvail: true,
  ers: 85,
  rpm: 12800,
  maxRpm: 15000,
};

/* ─── Shift Light Color Palette & Configurations ─────────────────────────── */
interface ShiftLED {
  type: "green" | "red" | "purple";
  lit: boolean;
}

const SHIFT_LEDS: ShiftLED[] = [
  // 5 Green (all lit)
  { type: "green", lit: true },
  { type: "green", lit: true },
  { type: "green", lit: true },
  { type: "green", lit: true },
  { type: "green", lit: true },
  // 5 Red (all lit)
  { type: "red", lit: true },
  { type: "red", lit: true },
  { type: "red", lit: true },
  { type: "red", lit: true },
  { type: "red", lit: true },
  // 4 Purple/Magenta (all lit per reference at max high RPM)
  { type: "purple", lit: true },
  { type: "purple", lit: true },
  { type: "purple", lit: true },
  { type: "purple", lit: true },
];

/* ─── Coordinate Math Helpers ────────────────────────────────────────────── */
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Number((cx + r * Math.cos(rad)).toFixed(2)),
    y: Number((cy + r * Math.sin(rad)).toFixed(2)),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const CentralTelemetry: React.FC = () => {
  // SVG Canvas dimensions (480 x 330)
  const VW = 480;
  const VH = 330;

  // Tachometer geometry: Perfectly contained within inner screen (x: 64..416, y: 54..302)
  // Left/Right endpoints terminate at x=94.9 and x=385.1 (well inside x=64 and x=416)
  // Apex terminates at y=170 (leaves y:56..168 for GEAR 7 and upper telemetry)
  const TACH_CX = 240;
  const TACH_CY = 345;
  const TACH_R_OUT = 175;
  const TACH_R_IN = 160; // 15px refined bar thickness
  const TACH_START_DEG = 214;
  const TACH_END_DEG = 326;
  const TACH_SPAN = TACH_END_DEG - TACH_START_DEG; // 112 deg

  // Current RPM fraction (~0.853)
  const currentFraction = REF.rpm / REF.maxRpm;
  const activeDegrees = TACH_START_DEG + currentFraction * TACH_SPAN;

  // Generate discrete tachometer bars (40 fine segments)
  const NUM_BARS = 40;
  const bars = [];
  const barGap = 0.75;
  const barDeg = TACH_SPAN / NUM_BARS - barGap;

  for (let i = 0; i < NUM_BARS; i++) {
    const deg0 = TACH_START_DEG + i * (TACH_SPAN / NUM_BARS);
    const deg1 = deg0 + barDeg;
    const progress = i / NUM_BARS;
    const isLit = progress <= currentFraction;

    const pOut0 = polarToCartesian(TACH_CX, TACH_CY, TACH_R_OUT, deg0);
    const pOut1 = polarToCartesian(TACH_CX, TACH_CY, TACH_R_OUT, deg1);
    const pIn1 = polarToCartesian(TACH_CX, TACH_CY, TACH_R_IN, deg1);
    const pIn0 = polarToCartesian(TACH_CX, TACH_CY, TACH_R_IN, deg0);

    const pathData = `M ${pOut0.x.toFixed(2)} ${pOut0.y.toFixed(2)} A ${TACH_R_OUT} ${TACH_R_OUT} 0 0 1 ${pOut1.x.toFixed(2)} ${pOut1.y.toFixed(2)} L ${pIn1.x.toFixed(2)} ${pIn1.y.toFixed(2)} A ${TACH_R_IN} ${TACH_R_IN} 0 0 0 ${pIn0.x.toFixed(2)} ${pIn0.y.toFixed(2)} Z`;

    // Colors matching reference:
    // 0..60%: Warm Golden Yellow
    // 60..78%: Bright Amber
    // 78..100%: Crimson / Redline Red
    let fill = "#221C12"; // dim base
    let glow = false;

    if (isLit) {
      if (progress < 0.60) {
        fill = "#D4AF37"; // Champagne Gold
      } else if (progress < 0.78) {
        fill = "#FFB820"; // Vibrant Amber
        glow = true;
      } else {
        fill = "#FF3A32"; // Redline Red
        glow = true;
      }
    } else {
      if (progress >= 0.78) {
        fill = "#480E0C"; // Dim Redline
      }
    }

    bars.push(
      <path
        key={`bar-${i}`}
        d={pathData}
        fill={fill}
        opacity={isLit ? 1 : 0.45}
        filter={glow ? "url(#mfd-bar-glow)" : undefined}
      />
    );
  }

  // Ticks & Numbers along the tachometer (0 to 10)
  const tachMarks = [];
  for (let n = 0; n <= 10; n++) {
    const markDeg = TACH_START_DEG + (n / 10) * TACH_SPAN;
    const pTickOut = polarToCartesian(TACH_CX, TACH_CY, TACH_R_IN - 1, markDeg);
    const pTickIn = polarToCartesian(TACH_CX, TACH_CY, TACH_R_IN - (n % 2 === 0 ? 5.5 : 3), markDeg);
    const pText = polarToCartesian(TACH_CX, TACH_CY, TACH_R_IN - 11, markDeg);

    tachMarks.push(
      <line
        key={`tick-${n}`}
        x1={pTickOut.x.toFixed(2)}
        y1={pTickOut.y.toFixed(2)}
        x2={pTickIn.x.toFixed(2)}
        y2={pTickIn.y.toFixed(2)}
        stroke={n >= 8 ? "#FF3A32" : "#9D957F"}
        strokeWidth={n % 2 === 0 ? 1.1 : 0.65}
        opacity={0.85}
      />
    );

    if (n % 2 === 0 || n === 10) {
      tachMarks.push(
        <text
          key={`num-${n}`}
          x={pText.x.toFixed(2)}
          y={(pText.y + 2.5).toFixed(2)}
          textAnchor="middle"
          fontSize="7.5"
          fontFamily="monospace"
          fontWeight="600"
          fill={n >= 8 ? "#FF6A60" : "#8E8675"}
        >
          {n}
        </text>
      );
    }
  }

  // Indicator Needle / Cursor at active RPM point (~7.6)
  const pNeedleOut = polarToCartesian(TACH_CX, TACH_CY, TACH_R_OUT + 3.5, activeDegrees);
  const pNeedleIn = polarToCartesian(TACH_CX, TACH_CY, TACH_R_IN - 4.5, activeDegrees);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-full drop-shadow-[0_10px_35px_rgba(0,0,0,0.95)]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Carbon Fiber Pattern for Outer Bezel */}
          <pattern id="mfd-carbon" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#0C0C0E" />
            <path d="M0 0h3v3H0zM3 3h3v3H3z" fill="#141418" />
            <path d="M0 3h3v3H0zM3 0h3v3H3z" fill="#09090B" />
          </pattern>

          {/* Golden Outer Stroke Gradient */}
          <linearGradient id="mfd-gold-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0C995" />
            <stop offset="30%" stopColor="#8C7443" />
            <stop offset="70%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#5A4720" />
          </linearGradient>

          {/* Strict Inner Screen Clipping Path */}
          <clipPath id="mfd-screen-clip">
            <rect x="64" y="54" width="352" height="248" rx="8" />
          </clipPath>

          {/* Glow Filters */}
          <filter id="mfd-green-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="mfd-red-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="mfd-purple-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="mfd-bar-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="mfd-text-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 1. PHYSICAL MFD HOUSING (Outer Bezel with Side Wings & Top Brow) */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <g id="mfd-outer-housing">
          {/* Main Housing Outline with Chamfered Shoulders and Lateral Button Pods */}
          <path
            d="
              M 90 28
              C 150 14, 330 14, 390 28
              L 416 48
              L 452 78
              C 458 84, 460 92, 460 102
              L 460 188
              C 460 198, 456 206, 448 212
              L 420 236
              L 420 288
              C 420 302, 408 314, 394 314
              L 86 314
              C 72 314, 60 302, 60 288
              L 60 236
              L 32 212
              C 24 206, 20 198, 20 188
              L 20 102
              C 20 92, 22 84, 28 78
              L 64 48
              Z
            "
            fill="url(#mfd-carbon)"
            stroke="url(#mfd-gold-border)"
            strokeWidth="1.8"
          />

          {/* Top Brow Specular Highlight */}
          <path
            d="M 94 30 C 152 16, 328 16, 386 30"
            fill="none"
            stroke="#FFE6A3"
            strokeWidth="0.9"
            strokeOpacity="0.45"
          />

          {/* ── Left Wing Physical Buttons ── */}
          {/* Upper Left Button: Green Mode Pill */}
          <rect
            x="28"
            y="114"
            width="18"
            height="9"
            rx="4.5"
            fill="#0E2E18"
            stroke="#27F26A"
            strokeWidth="1.2"
          />
          <circle cx="37" cy="118.5" r="2.2" fill="#27F26A" filter="url(#mfd-green-glow)" />

          {/* Lower Left Button: Dark Rotary / Push Button */}
          <rect
            x="28"
            y="138"
            width="18"
            height="9"
            rx="4.5"
            fill="#18181A"
            stroke="#444448"
            strokeWidth="1.2"
          />
          <line x1="33" y1="142.5" x2="41" y2="142.5" stroke="#8E8675" strokeWidth="1.5" strokeLinecap="round" />

          {/* ── Right Wing Physical Buttons ── */}
          {/* Upper Right Button: Red Radio Button */}
          <circle
            cx="442"
            cy="125"
            r="8.5"
            fill="#320E0E"
            stroke="#FF3A32"
            strokeWidth="1.2"
          />
          <path d="M 439 125 L 445 125 M 442 122 L 442 128" stroke="#FF3A32" strokeWidth="1.4" strokeLinecap="round" />

          {/* Lower Right Button: Orange Setup Button */}
          <circle
            cx="442"
            cy="153"
            r="8.5"
            fill="#2E1808"
            stroke="#FF8800"
            strokeWidth="1.2"
          />
          <circle cx="442" cy="153" r="3.5" fill="#FF8800" />
        </g>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 2. SHIFT LIGHT ARRAY (14 LEDs: 5 Green → 5 Red → 4 Purple)     */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <g id="mfd-shift-lights">
          {/* Recessed shift light housing channel */}
          <path
            d="M 120 40 C 180 28, 300 28, 360 40"
            fill="none"
            stroke="#08080A"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {SHIFT_LEDS.map((led, index) => {
            const t = (index - 6.5) / 6.5; // -1 to +1
            const cx = Number((240 + t * 116).toFixed(2));
            const cy = Number((34 + Math.pow(t, 2) * 8).toFixed(2));
            const r = 5.2;

            let litColor = "#27F26A";
            let dimColor = "#08200E";
            let glowFilter = "url(#mfd-green-glow)";

            if (led.type === "red") {
              litColor = "#FF3A32";
              dimColor = "#280808";
              glowFilter = "url(#mfd-red-glow)";
            } else if (led.type === "purple") {
              litColor = "#D040FF";
              dimColor = "#20082E";
              glowFilter = "url(#mfd-purple-glow)";
            }

            return (
              <g key={`led-${index}`}>
                {/* Outer Bezel Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 1.6}
                  fill="#0E0E10"
                  stroke="#262628"
                  strokeWidth="0.8"
                />
                {/* LED Lens */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={led.lit ? litColor : dimColor}
                  opacity={led.lit ? 1 : 0.4}
                  filter={led.lit ? glowFilter : undefined}
                />
                {/* Specular Highlight on lens */}
                {led.lit && (
                  <circle
                    cx={Number((cx - 1.4).toFixed(2))}
                    cy={Number((cy - 1.4).toFixed(2))}
                    r={Number((r * 0.35).toFixed(2))}
                    fill="#FFFFFF"
                    opacity="0.85"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 3. DIGITAL OLED DISPLAY SCREEN                                  */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <g id="mfd-screen">
          {/* Main Display Window Background */}
          <rect
            x="64"
            y="54"
            width="352"
            height="248"
            rx="8"
            fill="#060608"
            stroke="url(#mfd-gold-border)"
            strokeWidth="1.2"
          />

          {/* Screen Inner Bevel Glow */}
          <rect
            x="65"
            y="55"
            width="350"
            height="246"
            rx="7"
            fill="none"
            stroke="rgba(215, 192, 138, 0.12)"
            strokeWidth="1"
          />

          {/* Screen Content strictly clipped inside display area */}
          <g id="mfd-screen-content" clipPath="url(#mfd-screen-clip)">

            {/* ──────────────────────────────────────────────────────────── */}
            {/* UPPER SECTION: LAP, GEAR 7, KIWQ MIX 2, BEST LAP             */}
            {/* ──────────────────────────────────────────────────────────── */}

            {/* ── Upper Left Column (LAP, POS, FUEL) ── */}
            <g id="mfd-upper-left">
              {/* LAP */}
              <text x="82" y="78" fill="#8E8675" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5">
                LAP
              </text>
              <text x="82" y="97" fill="#FFFFFF" fontSize="16" fontFamily="monospace" fontWeight="700" letterSpacing="-0.5">
                {REF.lap} <tspan fill="#666" fontSize="12">/ {REF.totalLaps}</tspan>
              </text>

              {/* POS */}
              <text x="82" y="118" fill="#8E8675" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5">
                POS
              </text>
              <text x="82" y="139" fill="#FFFFFF" fontSize="20" fontFamily="monospace" fontWeight="700">
                {REF.position}
              </text>

              {/* FUEL */}
              <text x="82" y="158" fill="#8E8675" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5">
                FUEL
              </text>
              <text x="82" y="174" fill="#E8E2D5" fontSize="12.5" fontFamily="monospace" fontWeight="700">
                {REF.fuel}
              </text>
            </g>

            {/* ── Upper Center (GEAR 7 - HERO) ── */}
            <g id="mfd-upper-center">
              <text
                x="240"
                y="74"
                textAnchor="middle"
                fill="#8E8675"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="600"
                letterSpacing="2"
              >
                GEAR
              </text>
              <text
                x="240"
                y="138"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="72"
                fontFamily="monospace"
                fontWeight="400"
                letterSpacing="-2"
                filter="url(#mfd-text-glow)"
              >
                {REF.gear}
              </text>
            </g>

            {/* ── Upper Right Column (KIWQ / MIX 2, BEST LAP) ── */}
            <g id="mfd-upper-right">
              {/* Battery / KIWQ Icon */}
              <g transform="translate(352, 67)">
                <rect x="0" y="0" width="18" height="9" rx="2" fill="none" stroke="#27F26A" strokeWidth="1" />
                <rect x="2" y="2" width="10" height="5" fill="#27F26A" />
                <rect x="18" y="2.5" width="2" height="4" rx="0.5" fill="#27F26A" />
              </g>
              <text x="376" y="75" fill="#FF8800" fontSize="8" fontFamily="monospace" fontWeight="700" letterSpacing="0.5">
                KIWQ
              </text>

              {/* MIX 2 (prominent green) */}
              <text x="398" y="95" textAnchor="end" fill="#27F26A" fontSize="17" fontFamily="monospace" fontWeight="700">
                MIX {REF.mix}
              </text>

              {/* BEST LAP */}
              <text x="398" y="122" textAnchor="end" fill="#8E8675" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5">
                BEST LAP
              </text>
              <text x="398" y="141" textAnchor="end" fill="#FFFFFF" fontSize="14" fontFamily="monospace" fontWeight="700" letterSpacing="0.5">
                {REF.bestLap}
              </text>
            </g>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* LOWER SECTION: TACHOMETER ARC + 312 SPEED + STATUS           */}
            {/* ──────────────────────────────────────────────────────────── */}

            {/* ── Tachometer Curved Arc (Rainbow Arch) ── */}
            <g id="mfd-tachometer">
              {/* Dark background track beneath the segments */}
              <path
                d={describeArc(TACH_CX, TACH_CY, (TACH_R_OUT + TACH_R_IN) / 2, TACH_START_DEG - 0.5, TACH_END_DEG + 0.5)}
                fill="none"
                stroke="#101012"
                strokeWidth={TACH_R_OUT - TACH_R_IN + 2}
              />

              {/* Tachometer Discrete Segments */}
              {bars}

              {/* Scale Ticks & Numbers */}
              {tachMarks}

              {/* Needle / Indicator marker at active RPM position */}
              <line
                x1={pNeedleOut.x.toFixed(2)}
                y1={pNeedleOut.y.toFixed(2)}
                x2={pNeedleIn.x.toFixed(2)}
                y2={pNeedleIn.y.toFixed(2)}
                stroke="#FFE890"
                strokeWidth="2.2"
                strokeLinecap="round"
                filter="url(#mfd-bar-glow)"
              />

              {/* Outer & Inner Thin Gold Guide Lines */}
              <path
                d={describeArc(TACH_CX, TACH_CY, TACH_R_OUT + 1, TACH_START_DEG, TACH_END_DEG)}
                fill="none"
                stroke="#B7A06A"
                strokeWidth="0.8"
                strokeOpacity="0.4"
              />
              <path
                d={describeArc(TACH_CX, TACH_CY, TACH_R_IN - 1, TACH_START_DEG, TACH_END_DEG)}
                fill="none"
                stroke="#B7A06A"
                strokeWidth="0.8"
                strokeOpacity="0.25"
              />
            </g>

            {/* ── SPEED & FLANKING STATUS READOUTS (Inside Tachometer Hollow) ── */}
            <g id="mfd-speed-readout">
              {/* Speed Readout 312 KM/H in Center */}
              <text
                x="240"
                y="220"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="44"
                fontFamily="monospace"
                fontWeight="800"
                letterSpacing="-1"
                filter="url(#mfd-text-glow)"
              >
                {REF.speed}
              </text>
              <text
                x="240"
                y="236"
                textAnchor="middle"
                fill="#8E8675"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="600"
                letterSpacing="2"
              >
                KM/H
              </text>

              {/* Left Flank: DRS AVAIL with Green Pill */}
              <g transform="translate(156, 252)">
                <rect x="0" y="0" width="14" height="7.5" rx="2" fill="#0D3016" stroke="#27F26A" strokeWidth="1" />
                <rect x="2" y="2" width="5" height="3.5" rx="1" fill="#27F26A" />
                <text x="18" y="7" fill="#27F26A" fontSize="8" fontFamily="monospace" fontWeight="700" letterSpacing="0.8">
                  DRS AVAIL
                </text>
              </g>

              {/* Right Flank: MIX 2 & ERS 85% */}
              <g transform="translate(300, 249)">
                <text x="0" y="0" fill="#8E8675" fontSize="8" fontFamily="monospace">
                  MIX <tspan fill="#27F26A" fontWeight="700">{REF.mix}</tspan>
                </text>
                <text x="0" y="10" fill="#8E8675" fontSize="8" fontFamily="monospace">
                  ERS <tspan fill="#FF8800" fontWeight="700">{REF.ers}%</tspan>
                </text>
              </g>
            </g>

          </g>{/* end mfd-screen-content */}
        </g>{/* end mfd-screen */}
      </svg>
    </div>
  );
};

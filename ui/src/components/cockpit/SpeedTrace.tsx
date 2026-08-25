/**
 * SpeedTrace — Phase 2D: Speed / Elevation Telemetry Trace (Precision Polish)
 *
 * Reference Authority: Nano Banana APX IQ Cockpit (media_1787442062666.png)
 *
 * Reconstructed as an authentic motorsport telemetry plotting instrument:
 *   - Dark engineered plotting canvas with subtle low-contrast grid
 *   - Golden telemetry speed trace with realistic telemetry-derived acceleration/braking profile
 *   - Subtle luminous under-fill gradient fading toward bottom
 *   - Y-Axis: 100, 150, 200, 250, 300, 350 KM/H
 *   - X-Axis: 0, 400, 800, 1200, 1600, 2000, 2400 M
 *   - Subordinate live car position telemetry marker at 312 KM/H
 *   - Deterministic SVG geometry with 2-decimal precision (zero hydration mismatch)
 *
 * Static Reference Mode — Phase 2D.
 */

"use client";

import React from "react";

/* ─── Static Reference Telemetry Data Boundary ───────────────────────────── */
export interface TelemetryPoint {
  distance: number; // Lap distance in meters [0..2400]
  speed: number;    // Vehicle speed in km/h [100..350]
}

const SPEED_PROFILE: TelemetryPoint[] = [
  { distance: 0, speed: 116 },
  { distance: 70, speed: 142 },
  { distance: 140, speed: 186 },
  { distance: 200, speed: 168 },
  { distance: 270, speed: 212 },
  { distance: 350, speed: 268 },
  { distance: 440, speed: 312 },
  { distance: 530, speed: 328 },
  { distance: 580, speed: 314 },
  { distance: 630, speed: 218 },
  { distance: 680, speed: 110 },
  { distance: 750, speed: 168 },
  { distance: 830, speed: 224 },
  { distance: 920, speed: 268 },
  { distance: 1010, speed: 305 },
  { distance: 1090, speed: 326 },
  { distance: 1150, speed: 272 },
  { distance: 1200, speed: 194 },
  { distance: 1260, speed: 236 },
  { distance: 1330, speed: 258 },
  { distance: 1400, speed: 208 },
  { distance: 1480, speed: 250 },
  { distance: 1580, speed: 286 },
  { distance: 1680, speed: 324 },
  { distance: 1750, speed: 342 },
  { distance: 1830, speed: 318 },
  { distance: 1890, speed: 218 },
  { distance: 1950, speed: 242 },
  { distance: 2030, speed: 118 },
  { distance: 2100, speed: 176 },
  { distance: 2180, speed: 240 },
  { distance: 2260, speed: 284 },
  { distance: 2330, speed: 306 },
  { distance: 2380, speed: 312 },
];

/* ─── Grid & Axis Calibration Constants ──────────────────────────────────── */
const VIEWBOX = { width: 600, height: 200 };
// Optimized vertical plotting area utilization (~8% expansion)
const PLOT = {
  left: 46,
  right: 566,
  top: 18,
  bottom: 174,
};

const DOMAIN_X = { min: 0, max: 2400 };
const DOMAIN_Y = { min: 100, max: 350 };

const X_TICKS = [0, 400, 800, 1200, 1600, 2000, 2400];
const Y_TICKS = [100, 150, 200, 250, 300, 350];

/* ─── Coordinate Mapping Helpers ─────────────────────────────────────────── */
function mapX(dist: number): number {
  const norm = (dist - DOMAIN_X.min) / (DOMAIN_X.max - DOMAIN_X.min);
  const val = PLOT.left + norm * (PLOT.right - PLOT.left);
  return Number(val.toFixed(2));
}

function mapY(speed: number): number {
  const norm = (speed - DOMAIN_Y.min) / (DOMAIN_Y.max - DOMAIN_Y.min);
  const val = PLOT.bottom - norm * (PLOT.bottom - PLOT.top);
  return Number(val.toFixed(2));
}

/* ─── Spline Path Generation Helper ──────────────────────────────────────── */
function generateSmoothPath(points: TelemetryPoint[]): { linePath: string; areaPath: string } {
  if (points.length === 0) return { linePath: "", areaPath: "" };

  const coords = points.map((p) => ({
    x: mapX(p.distance),
    y: mapY(p.speed),
  }));

  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

    const cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(2);
    const cp1y = (p1.y + (p2.y - p0.y) / 6).toFixed(2);
    const cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(2);
    const cp2y = (p2.y - (p3.y - p1.y) / 6).toFixed(2);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  const lastCoord = coords[coords.length - 1];
  const firstCoord = coords[0];
  const area = `${d} L ${lastCoord.x.toFixed(2)} ${PLOT.bottom.toFixed(2)} L ${firstCoord.x.toFixed(2)} ${PLOT.bottom.toFixed(2)} Z`;

  return { linePath: d, areaPath: area };
}

export const SpeedTrace: React.FC = () => {
  const { linePath, areaPath } = generateSmoothPath(SPEED_PROFILE);
  const lastPoint = SPEED_PROFILE[SPEED_PROFILE.length - 1];
  const markerX = mapX(lastPoint.distance);
  const markerY = mapY(lastPoint.speed);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none font-mono">
      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="w-full h-full drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)] overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Luminous Glow for Speed Line */}
          <filter id="speed-line-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.0" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Under-Fill Area Subtle Gradient */}
          <linearGradient id="speed-area-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.13" />
            <stop offset="60%" stopColor="#D4AF37" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.00" />
          </linearGradient>

          {/* Linear Golden Stroke Gradient */}
          <linearGradient id="speed-trace-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#FFE082" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 1. ENGINEERING GRID & AXES                                       */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <g id="telemetry-grid">
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {Y_TICKS.map((tick) => {
            const y = mapY(tick);
            return (
              <g key={`y-tick-${tick}`}>
                <line
                  x1={PLOT.left}
                  y1={y}
                  x2={PLOT.right}
                  y2={y}
                  stroke="#B7A06A"
                  strokeWidth="0.6"
                  opacity="0.11"
                />
                <text
                  x={(PLOT.left - 7).toFixed(2)}
                  y={(y + 2.5).toFixed(2)}
                  textAnchor="end"
                  fill="#7A7365"
                  fontSize="7.5"
                  fontWeight="500"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Vertical Gridlines & X-Axis Labels */}
          {X_TICKS.map((tick) => {
            const x = mapX(tick);
            return (
              <g key={`x-tick-${tick}`}>
                <line
                  x1={x}
                  y1={PLOT.top}
                  x2={x}
                  y2={PLOT.bottom}
                  stroke="#B7A06A"
                  strokeWidth="0.6"
                  opacity="0.11"
                />
                <text
                  x={x.toFixed(2)}
                  y={(PLOT.bottom + 13).toFixed(2)}
                  textAnchor="middle"
                  fill="#7A7365"
                  fontSize="7.5"
                  fontWeight="500"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Primary Baseline Line */}
          <line
            x1={PLOT.left}
            y1={PLOT.bottom}
            x2={PLOT.right}
            y2={PLOT.bottom}
            stroke="#B7A06A"
            strokeWidth="0.8"
            opacity="0.22"
          />
        </g>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 2. SPEED TRACE & AREA FILL                                       */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <g id="telemetry-trace">
          {/* Subtle Gradient Area Fill beneath trace */}
          <path d={areaPath} fill="url(#speed-area-fill)" />

          {/* Ambient Glow Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#D4AF37"
            strokeWidth="3.0"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.28"
            filter="url(#speed-line-glow)"
          />

          {/* Core Engineering Trace Line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#speed-trace-stroke)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* 3. SPEED KM/H HEADER LABEL & SUBORDINATE TELEMETRY MARKER        */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <g id="telemetry-annotations">
          {/* Top-Right Header Label: SPEED KM/H */}
          <text
            x={PLOT.right}
            y={(PLOT.top - 6).toFixed(2)}
            textAnchor="end"
            fill="#B7A06A"
            fontSize="8.0"
            fontWeight="700"
            letterSpacing="1.2"
            opacity="0.80"
          >
            SPEED KM/H
          </text>

          {/* Subordinate Live Telemetry Point Marker at end of trace */}
          <g transform={`translate(${markerX}, ${markerY})`}>
            {/* Ambient Halo */}
            <circle cx="0" cy="0" r="4.0" fill="#D4AF37" opacity="0.20" />
            {/* Core Lens */}
            <circle cx="0" cy="0" r="2.2" fill="#FFE890" stroke="#1A150A" strokeWidth="0.7" />
            {/* Subordinate Readout: 312 */}
            <text
              x="6.5"
              y="2.5"
              fill="#DCD5C8"
              fontSize="8.0"
              fontWeight="600"
              letterSpacing="0.2"
              opacity="0.85"
            >
              {lastPoint.speed}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

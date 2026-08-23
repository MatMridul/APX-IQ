/**
 * TrackMap — Phase 2C: Circuit Map & Sector Intelligence (Precision Polish)
 *
 * Reference Authority: Nano Banana APX IQ Cockpit (media_1787442062666.png)
 *
 * Reconstructed Circuit de Spa-Francorchamps visualization:
 *   - Iconic Spa-Francorchamps circuit geometry (La Source hairpin, Eau Rouge/Raidillon S-kink, Kemmel Straight, Les Combes chicane, Bruxelles loop, Pouhon double-apex, Fagnes, Stavelot, Blanchimont, Bus Stop)
 *   - Luminous champagne gold engineering track stroke with restrained precision bloom
 *   - 3-Sector division (S1, S2, S3) tied directly to track telemetry geometry
 *   - Active live car location marker at Eau Rouge with SECTOR 34.24s readout and subtle leader line
 *   - Lower-right sector intelligence summary (S1: 34.2, S2: 51.5, S3: 29.3)
 *   - Restrained start/finish timing tick
 *   - Optimized internal horizontal alignment (-10px shift) for balanced cockpit density
 *
 * Static Reference Mode — Phase 2C.
 */

"use client";

import React from "react";

/* ─── Static Reference Circuit & Sector Data ─────────────────────────────── */
interface SectorData {
  id: string;
  name: string;
  time: string;
  status: "active" | "completed" | "upcoming";
}

const CIRCUIT_INFO = {
  name: "Spa-Francorchamps",
  location: "Stavelot, Belgium",
  lengthKm: 7.004,
  activeSector: 1,
  activeCorner: "Eau Rouge",
  currentSectorTime: "34.24s",
  sectors: [
    { id: "S1", name: "Sector 1", time: "34.2", status: "active" },
    { id: "S2", name: "Sector 2", time: "51.5", status: "upcoming" },
    { id: "S3", name: "Sector 3", time: "29.3", status: "completed" },
  ] as SectorData[],
};

/* ─── Track Geometry Constants (Spa-Francorchamps normalized) ─────────────── */
// SVG coordinate space: 380 × 260
const TRACK_PATH = `
  M 72 228
  C 54 232, 34 224, 30 208
  C 26 192, 42 182, 54 176
  L 80 150
  C 88 142, 96 134, 108 120
  L 236 48
  C 252 40, 272 34, 286 40
  C 298 46, 302 58, 294 70
  L 282 82
  C 268 94, 248 106, 244 118
  C 240 132, 256 142, 274 142
  C 292 142, 314 152, 334 166
  C 354 180, 362 200, 350 218
  C 338 234, 318 236, 304 226
  L 290 214
  C 282 208, 274 212, 266 220
  C 256 230, 242 234, 226 232
  L 168 218
  C 142 212, 118 204, 98 210
  C 86 214, 78 222, 72 228
  Z
`;

// Car position coordinates at Eau Rouge (Turn 2/3 uphill)
const CAR_POS = { x: 92, y: 136 };

// Start / Finish line coordinates
const SF_LINE = { x1: 68, y1: 222, x2: 74, y2: 234 };

export const TrackMap: React.FC = () => {
  const VW = 380;
  const VH = 260;

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none font-mono">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-full drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)] overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Restrained Luminous Track Ambient Glow Filter */}
          <filter id="track-gold-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.0" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Car Marker Glow */}
          <filter id="car-marker-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Track Gradient for subtle dynamic depth */}
          <linearGradient id="track-stroke-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E6C875" />
            <stop offset="35%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#C29B28" />
            <stop offset="100%" stopColor="#E6C875" />
          </linearGradient>
        </defs>

        {/* ── Internal Shift Group (shifts composition ~2.6% left for optimal balance) ── */}
        <g transform="translate(-10, 0)">

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 1. TRACK SILHOUETTE & RESTRAINED ENGINEERING STROKE              */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <g id="circuit-geometry">
            {/* Ambient Bloom Underlay (restrained 20-30% reduction) */}
            <path
              d={TRACK_PATH}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="5.0"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.15"
              filter="url(#track-gold-glow)"
            />

            {/* Mid-range Glow Ribbon */}
            <path
              d={TRACK_PATH}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.38"
            />

            {/* Core Crisp Engineering Gold Track Line */}
            <path
              d={TRACK_PATH}
              fill="none"
              stroke="url(#track-stroke-grad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Start / Finish Perpendicular Marker (Restrained) */}
            <line
              x1={SF_LINE.x1}
              y1={SF_LINE.y1}
              x2={SF_LINE.x2}
              y2={SF_LINE.y2}
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="square"
              opacity="0.85"
            />
          </g>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 2. ACTIVE LIVE CAR POSITION & SECTOR CALLOUT (Eau Rouge)        */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <g id="active-telemetry-marker">
            {/* Outer Ambient Beacon Halo */}
            <circle
              cx={CAR_POS.x}
              cy={CAR_POS.y}
              r="7.5"
              fill="#D4AF37"
              fillOpacity="0.16"
              filter="url(#car-marker-glow)"
            />

            {/* Secondary Ring */}
            <circle
              cx={CAR_POS.x}
              cy={CAR_POS.y}
              r="4.8"
              fill="#1A150A"
              stroke="#E6C875"
              strokeWidth="1.1"
            />

            {/* Solid Glowing Core */}
            <circle
              cx={CAR_POS.x}
              cy={CAR_POS.y}
              r="2.8"
              fill="#FFE890"
              filter="url(#car-marker-glow)"
            />

            {/* Subtle Leader Line to SECTOR callout */}
            <polyline
              points={`${CAR_POS.x - 4},${CAR_POS.y - 4} ${CAR_POS.x - 12},${CAR_POS.y - 12} ${CAR_POS.x - 22},${CAR_POS.y - 12}`}
              fill="none"
              stroke="#B7A06A"
              strokeWidth="0.6"
              opacity="0.45"
            />

            {/* Top-Left Callout: SECTOR 34.24s */}
            <g transform={`translate(${CAR_POS.x - 14}, ${CAR_POS.y - 20})`}>
              <text
                x="0"
                y="0"
                textAnchor="end"
                fill="#8E8675"
                fontSize="7.5"
                letterSpacing="1.2"
                fontWeight="600"
              >
                SECTOR
              </text>
              <text
                x="0"
                y="10.5"
                textAnchor="end"
                fill="#FFFFFF"
                fontSize="9.5"
                fontWeight="700"
                letterSpacing="0.2"
              >
                {CIRCUIT_INFO.currentSectorTime}
              </text>
            </g>

            {/* Under Marker Callout: 2 / Eau Rouge */}
            <g transform={`translate(${CAR_POS.x + 8}, ${CAR_POS.y + 13})`}>
              <text
                x="0"
                y="0"
                fill="#8E8675"
                fontSize="7.5"
                fontWeight="700"
              >
                2
              </text>
              <text
                x="9"
                y="0"
                fill="#E8E2D5"
                fontSize="7.5"
                fontWeight="600"
                letterSpacing="0.5"
              >
                Eau Rouge
              </text>
            </g>

            {/* Lower Sector 1 Callout: 1 / SEC / Eau Rouge */}
            <g transform="translate(108, 168)">
              <text x="0" y="0" fill="#8E8675" fontSize="7.5" fontWeight="700">
                1
              </text>
              <text x="7" y="0" fill="#8E8675" fontSize="7" fontWeight="600" letterSpacing="0.5">
                SEC
              </text>
              <text x="0" y="8.5" fill="#8E8675" fontSize="7" fontWeight="500">
                Eau
              </text>
              <text x="0" y="16" fill="#8E8675" fontSize="7" fontWeight="500">
                Rouge
              </text>
            </g>
          </g>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 3. SECTOR TIMINGS SUMMARY (Lower Right Quadrant)                 */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <g id="sector-timings-summary" transform="translate(244, 180)">
            {CIRCUIT_INFO.sectors.map((sec, i) => (
              <g key={sec.id} transform={`translate(0, ${i * 11.5})`}>
                <text
                  x="0"
                  y="0"
                  fill="#D4AF37"
                  fontSize="8.5"
                  fontWeight="700"
                  letterSpacing="0.5"
                >
                  {sec.id}:
                </text>
                <text
                  x="20"
                  y="0"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontWeight="700"
                  letterSpacing="0.2"
                >
                  {sec.time}
                </text>
              </g>
            ))}
          </g>

        </g>{/* end internal shift group */}
      </svg>
    </div>
  );
};

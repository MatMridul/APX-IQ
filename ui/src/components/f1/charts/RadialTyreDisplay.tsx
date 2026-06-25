/**
 * RadialTyreDisplay — 4 concentric D3 arcs, one per tyre
 * FL / FR / RL / RR rendered as colour-coded arcs
 */

"use client";

import { useMemo } from "react";
import { arc }         from "d3-shape";
import { scaleLinear } from "d3-scale";
import { getTyreColor, thresholds } from "@/lib/theme";

interface RadialTyreDisplayProps {
  temps: number[]; // [FL, FR, RL, RR]
  size?: number;
}

const TYRE_LABELS = ["FL", "FR", "RL", "RR"];
// Each tyre occupies a 90° quadrant, stacked as concentric arcs
const CONFIGS = [
  { startAngle: -Math.PI / 2, endAngle: 0,            label: "FL" },
  { startAngle: 0,            endAngle: Math.PI / 2,  label: "FR" },
  { startAngle: Math.PI / 2,  endAngle: Math.PI,      label: "RL" },
  { startAngle: Math.PI,      endAngle: 3*Math.PI/2,  label: "RR" },
];

const TEMP_MIN = 40;
const TEMP_MAX = 130;

export function RadialTyreDisplay({ temps, size = 200 }: RadialTyreDisplayProps) {
  const cx = size / 2;
  const cy = size / 2;

  const rings = useMemo(() =>
    CONFIGS.map((cfg, i) => {
      const temp    = temps?.[i] ?? 0;
      const ratio   = Math.min(Math.max((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN), 0), 1);
      const color   = getTyreColor(temp);

      const innerR = size * (0.18 + i * 0.10);
      const outerR = size * (0.24 + i * 0.10);

      const trackPath = arc()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .startAngle(cfg.startAngle)
        .endAngle(cfg.endAngle)
        .cornerRadius(3)(null as any);

      const valuePath = arc()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .startAngle(cfg.startAngle)
        .endAngle(cfg.startAngle + (cfg.endAngle - cfg.startAngle) * ratio)
        .cornerRadius(3)(null as any);

      return { trackPath, valuePath, color, temp, label: cfg.label };
    }),
  [temps, size]);

  return (
    <div className="flex flex-col items-center gap-1 w-full h-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="overflow-visible flex-1"
      >
        {rings.map((ring, i) => (
          <g key={i} transform={`translate(${cx},${cy})`}>
            {/* Track (background) */}
            <path
              d={ring.trackPath ?? ""}
              fill="rgba(255,255,255,0.06)"
            />
            {/* Value */}
            <path
              d={ring.valuePath ?? ""}
              fill={ring.color}
              opacity={0.85}
              style={{ filter: `drop-shadow(0 0 4px ${ring.color}60)` }}
            />
          </g>
        ))}

        {/* Centre labels */}
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.07} fontWeight="700" fill="rgba(255,255,255,0.5)"
          fontFamily="var(--font-jetbrains-mono)">
          TYRES
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.06} fill="rgba(255,255,255,0.3)"
          fontFamily="var(--font-jetbrains-mono)">
          °C
        </text>
      </svg>

      {/* Temperature readouts */}
      <div className="grid grid-cols-4 w-full gap-1 px-1">
        {rings.map((ring) => (
          <div key={ring.label} className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-silver/60">{ring.label}</span>
            <span
              className="text-sm font-mono font-black tabular-nums leading-none"
              style={{ color: ring.color }}
            >
              {ring.temp > 0 ? `${Math.round(ring.temp)}°` : "--°"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CircularRPMGauge — SVG arc gauge using d3-shape + d3-scale
 * Renders a tachometer-style arc: white → yellow → red at redline
 */

"use client";

import { useMemo } from "react";
import { arc }            from "d3-shape";
import { scaleLinear }    from "d3-scale";
import { interpolateRgb } from "d3-interpolate";
import { cn }             from "@/lib/utils";
import { thresholds }     from "@/lib/theme";

interface CircularRPMGaugeProps {
  rpm:    number;
  maxRPM: number;
  gear?:  number;
  size?:  number;
}

const START_ANGLE = -Math.PI * 0.75;  // Start at 7 o'clock
const END_ANGLE   =  Math.PI * 0.75;  // End  at 5 o'clock
const INNER_R     = 0.70;
const OUTER_R     = 0.92;

export function CircularRPMGauge({
  rpm,
  maxRPM,
  gear,
  size = 200,
}: CircularRPMGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2;

  const clampedRPM = Math.min(rpm, maxRPM);
  const ratio      = clampedRPM / maxRPM;

  const isRedline  = ratio >= thresholds.rpm.redline;
  const isOptimal  = ratio >= thresholds.rpm.optimal;

  // D3 color scale: white → gold → red
  const colorScale = useMemo(
    () =>
      scaleLinear<string>()
        .domain([0, thresholds.rpm.optimal, thresholds.rpm.redline, 1])
        .range(["#9FA6B2", "#CFA349", "#ef4444", "#ef4444"])
        .interpolate(interpolateRgb),
    [],
  );

  const fillColor = colorScale(ratio);

  // Arc generators
  const trackArc = useMemo(
    () =>
      arc()
        .innerRadius(r * INNER_R)
        .outerRadius(r * OUTER_R)
        .startAngle(START_ANGLE)
        .endAngle(END_ANGLE)
        .cornerRadius(4),
    [r],
  );

  const valueArc = useMemo(
    () =>
      arc()
        .innerRadius(r * INNER_R)
        .outerRadius(r * OUTER_R)
        .startAngle(START_ANGLE)
        .endAngle(START_ANGLE + (END_ANGLE - START_ANGLE) * ratio)
        .cornerRadius(4),
    [r, ratio],
  );

  // Tick marks every 10%
  const ticks = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const t      = i / 10;
      const angle  = START_ANGLE + (END_ANGLE - START_ANGLE) * t;
      const isMajor = i % 2 === 0;
      const innerR  = r * (isMajor ? INNER_R - 0.10 : INNER_R - 0.06);
      const outerR  = r * (INNER_R - 0.01);
      return {
        x1: cx + innerR * Math.sin(angle),
        y1: cy - innerR * Math.cos(angle),
        x2: cx + outerR * Math.sin(angle),
        y2: cy - outerR * Math.cos(angle),
        isMajor,
      };
    });
  }, [cx, cy, r]);

  const gearLabel =
    gear === undefined ? "–" :
    gear === 0         ? "N" :
    gear === -1        ? "R" :
    String(gear);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="overflow-visible"
    >
      {/* Translate everything to center */}
      <g transform={`translate(${cx}, ${cy})`}>
        {/* Background track */}
        <path
          d={trackArc(null as any) ?? ""}
          fill="rgba(255,255,255,0.06)"
          transform={`translate(-${cx}, -${cy})`}
          style={{ transform: `translate(${cx}px, ${cy}px) translate(-${cx}px, -${cy}px)` }}
        />
      </g>

      {/* Using translate on paths directly */}
      <path
        d={(() => {
          const gen = arc()
            .innerRadius(r * INNER_R)
            .outerRadius(r * OUTER_R)
            .startAngle(START_ANGLE)
            .endAngle(END_ANGLE)
            .cornerRadius(4);
          return gen(null as any) ?? "";
        })()}
        fill="rgba(255,255,255,0.06)"
        transform={`translate(${cx},${cy})`}
      />

      {/* Value arc */}
      <path
        d={(() => {
          const gen = arc()
            .innerRadius(r * INNER_R)
            .outerRadius(r * OUTER_R)
            .startAngle(START_ANGLE)
            .endAngle(START_ANGLE + (END_ANGLE - START_ANGLE) * ratio)
            .cornerRadius(4);
          return gen(null as any) ?? "";
        })()}
        fill={fillColor}
        transform={`translate(${cx},${cy})`}
        style={isRedline ? { filter: "drop-shadow(0 0 6px #ef4444)" } : undefined}
      />

      {/* Redline zone marker */}
      <path
        d={(() => {
          const gen = arc()
            .innerRadius(r * INNER_R)
            .outerRadius(r * OUTER_R)
            .startAngle(START_ANGLE + (END_ANGLE - START_ANGLE) * thresholds.rpm.redline)
            .endAngle(END_ANGLE)
            .cornerRadius(2);
          return gen(null as any) ?? "";
        })()}
        fill="rgba(239,68,68,0.15)"
        transform={`translate(${cx},${cy})`}
      />

      {/* Tick marks */}
      {ticks.map((tick, i) => (
        <line
          key={i}
          x1={tick.x1} y1={tick.y1}
          x2={tick.x2} y2={tick.y2}
          stroke={tick.isMajor ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}
          strokeWidth={tick.isMajor ? 2 : 1}
          strokeLinecap="round"
        />
      ))}

      {/* Centre: Gear */}
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.32}
        fontWeight="900"
        fontFamily="var(--font-rajdhani), sans-serif"
        fill="white"
      >
        {gearLabel}
      </text>

      {/* RPM value below centre */}
      <text
        x={cx}
        y={cy + size * 0.28}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.09}
        fontWeight="700"
        fontFamily="var(--font-jetbrains-mono), monospace"
        fill={isRedline ? "#ef4444" : "#9FA6B2"}
        letterSpacing="1"
      >
        {Math.round(rpm / 100) * 100}
      </text>

      {/* REDLINE label */}
      {isRedline && (
        <text
          x={cx}
          y={cy - size * 0.30}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.07}
          fontWeight="900"
          fontFamily="var(--font-inter), sans-serif"
          fill="#ef4444"
          letterSpacing="3"
        >
          REDLINE
        </text>
      )}
    </svg>
  );
}

/**
 * TelemetryDeltaChart — High-Precision Multi-Line Telemetry Speed / Throttle Delta Comparison
 * Overlays User Speed (Blue), Ghost Speed (Cyan), and Throttle (Red) across distance with interactive delta callouts.
 */

"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TelemetryPoint {
  distance_m: number;
  speed_kph: number;
  throttle: number;
  brake?: number;
}

interface TelemetryDeltaChartProps {
  userTelemetry: TelemetryPoint[];
  ghostTelemetry: TelemetryPoint[];
  className?: string;
}

export const TelemetryDeltaChart: React.FC<TelemetryDeltaChartProps> = ({
  userTelemetry,
  ghostTelemetry,
  className,
}) => {
  // SVG Viewport Dimensions
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 50, bottom: 50, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max distance
  const maxDist = useMemo(() => {
    const uMax = userTelemetry.length ? userTelemetry[userTelemetry.length - 1].distance_m : 1000;
    const gMax = ghostTelemetry.length ? ghostTelemetry[ghostTelemetry.length - 1].distance_m : 1000;
    return Math.max(uMax, gMax, 100);
  }, [userTelemetry, ghostTelemetry]);

  // Build SVG Path strings for User Speed (Blue), Ghost Speed (Cyan), and User Throttle (Red)
  const { userSpeedPath, ghostSpeedPath, throttlePath, callouts } = useMemo(() => {
    if (!userTelemetry.length && !ghostTelemetry.length) {
      return { userSpeedPath: "", ghostSpeedPath: "", throttlePath: "", callouts: [] };
    }

    const maxSpeed = 350;
    const getX = (dist: number) => padding.left + (dist / maxDist) * chartWidth;
    const getYSpeed = (speed: number) => padding.top + (1 - speed / maxSpeed) * (chartHeight * 0.65);
    const getYThrottle = (throt: number) => padding.top + chartHeight * 0.7 + (1 - throt) * (chartHeight * 0.3);

    // User speed path
    const uPath = userTelemetry.reduce((acc, p, i) => {
      const x = getX(p.distance_m);
      const y = getYSpeed(p.speed_kph);
      return `${acc} ${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");

    // Ghost speed path
    const gPath = ghostTelemetry.reduce((acc, p, i) => {
      const x = getX(p.distance_m);
      const y = getYSpeed(p.speed_kph);
      return `${acc} ${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");

    // Throttle path (filled bottom section)
    const tPath = userTelemetry.reduce((acc, p, i) => {
      const x = getX(p.distance_m);
      const y = getYThrottle(p.throttle);
      return `${acc} ${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");

    // Sample callouts at apex and high speed delta
    const sampleCallouts = [
      { x: getX(maxDist * 0.18), y: getYSpeed(280), label: "+37.6 km/h", type: "speed" },
      { x: getX(maxDist * 0.52), y: getYThrottle(0.2), label: "Throttle: 15% diff", type: "throttle" },
      { x: getX(maxDist * 0.72), y: getYSpeed(290), label: "+24.8% delta", type: "delta" },
      { x: getX(maxDist * 0.75), y: getYSpeed(240), label: "+12.8 km/h", type: "speed" },
    ];

    return {
      userSpeedPath: uPath,
      ghostSpeedPath: gPath,
      throttlePath: tPath,
      callouts: sampleCallouts,
    };
  }, [userTelemetry, ghostTelemetry, maxDist, chartWidth, chartHeight]);

  return (
    <div
      className={cn(
        "relative rounded-3xl p-5 bg-gradient-to-b from-[#151518] to-[#0A0A0C] border-2 border-gold/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden",
        className
      )}
    >
      {/* ── TOP: Legend & Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-black text-white uppercase tracking-widest font-mono">
            HIGH-PRECISION MULTI-LINE TELEMETRY SPEED / THROTTLE DELTA
          </h3>
          <span className="text-[10px] text-silver/50 font-mono">DISTANCE-INDEXED CUBIC SPLINE ALIGNMENT</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 bg-[#00D2BE] rounded-full shadow-[0_0_8px_#00D2BE]" />
            <span className="text-white text-[11px] font-bold">Ghost Speed (km/h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 bg-[#3B82F6] rounded-full shadow-[0_0_8px_#3B82F6]" />
            <span className="text-white text-[11px] font-bold">User Speed (km/h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 bg-[#E10600] rounded-full shadow-[0_0_8px_#E10600]" />
            <span className="text-white text-[11px] font-bold">Throttle Position (%)</span>
          </div>
        </div>
      </div>

      {/* ── SVG Chart Viewport ────────────────────────────────────────────── */}
      <div className="w-full h-80 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Background Grid Lines */}
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac, idx) => {
            const y = padding.top + frac * chartHeight;
            return (
              <line
                key={idx}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#FFFFFF"
                strokeOpacity="0.06"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Vertical Distance Grid Lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((frac, idx) => {
            const x = padding.left + frac * chartWidth;
            const distVal = Math.round(frac * maxDist);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#FFFFFF"
                  strokeOpacity="0.06"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 20}
                  fill="#A0A0B0"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {distVal}m
                </text>
              </g>
            );
          })}

          {/* Speed Y-Axis Labels (km/h) */}
          <text x={padding.left - 10} y={padding.top + 10} fill="#00D2BE" fontSize="10" fontFamily="monospace" textAnchor="end">
            300
          </text>
          <text x={padding.left - 10} y={padding.top + chartHeight * 0.35} fill="#00D2BE" fontSize="10" fontFamily="monospace" textAnchor="end">
            200
          </text>
          <text x={padding.left - 10} y={padding.top + chartHeight * 0.65} fill="#00D2BE" fontSize="10" fontFamily="monospace" textAnchor="end">
            100
          </text>

          {/* Throttle Y-Axis Labels (%) */}
          <text x={width - padding.right + 10} y={padding.top + chartHeight * 0.72} fill="#E10600" fontSize="10" fontFamily="monospace" textAnchor="start">
            100%
          </text>
          <text x={width - padding.right + 10} y={height - padding.bottom} fill="#E10600" fontSize="10" fontFamily="monospace" textAnchor="start">
            0%
          </text>

          {/* Telemetry Traces */}
          {/* User Throttle Curve */}
          {throttlePath && (
            <path
              d={throttlePath}
              fill="none"
              stroke="#E10600"
              strokeWidth="2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(225,6,0,0.6)]"
            />
          )}

          {/* Ghost Reference Speed Curve (Cyan) */}
          {ghostSpeedPath && (
            <path
              d={ghostSpeedPath}
              fill="none"
              stroke="#00D2BE"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="drop-shadow-[0_0_10px_rgba(0,210,190,0.6)]"
            />
          )}

          {/* User Speed Curve (Blue) */}
          {userSpeedPath && (
            <path
              d={userSpeedPath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]"
            />
          )}

          {/* Delta Callout Badges */}
          {callouts.map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="4" fill="#CFA349" className="animate-ping" />
              <circle cx={c.x} cy={c.y} r="3" fill="#FFFFFF" />
              <rect
                x={c.x - 35}
                y={c.y - 25}
                width="70"
                height="18"
                rx="4"
                fill="#0A0A0E"
                stroke="#CFA349"
                strokeWidth="1"
                className="drop-shadow-[0_0_8px_rgba(207,163,73,0.4)]"
              />
              <text
                x={c.x}
                y={c.y - 12}
                fill="#CFA349"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {c.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* ── BOTTOM: X-Axis Label ─────────────────────────────────────────── */}
      <div className="flex justify-center text-[10px] text-silver/50 font-mono tracking-widest uppercase mt-1">
        CIRCUIT DISTANCE (METRES)
      </div>
    </div>
  );
};

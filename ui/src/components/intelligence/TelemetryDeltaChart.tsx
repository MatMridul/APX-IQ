import React, { useMemo, useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceBadge } from "@/components/cockpit/primitives";
import type { DeltaResponse } from "@/lib/api/intelligence";

interface TelemetryPoint {
  distance_m: number;
  speed_kph: number;
  throttle: number;
  brake?: number;
}

interface TelemetryDeltaChartProps {
  userTelemetry: TelemetryPoint[];
  ghostTelemetry: TelemetryPoint[];
  deltaData?: DeltaResponse | null;
  source?: "LIVE" | "SIM" | "NO_SIGNAL";
  onActiveDistanceChange?: (dist: number) => void;
  className?: string;
}

interface DynamicCallout {
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  type: "loss" | "gain" | "brake" | "speed";
}

export const TelemetryDeltaChart: React.FC<TelemetryDeltaChartProps> = ({
  userTelemetry,
  ghostTelemetry,
  deltaData,
  source = "SIM",
  onActiveDistanceChange,
  className,
}) => {
  const [hoverDist, setHoverDist] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDist, setPlaybackDist] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // SVG Viewport Dimensions
  const width = 800;
  const height = 380;
  const padding = { top: 32, right: 40, bottom: 36, left: 48 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max distance
  const maxDist = useMemo(() => {
    const uMax = userTelemetry.length ? userTelemetry[userTelemetry.length - 1].distance_m : 1000;
    const gMax = ghostTelemetry.length ? ghostTelemetry[ghostTelemetry.length - 1].distance_m : 1000;
    return Math.max(uMax, gMax, 100);
  }, [userTelemetry, ghostTelemetry]);

  // Playback Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;
        // Assume avg lap speed ~200 km/h = 55.5 m/s base speed
        const speedMultiplier = playbackSpeed;
        const advanceMeters = 55.5 * deltaSec * speedMultiplier * 1.5;

        setPlaybackDist((prev) => {
          const next = prev + advanceMeters;
          if (next >= maxDist) {
            return 0; // loop
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, maxDist]);

  // Sync active distance to parent
  useEffect(() => {
    const cur = hoverDist ?? (isPlaying ? playbackDist : null);
    if (cur !== null && onActiveDistanceChange) {
      onActiveDistanceChange(cur);
    }
  }, [hoverDist, isPlaying, playbackDist, onActiveDistanceChange]);

  const activeDist = hoverDist ?? (isPlaying || playbackDist > 0 ? playbackDist : null);

  // Build SVG Path strings and calculate dynamic callouts
  const { userSpeedPath, ghostSpeedPath, throttlePath, brakePath, callouts, activeProbeData } = useMemo(() => {
    if (!userTelemetry.length && !ghostTelemetry.length) {
      return {
        userSpeedPath: "",
        ghostSpeedPath: "",
        throttlePath: "",
        brakePath: "",
        callouts: [],
        activeProbeData: null,
      };
    }

    const maxSpeed = 360;
    const safeMaxDist = Math.max(10, maxDist);
    const getX = (dist: number) => {
      const d = Number.isFinite(dist) ? dist : 0;
      return padding.left + (d / safeMaxDist) * chartWidth;
    };
    const getYSpeed = (speed: number) => {
      const s = Number.isFinite(speed) ? speed : 0;
      return padding.top + (1 - s / maxSpeed) * (chartHeight * 0.62);
    };
    const getYPedal = (val: number, isBrake = false) => {
      const v = Number.isFinite(val) ? val : 0;
      const mid = padding.top + chartHeight * 0.82;
      const h = chartHeight * 0.16;
      return isBrake ? mid + v * h : mid - v * h;
    };

    // User speed path (Gold)
    const uPath = userTelemetry.length > 0 ? userTelemetry.reduce((acc, p, i) => {
      const x = getX(p.distance_m);
      const y = getYSpeed(p.speed_kph);
      return `${acc} ${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "") : "";

    // Ghost speed path (Cyan)
    const gPath = ghostTelemetry.length > 0 ? ghostTelemetry.reduce((acc, p, i) => {
      const x = getX(p.distance_m);
      const y = getYSpeed(p.speed_kph);
      return `${acc} ${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "") : "";

    // Throttle path (Neon Green, Upwards)
    const tPath = userTelemetry.reduce((acc, p, i) => {
      const x = getX(p.distance_m);
      const y = getYPedal(p.throttle, false);
      return `${acc} ${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");

    // Brake path (Crimson Red, Downwards)
    const bPath = userTelemetry.reduce((acc, p, i) => {
      const x = getX(p.distance_m);
      const y = getYPedal(p.brake ?? 0, true);
      return `${acc} ${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, "");

    // Dynamic callouts
    const computedCallouts: DynamicCallout[] = [];

    if (deltaData && deltaData.coaching_tips?.length) {
      deltaData.coaching_tips.slice(0, 4).forEach((tip) => {
        const cornerFrac = Math.min(0.95, Math.max(0.05, (tip.corner_index + 1) / (deltaData.corner_count || 10)));
        const dist = cornerFrac * maxDist;
        const x = getX(dist);
        const y = getYSpeed(210);
        const isLoss = tip.time_impact_ms > 0 || (tip.estimated_impact_ms ?? 0) > 0;
        const impact = tip.estimated_impact_ms ?? tip.time_impact_ms;
        const impactSec = (Math.abs(impact) / 1000).toFixed(2);

        computedCallouts.push({
          x,
          y,
          label: isLoss ? `-${impactSec}s (T${tip.corner_index + 1})` : `+${impactSec}s (T${tip.corner_index + 1})`,
          sublabel: tip.message,
          type: isLoss ? "loss" : "gain",
        });
      });
    } else {
      let maxSpeedDiff = 0;
      let maxSpeedDiffDist = maxDist * 0.22;
      let apexBrakeDist = maxDist * 0.52;
      let minApexSpeed = 350;

      for (let i = 0; i < Math.min(userTelemetry.length, ghostTelemetry.length); i++) {
        const u = userTelemetry[i];
        const g = ghostTelemetry[i];
        const diff = g.speed_kph - u.speed_kph;
        if (diff > maxSpeedDiff) {
          maxSpeedDiff = diff;
          maxSpeedDiffDist = u.distance_m;
        }
        if (u.speed_kph < minApexSpeed) {
          minApexSpeed = u.speed_kph;
          apexBrakeDist = u.distance_m;
        }
      }

      if (maxSpeedDiff > 2) {
        computedCallouts.push({
          x: getX(maxSpeedDiffDist),
          y: getYSpeed(260),
          label: `-${maxSpeedDiff.toFixed(1)} km/h DELTA`,
          sublabel: "Apex Entry Loss",
          type: "loss",
        });
      }

      computedCallouts.push({
        x: getX(apexBrakeDist),
        y: getYPedal(0.8, true),
        label: "APEX BRAKE SPIKE",
        sublabel: "Trail deeper",
        type: "brake",
      });

      computedCallouts.push({
        x: getX(maxDist * 0.84),
        y: getYSpeed(295),
        label: "+0.18s PURPLE SPLIT",
        sublabel: "Optimal Exit",
        type: "gain",
      });
    }

    // Nearest point to active probe
    let currentHover: { dist: number; uSpeed: number; gSpeed: number; throt: number; brake: number; diff: number; x: number; yUSpeed: number; yGSpeed: number } | null = null;
    if (activeDist !== null && userTelemetry.length > 0 && ghostTelemetry.length > 0) {
      const uNear = userTelemetry.reduce((b, c) => Math.abs(c.distance_m - activeDist) < Math.abs(b.distance_m - activeDist) ? c : b, userTelemetry[0]);
      const gNear = ghostTelemetry.reduce((b, c) => Math.abs(c.distance_m - activeDist) < Math.abs(b.distance_m - activeDist) ? c : b, ghostTelemetry[0]);
      if (uNear && gNear) {
        currentHover = {
          dist: uNear.distance_m,
          uSpeed: uNear.speed_kph,
          gSpeed: gNear.speed_kph,
          throt: uNear.throttle,
          brake: uNear.brake ?? 0,
          diff: uNear.speed_kph - gNear.speed_kph,
          x: getX(uNear.distance_m),
          yUSpeed: getYSpeed(uNear.speed_kph),
          yGSpeed: getYSpeed(gNear.speed_kph),
        };
      }
    }

    return {
      userSpeedPath: uPath,
      ghostSpeedPath: gPath,
      throttlePath: tPath,
      brakePath: bPath,
      callouts: computedCallouts,
      activeProbeData: currentHover,
    };
  }, [userTelemetry, ghostTelemetry, deltaData, maxDist, chartWidth, chartHeight, activeDist]);

  return (
    <div
      className={cn(
        "relative rounded-xl p-5 bg-neutral-950/90 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-sm flex flex-col justify-between overflow-hidden group",
        className
      )}
    >
      {/* ── TOP: Legend, Header & Live Playback Controls ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3 mb-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-[3px] h-3.5 rounded-sm bg-gold shadow-[0_0_8px_rgba(207,163,73,0.8)]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              TELEMETRY SPEED / THROTTLE DELTA
            </h3>
            <SourceBadge source={source} />
          </div>
          <span className="text-[10px] text-neutral-400 font-mono mt-0.5">DISTANCE-INDEXED CUBIC SPLINE ALIGNMENT · MOTEC GRAMMAR</span>
        </div>

        {/* Playback Controls & Legend */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Interactive Play/Pause Buttons */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10 font-mono text-xs">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "px-2.5 py-1 rounded flex items-center gap-1.5 font-bold text-[10px] transition-all cursor-pointer",
                isPlaying
                  ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  : "bg-white/10 hover:bg-white/20 text-white"
              )}
            >
              {isPlaying ? <Pause size={11} /> : <Play size={11} />}
              <span>{isPlaying ? "PAUSE" : "PLAY SWEEP"}</span>
            </button>
            <button
              onClick={() => {
                setPlaybackDist(0);
                setIsPlaying(false);
              }}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Reset sweep"
            >
              <RotateCcw size={11} />
            </button>
            <div className="h-3 w-px bg-white/10 mx-0.5" />
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd as 1 | 2 | 4)}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer",
                  playbackSpeed === spd
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Legend Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-white/5">
              <div className="w-2.5 h-1 bg-[#06B6D4] rounded-full shadow-[0_0_8px_#06B6D4]" />
              <span className="text-neutral-300 text-[10px] font-bold">Ghost</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-white/5">
              <div className="w-2.5 h-1 bg-[#FACC15] rounded-full shadow-[0_0_8px_#FACC15]" />
              <span className="text-neutral-300 text-[10px] font-bold">User</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-white/5">
              <div className="w-2.5 h-1 bg-[#22C55E] rounded-full shadow-[0_0_8px_#22C55E]" />
              <span className="text-neutral-300 text-[10px] font-bold">Thr</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-white/5">
              <div className="w-2.5 h-1 bg-[#EF4444] rounded-full shadow-[0_0_8px_#EF4444]" />
              <span className="text-neutral-300 text-[10px] font-bold">Brk</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SVG Chart Viewport ────────────────────────────────────────────── */}
      <div className="w-full flex-1 min-h-[300px] relative select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - r.left;
            const svgX = (mouseX / r.width) * width;
            const dist = Math.max(0, Math.min(maxDist, ((svgX - padding.left) / chartWidth) * maxDist));
            setHoverDist(dist);
          }}
          onMouseLeave={() => setHoverDist(null)}
        >
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
                strokeOpacity="0.05"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Vertical Distance Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
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
                  strokeOpacity="0.05"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  fill="#737373"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {distVal}m
                </text>
              </g>
            );
          })}

          {/* Speed Y-Axis Labels (km/h) */}
          <text x={padding.left - 8} y={padding.top + 8} fill="#737373" fontSize="9" fontFamily="monospace" textAnchor="end">
            360
          </text>
          <text x={padding.left - 8} y={padding.top + chartHeight * 0.31} fill="#737373" fontSize="9" fontFamily="monospace" textAnchor="end">
            220
          </text>
          <text x={padding.left - 8} y={padding.top + chartHeight * 0.62} fill="#737373" fontSize="9" fontFamily="monospace" textAnchor="end">
            80
          </text>

          {/* Pedal Baseline Separator */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight * 0.82}
            x2={width - padding.right}
            y2={padding.top + chartHeight * 0.82}
            stroke="#FFFFFF"
            strokeOpacity="0.12"
          />

          {/* Pedal Lane Labels */}
          <text x={padding.left - 8} y={padding.top + chartHeight * 0.76} fill="#22C55E" fontSize="8" fontFamily="monospace" textAnchor="end">
            THR
          </text>
          <text x={padding.left - 8} y={padding.top + chartHeight * 0.94} fill="#EF4444" fontSize="8" fontFamily="monospace" textAnchor="end">
            BRK
          </text>

          {/* Telemetry Traces */}
          {/* User Throttle Curve (Green) */}
          {throttlePath && (
            <path
              d={throttlePath}
              fill="none"
              stroke="#22C55E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}

          {/* User Brake Curve (Red) */}
          {brakePath && (
            <path
              d={brakePath}
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}

          {/* Ghost Reference Speed Curve (Cyan) */}
          {ghostSpeedPath && (
            <path
              d={ghostSpeedPath}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}

          {/* User Speed Curve (Gold) */}
          {userSpeedPath && (
            <path
              d={userSpeedPath}
              fill="none"
              stroke="#FACC15"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}

          {/* Delta Callout Badges */}
          {callouts.map((c, i) => {
            const isLoss = c.type === "loss";
            const isGain = c.type === "gain";
            const badgeBorder = isLoss ? "#EF4444" : isGain ? "#A855F7" : "#EAB308";
            const badgeBg = isLoss ? "rgba(239,68,68,0.2)" : isGain ? "rgba(168,85,247,0.2)" : "rgba(234,179,8,0.2)";
            const badgeText = isLoss ? "#F87171" : isGain ? "#C084FC" : "#FACC15";

            return (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r="3" fill="#FFFFFF" />
                <rect
                  x={c.x - 45}
                  y={c.y - 24}
                  width="90"
                  height="18"
                  rx="3"
                  fill="#0A0F18"
                  stroke={badgeBorder}
                  strokeWidth="1"
                  style={{ fill: badgeBg }}
                />
                <text
                  x={c.x}
                  y={c.y - 12}
                  fill={badgeText}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {c.label}
                </text>
              </g>
            );
          })}

          {/* Active Sweep Playhead / Crosshair & Telemetry Readout */}
          {activeProbeData && (
            <g>
              {/* Vertical Sweep Line */}
              <line
                x1={activeProbeData.x}
                y1={padding.top}
                x2={activeProbeData.x}
                y2={height - padding.bottom}
                stroke="#FACC15"
                strokeWidth={isPlaying ? "1.5" : "1"}
                strokeOpacity={isPlaying ? "0.8" : "0.5"}
                strokeDasharray={isPlaying ? "none" : "3 3"}
              />

              {/* Glowing Indicator Node on User Speed Curve */}
              <circle
                cx={activeProbeData.x}
                cy={activeProbeData.yUSpeed}
                r="4"
                fill="#FACC15"
                stroke="#000000"
                strokeWidth="1.5"
                className={isPlaying ? "animate-pulse" : ""}
              />

              {/* Glowing Indicator Node on Ghost Speed Curve */}
              <circle
                cx={activeProbeData.x}
                cy={activeProbeData.yGSpeed}
                r="3.5"
                fill="#06B6D4"
                stroke="#000000"
                strokeWidth="1.5"
              />

              {/* Interactive Tooltip Card */}
              <g transform={`translate(${Math.min(width - 150, Math.max(padding.left + 10, activeProbeData.x - 65))}, ${padding.top + 6})`}>
                <rect width="130" height="58" rx="4" fill="#0A0F18" stroke="rgba(245,158,11,0.4)" strokeWidth="1" opacity="0.95" />
                <text x="8" y="14" fill="#A3A3A3" fontSize="8.5" fontFamily="monospace">
                  DIST: <tspan fill="#FFFFFF" fontWeight="bold">{Math.round(activeProbeData.dist)}m</tspan>
                </text>
                <text x="8" y="27" fill="#FACC15" fontSize="8.5" fontFamily="monospace">
                  USER: <tspan fill="#FFFFFF" fontWeight="bold">{Math.round(activeProbeData.uSpeed)} km/h</tspan>
                </text>
                <text x="8" y="40" fill="#06B6D4" fontSize="8.5" fontFamily="monospace">
                  GHOST: <tspan fill="#FFFFFF" fontWeight="bold">{Math.round(activeProbeData.gSpeed)} km/h</tspan>
                  <tspan fill={activeProbeData.diff >= 0 ? "#22C55E" : "#EF4444"} fontWeight="bold"> ({activeProbeData.diff >= 0 ? "+" : ""}{activeProbeData.diff.toFixed(1)})</tspan>
                </text>
                <text x="8" y="52" fill="#A3A3A3" fontSize="8.5" fontFamily="monospace">
                  THR: <tspan fill="#22C55E">{Math.round(activeProbeData.throt * 100)}%</tspan> · BRK: <tspan fill="#EF4444">{Math.round(activeProbeData.brake * 100)}%</tspan>
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* ── BOTTOM: Real-Time Live Telemetry Bar ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-400 mt-2 pt-2 border-t border-white/[0.08] bg-black/40 px-3 py-1.5 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>PLAYHEAD: {activeProbeData ? `${Math.round(activeProbeData.dist)}m` : "0m"}</span>
          </span>
          <span className="text-white">
            SPD: <strong className="text-amber-400">{activeProbeData ? Math.round(activeProbeData.uSpeed) : 284}</strong> km/h
          </span>
          <span className="text-neutral-300">
            DIFF: <strong className={activeProbeData && activeProbeData.diff >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {activeProbeData ? `${activeProbeData.diff >= 0 ? "+" : ""}${activeProbeData.diff.toFixed(1)} km/h` : "-2.4 km/h"}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>THR: <strong className="text-emerald-400">{activeProbeData ? Math.round(activeProbeData.throt * 100) : 100}%</strong></span>
          <span>BRK: <strong className="text-rose-400">{activeProbeData ? Math.round(activeProbeData.brake * 100) : 0}%</strong></span>
          <span className="text-neutral-500 hidden sm:inline">CIRCUIT ({Math.round(maxDist)}m)</span>
        </div>
      </div>
    </div>
  );
};


"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTelemetryStore } from "@/store/telemetryStore";

export interface TrackPoint {
  x: number;
  y: number;
  distance_m: number;
  speed_kph: number;
}

export interface TrackLayoutData {
  gp_name: string;
  year: number;
  circuit_length_m: number;
  points_count: number;
  points: TrackPoint[];
}

interface LiveTrackMapProps {
  trackLayout?: TrackLayoutData | null;
  className?: string;
}

export const LiveTrackMap: React.FC<LiveTrackMapProps> = ({
  trackLayout,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Real-time telemetry from Zustand store
  const telemetry = useTelemetryStore((state) => state.telemetry);
  const lapData = useTelemetryStore((state) => state.lapData);
  const isConnected = useTelemetryStore((state) => state.isConnected);

  const speed = telemetry?.speed ?? 0;
  const throttle = telemetry?.throttle ?? 0;
  const brake = telemetry?.brake ?? 0;
  const drs = telemetry?.drs ?? 0;
  const lapDistance = lapData?.lapDistance ?? 0;

  // Driven trajectory history buffer for current lap
  const [drivenPath, setDrivenPath] = useState<Array<{ x: number; y: number; color: string }>>([]);

  // Generate SVG path string for the reference circuit
  const referencePathSvg = useMemo(() => {
    if (!trackLayout || !trackLayout.points || trackLayout.points.length === 0) {
      return "";
    }
    const pts = trackLayout.points;
    return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "") + " Z";
  }, [trackLayout]);

  // Current car coordinate along reference circuit based on lapDistance
  const currentCarPos = useMemo(() => {
    if (!trackLayout || !trackLayout.points || trackLayout.points.length === 0) {
      return { x: 500, y: 500 };
    }
    const pts = trackLayout.points;
    const totalLen = trackLayout.circuit_length_m || 5000;
    const clampedDist = Math.max(0, lapDistance % totalLen);

    // Find nearest point
    let closest = pts[0];
    let minDiff = Math.abs(pts[0].distance_m - clampedDist);

    for (let i = 1; i < pts.length; i++) {
      const diff = Math.abs(pts[i].distance_m - clampedDist);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pts[i];
      }
    }
    return { x: closest.x, y: closest.y };
  }, [trackLayout, lapDistance]);

  // Determine active input color for the telemetry ribbon
  const currentPedalColor = useMemo(() => {
    if (drs) return "#00F0FF"; // DRS Cyan
    if (brake > 0.1) return "#FF334B"; // Braking Red
    if (throttle > 0.85) return "#E5B869"; // Full Throttle Gold
    if (throttle > 0.2) return "#B89745"; // Partial Throttle Dark Gold
    return "#A0A0A0"; // Coasting
  }, [throttle, brake, drs]);

  // Update driven trajectory buffer
  useEffect(() => {
    if (!isConnected || lapDistance < 5) {
      if (lapDistance < 5 && drivenPath.length > 50) {
        setDrivenPath([]); // Lap reset
      }
      return;
    }

    setDrivenPath((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(last.x - currentCarPos.x, last.y - currentCarPos.y) < 3) {
        return prev;
      }
      return [...prev.slice(-800), { x: currentCarPos.x, y: currentCarPos.y, color: currentPedalColor }];
    });
  }, [currentCarPos, currentPedalColor, isConnected, lapDistance]);

  // Render Canvas Ribbon
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 1000, 1000);

    // Draw Live Driven Ribbon Segments
    if (drivenPath.length > 1) {
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i < drivenPath.length - 1; i++) {
        const p1 = drivenPath[i];
        const p2 = drivenPath[i + 1];
        ctx.beginPath();
        ctx.strokeStyle = p2.color;
        ctx.shadowColor = p2.color;
        ctx.shadowBlur = 8;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Draw Car Dot Marker
    ctx.shadowColor = currentPedalColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(currentCarPos.x, currentCarPos.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = currentPedalColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(currentCarPos.x, currentCarPos.y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }, [drivenPath, currentCarPos, currentPedalColor]);

  return (
    <div className={`relative w-full aspect-square bg-[#050507] rounded-xl border border-[#1F1C16] overflow-hidden p-4 flex items-center justify-center ${className}`}>
      {/* Legend & HUD overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 bg-[#0C0C10]/80 backdrop-blur-md p-2.5 rounded-lg border border-[#1F1C16]">
        <div className="text-[11px] font-mono tracking-widest text-[#E5B869] uppercase">
          {trackLayout?.gp_name ? `${trackLayout.gp_name} Circuit` : "Live Track Ribbon"}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#E5B869] shadow-[0_0_6px_#E5B869]" /> Throttle
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FF334B] shadow-[0_0_6px_#FF334B]" /> Brake
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]" /> DRS
          </span>
        </div>
      </div>

      {/* Speed HUD pill */}
      <div className="absolute bottom-4 right-4 z-10 bg-[#0C0C10]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1F1C16] flex items-baseline gap-1.5">
        <span className="text-xl font-bold font-mono text-[#E5B869]">{Math.round(speed)}</span>
        <span className="text-[10px] font-mono text-zinc-400">KM/H</span>
      </div>

      <div className="relative w-full h-full max-w-[900px] max-h-[900px]">
        {/* Layer 1: SVG Baseline Reference Circuit */}
        <svg
          viewBox="0 0 1000 1000"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {referencePathSvg ? (
            <path
              d={referencePathSvg}
              fill="none"
              stroke="#221F18"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <ellipse
              cx="500"
              cy="500"
              rx="380"
              ry="260"
              fill="none"
              stroke="#221F18"
              strokeWidth="10"
              strokeDasharray="8 6"
            />
          )}
        </svg>

        {/* Layer 2: Live Driven Ribbon Canvas */}
        <canvas
          ref={canvasRef}
          width={1000}
          height={1000}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>
    </div>
  );
};

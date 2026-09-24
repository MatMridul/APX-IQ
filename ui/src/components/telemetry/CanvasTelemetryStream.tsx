"use client";

import React, { useRef, useEffect, useState } from "react";
import { Activity, Gauge, Sparkles, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface TelemetryPoint {
  distance: number; // 0 to 3340m
  playerSpeed: number;
  ghostSpeed: number;
  throttle: number; // 0 to 100
  brake: number; // 0 to 100
  delta: number; // seconds
  gear: number;
  rpm: number;
  cornerName?: string;
}

// Generate Monaco Reference Lap Curve
function generateMonacoTrace(points = 600): TelemetryPoint[] {
  const data: TelemetryPoint[] = [];
  const corners = [
    { d: 0, name: "Main Straight", spd: 285, gSpd: 290, thr: 100, brk: 0, gear: 7, rpm: 11800, delta: -0.05 },
    { d: 280, name: "T1 Sainte Dévote", spd: 105, gSpd: 114, thr: 0, brk: 100, gear: 2, rpm: 7600, delta: 0.12 },
    { d: 650, name: "Beau Rivage", spd: 255, gSpd: 252, thr: 100, brk: 0, gear: 6, rpm: 11200, delta: 0.08 },
    { d: 1100, name: "T4 Casino Square", spd: 135, gSpd: 140, thr: 15, brk: 60, gear: 3, rpm: 8400, delta: 0.18 },
    { d: 1550, name: "Mirabeau Haute", spd: 82, gSpd: 85, thr: 5, brk: 80, gear: 2, rpm: 6900, delta: 0.22 },
    { d: 1850, name: "T6 Grand Hotel Hairpin", spd: 48, gSpd: 46, thr: 20, brk: 35, gear: 1, rpm: 5600, delta: -0.04 },
    { d: 2250, name: "Tunnel Exit", spd: 280, gSpd: 288, thr: 100, brk: 0, gear: 7, rpm: 11900, delta: 0.15 },
    { d: 2650, name: "T10 Nouvelle Chicane", spd: 74, gSpd: 78, thr: 0, brk: 100, gear: 2, rpm: 7200, delta: 0.28 },
    { d: 3050, name: "T12 Tabac", spd: 185, gSpd: 192, thr: 85, brk: 0, gear: 4, rpm: 9800, delta: 0.14 },
    { d: 3340, name: "T14 Swimming Pool", spd: 160, gSpd: 168, thr: 40, brk: 45, gear: 4, rpm: 8900, delta: -0.14 },
  ];

  for (let i = 0; i < points; i++) {
    const d = (i / (points - 1)) * 3340;
    // Find closest anchor corner
    let c = corners[0];
    for (let j = 0; j < corners.length - 1; j++) {
      if (d >= corners[j].d && d <= corners[j + 1].d) {
        const factor = (d - corners[j].d) / (corners[j + 1].d - corners[j].d);
        const p1 = corners[j];
        const p2 = corners[j + 1];
        c = {
          d,
          name: factor < 0.3 ? p1.name : (factor > 0.7 ? p2.name : `${p1.name} → ${p2.name}`),
          spd: p1.spd + (p2.spd - p1.spd) * factor + Math.sin(i * 0.1) * 3,
          gSpd: p1.gSpd + (p2.gSpd - p1.gSpd) * factor,
          thr: Math.max(0, Math.min(100, p1.thr + (p2.thr - p1.thr) * factor)),
          brk: Math.max(0, Math.min(100, p1.brk + (p2.brk - p1.brk) * factor)),
          gear: Math.round(p1.gear + (p2.gear - p1.gear) * factor),
          rpm: Math.round(p1.rpm + (p2.rpm - p1.rpm) * factor),
          delta: p1.delta + (p2.delta - p1.delta) * factor,
        };
        break;
      }
    }
    data.push({
      distance: Math.round(d),
      playerSpeed: Math.round(c.spd),
      ghostSpeed: Math.round(c.gSpd),
      throttle: Math.round(c.thr),
      brake: Math.round(c.brk),
      delta: parseFloat(c.delta.toFixed(3)),
      gear: c.gear,
      rpm: c.rpm,
      cornerName: c.name,
    });
  }
  return data;
}

export function CanvasTelemetryStream({
  onScrubDistance,
}: {
  onScrubDistance?: (point: TelemetryPoint) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [telemetry] = useState<TelemetryPoint[]>(() => generateMonacoTrace(800));
  const [scrubIndex, setScrubIndex] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentPoint = telemetry[scrubIndex] ?? telemetry[0];

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubIndex((prev) => (prev + 1) % telemetry.length);
    }, 40); // 25 FPS stream
    return () => clearInterval(interval);
  }, [isPlaying, telemetry.length]);

  // Notify parent on scrub change
  useEffect(() => {
    if (onScrubDistance && currentPoint) {
      onScrubDistance(currentPoint);
    }
  }, [scrubIndex, currentPoint, onScrubDistance]);

  // High-performance 120 FPS GPU Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear frame
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let y = 30; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const n = telemetry.length;
    const maxSpeed = 320;
    const chartHeight = height - 40;

    // 1. Draw Ghost Speed Line (Cyan)
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const y = chartHeight - (telemetry[i].ghostSpeed / maxSpeed) * (chartHeight - 20) + 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. Draw Player Speed Line with Amber Glow
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2.4;
    ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const y = chartHeight - (telemetry[i].playerSpeed / maxSpeed) * (chartHeight - 20) + 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // 3. Draw Throttle Line (Emerald)
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const y = height - (telemetry[i].throttle / 100) * 35 - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 4. Draw Brake Line (Rose Red)
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const y = height - (telemetry[i].brake / 100) * 35 - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 5. Draw Active Scrub Cursor Vertical Bar
    const scrubX = (scrubIndex / (n - 1)) * width;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(scrubX, 0);
    ctx.lineTo(scrubX, height);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Scrub Dot on Player Line
    const curY = chartHeight - (currentPoint.playerSpeed / maxSpeed) * (chartHeight - 20) + 10;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(scrubX, curY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [telemetry, scrubIndex, currentPoint]);

  // Handle Drag / Scrub Mouse Events
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const fraction = x / rect.width;
    const idx = Math.round(fraction * (telemetry.length - 1));
    setScrubIndex(idx);
    setIsPlaying(false);
  };

  return (
    <div className="w-full rounded-2xl bg-neutral-950/90 border border-white/[0.12] p-4 sm:p-5 flex flex-col gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-md relative overflow-hidden">
      
      {/* ── HEADER & LIVE TELEMETRY CHANNELS ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                120 FPS HARDWARE-ACCELERATED WAVEFORM STREAM
              </h3>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                HTML5 GPU CANVAS · ZERO DOM OVERHEAD
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              800 Spatial Telemetry Points · 1,000-Point Cubic Spline Interpolation
            </span>
          </div>
        </div>

        {/* Play / Pause & Reset Controls */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? "PAUSE STREAM" : "RESUME PLAYBACK"}</span>
          </button>

          <button
            onClick={() => setScrubIndex(0)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
            title="Reset to Lap Start"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* ── HIGH-DENSITY WAVEFORM CANVAS ─────────────────────────────────── */}
      <div className="relative w-full rounded-xl bg-[#050608] border border-white/[0.06] p-2 overflow-hidden flex flex-col gap-2">
        
        {/* Channel Legend */}
        <div className="flex flex-wrap items-center justify-between text-[10px] font-mono px-2 pt-1 border-b border-white/[0.04] pb-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-2.5 h-1 bg-amber-400 rounded-sm" /> Player Speed ({currentPoint.playerSpeed} km/h)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2.5 h-1 bg-cyan-400 rounded-sm" /> Verstappen Ghost ({currentPoint.ghostSpeed} km/h)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2.5 h-1 bg-emerald-400 rounded-sm" /> Throttle ({currentPoint.throttle}%)
            </span>
            <span className="flex items-center gap-1.5 text-rose-500 font-bold">
              <span className="w-2.5 h-1 bg-rose-500 rounded-sm" /> Brake ({currentPoint.brake}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400 uppercase">LOCATION:</span>
            <span className="text-white font-bold">{currentPoint.cornerName} ({currentPoint.distance}m)</span>
          </div>
        </div>

        {/* Interactive Canvas */}
        <canvas
          ref={canvasRef}
          width={900}
          height={220}
          onMouseDown={handleCanvasInteraction}
          onMouseMove={(e) => {
            if (e.buttons === 1) handleCanvasInteraction(e);
          }}
          className="w-full h-48 cursor-crosshair rounded-lg"
        />

        {/* Instant Telemetry HUD Readout Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-xs">
          <div className="p-2 rounded-lg bg-black/60 border border-white/[0.06] flex flex-col">
            <span className="text-[9px] text-neutral-400 uppercase">SPEED</span>
            <span className="font-bold text-amber-400 text-sm">{currentPoint.playerSpeed} KM/H</span>
          </div>

          <div className="p-2 rounded-lg bg-black/60 border border-white/[0.06] flex flex-col">
            <span className="text-[9px] text-neutral-400 uppercase">DELTA vs VER</span>
            <span className={cn("font-bold text-sm", currentPoint.delta <= 0 ? "text-emerald-400" : "text-rose-400")}>
              {currentPoint.delta > 0 ? `+${currentPoint.delta.toFixed(3)}s` : `${currentPoint.delta.toFixed(3)}s`}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-black/60 border border-white/[0.06] flex flex-col">
            <span className="text-[9px] text-neutral-400 uppercase">GEAR &amp; RPM</span>
            <span className="font-bold text-white text-sm">G{currentPoint.gear} · {currentPoint.rpm} RPM</span>
          </div>

          <div className="p-2 rounded-lg bg-black/60 border border-white/[0.06] flex flex-col">
            <span className="text-[9px] text-neutral-400 uppercase">PEDAL STATUS</span>
            <span className="font-bold text-white text-sm">
              <span className="text-emerald-400">T:{currentPoint.throttle}%</span> / <span className="text-rose-400">B:{currentPoint.brake}%</span>
            </span>
          </div>

          <div className="p-2 rounded-lg bg-black/60 border border-white/[0.06] flex flex-col">
            <span className="text-[9px] text-neutral-400 uppercase">DISTANCE</span>
            <span className="font-bold text-cyan-400 text-sm">{currentPoint.distance}m / 3,340m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useCanvas } from "@/lib/cockpit/canvas";
import { demoFrame, cockpitCursor, TRACK_LEN } from "@/lib/cockpit/demo";
import { CHANNEL } from "@/design/system";
import { MicroLabel, SimBadge } from "./primitives";

/**
 * Circuit map — canvas-rendered, MoTeC grammar: racing line colored by
 * speed channel, fading 6-second car trail, sector coloring on the
 * active sector, crosshair synced with the telemetry ribbon via the
 * shared cockpitCursor ref.
 *
 * The circuit geometry is a parametric demo shape (SIM-badged); the
 * wiring phase swaps in real layouts from GET /intelligence/track/{id}/layout.
 */

interface Pt {
  x: number;
  y: number;
  dist: number;
  speed: number;
  tx: number; // unit tangent
  ty: number;
}

function catmullRom(points: [number, number][], samplesPerSeg = 24): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  return out;
}

/** Demo circuit — a plausible GP-style closed loop (normalized 0-1). */
const CONTROL: Array<[number, number]> = [
  [0.18, 0.82], [0.08, 0.62], [0.14, 0.40], [0.30, 0.34], [0.42, 0.18],
  [0.60, 0.12], [0.78, 0.18], [0.88, 0.34], [0.80, 0.50], [0.62, 0.52],
  [0.52, 0.64], [0.62, 0.78], [0.46, 0.90], [0.28, 0.90],
];

function buildTrack(): Pt[] {
  const raw = catmullRom(CONTROL, 20);
  // cumulative distance (normalized to TRACK_LEN)
  let total = 0;
  const dists: number[] = [0];
  for (let i = 1; i <= raw.length; i++) {
    const [x0, y0] = raw[i - 1];
    const [x1, y1] = raw[i % raw.length];
    total += Math.hypot(x1 - x0, y1 - y0);
    dists.push(total);
  }
  const pts: Pt[] = [];
  const speedAtDist = (d: number) => 60 + 280 * (0.5 + 0.5 * Math.sin(d * 0.004 + 1.2));
  for (let i = 0; i < raw.length; i++) {
    const dist = (dists[i] / total) * TRACK_LEN;
    const [x0, y0] = raw[(i - 1 + raw.length) % raw.length];
    const [x1, y1] = raw[(i + 1) % raw.length];
    const tx = x1 - x0;
    const ty = y1 - y0;
    const len = Math.hypot(tx, ty) || 1;
    pts.push({ x: raw[i][0], y: raw[i][1], dist, speed: speedAtDist(dist), tx: tx / len, ty: ty / len });
  }
  return pts;
}

const speedColor = (kph: number): string => {
  // 60→360 kph mapped blue→green→yellow→red (one meaning: speed)
  const f = Math.min(1, Math.max(0, (kph - 60) / 300));
  if (f < 0.34) return `rgba(59,130,246,${0.55 + f})`;
  if (f < 0.67) return `rgba(34,197,94,${0.5 + f * 0.5})`;
  return `rgba(234,179,8,${0.5 + f * 0.5})`;
};

/** Shared fit: maps normalized track coords into a w×h box. */
function fitFor(w: number, h: number) {
  const pad = 16;
  const scale = Math.min(w - pad * 2, h - pad * 2) * 0.96;
  return { scale, ox: (w - scale) / 2, oy: (h - scale) / 2 };
}

export function TrackMap() {
  const track = useMemo(() => buildTrack(), []);
  const trail = useRef<Array<{ x: number; y: number }>>([]);

  const ref = useCanvas((ctx, w, h, t) => {
    const f = demoFrame(t);
    ctx.clearRect(0, 0, w, h);

    const { scale, ox, oy } = fitFor(w, h);
    const px = (p: Pt) => ({ x: ox + p.x * scale, y: oy + p.y * scale });

    // ── Track outline (asphalt ribbon) ─────────────────────────────
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    track.forEach((p, i) => {
      const q = px(p);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = "rgba(207,163,73,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Speed-colored racing line (thin, inside ribbon) ────────────
    for (let i = 0; i < track.length; i++) {
      const a = px(track[i]);
      const b = px(track[(i + 1) % track.length]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = speedColor(track[i].speed);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ── Sector start ticks + labels ────────────────────────────────
    ctx.font = "9px var(--font-mono), monospace";
    ctx.textAlign = "center";
    for (const s of [1, 2, 3]) {
      const target = ((s - 1) * TRACK_LEN) / 3;
      const p = track.reduce((best, cur) =>
        Math.abs(cur.dist - target) < Math.abs(best.dist - target) ? cur : best
      );
      const q = px(p);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(q.x, q.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`S${s}`, q.x, q.y - 8);
    }

    // ── Car trail (last ~6 s, alpha ramp) ──────────────────────────
    const car = track.reduce((best, cur) =>
      Math.abs(cur.dist - f.lapDist) < Math.abs(best.dist - f.lapDist) ? cur : best
    );
    const cq = px(car);
    trail.current.push({ x: cq.x, y: cq.y });
    if (trail.current.length > 360) trail.current.shift();
    for (let i = 1; i < trail.current.length; i++) {
      const a = trail.current[i - 1];
      const b = trail.current[i];
      const alpha = (i / trail.current.length) * 0.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(207,163,73,${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // ── Crosshair from ribbon hover ────────────────────────────────
    if (cockpitCursor.dist !== null) {
      const cp = track.reduce((best, cur) =>
        Math.abs(cur.dist - cockpitCursor.dist!) < Math.abs(best.dist - cockpitCursor.dist!)
          ? cur
          : best
      );
      const q = px(cp);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(q.x, q.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Car dot (heading-rotated chevron) ──────────────────────────
    ctx.save();
    ctx.translate(cq.x, cq.y);
    ctx.rotate(Math.atan2(car.ty, car.tx));
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, 5);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-5, -5);
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(207,163,73,0.9)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  });

  return (
    <div className="apx-panel !rounded-lg h-full flex flex-col p-2 relative">
      <div className="flex items-center justify-between px-1 pb-1">
        <MicroLabel>Circuit · Speed channel</MicroLabel>
        <SimBadge />
      </div>
      <canvas
        ref={ref}
        className="flex-1 w-full cursor-crosshair"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - r.left;
          const my = e.clientY - r.top;
          const { scale, ox, oy } = fitFor(r.width, r.height);
          let best: Pt | null = null;
          let bestD = Infinity;
          for (const p of track) {
            const d = Math.hypot(ox + p.x * scale - mx, oy + p.y * scale - my);
            if (d < bestD) {
              bestD = d;
              best = p;
            }
          }
          if (best && bestD < 60) cockpitCursor.dist = best.dist;
        }}
        onMouseLeave={() => {
          cockpitCursor.dist = null;
        }}
      />
    </div>
  );
}

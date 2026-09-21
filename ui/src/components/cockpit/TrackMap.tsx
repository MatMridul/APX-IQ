import { useEffect, useMemo, useRef } from "react";
import { useCanvas } from "@/lib/cockpit/canvas";
import { cockpitCursor, TRACK_LEN } from "@/lib/cockpit/demo";
import { getActiveFrame, useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useTrackLayout } from "@/hooks/useIntelligence";
import { useUxStore } from "@/store/uxStore";
import { SourceBadge } from "./primitives";
import { PanelHeader } from "./PanelHeader";

/**
 * Circuit map — Broadcast & Esports High-Octane GPS Tracking Radar (MoTeC & F1 TV grammar):
 * - Asphalt ribbon with dual-border curbs and 4-tier speed heatmap racing line
 * - Corner apex numbering (T1, T3, T4, T7, T11, T14) placed normal to track geometry
 * - DRS activation zones with neon green markers
 * - Checkered Start/Finish gate and glowing sector gates (S1, S2, S3)
 * - Fading luminous car wake trail and heading-oriented telemetry chevron
 * - Dynamic car telemetry HUD tag (P2 · 106 KM/H · DRS)
 * - Hover crosshair synchronized with Telemetry Ribbon
 */

interface Pt {
  x: number;
  y: number;
  dist: number;
  speed: number;
  tx: number; // unit tangent
  ty: number;
  nx: number; // unit normal (perpendicular)
  ny: number;
}

interface TrackData {
  pts: Pt[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  totalDist: number;
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

function buildTrack(): TrackData {
  const raw = catmullRom(CONTROL, 20);
  let total = 0;
  const dists: number[] = [0];
  for (let i = 1; i <= raw.length; i++) {
    const [x0, y0] = raw[i - 1];
    const [x1, y1] = raw[i % raw.length];
    total += Math.hypot(x1 - x0, y1 - y0);
    dists.push(total);
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of raw) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const speedAtDist = (d: number) => 70 + 260 * (0.5 + 0.5 * Math.sin(d * 0.0035 + 1.2));
  const pts: Pt[] = [];
  for (let i = 0; i < raw.length; i++) {
    const dist = (dists[i] / total) * TRACK_LEN;
    const [x0, y0] = raw[(i - 1 + raw.length) % raw.length];
    const [x1, y1] = raw[(i + 1) % raw.length];
    const tx = x1 - x0;
    const ty = y1 - y0;
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len;
    const uy = ty / len;
    pts.push({
      x: raw[i][0],
      y: raw[i][1],
      dist,
      speed: speedAtDist(dist),
      tx: ux,
      ty: uy,
      nx: -uy,
      ny: ux,
    });
  }

  return {
    pts,
    bounds: { minX, maxX, minY, maxY },
    totalDist: TRACK_LEN,
  };
}

function buildRealTrack(points: Array<{ x: number; y: number; distance_m?: number; speed_kph?: number }>): TrackData {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  if (!isFinite(minX) || maxX <= minX) { minX = 0; maxX = 1000; }
  if (!isFinite(minY) || maxY <= minY) { minY = 0; maxY = 1000; }

  const n = points.length;
  const lastDist = points[n - 1]?.distance_m;
  const totalDist = lastDist && lastDist > 500 ? lastDist : TRACK_LEN;

  const pts: Pt[] = points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len;
    const uy = ty / len;

    return {
      x: p.x,
      y: p.y,
      dist: p.distance_m ?? ((i / n) * totalDist),
      speed: p.speed_kph ?? 200,
      tx: ux,
      ty: uy,
      nx: -uy,
      ny: ux,
    };
  });

  return {
    pts,
    bounds: { minX, maxX, minY, maxY },
    totalDist,
  };
}

/** 4-Tier Broadcast Speed Spectrum */
const speedColor = (kph: number): string => {
  if (kph < 110) return "rgba(59, 130, 246, 0.95)"; // Blue: Technical / Hairpin
  if (kph < 210) return "rgba(16, 185, 129, 0.95)"; // Green: Mid-speed flow
  if (kph < 285) return "rgba(245, 158, 11, 0.95)"; // Gold: Fast sweeper
  return "rgba(168, 85, 247, 0.95)";                // Purple: Top straight
};

/** Shared fit: maps track coordinates into w×h box preserving aspect ratio and centering. */
function fitFor(
  w: number,
  h: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
) {
  const pad = 28;
  const availW = Math.max(10, w - pad * 2);
  const availH = Math.max(10, h - pad * 2);
  const spanX = Math.max(0.0001, bounds.maxX - bounds.minX);
  const spanY = Math.max(0.0001, bounds.maxY - bounds.minY);

  const scale = Math.min(availW / spanX, availH / spanY);
  const renderedW = spanX * scale;
  const renderedH = spanY * scale;

  const ox = (w - renderedW) / 2;
  const oy = (h - renderedH) / 2;

  return {
    scale,
    ox,
    oy,
    minX: bounds.minX,
    minY: bounds.minY,
  };
}

const CORNER_TURNS = [
  { name: "1", dist: 340 },
  { name: "3", dist: 760 },
  { name: "4", dist: 1240 },
  { name: "7", dist: 2230 },
  { name: "11", dist: 3320 },
  { name: "14", dist: 4040 },
];

const DRS_ZONES = [
  { label: "DRS 1", start: 2500, end: 3100 },
  { label: "DRS 2", start: 3600, end: 4200 },
];

export function TrackMap() {
  const liveTrackId = useTelemetryStore((s) => s.session?.trackId);
  const trackId = liveTrackId ?? 5; // Default to Monaco / standard circuit
  const { data: layoutData } = useTrackLayout(trackId);

  const track = useMemo(() => {
    if (layoutData?.points && layoutData.points.length >= 20) {
      return buildRealTrack(layoutData.points);
    }
    return buildTrack();
  }, [layoutData]);

  const trail = useRef<Array<{ x: number; y: number }>>([]);
  const { source } = useLiveOrDemo();

  // Reset trail when track layout changes
  useEffect(() => {
    trail.current = [];
  }, [track]);

  // Crosshair state must not survive route changes (stuck-cursor bug)
  useEffect(() => {
    cockpitCursor.dist = null;
    return () => {
      cockpitCursor.dist = null;
    };
  }, []);

  const ref = useCanvas((ctx, w, h, t) => {
    const { data: f } = getActiveFrame(t);
    if (!f || !track.pts || track.pts.length === 0) return;
    ctx.clearRect(0, 0, w, h);

    const { scale, ox, oy, minX, minY } = fitFor(w, h, track.bounds);
    if (!Number.isFinite(scale) || scale <= 0) return;
    const px = (p: { x: number; y: number }) => ({
      x: ox + (p.x - minX) * scale,
      y: oy + (p.y - minY) * scale,
    });

    // ── 1. Asphalt Base Ribbon ─────────────────────────────────────
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Outer kerb / runoff glow
    ctx.beginPath();
    track.pts.forEach((p, i) => {
      const q = px(p);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 14;
    ctx.stroke();

    // Dark asphalt bed
    ctx.beginPath();
    track.pts.forEach((p, i) => {
      const q = px(p);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.95)";
    ctx.lineWidth = 8;
    ctx.stroke();

    // ── 2. DRS Activation Zone Highlights ──────────────────────────
    for (const drs of DRS_ZONES) {
      const segPts = track.pts.filter(
        (p) => p.dist >= drs.start && p.dist <= drs.end
      );
      if (segPts.length > 1) {
        ctx.beginPath();
        segPts.forEach((p, i) => {
          const q = px(p);
          if (i === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        });
        ctx.strokeStyle = "rgba(34, 197, 94, 0.55)";
        ctx.lineWidth = 6;
        ctx.stroke();

        // DRS Zone Label
        const midPt = segPts[Math.floor(segPts.length / 2)];
        const mq = px(midPt);
        const tagX = mq.x + midPt.nx * 14;
        const tagY = mq.y + midPt.ny * 14;

        ctx.fillStyle = "rgba(10, 15, 24, 0.85)";
        ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tagX - 16, tagY - 6, 32, 12, 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 7px var(--font-mono), monospace";
        ctx.fillStyle = "#22C55E";
        ctx.textAlign = "center";
        ctx.fillText(drs.label, tagX, tagY + 3);
      }
    }

    // ── 3. Speed Heatmap Racing Line ───────────────────────────────
    for (let i = 0; i < track.pts.length; i++) {
      const a = px(track.pts[i]);
      const b = px(track.pts[(i + 1) % track.pts.length]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = speedColor(track.pts[i].speed);
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // ── 4. Corner Apex Numbering (T1, T3, T4, T7, T11, T14) ────────
    ctx.font = "bold 8px var(--font-mono), monospace";
    ctx.textAlign = "center";
    for (const corner of CORNER_TURNS) {
      const p = track.pts.reduce((best, cur) =>
        Math.abs(cur.dist - corner.dist) < Math.abs(best.dist - corner.dist) ? cur : best
      );
      const q = px(p);
      const cx = q.x + p.nx * 14;
      const cy = q.y + p.ny * 14;

      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText(corner.name, cx, cy + 3);
    }

    // ── 5. Start / Finish Gate ─────────────────────────────────────
    const startPt = track.pts[0];
    const sq = px(startPt);
    ctx.save();
    ctx.translate(sq.x, sq.y);
    ctx.rotate(Math.atan2(startPt.ny, startPt.nx));
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // S/F Checkered Marker
    ctx.fillStyle = "#FACC15";
    ctx.font = "bold 8px var(--font-mono), monospace";
    ctx.textAlign = "center";
    ctx.fillText("S/F", sq.x - startPt.nx * 14, sq.y - startPt.ny * 14 + 3);

    // ── 6. Sector Split Gates (S1, S2, S3) ─────────────────────────
    for (const s of [1, 2, 3]) {
      const target = ((s - 1) * track.totalDist) / 3;
      const p = track.pts.reduce((best, cur) =>
        Math.abs(cur.dist - target) < Math.abs(best.dist - target) ? cur : best
      );
      const q = px(p);

      if (s > 1) {
        // Glowing sector gate line
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(Math.atan2(p.ny, p.nx));
        ctx.strokeStyle = "rgba(234, 179, 8, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
        ctx.restore();
      }

      // Sector label pill
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(234, 179, 8, 0.5)";
      ctx.lineWidth = 1;
      const secX = q.x + p.nx * 13;
      const secY = q.y + p.ny * 13;
      ctx.beginPath();
      ctx.roundRect(secX - 8, secY - 6, 16, 12, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(234, 179, 8, 0.95)";
      ctx.fillText(`S${s}`, secX, secY + 3);
    }

    // ── 7. Car Position, Wake & Dynamic HUD Pill ───────────────────
    const liveState = useTelemetryStore.getState();
    const liveMotion = liveState.motion;
    const isLive = liveState.isConnected && liveState.telemetry !== null;

    const carDistNorm = f.trackLen > 0 ? (((f.lapDist % f.trackLen) + f.trackLen) % f.trackLen) / f.trackLen : 0;
    const targetCarDist = carDistNorm * track.totalDist;
    const car = track.pts.reduce((best, cur) =>
      Math.abs(cur.dist - targetCarDist) < Math.abs(best.dist - targetCarDist) ? cur : best
    );
    const cq = px(car);

    // Car Wake Trail (last ~6 s with alpha dissipation)
    trail.current.push({ x: cq.x, y: cq.y });
    if (trail.current.length > 360) trail.current.shift();
    for (let i = 1; i < trail.current.length; i++) {
      const a = trail.current[i - 1];
      const b = trail.current[i];
      const alpha = (i / trail.current.length) * 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(234, 179, 8, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Car heading chevron (use real yaw from motion packet if available)
    const headingAngle = isLive && liveMotion?.yaw != null ? liveMotion.yaw : Math.atan2(car.ty, car.tx);
    ctx.save();
    ctx.translate(cq.x, cq.y);
    ctx.rotate(headingAngle);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, -6);
    ctx.closePath();
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "#FACC15";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();

    // Floating Dynamic Telemetry HUD Tag next to car
    const drsTag = f.drs ? " · DRS" : "";
    const carTag = `P${f.position} · ${Math.round(f.speed)} KM/H${drsTag}`;
    ctx.font = "bold 8.5px var(--font-mono), monospace";
    const ctw = ctx.measureText(carTag).width + 8;
    const cth = 14;
    const ctxPos = Math.max(6, Math.min(w - ctw - 6, cq.x + car.nx * 18 - ctw / 2));
    const ctyPos = Math.max(26, Math.min(h - cth - 6, cq.y + car.ny * 18 - cth / 2));

    ctx.fillStyle = "rgba(10, 14, 22, 0.92)";
    ctx.strokeStyle = "rgba(250, 204, 21, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ctxPos, ctyPos, ctw, cth, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FACC15";
    ctx.textAlign = "center";
    ctx.fillText(carTag, ctxPos + ctw / 2, ctyPos + 10);


    // ── 8. Crosshair from Telemetry Ribbon Hover ───────────────────
    if (cockpitCursor.dist !== null) {
      const ribbonNorm = f.trackLen > 0 ? cockpitCursor.dist / f.trackLen : 0;
      const cursorTarget = ribbonNorm * track.totalDist;
      const cp = track.pts.reduce((best, cur) =>
        Math.abs(cur.dist - cursorTarget) < Math.abs(best.dist - cursorTarget) ? cur : best
      );
      const q = px(cp);

      // Pulsing Radar Reticle
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(q.x, q.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(q.x, q.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#38BDF8";
      ctx.fill();

      // Tooltip tag at reticle
      const cursorTag = `${Math.round(cp.speed)} km/h`;
      ctx.font = "bold 8px var(--font-mono), monospace";
      const ctW = ctx.measureText(cursorTag).width + 6;
      ctx.fillStyle = "rgba(10, 15, 24, 0.9)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(q.x + 12, q.y - 7, ctW, 14, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38BDF8";
      ctx.textAlign = "center";
      ctx.fillText(cursorTag, q.x + 12 + ctW / 2, q.y + 3);
    }
  });

  return (
    <div className="apx-panel h-full w-full flex flex-col p-2 relative bg-neutral-950/80 border border-white/[0.08] rounded-md backdrop-blur-sm">
      <PanelHeader
        label="Circuit · Speed channel"
        right={
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono tracking-wider text-neutral-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> &lt;110
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 110-210
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 210-285
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> &gt;285
              </span>
            </div>
            <SourceBadge source={source} />
          </div>
        }
      />
      <canvas
        ref={ref}
        className="flex-1 w-full cursor-crosshair select-none"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - r.left;
          const my = e.clientY - r.top;
          const { scale, ox, oy, minX, minY } = fitFor(r.width, r.height, track.bounds);
          let best: Pt | null = null;
          let bestD = Infinity;
          for (const p of track.pts) {
            const d = Math.hypot(ox + (p.x - minX) * scale - mx, oy + (p.y - minY) * scale - my);
            if (d < bestD) {
              bestD = d;
              best = p;
            }
          }
          if (best && bestD < 60) {
            const stateFrame = getActiveFrame(0).data;
            const currentTrackLen = stateFrame?.trackLen || TRACK_LEN;
            cockpitCursor.dist = (best.dist / track.totalDist) * currentTrackLen;
          }
        }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - r.left;
          const my = e.clientY - r.top;
          const { scale, ox, oy, minX, minY } = fitFor(r.width, r.height, track.bounds);
          let best: Pt | null = null;
          let bestD = Infinity;
          for (const p of track.pts) {
            const d = Math.hypot(ox + (p.x - minX) * scale - mx, oy + (p.y - minY) * scale - my);
            if (d < bestD) {
              bestD = d;
              best = p;
            }
          }
          if (best && bestD < 80) {
            const stateFrame = getActiveFrame(0).data;
            const currentTrackLen = stateFrame?.trackLen || TRACK_LEN;
            const targetM = (best.dist / track.totalDist) * currentTrackLen;
            useUxStore.getState().seekToDistance(targetM);
          }
        }}
        onMouseLeave={() => {
          cockpitCursor.dist = null;
        }}
      />
    </div>
  );
}


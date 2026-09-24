import { useEffect, useRef } from "react";
import { useCanvas } from "@/lib/cockpit/canvas";
import {
  lapProfile,
  cockpitCursor,
  TRACK_LEN,
} from "@/lib/cockpit/demo";
import { getActiveFrame, useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { CHANNEL } from "@/design/system";
import { useUxStore } from "@/store/uxStore";
import { SourceBadge } from "./primitives";
import { PanelHeader } from "./PanelHeader";

/**
 * Telemetry ribbon — Broadcast & Esports High-Octane lap-domain telemetry
 * (MoTeC & F1 TV grammar):
 * - Speed channel with radiant area fill, glow trace, and corner apex badges
 * - Mirrored pedal lanes with high-contrast Throttle (Neon Green) & Brake (Crimson) fills
 * - Gear sequence strip along top
 * - Sweeping live laser playhead with dynamic speed/gear HUD tag
 * - Floating tactical HUD telemetry tooltip on cursor hover (synchronized with Track Map)
 */

interface CornerApex {
  name: string;
  dist: number;
  speed: number;
}

const APEX_LIST: CornerApex[] = [
  { name: "T1", dist: 340, speed: 88 },
  { name: "T4", dist: 1240, speed: 76 },
  { name: "T7", dist: 2230, speed: 71 },
  { name: "T11", dist: 3320, speed: 84 },
  { name: "T14", dist: 4040, speed: 152 },
];

export function TelemetryRibbon() {
  const hoverX = useRef<number | null>(null);
  const hoverY = useRef<number | null>(null);
  const smoothX = useRef<number | null>(null);
  const smoothY = useRef<number | null>(null);
  const { source } = useLiveOrDemo();

  // Crosshair state must not survive route changes (stuck-cursor bug)
  useEffect(() => {
    cockpitCursor.dist = null;
    return () => {
      cockpitCursor.dist = null;
    };
  }, []);

  const ref = useCanvas((ctx, w, h, t) => {
    const { data: f } = getActiveFrame(t);
    if (!f) return;
    const prof = lapProfile(600);
    ctx.clearRect(0, 0, w, h);

    const padL = 38, padR = 14, padT = 26, padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    if (plotW <= 10) return;

    const x = (dist: number) => padL + (dist / TRACK_LEN) * plotW;
    const speedH = plotH * 0.52;
    const pedalH = plotH * 0.38;
    const speedTop = padT;
    const speedBot = speedTop + speedH;
    const pedalMid = speedBot + 12 + pedalH / 2;
    const ySpeed = (kph: number) => speedBot - (kph / 360) * speedH;

    // ── Sector shading & vertical grid lines ─────────────────────────
    const sectorBands: Array<[string, number, number, string]> = [
      ["S1", 0, TRACK_LEN / 3, "rgba(255,255,255,0.015)"],
      ["S2", TRACK_LEN / 3, (2 * TRACK_LEN) / 3, "rgba(255,255,255,0.035)"],
      ["S3", (2 * TRACK_LEN) / 3, TRACK_LEN, "rgba(255,255,255,0.015)"],
    ];

    sectorBands.forEach(([label, d0, d1, bg], i) => {
      ctx.fillStyle = bg;
      ctx.fillRect(x(d0), padT - 6, x(d1) - x(d0), h - padB - padT + 6);

      // Sector dividing line
      if (i > 0) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x(d0), padT - 6);
        ctx.lineTo(x(d0), h - padB);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Sector label tag
      ctx.fillStyle = "rgba(207, 163, 73, 0.75)";
      ctx.font = "bold 9px var(--font-mono), monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, x((d0 + d1) / 2), h - padB + 14);
    });

    // ── Speed Horizontal Gridlines ──────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.font = "9px var(--font-mono), monospace";
    ctx.textAlign = "right";

    for (const kph of [100, 200, 300]) {
      const yy = ySpeed(kph);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(w - padR, yy);
      ctx.stroke();

      ctx.fillStyle = "rgba(159, 166, 178, 0.5)";
      ctx.fillText(`${kph}`, padL - 6, yy + 3);
    }

    // Distance scale ticks along the bottom sector bar
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(159, 166, 178, 0.45)";
    ctx.font = "8px var(--font-mono), monospace";
    for (const dm of [0, 1000, 2000, 3000, 4000]) {
      ctx.fillText(dm === 0 ? "0m" : `${(dm / 1000).toFixed(0)}k`, x(dm), h - padB + 14);
    }

    // ── Speed Profile (Decimated & Rendered) ─────────────────────────
    const cols = Math.max(2, Math.floor(plotW / 2));
    const colW = plotW / cols;
    const mins = new Array<number>(cols).fill(Infinity);
    const maxs = new Array<number>(cols).fill(-Infinity);
    for (let i = 0; i < prof.dist.length; i++) {
      const c = Math.min(cols - 1, Math.max(0, Math.floor((x(prof.dist[i]) - padL) / colW)));
      if (prof.speed[i] < mins[c]) mins[c] = prof.speed[i];
      if (prof.speed[i] > maxs[c]) maxs[c] = prof.speed[i];
    }

    const tracePath = () => {
      ctx.beginPath();
      let started = false;
      for (let c = 0; c < cols; c++) {
        if (mins[c] === Infinity) continue;
        const px = padL + c * colW;
        if (!started) {
          ctx.moveTo(px, ySpeed(maxs[c]));
          started = true;
        } else ctx.lineTo(px, ySpeed(maxs[c]));
      }
      for (let c = cols - 1; c >= 0; c--) {
        if (mins[c] === Infinity) continue;
        ctx.lineTo(padL + c * colW, ySpeed(mins[c]));
      }
    };

    const curX = x(f.lapDist);

    // 1. Radiant Area Fill under traveled portion
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, 0, curX - padL, h);
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(x(prof.dist[0]), ySpeed(prof.speed[0]));
    for (let i = 1; i < prof.dist.length; i++) {
      if (prof.dist[i] > f.lapDist) break;
      ctx.lineTo(x(prof.dist[i]), ySpeed(prof.speed[i]));
    }
    ctx.lineTo(curX, ySpeed(f.speed));
    ctx.lineTo(curX, speedBot);
    ctx.lineTo(padL, speedBot);
    ctx.closePath();

    const speedGrad = ctx.createLinearGradient(0, speedTop, 0, speedBot);
    speedGrad.addColorStop(0, "rgba(234, 179, 8, 0.28)");
    speedGrad.addColorStop(0.6, "rgba(234, 179, 8, 0.10)");
    speedGrad.addColorStop(1, "rgba(234, 179, 8, 0.01)");
    ctx.fillStyle = speedGrad;
    ctx.fill();
    ctx.restore();

    // 2. Traveled portion line (High-glow neon gold)
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, 0, curX - padL, h);
    ctx.clip();
    tracePath();
    ctx.strokeStyle = "#FACC15";
    ctx.lineWidth = 2.2;
    ctx.shadowColor = "rgba(234, 179, 8, 0.7)";
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();

    // 3. Remaining lap portion line (Tactical dimmed gold)
    ctx.save();
    ctx.beginPath();
    ctx.rect(curX, 0, w - curX, h);
    ctx.clip();
    tracePath();
    ctx.strokeStyle = "rgba(234, 179, 8, 0.35)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // ── Corner Apex Badges (T1, T4, T7, T11, T14) ────────────────────
    for (const apex of APEX_LIST) {
      const ax = x(apex.dist);
      const ay = ySpeed(apex.speed);

      // Apex indicator dot
      ctx.beginPath();
      ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fill();

      // Apex mini tag badge
      const tagText = `${apex.name} · ${apex.speed}`;
      ctx.font = "bold 8px var(--font-mono), monospace";
      const tagW = ctx.measureText(tagText).width + 8;
      const tagH = 13;
      const tagX = Math.max(padL + 2, Math.min(w - padR - tagW, ax - tagW / 2));
      const tagY = ay - 18;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(234, 179, 8, 0.95)";
      ctx.textAlign = "center";
      ctx.fillText(tagText, tagX + tagW / 2, tagY + 9.5);
    }

    // ── Pedal Lanes (Mirrored with Solid Filled Polygons) ───────────
    // Neutral mid-line
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, pedalMid);
    ctx.lineTo(w - padR, pedalMid);
    ctx.stroke();

    // 1. Throttle Fill & Stroke (Upwards, Neon Green)
    ctx.beginPath();
    ctx.moveTo(x(prof.dist[0]), pedalMid);
    for (let i = 0; i < prof.dist.length; i++) {
      const xx = x(prof.dist[i]);
      const yy = pedalMid - prof.throttle[i] * (pedalH / 2);
      ctx.lineTo(xx, yy);
    }
    ctx.lineTo(x(prof.dist[prof.dist.length - 1]), pedalMid);
    ctx.closePath();

    const thrGrad = ctx.createLinearGradient(0, pedalMid - pedalH / 2, 0, pedalMid);
    thrGrad.addColorStop(0, "rgba(34, 197, 94, 0.35)");
    thrGrad.addColorStop(1, "rgba(34, 197, 94, 0.04)");
    ctx.fillStyle = thrGrad;
    ctx.fill();

    // Throttle outline
    ctx.beginPath();
    for (let i = 0; i < prof.dist.length; i++) {
      const xx = x(prof.dist[i]);
      const yy = pedalMid - prof.throttle[i] * (pedalH / 2);
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = "rgba(34, 197, 94, 0.95)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Brake Fill & Stroke (Downwards, Crimson Red)
    ctx.beginPath();
    ctx.moveTo(x(prof.dist[0]), pedalMid);
    for (let i = 0; i < prof.dist.length; i++) {
      const xx = x(prof.dist[i]);
      const yy = pedalMid + prof.brake[i] * (pedalH / 2);
      ctx.lineTo(xx, yy);
    }
    ctx.lineTo(x(prof.dist[prof.dist.length - 1]), pedalMid);
    ctx.closePath();

    const brkGrad = ctx.createLinearGradient(0, pedalMid, 0, pedalMid + pedalH / 2);
    brkGrad.addColorStop(0, "rgba(239, 68, 68, 0.04)");
    brkGrad.addColorStop(1, "rgba(239, 68, 68, 0.45)");
    ctx.fillStyle = brkGrad;
    ctx.fill();

    // Brake outline
    ctx.beginPath();
    for (let i = 0; i < prof.dist.length; i++) {
      const xx = x(prof.dist[i]);
      const yy = pedalMid + prof.brake[i] * (pedalH / 2);
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // ── Gear Ticks Along Top Strip ──────────────────────────────────
    ctx.font = "bold 9px var(--font-mono), monospace";
    ctx.textAlign = "center";
    let lastTickX = -Infinity;
    for (let i = 1; i < prof.gear.length; i++) {
      if (prof.gear[i] !== prof.gear[i - 1] && prof.gear[i] > 0) {
        const tx = x(prof.dist[i]);
        if (tx - lastTickX >= 28) {
          ctx.fillStyle = "rgba(6, 182, 212, 0.85)";
          ctx.fillText(`G${prof.gear[i]}`, tx, padT - 12);
          lastTickX = tx;
        }
      }
    }

    // ── Live Marker Laser Playhead ──────────────────────────────────
    // Vertical laser line
    const laserGrad = ctx.createLinearGradient(0, padT - 6, 0, h - padB);
    laserGrad.addColorStop(0, "rgba(234, 179, 8, 0.1)");
    laserGrad.addColorStop(0.3, "rgba(234, 179, 8, 0.85)");
    laserGrad.addColorStop(0.7, "rgba(234, 179, 8, 0.85)");
    laserGrad.addColorStop(1, "rgba(234, 179, 8, 0.1)");
    ctx.strokeStyle = laserGrad;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(curX, padT - 6);
    ctx.lineTo(curX, h - padB);
    ctx.stroke();

    // Speed point halo
    ctx.beginPath();
    ctx.arc(curX, ySpeed(f.speed), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#FACC15";
    ctx.shadowColor = "#EAB308";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Live Playhead Speed Tag
    const liveTag = `${Math.round(f.speed)} KM/H`;
    ctx.font = "bold 9px var(--font-mono), monospace";
    const ltW = ctx.measureText(liveTag).width + 8;
    const ltX = curX > w - padR - 70 ? curX - ltW - 6 : curX + 6;
    const ltY = Math.max(padT, Math.min(speedBot - 16, ySpeed(f.speed) - 8));

    ctx.fillStyle = "rgba(10, 14, 22, 0.9)";
    ctx.strokeStyle = "rgba(234, 179, 8, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ltX, ltY, ltW, 15, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FACC15";
    ctx.textAlign = "center";
    ctx.fillText(liveTag, ltX + ltW / 2, ltY + 11);

    // ── Crosshair & Floating Tactical HUD Tooltip on Hover (Task 2.5) ──
    if (hoverX.current !== null) {
      const rawTargetX = Math.max(padL, Math.min(w - padR, hoverX.current));
      const rawTargetY = hoverY.current ?? 60;

      // Spring-damped smooth interpolation
      if (smoothX.current === null) {
        smoothX.current = rawTargetX;
      } else {
        smoothX.current += (rawTargetX - smoothX.current) * 0.28;
      }

      if (smoothY.current === null) {
        smoothY.current = rawTargetY;
      } else {
        smoothY.current += (rawTargetY - smoothY.current) * 0.28;
      }

      const hx = smoothX.current;
      const hy = smoothY.current;
      const dist = ((hx - padL) / plotW) * TRACK_LEN;
      cockpitCursor.dist = Math.max(0, Math.min(TRACK_LEN, dist));

      // Draw cursor vertical crosshair with subtle gold bloom
      ctx.shadowColor = "rgba(250, 204, 21, 0.4)";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, padT - 6);
      ctx.lineTo(hx, h - padB);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Interpolate hovered values from profile
      const profIdx = Math.min(
        prof.dist.length - 1,
        Math.max(0, Math.floor((dist / TRACK_LEN) * prof.dist.length))
      );
      const hSpeed = Math.round(prof.speed[profIdx]);
      const hThr = Math.round(prof.throttle[profIdx] * 100);
      const hBrk = Math.round(prof.brake[profIdx] * 100);
      const hGear = prof.gear[profIdx];
      const hSec = dist < TRACK_LEN / 3 ? "S1" : dist < (2 * TRACK_LEN) / 3 ? "S2" : "S3";

      // Tactical Floating Tooltip
      const boxW = 120;
      const boxH = 68;
      const boxX = hx > w - padR - boxW - 10 ? hx - boxW - 10 : hx + 10;
      const boxY = Math.max(padT, Math.min(h - padB - boxH, hy - boxH / 2));

      ctx.fillStyle = "rgba(10, 15, 24, 0.94)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 4);
      ctx.fill();
      ctx.stroke();

      // Tooltip header: Distance & Sector
      ctx.font = "bold 9px var(--font-mono), monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(207, 163, 73, 0.9)";
      ctx.fillText(`${dist.toFixed(0)}m · ${hSec}`, boxX + 8, boxY + 14);

      // Gear badge in top right of tooltip
      ctx.textAlign = "right";
      ctx.fillStyle = "#06B6D4";
      ctx.fillText(`GEAR ${hGear}`, boxX + boxW - 8, boxY + 14);

      // Row 1: Speed
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(159, 166, 178, 0.7)";
      ctx.fillText("SPD", boxX + 8, boxY + 30);
      ctx.textAlign = "right";
      ctx.fillStyle = "#FACC15";
      ctx.fillText(`${hSpeed} km/h`, boxX + boxW - 8, boxY + 30);

      // Row 2: Throttle
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(159, 166, 178, 0.7)";
      ctx.fillText("THR", boxX + 8, boxY + 44);
      ctx.textAlign = "right";
      ctx.fillStyle = "#22C55E";
      ctx.fillText(`${hThr}%`, boxX + boxW - 8, boxY + 44);

      // Row 3: Brake
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(159, 166, 178, 0.7)";
      ctx.fillText("BRK", boxX + 8, boxY + 58);
      ctx.textAlign = "right";
      ctx.fillStyle = "#EF4444";
      ctx.fillText(`${hBrk}%`, boxX + boxW - 8, boxY + 58);
    } else {
      smoothX.current = null;
      smoothY.current = null;
      if (cockpitCursor.dist !== null) {
        cockpitCursor.dist = null;
      }
    }

    // Lane labels in left margin
    ctx.textAlign = "left";
    ctx.font = "bold 9px var(--font-mono), monospace";
    ctx.fillStyle = CHANNEL.speed;
    ctx.fillText("SPD", padL + 4, speedTop + 10);
    ctx.fillStyle = CHANNEL.throttle;
    ctx.fillText("THR", padL + 4, pedalMid - pedalH / 2 + 10);
    ctx.fillStyle = CHANNEL.brake;
    ctx.fillText("BRK", padL + 4, pedalMid + pedalH / 2 - 2);
  });

  return (
    <div className="apx-panel h-full w-full flex flex-col p-2 relative bg-neutral-950/80 border border-white/[0.08] rounded-md backdrop-blur-sm">
      <PanelHeader
        label="Telemetry · Lap domain"
        right={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider">
              <span className="flex items-center gap-1 text-amber-400">
                <span className="inline-block w-2 h-0.5 bg-amber-400 rounded-full" />
                SPD
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="inline-block w-2 h-0.5 bg-emerald-400 rounded-full" />
                THR
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <span className="inline-block w-2 h-0.5 bg-rose-500 rounded-full" />
                BRK
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
          hoverX.current = e.clientX - r.left;
          hoverY.current = e.clientY - r.top;
        }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const padL = 38, padR = 14;
          const plotW = r.width - padL - padR;
          const clickX = e.clientX - r.left - padL;
          if (plotW > 10 && clickX >= 0 && clickX <= plotW) {
            const frac = clickX / plotW;
            const targetM = frac * TRACK_LEN;
            useUxStore.getState().seekToDistance(targetM);
          }
        }}
        onMouseLeave={() => {
          hoverX.current = null;
          hoverY.current = null;
        }}
      />
    </div>
  );
}


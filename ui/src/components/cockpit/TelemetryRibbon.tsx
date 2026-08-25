"use client";

import { useRef } from "react";
import { useCanvas } from "@/lib/cockpit/canvas";
import {
  demoFrame,
  lapProfile,
  cockpitCursor,
  TRACK_LEN,
} from "@/lib/cockpit/demo";
import { CHANNEL } from "@/design/system";
import { MicroLabel, SimBadge } from "./primitives";

/**
 * Telemetry ribbon — TRUE lap-domain view (MoTeC grammar): the full
 * lap profile is drawn once per frame from the cached lap profile;
 * the live marker sweeps it. Line and marker share one geometry, so
 * the dot always rides the line.
 *
 * Lanes: speed (area) · throttle (up) / brake (down) mirrored · gear
 * ticks along the top. Hover sets the shared crosshair the track map
 * mirrors. Min/max decimated per column — cost independent of rate.
 */

export function TelemetryRibbon() {
  const hoverX = useRef<number | null>(null);

  const ref = useCanvas((ctx, w, h, t) => {
    const f = demoFrame(t);
    const prof = lapProfile(600);
    ctx.clearRect(0, 0, w, h);

    const padL = 34, padR = 10, padT = 24, padB = 18;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    if (plotW <= 10) return;

    const x = (dist: number) => padL + (dist / TRACK_LEN) * plotW;
    const speedH = plotH * 0.5;
    const pedalH = plotH * 0.42;
    const speedTop = padT;
    const speedBot = speedTop + speedH;
    const pedalMid = speedBot + 10 + pedalH / 2;
    const ySpeed = (kph: number) => speedBot - (kph / 360) * speedH;

    // ── Grid ───────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (const d of [TRACK_LEN / 3, (2 * TRACK_LEN) / 3]) {
      ctx.beginPath();
      ctx.moveTo(x(d), padT - 8);
      ctx.lineTo(x(d), h - padB);
      ctx.stroke();
    }
    ctx.font = "9px var(--font-mono), monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(159,166,178,0.45)";
    for (const kph of [100, 200, 300]) {
      const yy = ySpeed(kph);
      ctx.fillText(String(kph), padL - 5, yy + 3);
    }

    // ── Speed profile: full lap, min/max decimated ─────────────────
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

    // Traveled portion (brighter) + remainder (dimmer)
    const curX = x(f.lapDist);
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, 0, curX - padL, h);
    ctx.clip();
    tracePath();
    ctx.strokeStyle = CHANNEL.speed;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(curX, 0, w - curX, h);
    ctx.clip();
    tracePath();
    ctx.strokeStyle = "rgba(234,179,8,0.35)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // Area under traveled portion
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, 0, curX - padL, h);
    ctx.clip();
    tracePath();
    ctx.lineTo(curX, speedBot);
    ctx.lineTo(padL, speedBot);
    ctx.closePath();
    ctx.fillStyle = "rgba(234,179,8,0.08)";
    ctx.fill();
    ctx.restore();

    // ── Pedal lanes (mirrored, full profile) ───────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(padL, pedalMid);
    ctx.lineTo(w - padR, pedalMid);
    ctx.stroke();

    const drawPedal = (arr: number[], color: string, up: boolean) => {
      ctx.beginPath();
      for (let i = 0; i < prof.dist.length; i++) {
        const yy = pedalMid - (up ? arr[i] : -arr[i]) * (pedalH / 2);
        const xx = x(prof.dist[i]);
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    drawPedal(prof.throttle, "rgba(34,197,94,0.9)", true);
    drawPedal(prof.brake, "rgba(239,68,68,0.9)", false);

    // ── Gear ticks (at change points, min 26px apart) ──────────────
    ctx.font = "10px var(--font-mono), monospace";
    ctx.textAlign = "center";
    let lastTickX = -Infinity;
    for (let i = 1; i < prof.gear.length; i++) {
      if (prof.gear[i] !== prof.gear[i - 1] && prof.gear[i] > 0) {
        const tx = x(prof.dist[i]);
        if (tx - lastTickX >= 26) {
          ctx.fillStyle = "rgba(159,166,178,0.7)";
          ctx.fillText(String(prof.gear[i]), tx, padT - 10);
          lastTickX = tx;
        }
      }
    }

    // ── Live marker — ON the line by construction ──────────────────
    ctx.strokeStyle = "rgba(207,163,73,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(curX, padT - 8);
    ctx.lineTo(curX, h - padB);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(curX, ySpeed(f.speed), 4, 0, Math.PI * 2);
    ctx.fillStyle = CHANNEL.speed;
    ctx.shadowColor = CHANNEL.speed;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── Crosshair ──────────────────────────────────────────────────
    if (hoverX.current !== null) {
      const dist = ((hoverX.current - padL) / plotW) * TRACK_LEN;
      cockpitCursor.dist = Math.max(0, Math.min(TRACK_LEN, dist));
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverX.current, padT - 8);
      ctx.lineTo(hoverX.current, h - padB);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (cockpitCursor.dist !== null) {
      cockpitCursor.dist = null;
    }

    // Lane labels
    ctx.textAlign = "left";
    ctx.fillStyle = CHANNEL.speed;
    ctx.fillText("SPEED", padL + 2, speedTop + 10);
    ctx.fillStyle = CHANNEL.throttle;
    ctx.fillText("THR", padL + 2, pedalMid - pedalH / 2 + 10);
    ctx.fillStyle = CHANNEL.brake;
    ctx.fillText("BRK", padL + 2, pedalMid + pedalH / 2 - 2);
  });

  return (
    <div className="apx-panel !rounded-lg h-full flex flex-col p-2 relative">
      <div className="flex items-center justify-between px-1 pb-1">
        <MicroLabel>Telemetry · Lap domain</MicroLabel>
        <SimBadge />
      </div>
      <canvas
        ref={ref}
        className="flex-1 w-full cursor-crosshair"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          hoverX.current = e.clientX - r.left;
        }}
        onMouseLeave={() => {
          hoverX.current = null;
        }}
      />
    </div>
  );
}

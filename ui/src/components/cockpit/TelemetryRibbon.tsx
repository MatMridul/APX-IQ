"use client";

import { useRef } from "react";
import { useCanvas } from "@/lib/cockpit/canvas";
import { demoFrame, cockpitCursor, TRACK_LEN, type Frame } from "@/lib/cockpit/demo";
import { CHANNEL } from "@/design/system";
import { MicroLabel, SimBadge } from "./primitives";

/**
 * Telemetry ribbon — MoTeC-style DISTANCE-domain view: the whole lap
 * is visible; a marker sweeps the current position; hover sets the
 * shared crosshair that the track map mirrors.
 *
 * Lanes (top→bottom): speed (area), throttle (up) / brake (down)
 * mirrored around a centre line, gear ticks.
 *
 * Samples accumulate in a ring buffer (one per frame); drawing is
 * min/max decimated per pixel column so cost is independent of rate
 * (design/MOTION.md Domain A).
 */

const MAX_SAMPLES = 2400; // ~40 s at 60 Hz

export function TelemetryRibbon() {
  const buf = useRef<Frame[]>([]);
  const lastT = useRef(-1);
  const hoverX = useRef<number | null>(null);

  const ref = useCanvas((ctx, w, h, t) => {
    const f = demoFrame(t);
    // Push one sample per frame (skip if tab was hidden — dt clamp handles)
    if (t !== lastT.current) {
      const arr = buf.current;
      arr.push(f);
      if (arr.length > MAX_SAMPLES) arr.shift();
      lastT.current = t;
    }

    const samples = buf.current;
    ctx.clearRect(0, 0, w, h);

    const padL = 30, padR = 10, padT = 22, padB = 18;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    if (plotW <= 10 || samples.length < 2) return;

    const x = (dist: number) => padL + (dist / TRACK_LEN) * plotW;

    // ── Lane geometry ──────────────────────────────────────────────
    const speedH = plotH * 0.52;
    const pedalH = plotH * 0.42;
    const speedTop = padT;
    const pedalMid = padT + speedH + 8 + pedalH / 2;
    const ySpeed = (kph: number) => speedTop + speedH - (kph / 360) * speedH;

    // Grid: faint sector dividers + speed gridlines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (const d of [TRACK_LEN / 3, (2 * TRACK_LEN) / 3]) {
      ctx.beginPath();
      ctx.moveTo(x(d), padT - 6);
      ctx.lineTo(x(d), h - padB);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(159,166,178,0.5)";
    ctx.font = "9px var(--font-mono), monospace";
    ctx.textAlign = "right";
    for (const kph of [100, 200, 300]) {
      const yy = ySpeed(kph);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(w - padR, yy);
      ctx.stroke();
      ctx.fillText(String(kph), padL - 5, yy + 3);
    }

    // ── Speed lane (min/max decimated area) ────────────────────────
    // Samples span only the accumulated window; map by sample distance.
    const d0 = samples[0].lapDist;
    const span = Math.max(1, samples[samples.length - 1].lapDist - d0 + (samples[samples.length - 1].lap - samples[0].lap) * TRACK_LEN);
    const xs = (s: Frame) => {
      let rel = s.lapDist - d0;
      if (rel < -TRACK_LEN / 2) rel += TRACK_LEN;
      return padL + (rel / span) * plotW;
    };

    const cols = Math.max(2, Math.floor(plotW / 2));
    const colW = plotW / cols;
    const mins = new Array<number>(cols).fill(Infinity);
    const maxs = new Array<number>(cols).fill(-Infinity);
    for (const s of samples) {
      const c = Math.min(cols - 1, Math.max(0, Math.floor((xs(s) - padL) / colW)));
      const v = s.speed;
      if (v < mins[c]) mins[c] = v;
      if (v > maxs[c]) maxs[c] = v;
    }

    ctx.beginPath();
    let started = false;
    for (let c = 0; c < cols; c++) {
      if (mins[c] === Infinity) continue;
      const px = padL + c * colW;
      if (!started) { ctx.moveTo(px, ySpeed(maxs[c])); started = true; }
      else ctx.lineTo(px, ySpeed(maxs[c]));
    }
    for (let c = cols - 1; c >= 0; c--) {
      if (mins[c] === Infinity) continue;
      ctx.lineTo(padL + c * colW, ySpeed(mins[c]));
    }
    ctx.strokeStyle = CHANNEL.speed;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.lineTo(x(samples[samples.length - 1].lapDist), speedTop + speedH);
    ctx.lineTo(x(samples[0].lapDist), speedTop + speedH);
    ctx.closePath();
    ctx.fillStyle = "rgba(234,179,8,0.10)";
    ctx.fill();

    // ── Pedal lanes (mirrored around centre) ───────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(padL, pedalMid);
    ctx.lineTo(w - padR, pedalMid);
    ctx.stroke();

    const drawPedal = (key: "throttle" | "brake", color: string) => {
      ctx.beginPath();
      let first = true;
      for (const s of samples) {
        const v = s[key];
        const yy = pedalMid - (key === "throttle" ? v : -v) * (pedalH / 2);
        if (first) { ctx.moveTo(xs(s), yy); first = false; }
        else ctx.lineTo(xs(s), yy);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };
    drawPedal("throttle", CHANNEL.throttle);
    drawPedal("brake", CHANNEL.brake);

    // ── Gear ticks ─────────────────────────────────────────────────
    ctx.font = "10px var(--font-mono), monospace";
    ctx.textAlign = "center";
    let prevGear = -1;
    for (const s of samples) {
      if (s.gear !== prevGear && s.gear > 0) {
        ctx.fillStyle = "rgba(159,166,178,0.75)";
        ctx.fillText(String(s.gear), xs(s), padT - 8);
        prevGear = s.gear;
      } else if (s.gear !== prevGear) prevGear = s.gear;
    }

    // ── Live position marker ───────────────────────────────────────
    const mx = x(f.lapDist);
    ctx.strokeStyle = "rgba(207,163,73,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, padT - 6);
    ctx.lineTo(mx, h - padB);
    ctx.stroke();
    ctx.fillStyle = "var(--color-gold)";
    ctx.beginPath();
    ctx.arc(mx, ySpeed(f.speed), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = CHANNEL.speed;
    ctx.fill();

    // ── Crosshair (hover → shared cursor) ──────────────────────────
    if (hoverX.current !== null) {
      const dist = ((hoverX.current - padL) / plotW) * TRACK_LEN;
      cockpitCursor.dist = Math.max(0, Math.min(TRACK_LEN, dist));
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverX.current, padT - 6);
      ctx.lineTo(hoverX.current, h - padB);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (cockpitCursor.dist !== null) {
      cockpitCursor.dist = null;
    }

    // Lane labels
    ctx.textAlign = "left";
    ctx.fillStyle = CHANNEL.speed;
    ctx.fillText("SPEED", padL + 2, padT + 10);
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

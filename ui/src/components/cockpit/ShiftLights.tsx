"use client";

import { useEffect, useRef } from "react";
import { useCanvas } from "@/lib/cockpit/canvas";
import { getActiveFrame } from "@/hooks/useLiveOrDemo";
import { useTelemetryStore } from "@/store/telemetryStore";
import { LED_RAMP } from "@/design/system";
import { usePrefs } from "@/lib/cockpit/preferences";

/**
 * Authentic F1 Shift Light Array — 15 Precision High-Output LEDs
 * 
 * Progressive bank sequence:
 *  - 5 Vivid Emerald Greens (Indices 0–4)
 *  - 5 High-Visibility Reds (Indices 5–9)
 *  - 5 Electric Blues (Indices 10–14)
 *  - Full limiter white-out strobe with hysteresis
 *
 * Canvas-rendered on the shared 60 Hz scheduler; React never re-renders for light state.
 */

const N = 15;

function ledColor(i: number): [number, number, number] {
  const hex =
    i < LED_RAMP.greens
      ? LED_RAMP.green
      : i < LED_RAMP.greens + LED_RAMP.reds
        ? LED_RAMP.red
        : LED_RAMP.blue;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ShiftLights({
  height = 26,
  arc = false,
  fill = false,
}: {
  height?: number;
  arc?: boolean;
  fill?: boolean;
}) {
  const { motion } = usePrefs();
  const motionRef = useRef(motion);
  useEffect(() => {
    motionRef.current = motion;
  }, [motion]);

  const limiterOn = useRef(false);
  const lastGear = useRef(1);
  const upshiftUntil = useRef(0);

  const ref = useCanvas((ctx, w, h, t) => {
    const { data: f } = getActiveFrame(t);
    if (!f) return;
    const level = motionRef.current;

    if (level !== "off") {
      if (f.gear > lastGear.current) upshiftUntil.current = t + LED_RAMP.upshiftBlinkMs / 1000;
      if (f.gear !== 0) lastGear.current = f.gear;

      if (f.rpmPct >= LED_RAMP.limiterEnterPct && f.throttle > 0.6) limiterOn.current = true;
      else if (f.rpmPct < LED_RAMP.limiterExitPct || f.throttle <= 0.6) limiterOn.current = false;
    } else {
      limiterOn.current = false;
      upshiftUntil.current = 0;
    }

    const upshift = level === "full" && t < upshiftUntil.current;
    const flashOn =
      limiterOn.current &&
      (level === "off"
        ? false
        : level === "reduced"
          ? true
          : Math.floor(t * LED_RAMP.limiterFlashHz * 2) % 2 === 0);

    ctx.clearRect(0, 0, w, h);

    const liveState = useTelemetryStore.getState();
    const isLive = liveState.isConnected && liveState.telemetry !== null;
    const revLightsPct = isLive && liveState.telemetry?.revLightsPercent != null && liveState.telemetry.revLightsPercent > 0
      ? liveState.telemetry.revLightsPercent / 100
      : f.rpmPct;

    const litCount = Math.round(revLightsPct * N);

    // LED centers with authentic F1 bank grouping (5 Greens, 5 Reds, 5 Blues)
    const centers: Array<{ x: number; y: number; d: number }> = [];
    if (arc) {
      const R = h * 2.9;
      const cx = w / 2;
      const cy = h + R - h * 0.62;
      const spread = 1.7;
      const d = Math.max(1, Math.min((w * 0.72) / (N * 2.1), h * 0.6));
      for (let i = 0; i < N; i++) {
        const a = -Math.PI / 2 + (i / (N - 1) - 0.5) * spread;
        centers.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, d });
      }
    } else {
      const d = Math.max(6, Math.min(10.5, h - 8));
      const regularGap = 4;
      const groupGap = 9; // authentic bank separation
      
      let totalWidth = 0;
      for (let i = 0; i < N; i++) {
        totalWidth += d;
        if (i < N - 1) totalWidth += (i === 4 || i === 9) ? groupGap : regularGap;
      }
      
      let currentX = (w - totalWidth) / 2;
      for (let i = 0; i < N; i++) {
        centers.push({ x: currentX + d / 2, y: h / 2, d });
        currentX += d + ((i === 4 || i === 9) ? groupGap : regularGap);
      }
    }

    for (let i = 0; i < N; i++) {
      const [r, g, b] = ledColor(i);
      const { x, y, d } = centers[i];
      const radius = d / 2;

      const isLit = i < litCount;
      const isShiftAlert = limiterOn.current || upshift;

      // Outer CNC Bezel Collar
      ctx.beginPath();
      ctx.arc(x, y, radius + 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#0A0D14";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Recessed Lens Cavity
      ctx.beginPath();
      ctx.arc(x, y, radius + 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#040507";
      ctx.fill();

      // Core Lens Fill & Bloom
      let coreColor: string;
      let glow = 0;

      if (isShiftAlert) {
        coreColor = flashOn ? "#FFFFFF" : "rgba(240, 245, 255, 0.22)";
        glow = flashOn ? 16 : 0;
      } else if (isLit) {
        coreColor = `rgb(${r}, ${g}, ${b})`;
        glow = 12;
      } else {
        coreColor = `rgba(${r}, ${g}, ${b}, 0.24)`;
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = coreColor;
      if (glow > 0 && level === "full") {
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = glow;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Specular Reflection Dome Highlight
      if (radius > 3) {
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = isLit || (isShiftAlert && flashOn)
          ? "rgba(255, 255, 255, 0.8)"
          : "rgba(255, 255, 255, 0.22)";
        ctx.fill();
      }
    }
  });

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", height: fill ? "100%" : height, display: "block" }}
      aria-label="Shift lights (simulated)"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useCanvas } from "@/lib/cockpit/canvas";
import { demoFrame } from "@/lib/cockpit/demo";
import { LED_RAMP } from "@/design/system";
import { usePrefs } from "@/lib/cockpit/preferences";

/**
 * F1 shift-light engine — 15 LEDs, progressive green→red→blue fill,
 * limiter flash with hysteresis, upshift white blink (design/MOTION.md).
 * Canvas-rendered on the shared scheduler; React never re-renders for
 * light state.
 *
 * Layouts: straight row (default) or `arc` — LEDs curved over the gear
 * digit like a real wheel face.
 *
 * Motion levels: off → steady fill, no flashes; reduced → flashes
 * become steady highlight, no glow; full → everything.
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
    const f = demoFrame(t);
    const level = motionRef.current;

    if (level !== "off") {
      if (f.gear > lastGear.current) upshiftUntil.current = t + LED_RAMP.upshiftBlinkMs / 1000;
      if (f.gear !== 0) lastGear.current = f.gear;

      if (f.rpmPct >= LED_RAMP.limiterEnterPct) limiterOn.current = true;
      else if (f.rpmPct < LED_RAMP.limiterExitPct) limiterOn.current = false;
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

    const litCount = Math.round(f.rpmPct * N);

    // LED centers — straight row or arc (real wheel: LEDs curve over gear)
    const centers: Array<{ x: number; y: number; d: number }> = [];
    if (arc) {
      const R = h * 2.9;
      const cx = w / 2;
      const cy = h + R - h * 0.62;
      const spread = 1.7;
      const d = Math.min((w * 0.72) / (N * 2.1), h * 0.6);
      for (let i = 0; i < N; i++) {
        const a = -Math.PI / 2 + (i / (N - 1) - 0.5) * spread;
        centers.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, d });
      }
    } else {
      const pad = 4;
      const gap = 5;
      const d = Math.min((w - pad * 2 - gap * (N - 1)) / N, h - 6);
      const total = d * N + gap * (N - 1);
      const x0 = (w - total) / 2;
      for (let i = 0; i < N; i++) {
        centers.push({ x: x0 + i * (d + gap) + d / 2, y: h / 2, d });
      }
    }

    for (let i = 0; i < N; i++) {
      const [r, g, b] = ledColor(i);
      const { x, y, d } = centers[i];

      let fill: string;
      let glow = 0;

      if (limiterOn.current || upshift) {
        fill = flashOn ? LED_RAMP.white : `rgba(248,250,252,${LED_RAMP.unlitAlpha})`;
        glow = flashOn && level === "full" ? 14 : 0;
      } else if (i < litCount) {
        fill = `rgb(${r},${g},${b})`;
        glow = level === "full" && i >= litCount - 3 ? 8 : 0;
      } else {
        fill = `rgba(${r},${g},${b},${LED_RAMP.unlitAlpha})`;
      }

      ctx.beginPath();
      ctx.arc(x, y, d / 2, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (glow > 0) {
        ctx.shadowColor = fill;
        ctx.shadowBlur = glow;
        ctx.fill();
        ctx.shadowBlur = 0;
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

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
 * Motion levels: off → steady fill, no flashes; reduced → flashes
 * become steady highlight, no glow; full → everything.
 */

const N = 15;

function ledColor(i: number): [number, number, number] {
  const hex = i < LED_RAMP.greens ? LED_RAMP.green
    : i < LED_RAMP.greens + LED_RAMP.reds ? LED_RAMP.red
    : LED_RAMP.blue;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ShiftLights({ height = 26 }: { height?: number }) {
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
      // Upshift detection (gear increase → white blink beat)
      if (f.gear > lastGear.current) upshiftUntil.current = t + LED_RAMP.upshiftBlinkMs / 1000;
      if (f.gear !== 0) lastGear.current = f.gear;

      // Limiter with hysteresis
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
          ? true // steady highlight instead of strobe
          : Math.floor(t * LED_RAMP.limiterFlashHz * 2) % 2 === 0);

    const pad = 4;
    const gap = 5;
    const d = Math.min((w - pad * 2 - gap * (N - 1)) / N, h - 6);
    const total = d * N + gap * (N - 1);
    const x0 = (w - total) / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const litCount = Math.round(f.rpmPct * N);
    for (let i = 0; i < N; i++) {
      const [r, g, b] = ledColor(i);
      const x = x0 + i * (d + gap);
      const y = cy - d / 2;

      let fill: string;
      let glow = 0;

      if (limiterOn.current || upshift) {
        fill = flashOn
          ? LED_RAMP.white
          : `rgba(248,250,252,${LED_RAMP.unlitAlpha})`;
        glow = flashOn && level === "full" ? 14 : 0;
      } else if (i < litCount) {
        fill = `rgb(${r},${g},${b})`;
        glow = level === "full" && i >= litCount - 3 ? 8 : 0;
      } else {
        fill = `rgba(${r},${g},${b},${LED_RAMP.unlitAlpha})`;
      }

      ctx.beginPath();
      ctx.roundRect(x, y, d, d, d * 0.3);
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
      style={{ width: "100%", height, display: "block" }}
      aria-label="Shift lights (simulated)"
    />
  );
}

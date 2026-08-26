"use client";

import { useEffect, useRef } from "react";
import { scheduler } from "@/lib/cockpit/scheduler";
import { demoFrame } from "@/lib/cockpit/demo";
import { MicroLabel } from "./primitives";

/**
 * Delta-to-best — the real F1 wheel function: live gap vs personal
 * best, recomputed each "50 m" (here, each frame).
 *
 * Motion contract (design/MOTION.md): the BAR lerps every frame and
 * crossfades green↔red through zero; the NUMERIC readout snaps.
 * Both are written via refs — zero React re-renders.
 */

const MAX_ABS = 2.0; // seconds — full bar deflection

export function DeltaBar({ compact = false }: { compact?: boolean }) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let shown = 0;
    const unsub = scheduler.add((t, dt) => {
      const target = demoFrame(t).deltaMs / 1000; // seconds, signed
      // Frame-rate-independent lerp (k = 10/s)
      shown += (target - shown) * (1 - Math.exp(-10 * dt));

      const frac = Math.min(1, Math.abs(shown) / MAX_ABS);
      const side = shown >= 0 ? 1 : -1; // + = slower (red), - = faster (green)

      if (barRef.current) {
        barRef.current.style.width = `${(frac * 50).toFixed(2)}%`;
        barRef.current.style.transform = `translateX(${side < 0 ? `${(frac * 100).toFixed(1)}%` : "0%"})`;
        barRef.current.style.background =
          shown >= 0 ? "var(--color-signal-stop)" : "var(--color-signal-go)";
        barRef.current.style.boxShadow = `0 0 10px ${shown >= 0 ? "rgba(239,68,68,.5)" : "rgba(34,197,94,.5)"}`;
      }
      if (textRef.current) {
        const sign = shown >= 0 ? "+" : "−";
        textRef.current.textContent = `${sign}${Math.abs(shown).toFixed(3)}`;
        textRef.current.style.color =
          shown >= 0 ? "var(--color-signal-stop)" : "var(--color-signal-go)";
      }
    });
    return unsub;
  }, []);

  return (
    <div>
      {!compact && (
        <div className="flex items-baseline justify-between mb-1.5">
          <MicroLabel>Delta vs best</MicroLabel>
          <span
            ref={textRef}
            className="font-display text-3xl leading-none tabular-nums"
          >
            +0.000
          </span>
        </div>
      )}
      {compact && (
        <div className="flex items-baseline justify-end mb-0.5">
          <span
            ref={textRef}
            className="font-display text-[17px] leading-none tabular-nums"
          >
            +0.000
          </span>
        </div>
      )}
      {/* Center-anchored track: bar grows left (faster/green) or right (slower/red) */}
      <div className={`relative rounded-full bg-white/5 overflow-hidden ${compact ? "h-1.5" : "h-2.5"}`}>
        {/* center ticks make the from-center design legible (audit 11) */}
        {[25, 50, 75].map((p) => (
          <div
            key={p}
            className="absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: `${p}%` }}
          />
        ))}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/25" />
        <div
          ref={barRef}
          className="absolute top-0 bottom-0 left-1/2 rounded-full"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { scheduler } from "@/lib/cockpit/scheduler";
import { getActiveFrame } from "@/hooks/useLiveOrDemo";
import { MicroLabel } from "./primitives";

/**
 * Delta-to-best — the real F1 wheel function: live gap vs personal
 * best, recomputed each frame.
 *
 * Motion contract (design/MOTION.md): the BAR lerps every frame and
 * crossfades green/purple↔red through zero; the NUMERIC readout snaps.
 * Both are written via refs — zero React re-renders.
 */

const MAX_ABS = 2.0; // seconds — full bar deflection

export function DeltaBar({
  compact = false,
  showSectors = true,
}: {
  compact?: boolean;
  showSectors?: boolean;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const s1Ref = useRef<HTMLSpanElement | null>(null);
  const s2Ref = useRef<HTMLSpanElement | null>(null);
  const s3Ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let shown = 0;
    const unsub = scheduler.add((t, dt) => {
      const { data: f } = getActiveFrame(t);
      const rawTarget = (f?.deltaMs ?? 0) / 1000; // seconds, signed
      const target = Number.isFinite(rawTarget) ? rawTarget : 0;
      const safeDt = Math.max(0.001, Math.min(0.2, Number.isFinite(dt) ? dt : 0.016));
      
      // Frame-rate-independent lerp (k = 10/s)
      shown += (target - shown) * (1 - Math.exp(-10 * safeDt));
      if (!Number.isFinite(shown)) shown = 0;

      const frac = Math.min(1, Math.abs(shown) / MAX_ABS);
      const isSlower = shown >= 0;
      const isPurple = shown < -0.20; // purple delta territory
      const side = isSlower ? 1 : -1; // + = slower (red), - = faster (green/purple)

      const color = isSlower
        ? "var(--color-signal-stop)"
        : isPurple
        ? "#A855F7"
        : "var(--color-signal-go)";

      const glow = isSlower
        ? "0 0 10px rgba(239,68,68,.5)"
        : isPurple
        ? "0 0 14px rgba(168,85,247,.7)"
        : "0 0 10px rgba(34,197,94,.5)";

      if (barRef.current) {
        barRef.current.style.width = `${(frac * 50).toFixed(2)}%`;
        barRef.current.style.transform = side < 0 ? "translateX(-100%)" : "translateX(0%)";
        barRef.current.style.background = color;
        barRef.current.style.boxShadow = glow;
      }
      if (textRef.current) {
        const sign = isSlower ? "+" : "−";
        textRef.current.textContent = `${sign}${Math.abs(shown).toFixed(3)}`;
        textRef.current.style.color = color;
      }

      // Live sector micro-split approximations
      if (s1Ref.current && s2Ref.current && s3Ref.current) {
        const dist = f?.lapDist ?? 1500;
        if (dist < 1200) {
          // In S1
          s1Ref.current.textContent = isSlower ? "+0.03" : isPurple ? "-0.18" : "-0.04";
          s1Ref.current.style.color = color;
          s2Ref.current.textContent = "--.--";
          s2Ref.current.style.color = "rgba(255,255,255,0.3)";
          s3Ref.current.textContent = "--.--";
          s3Ref.current.style.color = "rgba(255,255,255,0.3)";
        } else if (dist < 2800) {
          // In S2
          s1Ref.current.textContent = "-0.04";
          s1Ref.current.style.color = "#22C55E";
          s2Ref.current.textContent = isSlower ? "+0.08" : isPurple ? "-0.12" : "-0.02";
          s2Ref.current.style.color = color;
          s3Ref.current.textContent = "--.--";
          s3Ref.current.style.color = "rgba(255,255,255,0.3)";
        } else {
          // In S3
          s1Ref.current.textContent = "-0.04";
          s1Ref.current.style.color = "#22C55E";
          s2Ref.current.textContent = "+0.02";
          s2Ref.current.style.color = "#EAB308";
          s3Ref.current.textContent = isSlower ? "+0.05" : isPurple ? "-0.09" : "-0.03";
          s3Ref.current.style.color = color;
        }
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

      {/* Micro-sector split indicator pills */}
      {showSectors && (
        <div className="flex items-center justify-between mt-1 text-[7.5px] font-mono tabular-nums">
          <div className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-black/40 border border-white/[0.08]">
            <span className="opacity-40 font-bold">S1</span>
            <span ref={s1Ref} className="font-bold text-emerald-400">
              -0.04
            </span>
          </div>
          <div className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-black/40 border border-white/[0.08]">
            <span className="opacity-40 font-bold">S2</span>
            <span ref={s2Ref} className="font-bold text-amber-400">
              +0.02
            </span>
          </div>
          <div className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-black/40 border border-white/[0.08]">
            <span className="opacity-40 font-bold">S3</span>
            <span ref={s3Ref} className="font-bold text-silver/40">
              --.--
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

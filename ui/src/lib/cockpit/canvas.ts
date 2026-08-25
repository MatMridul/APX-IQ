"use client";

import { useEffect, useRef } from "react";
import { scheduler } from "./scheduler";

/**
 * DPR-aware canvas + scheduler subscription in one hook.
 * The draw callback runs every frame with CSS-pixel dimensions;
 * the backing store is pre-scaled by devicePixelRatio (capped at 2).
 */
export function useCanvas(
  draw: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tSec: number,
    dtSec: number,
  ) => void,
) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);

  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(cv.clientWidth * dpr));
      cv.height = Math.max(1, Math.round(cv.clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(cv);

    const unsub = scheduler.add((t, dt) => {
      drawRef.current(ctx, cv.clientWidth, cv.clientHeight, t, dt);
    });

    return () => {
      unsub();
      ro.disconnect();
    };
  }, []);

  return ref;
}

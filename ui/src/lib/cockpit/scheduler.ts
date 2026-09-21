"use client";

import { useUxStore } from "@/store/uxStore";

/**
 * Single shared requestAnimationFrame scheduler for all cockpit
 * instruments (design/MOTION.md Domain A). One loop total — N
 * instruments register draw hooks; the loop pauses itself when idle.
 *
 * Integrates with useUxStore for play/pause and 0.5x/1x/2x/5x speed scaling.
 */

type DrawFn = (tSec: number, dtSec: number) => void;

class RafScheduler {
  private fns = new Set<DrawFn>();
  private raf = 0;
  private last = 0;
  private virtualTime = 0;

  add(fn: DrawFn): () => void {
    this.fns.add(fn);
    if (this.fns.size === 1) this.start();
    return () => {
      this.fns.delete(fn);
      if (this.fns.size === 0) this.stop();
    };
  }

  private start() {
    this.last = performance.now();
    this.virtualTime = this.last / 1000;

    const loop = (tMs: number) => {
      const rawDt = (tMs - this.last) / 1000;
      const dt = Math.max(0.001, Math.min(0.05, Number.isFinite(rawDt) ? rawDt : 0.016)); // clamp tab-switch spikes
      this.last = tMs;

      const ux = useUxStore.getState();
      if (ux.isPlaying) {
        this.virtualTime += dt * ux.playbackSpeed;
      }

      for (const fn of this.fns) {
        try {
          fn(this.virtualTime, dt);
        } catch (err) {
          // Safeguard: do not let a single widget error crash the shared animation loop
          console.warn("Cockpit scheduler frame warning:", err);
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
  }
}

export const scheduler = new RafScheduler();

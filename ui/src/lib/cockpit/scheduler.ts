"use client";

/**
 * Single shared requestAnimationFrame scheduler for all cockpit
 * instruments (design/MOTION.md Domain A). One loop total — N
 * instruments register draw hooks; the loop pauses itself when idle.
 */

type DrawFn = (tSec: number, dtSec: number) => void;

class RafScheduler {
  private fns = new Set<DrawFn>();
  private raf = 0;
  private last = 0;

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
    const loop = (tMs: number) => {
      const dt = Math.min(0.05, (tMs - this.last) / 1000); // clamp tab-switch spikes
      this.last = tMs;
      for (const fn of this.fns) fn(tMs / 1000, dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
  }
}

export const scheduler = new RafScheduler();

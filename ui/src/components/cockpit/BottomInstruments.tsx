"use client";

import { useEffect, useRef, useState } from "react";
import { MicroLabel, SimBadge } from "./primitives";

/**
 * Bottom instruments — now driven by the demo generator:
 *
 *   TYRE PRESSURE — four corner readouts (psi). Physical behavior:
 *   pressures climb as tyres warm through a stint, with per-corner
 *   phase and load coupling. Bars + values, ref-written at 5 Hz.
 *
 *   BRAKE BIAS — the engineer's lever: steps between 54–58.5% every
 *   few corners (a "click"), needle lerps to target each frame
 *   (Domain A), value readout snaps.
 */

const CORNERS = ["FL", "FR", "RL", "RR"] as const;
const PHASE = [0.0, 1.3, 2.4, 3.6];

export function BottomInstruments() {
  // Tyre pressure refs
  const psiRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Brake bias state
  const [biasTxt, setBiasTxt] = useState("56.0");
  const biasTarget = useRef(56);
  const biasShown = useRef(56);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const clickFlash = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // Tyre pressures — 5 Hz discrete updates, CSS transitions smooth
    const psiIv = setInterval(() => {
      const t = performance.now() / 1000;
      const f = demoFrameSafe(t);
      CORNERS.forEach((c, i) => {
        const warm = Math.min(1, f.lap * 0.12); // climbs over first laps
        const psi =
          20.8 +
          warm * 1.9 +
          0.55 * Math.sin(t / 9 + PHASE[i]) +
          (i >= 2 ? f.brake * 0.35 : f.throttle * 0.15);
        const el = psiRefs.current[i];
        if (el) el.textContent = psi.toFixed(1);
        const bar = barRefs.current?.[i];
        if (bar) {
          bar.style.width = `${((psi - 19) / 6) * 100}%`;
          bar.style.background =
            psi > 23.4 ? "var(--color-signal-caution)" : "var(--color-signal-go)";
        }
      });
    }, 200);

    // Bias "clicks" — every ~7 s the engineer takes 0.4–0.9% out/in
    const clickIv = setInterval(() => {
      const delta = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5);
      biasTarget.current = Math.min(58.5, Math.max(54, biasTarget.current + delta));
      setBiasTxt(biasTarget.current.toFixed(1));
      if (clickFlash.current) {
        clickFlash.current.textContent = `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`;
        clickFlash.current.style.opacity = "1";
        setTimeout(() => {
          if (clickFlash.current) clickFlash.current.style.opacity = "0";
        }, 900);
      }
    }, 7000);

    // Needle lerp — Domain A
    const unsub = schedulerLerp((dt: number) => {
      biasShown.current +=
        (biasTarget.current - biasShown.current) * (1 - Math.exp(-6 * dt));
      if (needleRef.current) {
        needleRef.current.style.left = `${biasShown.current}%`;
      }
    });

    return () => {
      clearInterval(psiIv);
      clearInterval(clickIv);
      unsub();
    };
  }, []);

  return (
    <div className="w-full h-full flex items-stretch gap-2.5 select-none">
      {/* ── TYRE PRESSURE ─────────────────────────────────────────── */}
      <div className="apx-panel !rounded-lg flex-1 h-full flex flex-col p-2.5 relative">
        <div className="flex items-center justify-between mb-1.5">
          <MicroLabel>Tyre press · psi</MicroLabel>
          <SimBadge />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 flex-1 content-center">
          {CORNERS.map((c, i) => (
            <div key={c}>
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-[9px] tracking-[0.14em] text-silver/50">
                  {c}
                </span>
                <span
                  ref={(el) => {
                    psiRefs.current[i] = el;
                  }}
                  className="font-mono text-[13px] text-white tabular-nums"
                >
                  21.0
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-0.5">
                <div
                  ref={(el) => {
                    if (barRefs.current) barRefs.current[i] = el;
                  }}
                  className="h-full rounded-full transition-[width,background-color] duration-300"
                  style={{ width: "30%", background: "var(--color-signal-go)" }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-mono text-[8px] tracking-[0.14em] text-silver/30 mt-1">
          <span>19</span>
          <span>WINDOW 21–24</span>
          <span>25</span>
        </div>
      </div>

      {/* ── BRAKE BIAS ────────────────────────────────────────────── */}
      <div className="apx-panel !rounded-lg flex-1 h-full flex flex-col p-2.5 relative">
        <div className="flex items-center justify-between mb-1.5">
          <MicroLabel>Brake bias</MicroLabel>
          <div className="flex items-center gap-1.5">
            <span
              ref={clickFlash}
              className="font-mono text-[9px] text-gold transition-opacity duration-500"
              style={{ opacity: 0 }}
            />
            <span className="font-mono text-[13px] text-white tabular-nums">
              {biasTxt}
              <span className="text-silver/40 text-[9px]"> % FRONT</span>
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="relative h-10">
            {/* track */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 rounded-full bg-white/5" />
            {/* click zone shading 54–58.5 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 rounded-sm bg-gold/10 border-x border-gold/30"
              style={{ left: "54%", width: "4.5%" }}
            />
            {/* needle */}
            <div
              ref={needleRef}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-8 rounded-full"
              style={{
                left: "56%",
                background: "var(--color-gold)",
                boxShadow: "0 0 8px rgba(207,163,73,0.6)",
                transition: "none",
              }}
            />
          </div>
          <div className="flex justify-between font-mono text-[8px] tracking-[0.14em] text-silver/30">
            <span>50</span>
            <span>REAR ← → FRONT</span>
            <span>60</span>
          </div>
        </div>
        <MicroLabel className="text-center">adjusts per corner · SIM</MicroLabel>
      </div>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────── */

import { demoFrame } from "@/lib/cockpit/demo";
import { scheduler } from "@/lib/cockpit/scheduler";

function demoFrameSafe(t: number) {
  try {
    return demoFrame(t);
  } catch {
    return { lap: 1, brake: 0, throttle: 0.5 };
  }
}

function schedulerLerp(fn: (dt: number) => void) {
  return scheduler.add((_t, dt) => fn(dt));
}

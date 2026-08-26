"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShiftLights } from "./ShiftLights";
import { DeltaBar } from "./DeltaBar";
import { MicroLabel, SimBadge } from "./primitives";
import { scheduler } from "@/lib/cockpit/scheduler";
import { demoFrame } from "@/lib/cockpit/demo";
import { useDur } from "@/lib/cockpit/preferences";

/**
 * The wheel cluster — hero of the cockpit. Shift lights on top, giant
 * gear digit (framer-motion swap on discrete change — Domain B),
 * snapping speed readout, delta bar, DRS/ERS/fuel instrument strips.
 *
 * Continuous values (speed/fuel/ers/pos/lap) are written via refs on
 * the shared scheduler — zero re-renders. Discrete values (gear, DRS)
 * use React state, updated only on change — a handful of renders per
 * lap, exactly as the motion spec prescribes.
 */

export function CentralTelemetry() {
  // Discrete state (Domain B)
  const [gear, setGear] = useState(1);
  const [drs, setDrs] = useState(false);
  const dur = useDur();

  // Continuous refs (Domain A)
  const speedRef = useRef<HTMLSpanElement | null>(null);
  const posRef = useRef<HTMLSpanElement | null>(null);
  const lapRef = useRef<HTMLSpanElement | null>(null);
  const fuelBarRef = useRef<HTMLDivElement | null>(null);
  const fuelTxtRef = useRef<HTMLSpanElement | null>(null);
  const ersBarRef = useRef<HTMLDivElement | null>(null);
  const ersTxtRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let lastSpeedTxt = "";
    const unsub = scheduler.add((t) => {
      const f = demoFrame(t);

      // Discrete → state (only on change)
      setGear((prev) => (prev === f.gear ? prev : f.gear));
      setDrs((prev) => (prev === f.drs ? prev : f.drs));

      // Continuous → refs
      if (speedRef.current) {
        const s = String(Math.round(f.speed));
        if (s !== lastSpeedTxt) {
          speedRef.current.textContent = s;
          lastSpeedTxt = s;
        }
      }
      if (posRef.current) posRef.current.textContent = String(f.position);
      if (lapRef.current) lapRef.current.textContent = String(f.lap);
      if (fuelBarRef.current)
        fuelBarRef.current.style.width = `${(f.fuelKg / 110) * 100}%`;
      if (fuelTxtRef.current)
        fuelTxtRef.current.textContent = `${f.fuelKg.toFixed(1)} kg`;
      if (ersBarRef.current)
        ersBarRef.current.style.width = `${f.ersPct * 100}%`;
      if (ersTxtRef.current)
        ersTxtRef.current.textContent = `${Math.round(f.ersPct * 100)}%`;
    });
    return unsub;
  }, []);

  return (
    <div className="apx-panel !rounded-xl h-full flex flex-col px-5 pt-3 pb-4 select-none relative overflow-hidden">
      {/* carbon weave hint */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, #fff 0 1px, transparent 1px 6px)",
        }}
      />

      <div className="flex items-center justify-between mb-2 relative">
        <MicroLabel>Wheel · Cluster</MicroLabel>
        <SimBadge />
      </div>

      <ShiftLights height={24} />

      {/* POS / GEAR / BEST row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mt-3 relative">
        <div className="flex flex-col gap-3">
          <div>
            <MicroLabel>Pos</MicroLabel>
            <div className="font-display text-4xl text-white leading-none tabular-nums">
              <span ref={posRef}>2</span>
              <span className="text-silver/40 text-xl">/20</span>
            </div>
          </div>
          <div>
            <MicroLabel>Lap</MicroLabel>
            <div className="font-display text-4xl text-white leading-none tabular-nums">
              <span ref={lapRef}>1</span>
              <span className="text-silver/40 text-xl">/56</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <MicroLabel className="mb-1">Gear</MicroLabel>
          <div className="relative h-[104px] w-[104px] flex items-center justify-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={gear}
                initial={{ scale: 1.14, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                transition={{ duration: dur.ui, ease: [0.4, 0, 0.2, 1] }}
                className="absolute font-display text-[100px] leading-none text-white"
                style={{ textShadow: "0 0 26px rgba(207,163,73,0.35)" }}
              >
                {gear === 0 ? "N" : gear}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-3 items-end text-right">
          <div>
            <MicroLabel>Best</MicroLabel>
            <div className="font-display text-4xl text-signal-purple leading-none tabular-nums">
              1:29.843
            </div>
            <MicroLabel className="block mt-0.5">session best</MicroLabel>
          </div>
          <div
            className={`font-mono text-[11px] tracking-[0.14em] font-bold border rounded px-2 py-1 transition-colors duration-150 ${
              drs
                ? "text-signal-go border-signal-go/50 bg-signal-go/10"
                : "text-silver border-white/15"
            }`}
          >
            {drs ? "DRS ACTIVE" : "DRS READY"}
          </div>
        </div>
      </div>

      {/* Speed */}
      <div className="flex items-baseline justify-center gap-3 mt-1 relative">
        <span
          ref={speedRef}
          className="font-display text-[88px] leading-none text-white tabular-nums"
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}
        >
          0
        </span>
        <span className="font-mono text-2xl text-silver/50 font-bold">KMH</span>
      </div>

      {/* Delta */}
      <div className="mt-auto pt-3 relative">
        <DeltaBar />
      </div>

      {/* Instrument strips */}
      <div className="grid grid-cols-2 gap-4 mt-3 relative">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <MicroLabel>ERS</MicroLabel>
            <span ref={ersTxtRef} className="font-mono text-xs text-signal-info tabular-nums">
              0%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              ref={ersBarRef}
              className="h-full rounded-full"
              style={{ width: "0%", background: "#3b82f6" }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <MicroLabel>Fuel</MicroLabel>
            <span ref={fuelTxtRef} className="font-mono text-xs text-silver tabular-nums">
              0 kg
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              ref={fuelBarRef}
              className="h-full rounded-full"
              style={{ width: "0%", background: "var(--color-gold)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

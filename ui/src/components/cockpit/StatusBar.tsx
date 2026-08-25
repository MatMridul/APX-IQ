"use client";

import { useEffect, useRef, useState } from "react";
import { SimBadge, NoSignal } from "./primitives";
import { scheduler } from "@/lib/cockpit/scheduler";

/**
 * Broadcast-style status bar: flag state · session clock · track ·
 * weather. Absent sources render NoSignal (weather/track until the
 * session packet is wired). Clock ticks via the scheduler (ref writes,
 * zero re-renders).
 */

export function StatusBar({ demoTime }: { demoTime: boolean }) {
  const clockRef = useRef<HTMLSpanElement | null>(null);
  const [flag, setFlag] = useState<"none" | "yellow">("none");

  useEffect(() => {
    if (!demoTime) return;
    let lastFlag = "none";
    const unsub = scheduler.add((t) => {
      if (clockRef.current) {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        clockRef.current.textContent = `${m}:${String(s).padStart(2, "0")}`;
      }
      const f = t % 120 > 74 && t % 120 < 84 ? "yellow" : "none";
      if (f !== lastFlag) {
        lastFlag = f;
        setFlag(f as "none" | "yellow");
      }
    });
    return unsub;
  }, [demoTime]);

  return (
    <div className="apx-panel !rounded-lg h-full flex items-center px-5 gap-6">
      {/* Flag / race state */}
      <div className="flex items-center gap-2.5 min-w-[130px]">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            flag === "yellow"
              ? "bg-signal-caution shadow-[0_0_8px_rgba(234,179,8,0.8)]"
              : "bg-signal-go shadow-[0_0_8px_rgba(34,197,94,0.7)]"
          }`}
        />
        <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-white font-bold">
          {flag === "yellow" ? "Yellow sector" : "Track clear"}
        </span>
        {demoTime && <SimBadge />}
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Session clock */}
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] tracking-[0.14em] text-silver/50 uppercase">
          Session
        </span>
        <span ref={clockRef} className="font-display text-2xl text-white tabular-nums leading-none">
          0:00
        </span>
      </div>

      <div className="h-5 w-px bg-white/10" />

      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] tracking-[0.14em] text-silver/50 uppercase">
          Track
        </span>
        <NoSignal label="no session packet" />
      </div>

      <div className="h-5 w-px bg-white/10" />

      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] tracking-[0.14em] text-silver/50 uppercase">
          Weather
        </span>
        <NoSignal label="no car status" />
      </div>

      <div className="ml-auto font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
        APX IQ · Pit Wall
      </div>
    </div>
  );
}

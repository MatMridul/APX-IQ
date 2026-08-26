"use client";

import { useEffect, useRef, useState } from "react";
import { scheduler } from "@/lib/cockpit/scheduler";
import { demoFrame } from "@/lib/cockpit/demo";
import { MicroLabel } from "./primitives";
import { CHANNEL } from "@/design/system";
import { PanelHeader } from "./PanelHeader";

/**
 * Battle panel — the race around you: gaps to the cars ahead/behind
 * with their sector rows (broadcast INT/BHD grammar) and the overtake
 * state machine (WAIT → READY → GO) from gap-trend logic.
 * Discrete-ish values update via low-frequency state (2 Hz) — this is
 * reading material, not frame data.
 */

type Ovt = "WAIT" | "READY" | "GO";

function SectorChips({ base, seed }: { base: number; seed: number }) {
  const s = (i: number) => (base + Math.sin(seed * 3.1 + i * 1.7) * 0.9).toFixed(1);
  const best = [0, 1, 2].map((i) => Math.abs(Math.sin(seed + i * 2.3)) > 0.72);
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded border ${
            best[i]
              ? "text-signal-purple border-signal-purple/40 bg-signal-purple/10"
              : "text-silver/70 border-white/10"
          }`}
        >
          {s(i)}
        </span>
      ))}
    </div>
  );
}

export function BattlePanel() {
  const [snap, setSnap] = useState({
    ahead: 1.4,
    behind: 2.6,
    ovt: "WAIT" as Ovt,
    pitLaps: 3,
    position: 2,
  });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      const t = performance.now() / 1000;
      const f = demoFrame(t);
      const ahead = Math.max(0.2, f.gapAheadS);
      const ovt: Ovt = ahead < 0.7 ? "GO" : ahead < 1.2 ? "READY" : "WAIT";
      // Pit window computed from fuel burn (audit 12: no frozen strings)
      const pitLaps = f.fuelKg / 2.35;
      setSnap({ ahead, behind: f.gapBehindS, ovt, pitLaps, position: f.position });
    }, 500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const ovtColor =
    snap.ovt === "GO"
      ? "text-signal-go border-signal-go/50 bg-signal-go/10"
      : snap.ovt === "READY"
        ? "text-signal-caution border-signal-caution/50 bg-signal-caution/10"
        : "text-silver/70 border-white/15";

  return (
    <div className="apx-panel h-full w-full flex flex-col p-3 gap-3 relative overflow-hidden">
      <PanelHeader label="Battle" />

      {/* Ahead */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono text-[10px] font-bold text-white rounded px-1.5 py-0.5"
              style={{ background: "#E80020" }}
            >
              HAM
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-silver/60 uppercase">
              ahead
            </span>
          </div>
          <span className="font-display text-2xl text-signal-stop leading-none tabular-nums">
            +{snap.ahead.toFixed(2)}
          </span>
        </div>
        <SectorChips base={28.4} seed={1.3} />
      </div>

      {/* Overtake state machine */}
      <div className={`rounded-lg border p-2.5 text-center ${ovtColor}`}>
        <MicroLabel className="block mb-0.5">Overtake</MicroLabel>
        <span className="font-display text-3xl font-bold tracking-wider">{snap.ovt}</span>
      </div>

      {/* Behind */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono text-[10px] font-bold text-black rounded px-1.5 py-0.5"
              style={{ background: "#F1CD00" }}
            >
              LEC
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-silver/60 uppercase">
              behind
            </span>
          </div>
          <span className="font-display text-2xl text-signal-go leading-none tabular-nums">
            −{snap.behind.toFixed(2)}
          </span>
        </div>
        <SectorChips base={29.1} seed={4.7} />
      </div>

      <div className="mt-auto flex items-center justify-between">
        <MicroLabel>
          P{snap.position ?? 2} ·{" "}
          {snap.pitLaps >= 56
            ? "no stop required"
            : `pit in ~${Math.max(0, Math.floor(snap.pitLaps))} laps`}
        </MicroLabel>
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: CHANNEL.throttle }}
        />
      </div>
    </div>
  );
}

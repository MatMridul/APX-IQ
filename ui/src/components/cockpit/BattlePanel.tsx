import { useEffect, useRef, useState } from "react";
import { getActiveFrame, useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { usePredictBattle } from "@/hooks/useIntelligence";
import { useTelemetryStore } from "@/store/telemetryStore";
import { MicroLabel, SourceBadge, SimBadge, NoSignal } from "./primitives";
import { PanelHeader } from "./PanelHeader";

/**
 * Battle panel — Broadcast & Esports F1 TV Battle HUD (MoTeC & F1 TV grammar):
 * - Gap ahead / leader with real driver badges from participants packet,
 * - Sector timing chips (Real sector times when live, demo when SIM),
 * - Overtake Tactical Radar state machine (WAIT → READY → ATTACK/GO),
 * - Projected overtake probability & finish position from backend BattlePredictor,
 * - Stint fuel burn & tyre life pit window from carStatus.
 */

type Ovt = "WAIT" | "READY" | "GO";

function SectorChips({
  s1Ms,
  s2Ms,
  s3Ms,
  isLive,
  seed = 1.3,
}: {
  s1Ms?: number;
  s2Ms?: number;
  s3Ms?: number;
  isLive: boolean;
  seed?: number;
}) {
  if (isLive) {
    const s1 = s1Ms && s1Ms > 0 ? (s1Ms / 1000).toFixed(3) : "--.---";
    const s2 = s2Ms && s2Ms > 0 ? (s2Ms / 1000).toFixed(3) : "--.---";
    const s3 = s3Ms && s3Ms > 0 ? (s3Ms / 1000).toFixed(3) : "--.---";

    return (
      <div className="flex gap-1.5 items-center">
        <div className="flex items-center gap-1 font-mono text-[9px] tabular-nums px-1.5 py-0.5 rounded border text-neutral-300 border-white/[0.08] bg-black/40">
          <span className="text-[7.5px] opacity-60">S1</span>
          <span className="font-bold">{s1}</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[9px] tabular-nums px-1.5 py-0.5 rounded border text-neutral-300 border-white/[0.08] bg-black/40">
          <span className="text-[7.5px] opacity-60">S2</span>
          <span className="font-bold">{s2}</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[9px] tabular-nums px-1.5 py-0.5 rounded border text-neutral-300 border-white/[0.08] bg-black/40">
          <span className="text-[7.5px] opacity-60">S3</span>
          <span className="font-bold">{s3}</span>
        </div>
      </div>
    );
  }

  // Demo fallback
  const s = (i: number) => (28.4 + Math.sin(seed * 3.1 + i * 1.7) * 0.9).toFixed(1);
  const best = [0, 1, 2].map((i) => Math.abs(Math.sin(seed + i * 2.3)) > 0.72);
  const pb = [0, 1, 2].map((i) => Math.abs(Math.sin(seed + i * 1.9)) > 0.55);

  return (
    <div className="flex gap-1.5 items-center">
      {[0, 1, 2].map((i) => {
        const isPurple = best[i];
        const isGreen = !isPurple && pb[i];
        return (
          <div
            key={i}
            className={`flex items-center gap-1 font-mono text-[9px] tabular-nums px-1.5 py-0.5 rounded border ${
              isPurple
                ? "text-purple-300 border-purple-500/50 bg-purple-950/40"
                : isGreen
                  ? "text-emerald-300 border-emerald-500/50 bg-emerald-950/40"
                  : "text-neutral-400 border-white/[0.08] bg-black/40"
            }`}
          >
            <span className="text-[7.5px] opacity-60">S{i + 1}</span>
            <span className="font-bold">{s(i)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BattlePanel() {
  const { source, isConnected, hasTelemetry } = useLiveOrDemo();
  const isLive = source === "LIVE";

  const lapData = useTelemetryStore((s) => s.lapData);
  const session = useTelemetryStore((s) => s.session);
  const carStatus = useTelemetryStore((s) => s.carStatus);
  const participants = useTelemetryStore((s) => s.participants);
  const sessionHistory = useTelemetryStore((s) => s.sessionHistory);

  const [snap, setSnap] = useState({
    ahead: 1.4,
    behind: 2.6,
    ovt: "WAIT" as Ovt,
    pitLaps: 3,
    position: 2,
    predictedFinish: 2,
    action: "",
  });

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const predictBattle = usePredictBattle();
  const lastPredictedRef = useRef(0);

  useEffect(() => {
    timer.current = setInterval(() => {
      const t = performance.now() / 1000;
      const { data: f } = getActiveFrame(t);
      if (!f) return;

      const ahead = isLive && lapData?.deltaToFrontMs != null && Number.isFinite(lapData.deltaToFrontMs)
        ? lapData.deltaToFrontMs / 1000
        : Math.max(0.2, Number.isFinite(f.gapAheadS) ? f.gapAheadS : 1.4);

      const ovt: Ovt = ahead < 0.7 ? "GO" : ahead < 1.2 ? "READY" : "WAIT";
      const rawFuel = f.fuelKg;
      const pitLaps = isLive && carStatus?.fuelRemainingLaps != null && Number.isFinite(carStatus.fuelRemainingLaps)
        ? carStatus.fuelRemainingLaps
        : Number.isFinite(rawFuel) && rawFuel > 0 ? rawFuel / 2.35 : 3;

      setSnap((prev) => ({
        ...prev,
        ahead,
        behind: Number.isFinite(f.gapBehindS) ? f.gapBehindS : 2.6,
        ovt,
        pitLaps: Number.isFinite(pitLaps) ? pitLaps : 3,
        position: lapData?.position ?? f.position,
      }));

      // Query backend battle predictor every 8 seconds
      const pos = lapData?.position ?? f.position;
      const curLap = lapData?.lap ?? f.lap;
      const totalLaps = session?.totalLaps || 56;
      if (Date.now() - lastPredictedRef.current > 8000 && pos > 0) {
        lastPredictedRef.current = Date.now();
        predictBattle.mutate(
          {
            current_position: pos,
            gap_ahead_s: ahead,
            gap_behind_s: isLive ? 0 : f.gapBehindS,
            laps_remaining: Math.max(1, Math.round(totalLaps - curLap)),
          },
          {
            onSuccess: (res) => {
              setSnap((prev) => ({
                ...prev,
                predictedFinish: res.predicted_finish,
                action: res.ahead_action,
              }));
            },
            onError: () => {
              // Silently handle offline backend / network issues
            },
          }
        );
      }
    }, 500);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [isLive, lapData, carStatus, session, predictBattle]);

  // Determine driver ahead name from participants
  const curPos = lapData?.position ?? snap.position;
  let aheadName = "HAM";
  let aheadPosLabel = `LEADER · P1`;

  if (isLive) {
    if (curPos === 1) {
      aheadName = "YOU";
      aheadPosLabel = "P1 · LEADER";
    } else {
      const aheadDriver = participants.find((p) => p.carIndex === curPos - 2);
      if (aheadDriver && aheadDriver.name) {
        aheadName = aheadDriver.name.length <= 4 ? aheadDriver.name : aheadDriver.name.slice(0, 3).toUpperCase();
      } else {
        aheadName = `P${curPos - 1}`;
      }
      aheadPosLabel = `AHEAD · P${curPos - 1}`;
    }
  }

  const stintLap = lapData?.lap ?? 11;
  const totalLaps = session?.totalLaps || 56;

  return (
    <div className="apx-panel h-full w-full flex flex-col p-2.5 gap-2 relative bg-neutral-950/80 border border-white/[0.08] rounded-md backdrop-blur-sm">
      <PanelHeader
        label="Battle · Radar"
        right={
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase text-amber-400/90 tracking-wider">
              EST P{snap.predictedFinish || curPos}
            </span>
            <SourceBadge source={source} />
          </div>
        }
      />

      {/* Driver Ahead */}
      <div className="rounded border border-red-500/20 bg-gradient-to-r from-red-950/20 to-black/40 p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-red-600 rounded-sm" />
            <span className="font-mono text-[11px] font-bold text-white bg-red-600/90 rounded px-1.5 py-0.2">
              {aheadName}
            </span>
            <span className="font-mono text-[9px] tracking-wider text-neutral-400 uppercase">
              {aheadPosLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            {curPos === 1 ? (
              <span className="font-mono text-xl font-bold text-red-400 tabular-nums tracking-tight">
                LEAD
              </span>
            ) : isLive && lapData?.deltaToFrontMs == null ? (
              <NoSignal label="GAP" />
            ) : (
              <>
                <span className="font-mono text-[10px] text-red-400/70 font-semibold">+</span>
                <span className="font-mono text-xl font-bold text-red-400 tabular-nums tracking-tight">
                  {snap.ahead.toFixed(2)}
                </span>
                <span className="font-mono text-[9px] text-red-400/60">s</span>
              </>
            )}
          </div>
        </div>
        <SectorChips
          s1Ms={lapData?.sector1}
          s2Ms={lapData?.sector2}
          s3Ms={sessionHistory?.laps?.[sessionHistory.laps.length - 1]?.sector3Ms}
          isLive={isLive}
          seed={1.3}
        />
      </div>


      {/* Central Tactical Overtake State */}
      <div
        className={`rounded border px-3 py-2 flex items-center justify-between transition-colors ${
          snap.ovt === "GO"
            ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
            : snap.ovt === "READY"
              ? "border-amber-500/60 bg-amber-950/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              : "border-white/[0.08] bg-black/40 text-neutral-400"
        }`}
      >
        <div className="flex flex-col">
          <span className="font-mono text-[8px] uppercase tracking-widest text-neutral-400 font-semibold">
            TACTICAL RADAR
          </span>
          <span className="font-mono text-[10px] font-medium text-neutral-300">
            {snap.ovt === "GO"
              ? "OVERTAKE WINDOW OPEN · PUSH"
              : snap.ovt === "READY"
                ? "DRS RANGE ACTIVE · TOW DETECTED"
                : "BUILDING BATTERY DELTA"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-base font-black tracking-widest px-2 py-0.5 rounded ${
              snap.ovt === "GO"
                ? "bg-emerald-500 text-black animate-pulse"
                : snap.ovt === "READY"
                  ? "bg-amber-500 text-black"
                  : "bg-neutral-800 text-neutral-300"
            }`}
          >
            {snap.ovt}
          </span>
        </div>
      </div>

      {/* Driver Behind */}
      <div className="rounded border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 to-black/40 p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-sm" />
            <span className="font-mono text-[11px] font-bold text-black bg-amber-400 rounded px-1.5 py-0.2">
              {isLive ? `P${curPos + 1}` : "LEC"}
            </span>
            <span className="font-mono text-[9px] tracking-wider text-neutral-400 uppercase">
              CHASER · P{curPos + 1}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            {isLive ? (
              <span className="font-mono text-xs text-neutral-500">
                <SimBadge />
              </span>
            ) : (
              <>
                <span className="font-mono text-[10px] text-emerald-400/70 font-semibold">-</span>
                <span className="font-mono text-xl font-bold text-emerald-400 tabular-nums tracking-tight">
                  {snap.behind.toFixed(2)}
                </span>
                <span className="font-mono text-[9px] text-emerald-400/60">s</span>
              </>
            )}
          </div>
        </div>
        <SectorChips isLive={isLive} seed={4.7} />
      </div>

      {/* Stint & Pit Stop Strategy */}
      <div className="mt-auto pt-1 border-t border-white/[0.06] flex items-center justify-between text-[9px] font-mono text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>
            {snap.pitLaps >= totalLaps
              ? "NO STOP REQUIRED"
              : `PIT IN ~${Math.max(0, Math.floor(snap.pitLaps))} LAPS`}
          </span>
        </span>
        <span className="text-neutral-500 uppercase">
          STINT {sessionHistory?.numTyreStints && sessionHistory.numTyreStints > 0 ? sessionHistory.numTyreStints : 1} · LAP {stintLap}/{totalLaps}
        </span>
      </div>
    </div>
  );
}



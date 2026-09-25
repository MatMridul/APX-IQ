import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getActiveFrame, useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { usePredictBattle } from "@/hooks/useIntelligence";
import { useTelemetryStore } from "@/store/telemetryStore";
import { MicroLabel, SourceBadge, SimBadge, NoSignal } from "./primitives";
import { PanelHeader } from "./PanelHeader";
import { TimeTrialRivalTracker } from "./TimeTrialRivalTracker";

/**
 * Battle panel — Broadcast & Esports F1 TV Battle HUD (MoTeC & F1 TV grammar):
 * - Gap ahead / leader with real driver badges from participants packet,
 * - Sector timing chips (Real sector times when live, demo when SIM),
 * - Overtake Tactical Radar state machine (WAIT → READY → ATTACK/GO),
 * - Projected overtake probability & finish position from backend BattlePredictor,
 * - Stint fuel burn & tyre life pit window from carStatus.
 */

type Ovt = "WAIT" | "READY" | "GO";

function TacticalRadarScope({ aheadS, behindS, ovt }: { aheadS: number; behindS: number; ovt: Ovt }) {
  const radius = 28;
  const cx = 35;
  const cy = 35;

  const normAhead = Math.max(0.12, Math.min(1, aheadS / 2.8));
  const aheadY = cy - normAhead * radius;

  const normBehind = Math.max(0.12, Math.min(1, behindS / 2.8));
  const behindY = cy + normBehind * radius;

  const isDrs = aheadS < 1.0;

  return (
    <div className="relative w-[70px] h-[70px] shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 70 70" className="w-full h-full select-none">
        <defs>
          <radialGradient id="radar-sweep-cone" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#22C55E" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Scope Background */}
        <circle cx={cx} cy={cy} r={radius} fill="#06090F" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        {/* Outer 2.5s Range Ring */}
        <circle cx={cx} cy={cy} r={radius * 0.9} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />

        {/* 1.0s DRS Threshold Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius * (1.0 / 2.8)}
          fill="none"
          stroke={isDrs ? "rgba(234,179,8,0.7)" : "rgba(255,255,255,0.15)"}
          strokeWidth="0.9"
          strokeDasharray="2 2"
        />

        {/* Inner 0.5s Range Ring */}
        <circle cx={cx} cy={cy} r={radius * (0.5 / 2.8)} fill="none" stroke="rgba(34,197,94,0.2)" strokeWidth="0.7" />

        {/* Crosshair Axes */}
        <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
        <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />

        {/* Rotating Phosphor Sweep Line */}
        <g className="origin-[35px_35px] animate-spin" style={{ animationDuration: "3.5s" }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - radius} stroke="#22C55E" strokeWidth="1.2" strokeOpacity="0.85" />
          <path
            d={`M ${cx} ${cy} L ${cx} ${cy - radius} A ${radius} ${radius} 0 0 1 ${cx + radius * 0.7} ${cy - radius * 0.7} Z`}
            fill="url(#radar-sweep-cone)"
          />
        </g>

        {/* Own Car Blip (Center) */}
        <circle cx={cx} cy={cy} r={2.5} fill="#06B6D4" stroke="#FFFFFF" strokeWidth="0.8" />

        {/* Ahead Rival Blip (Task 2.4) */}
        <g>
          {isDrs && (
            <circle
              cx={cx}
              cy={aheadY}
              r={5}
              fill="none"
              stroke="#EF4444"
              strokeWidth="1"
              className="animate-ping origin-center"
              style={{ transformOrigin: `${cx}px ${aheadY}px` }}
            />
          )}
          <circle
            cx={cx}
            cy={aheadY}
            r={3}
            fill="#EF4444"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            className={isDrs ? "animate-pulse" : ""}
          />
        </g>

        {/* Behind Chaser Blip */}
        <circle cx={cx} cy={behindY} r={2.4} fill="#F59E0B" stroke="#000000" strokeWidth="0.6" />
      </svg>

      {/* DRS range beacon indicator */}
      {isDrs && (
        <span className="absolute top-0.5 right-0.5 text-[6px] font-mono font-black text-amber-400 bg-amber-950/80 px-1 py-px rounded border border-amber-500/40">
          DRS
        </span>
      )}
    </div>
  );
}

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

  const isTimeTrialSession = session?.sessionType === 13;
  const [panelMode, setPanelMode] = useState<"BATTLE" | "RIVAL">("BATTLE");

  useEffect(() => {
    if (isTimeTrialSession) {
      // Defer state update to avoid synchronous setState within effect body
      const t = setTimeout(() => setPanelMode("RIVAL"), 0);
      return () => clearTimeout(t);
    }
  }, [isTimeTrialSession]);

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
        label={
          <div className="relative flex items-center p-0.5 rounded-lg bg-black/60 border border-white/10">
            <button
              onClick={() => setPanelMode("BATTLE")}
              className={`relative z-10 px-2 py-0.5 rounded text-[8.5px] font-bold tracking-wider transition-colors cursor-pointer ${
                panelMode === "BATTLE" ? "text-red-400" : "text-neutral-400 hover:text-white"
              }`}
            >
              {panelMode === "BATTLE" && (
                <motion.div
                  layoutId="activeBattleTab"
                  className="absolute inset-0 bg-red-500/20 border border-red-500/40 rounded shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10">BATTLE · RADAR</span>
            </button>
            <button
              onClick={() => setPanelMode("RIVAL")}
              className={`relative z-10 px-2 py-0.5 rounded text-[8.5px] font-bold tracking-wider transition-colors cursor-pointer ${
                panelMode === "RIVAL" ? "text-gold" : "text-neutral-400 hover:text-white"
              }`}
            >
              {panelMode === "RIVAL" && (
                <motion.div
                  layoutId="activeBattleTab"
                  className="absolute inset-0 bg-gold/20 border border-gold/40 rounded shadow-[0_0_8px_rgba(207,163,73,0.25)]"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10">RIVAL · SPLIT</span>
            </button>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            {panelMode === "BATTLE" && (
              <span className="text-[9px] font-mono uppercase text-amber-400/90 tracking-wider">
                EST P{snap.predictedFinish || curPos}
              </span>
            )}
            {panelMode === "RIVAL" && (
              <span className="text-[8.5px] font-mono uppercase text-purple-400 tracking-wider font-bold">
                PKT 14 TT
              </span>
            )}
            <SourceBadge source={source} />
          </div>
        }
      />

      {panelMode === "RIVAL" ? (
        <TimeTrialRivalTracker />
      ) : (
        <>
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


      {/* Central Tactical Overtake State & Proximity Radar (Task 2.4) */}
      <div
        className={`rounded border px-2.5 py-2 flex items-center justify-between gap-3 transition-colors ${
          snap.ovt === "GO"
            ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
            : snap.ovt === "READY"
              ? "border-amber-500/60 bg-amber-950/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              : "border-white/[0.08] bg-black/40 text-neutral-400"
        }`}
      >
        <TacticalRadarScope aheadS={snap.ahead} behindS={snap.behind} ovt={snap.ovt} />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-widest text-neutral-400 font-semibold">
              TACTICAL RADAR · {snap.ahead < 1.0 ? "DRS ACTIVE" : "TOW HUNT"}
            </span>
            <span className="font-mono text-[8px] text-neutral-500 tabular-nums">
              RNG: {snap.ahead.toFixed(2)}s
            </span>
          </div>
          <span className="font-mono text-[10px] font-medium text-neutral-300 truncate mt-0.5">
            {snap.ovt === "GO"
              ? "OVERTAKE WINDOW OPEN · PUSH"
              : snap.ovt === "READY"
                ? "DRS RANGE ACTIVE · TOW DETECTED"
                : "BUILDING BATTERY DELTA"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
        </>
      )}
    </div>
  );
}



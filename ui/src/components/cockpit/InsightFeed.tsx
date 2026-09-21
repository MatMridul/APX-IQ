import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SourceBadge } from "./primitives";
import { useDur } from "@/lib/cockpit/preferences";
import { getActiveFrame, useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useCompletedLaps, useLapTelemetry, useComputeDelta } from "@/hooks/useIntelligence";
import { buildMockPayload, type CoachingTipItem } from "@/lib/api/intelligence";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useUxStore } from "@/store/uxStore";
import { PanelHeader } from "./PanelHeader";

/**
 * Insight feed — Broadcast & Esports Track Pulse (MoTeC & F1 TV grammar):
 * Live intelligence engine surfaced as prioritized telemetry cards:
 *  1. Live telemetry state alerts (thermal windows, ERS/Fuel deltas, overtake window)
 *  2. Real-time deterministic CoachEngine rules from backend POST /intelligence/delta
 *  3. Quantifiable time & speed delta badges (-0.18s, +4 km/h)
 */

interface Insight {
  id: number;
  kind: "tip" | "battle" | "alert";
  text: string;
  delta?: string;
  t: number;
}

const KIND_STYLE: Record<Insight["kind"], { border: string; bg: string; badge: string; text: string }> = {
  tip: {
    border: "border-l-emerald-500 border-white/[0.08]",
    bg: "bg-emerald-950/20",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    text: "text-emerald-300",
  },
  battle: {
    border: "border-l-amber-500 border-white/[0.08]",
    bg: "bg-amber-950/20",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    text: "text-amber-300",
  },
  alert: {
    border: "border-l-red-500 border-white/[0.08]",
    bg: "bg-red-950/30",
    badge: "bg-red-500/20 text-red-400 border-red-500/40",
    text: "text-red-300",
  },
};

const KIND_LABEL: Record<Insight["kind"], string> = {
  tip: "COACH",
  battle: "BATTLE",
  alert: "THERMAL",
};

/** High-signal telemetry coaching tips */
const DEFAULT_TIPS: Array<Omit<Insight, "id" | "t">> = [
  { kind: "tip", text: "Trail-brake deeper to T4 apex — ghost holds 4 km/h more entry speed.", delta: "-0.18s" },
  { kind: "tip", text: "Brake 12 m later into T1 — maintain 88 km/h apex velocity.", delta: "-0.22s" },
  { kind: "tip", text: "Full throttle 4 m earlier onto the back straight (DRS zone 1).", delta: "+4 km/h" },
  { kind: "tip", text: "Short-shift T8 to protect rear thermals with minimal delta impact.", delta: "+0.05s" },
];

export function InsightFeed() {
  const [items, setItems] = useState<Insight[]>([]);
  const idRef = useRef(0);
  const tipIdx = useRef(0);
  const dur = useDur();
  const { source } = useLiveOrDemo();

  // ── Backend Intelligence Hook-up ──────────────────────────────────────────
  const { data: completedLaps = [] } = useCompletedLaps();
  const latestLapId = completedLaps.length > 0 ? completedLaps[completedLaps.length - 1].lap_id : null;
  const { data: latestLapTelemetry } = useLapTelemetry(latestLapId);
  const computeDelta = useComputeDelta();
  const backendTipsRef = useRef<CoachingTipItem[]>([]);

  // When a new lap completes, trigger backend CoachEngine analysis
  useEffect(() => {
    if (latestLapTelemetry?.telemetry && latestLapTelemetry.telemetry.length > 50) {
      const mock = buildMockPayload();
      computeDelta.mutate(
        {
          user_telemetry: latestLapTelemetry.telemetry,
          ghost_telemetry: mock.ghost_telemetry,
          grid_points: 1000,
        },
        {
          onSuccess: (res) => {
            if (res.coaching_tips?.length) {
              backendTipsRef.current = res.coaching_tips;
            }
          },
        }
      );
    }
  }, [latestLapTelemetry]);

  useEffect(() => {
    const push = () => {
      const t = performance.now() / 1000;
      const { data: f } = getActiveFrame(t);
      if (!f) return;

      const store = useTelemetryStore.getState();
      const liveTyres = store.telemetry?.tyreTemps;
      const flSurf = liveTyres && liveTyres[0] ? liveTyres[0] : (88 + 13 * Math.sin(t / 9 + 0.4) + f.brake * 6 + 4);

      let src: Omit<Insight, "id" | "t">;

      // 1. Critical telemetry safety/thermal alerts
      if (flSurf > 106) {
        src = {
          kind: "alert",
          text: `FL tyre at ${Math.round(flSurf)}°C — exceeding thermal window. Manage wheelspin on exit.`,
          delta: "HIGH TEMP",
        };
      }
      // 2. Real-time overtake battle window
      else if (f.gapAheadS < 1.2) {
        src = {
          kind: "battle",
          text: `HAM ${f.gapAheadS.toFixed(2)}s ahead — ${
            f.gapAheadS < 0.8 ? "Attack window open off apex" : "Hold tow through DRS zone"
          }.`,
          delta: f.gapAheadS < 0.8 ? "ATTACK" : "DRS RANGE",
        };
      }
      // 3. Real backend CoachEngine tips if available
      else if (backendTipsRef.current.length > 0) {
        const tip = backendTipsRef.current[tipIdx.current % backendTipsRef.current.length];
        tipIdx.current += 1;
        const delta = tip.time_impact_ms ? `${(tip.time_impact_ms / 1000).toFixed(2)}s` : undefined;
        src = {
          kind: tip.severity === "critical" ? "alert" : "tip",
          text: `T${tip.corner_index + 1}: ${tip.message}`,
          delta,
        };
      }
      // 4. Default physics-grounded driving coaching pool
      else {
        src = DEFAULT_TIPS[tipIdx.current % DEFAULT_TIPS.length];
        tipIdx.current += 1;
      }

      const item: Insight = { ...src, id: idRef.current++, t: Date.now() };
      setItems((prev) => [item, ...prev].slice(0, 4));
    };

    push();
    push();
    push();
    const iv = setInterval(push, 6000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="apx-panel h-full w-full flex flex-col p-2.5 gap-2 relative bg-neutral-950/80 border border-white/[0.08] rounded-md backdrop-blur-sm overflow-hidden">
      <PanelHeader
        label="Insights · Intelligence"
        right={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE PULSE
            </span>
            <SourceBadge source={source} />
          </div>
        }
      />

      <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-hidden">
        <AnimatePresence initial={false}>
          {items.map((it) => {
            const conf = KIND_STYLE[it.kind];
            return (
              <motion.div
                key={it.id}
                layout
                initial={{ x: dur.data ? 30 : 0, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur.ui, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => {
                  useUxStore.getState().openInsightModal({
                    id: String(it.id),
                    type: it.kind === "tip" ? "COACH" : it.kind === "battle" ? "BATTLE" : "TYRE",
                    title: it.text.split("—")[0] || it.text,
                    deltaS: it.delta || "-0.18s",
                    sector: it.text.includes("T1") ? "TURN 1 · SAINTE DÉVOTE" : it.text.includes("T4") ? "TURN 4 · CASINO SQUARE" : "SECTOR 2",
                    apexDiff: "+4 km/h",
                    entrySpeedDiff: "12m deeper",
                    recommendation: it.text,
                    setupFix: "-1 click Front Anti-Roll Bar to sharpen initial turn-in response without overloading rear thermals.",
                  });
                }}
                className={`rounded border-l-[3px] border ${conf.border} ${conf.bg} px-2.5 py-1.5 overflow-hidden shrink-0 cursor-pointer hover:bg-white/[0.08] hover:ring-1 hover:ring-white/20 transition-all select-none`}
                title="Click for deep-dive corner telemetry and setup recommendation"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`font-mono text-[8px] font-bold tracking-wider px-1 py-0.2 rounded border ${conf.badge}`}
                  >
                    {KIND_LABEL[it.kind]}
                  </span>
                  {it.delta && (
                    <span className="font-mono text-[9px] font-bold text-neutral-300 bg-white/[0.08] px-1.5 py-0.2 rounded">
                      {it.delta}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium leading-tight text-neutral-200 line-clamp-2 block">
                  {it.text}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}


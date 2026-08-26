"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MicroLabel } from "./primitives";
import { useDur } from "@/lib/cockpit/preferences";
import { demoFrame } from "@/lib/cockpit/demo";
import { PanelHeader } from "./PanelHeader";

/**
 * Insight feed — our Track Pulse: the intelligence engines surfaced as
 * a prioritized, sliding chip stream instead of a wall of numbers.
 * Demo pool now; CoachEngine/BattlePredictor events at wiring phase.
 */

interface Insight {
  id: number;
  kind: "tip" | "battle" | "alert";
  text: string;
  t: number;
}

const KIND_STYLE: Record<Insight["kind"], string> = {
  tip: "border-gold/40 text-gold",
  battle: "border-silver/50 text-silver",
  alert: "border-signal-stop/50 text-signal-stop",
};

const KIND_LABEL: Record<Insight["kind"], string> = {
  tip: "COACH",
  battle: "BATTLE",
  alert: "ALERT",
};

/** Static coaching tips (state-derived ones are generated in the effect). */

const TIPS: Array<Omit<Insight, "id" | "t">> = [
  { kind: "tip", text: "Trail-brake deeper to T4 apex; you're losing 0.18 s on entry." },
  { kind: "tip", text: "Brake 12 m later into T1 — ghost holds 4 km/h more entry speed." },
  { kind: "tip", text: "Full throttle 4 m earlier onto the back straight (DRS zone)." },
  { kind: "tip", text: "Short-shift T8 to protect the rears — delta impact +0.05 s only." },
];

export function InsightFeed() {
  const [items, setItems] = useState<Insight[]>([]);
  const idRef = useRef(0);
  const tipIdx = useRef(0);
  const dur = useDur();

  useEffect(() => {
    const push = () => {
      // Coherence rule (self-audit 3): state-derived insights MUST read
      // the same frame the instruments display — no independent randoms.
      const t = performance.now() / 1000;
      const f = demoFrame(t);
      const flSurf = 88 + 13 * Math.sin(t / 9 + 0.4) + f.brake * 6 + 4; // matches RaceCarTelemetry

      let src: Omit<Insight, "id" | "t">;
      if (flSurf > 106) {
        src = {
          kind: "alert",
          text: `Front-left at ${Math.round(flSurf)}°C — over thermal window; manage wheelspin out of T6.`,
        };
      } else if (f.gapAheadS < 1.2) {
        src = {
          kind: "battle",
          text: `HAM ${f.gapAheadS.toFixed(2)}s ahead — ${
            f.gapAheadS < 0.8 ? "overtake window open, use it off the next corner" : "gap closing; hold the tow through the DRS zone"
          }.`,
        };
      } else {
        src = TIPS[tipIdx.current % TIPS.length];
        tipIdx.current += 1;
      }
      const item: Insight = { ...src, id: idRef.current++, t: Date.now() };
      setItems((prev) => [item, ...prev].slice(0, 5));
    };
    push();
    push();
    push();
    const iv = setInterval(push, 7000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="apx-panel h-full w-full flex flex-col p-2.5 gap-2 relative overflow-hidden">
      <PanelHeader label="Insights · Live" />

      <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-hidden">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.div
              key={it.id}
              layout
              initial={{ x: dur.data ? 40 : 0, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.ui, ease: [0.4, 0, 0.2, 1] }}
              className={`rounded-md border bg-black/30 px-2.5 py-1.5 overflow-hidden shrink-0 ${KIND_STYLE[it.kind]}`}
            >
              <span className="font-mono text-[8px] tracking-[0.18em] font-bold block mb-0.5">
                {KIND_LABEL[it.kind]}
              </span>
              <span className="text-[12px] leading-snug text-silver/90 line-clamp-2 block">
                {it.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

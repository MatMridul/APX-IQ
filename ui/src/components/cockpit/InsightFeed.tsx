"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MicroLabel, SimBadge } from "./primitives";

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

const POOL: Array<Omit<Insight, "id" | "t">> = [
  { kind: "tip", text: "Brake 12 m later into T1 — ghost holds 4 km/h more entry speed." },
  { kind: "battle", text: "HAM ahead slowing in sector 2 — gap closing at 0.3 s/lap." },
  { kind: "tip", text: "Trail-brake deeper to T4 apex; you're losing 0.18 s on entry." },
  { kind: "alert", text: "Front-left thermal window exceeded — manage wheelspin out of T6." },
  { kind: "tip", text: "Full throttle 4 m earlier onto the back straight (DRS zone)." },
  { kind: "battle", text: "LEC behind on fresher tyres — expect pressure within 2 laps." },
  { kind: "tip", text: "Short-shift T8 to protect the rears — delta impact +0.05 s only." },
];

const KIND_STYLE: Record<Insight["kind"], string> = {
  tip: "border-gold/40 text-gold",
  battle: "border-signal-info/50 text-signal-info",
  alert: "border-signal-stop/50 text-signal-stop",
};

const KIND_LABEL: Record<Insight["kind"], string> = {
  tip: "COACH",
  battle: "BATTLE",
  alert: "ALERT",
};

export function InsightFeed() {
  const [items, setItems] = useState<Insight[]>([]);
  const idRef = useRef(0);
  const poolIdx = useRef(0);

  useEffect(() => {
    const push = () => {
      const src = POOL[poolIdx.current % POOL.length];
      poolIdx.current += 1;
      const item: Insight = { ...src, id: idRef.current++, t: Date.now() };
      setItems((prev) => [item, ...prev].slice(0, 4));
    };
    push();
    const iv = setInterval(push, 7000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="apx-panel !rounded-lg h-full flex flex-col p-3 gap-2 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <MicroLabel>Insights · Live</MicroLabel>
        <SimBadge />
      </div>

      <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.div
              key={it.id}
              layout
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className={`rounded-lg border bg-black/30 px-3 py-2 ${KIND_STYLE[it.kind]}`}
            >
              <span className="font-mono text-[9px] tracking-[0.18em] font-bold block mb-0.5">
                {KIND_LABEL[it.kind]}
              </span>
              <span className="text-[13px] text-silver/90 leading-snug">{it.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

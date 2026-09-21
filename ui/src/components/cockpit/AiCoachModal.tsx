"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUxStore } from "@/store/uxStore";

export function AiCoachModal() {
  const modal = useUxStore((s) => s.insightModal);
  const close = useUxStore((s) => s.closeInsightModal);

  if (!modal || !modal.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          className="relative w-full max-w-2xl rounded-xl border border-emerald-500/40 bg-neutral-950 p-5 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_25px_rgba(34,197,94,0.15)] select-none text-white font-mono"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/40">
                {modal.type} DEEP DIVE
              </span>
              <span className="text-sm font-bold tracking-wider text-neutral-200">
                {modal.sector} · CORNER ANALYSIS
              </span>
            </div>
            <button
              onClick={close}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              ✕ ESC
            </button>
          </div>

          {/* Title Banner */}
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">{modal.title}</div>
              <div className="text-[10px] text-emerald-300/80 mt-0.5">{modal.recommendation}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-400 block">POTENTIAL GAIN</span>
              <span className="text-sm font-bold text-emerald-400">{modal.deltaS}</span>
            </div>
          </div>

          {/* Telemetry Corner Comparison Visual Trace */}
          <div className="mt-4 p-3 rounded-lg bg-neutral-900/80 border border-white/10">
            <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-2">
              <span>CORNER TELEMETRY TRACE: CURRENT vs POLE REFERENCE</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-amber-400 inline-block" /> Driver
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-emerald-400 inline-block" /> Ghost (VER)
                </span>
              </div>
            </div>

            {/* Simulated Trace SVG */}
            <svg viewBox="0 0 500 120" className="w-full h-28 bg-black/60 rounded border border-white/5">
              <defs>
                <linearGradient id="trace-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.05)" />
              <line x1="250" y1="0" x2="250" y2="120" stroke="rgba(234,179,8,0.3)" strokeDasharray="3 3" />
              <text x="254" y="16" fill="#FACC15" fontSize="8" fontFamily="monospace">APEX</text>

              {/* Reference Ghost Speed Curve (Green) */}
              <path
                d="M 10 20 Q 120 20, 180 85 T 250 92 T 340 30 T 490 20"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
              />

              {/* Driver Actual Speed Curve (Amber) */}
              <path
                d="M 10 20 Q 100 20, 150 95 T 250 102 T 360 45 T 490 25"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </svg>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-[9px] text-neutral-400 block">BRAKING POINT</span>
                <span className="text-amber-400 font-bold">{modal.entrySpeedDiff}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-[9px] text-neutral-400 block">MIN APEX SPEED</span>
                <span className="text-emerald-400 font-bold">{modal.apexDiff}</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5">
                <span className="text-[9px] text-neutral-400 block">THROTTLE ROLL-ON</span>
                <span className="text-emerald-400 font-bold">4m Earlier Target</span>
              </div>
            </div>
          </div>

          {/* Actionable Engineering Setup Recommendation */}
          <div className="mt-4 p-3 rounded-lg bg-neutral-900/60 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-gold uppercase tracking-wider block font-bold">
                ENGINEERING SETUP SUGGESTION
              </span>
              <span className="text-xs text-neutral-300 font-medium">{modal.setupFix}</span>
            </div>
            <button
              onClick={() => {
                alert("Setup modification applied to telemetry baseline simulation.");
                close();
              }}
              className="px-3 py-1.5 rounded bg-gold/20 hover:bg-gold/30 text-gold border border-gold/50 text-xs font-bold transition-colors cursor-pointer"
            >
              APPLY SETUP FIX
            </button>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between text-[10px] text-neutral-400 border-t border-white/10 pt-2.5">
            <span>Powered by APX-IQ Machine Learning Vehicle Kinematics Engine</span>
            <button
              onClick={close}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
            >
              CLOSE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

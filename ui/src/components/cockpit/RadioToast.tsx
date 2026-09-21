"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUxStore } from "@/store/uxStore";

export function RadioToast() {
  const radioOpen = useUxStore((s) => s.radioOpen);
  const transcript = useUxStore((s) => s.radioTranscript);
  const close = useUxStore((s) => s.closeRadio);

  useEffect(() => {
    if (radioOpen) {
      const timer = setTimeout(() => {
        close();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [radioOpen, close]);

  if (!radioOpen || !transcript) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-lg rounded-xl border border-cyan-500/50 bg-neutral-950/95 p-3.5 shadow-[0_0_30px_rgba(6,182,212,0.3)] backdrop-blur-md select-none font-mono text-white"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-black tracking-widest text-cyan-300 uppercase">
              TEAM RADIO · PIT WALL AUDIO
            </span>
          </div>
          <button
            onClick={close}
            className="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5"
          >
            DISMISS
          </button>
        </div>

        <div className="mt-2.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <span className="text-cyan-400 text-sm font-bold">🎙</span>
          </div>
          <div className="flex-1">
            <div className="text-xs text-neutral-100 font-medium leading-relaxed">
              &quot;{transcript}&quot;
            </div>
            {/* Audio waveform simulation */}
            <div className="flex items-center gap-1 mt-2">
              {[4, 12, 18, 8, 22, 16, 10, 24, 14, 6, 20, 10, 16, 8, 12].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-cyan-400/80 rounded-full animate-pulse"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.08}s`,
                    animationDuration: "0.6s",
                  }}
                />
              ))}
              <span className="text-[9px] text-cyan-400/60 ml-2">VHF 142.85 MHz</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

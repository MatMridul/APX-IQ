"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUxStore } from "@/store/uxStore";

export function TyreThermalModal() {
  const modal = useUxStore((s) => s.tyreModal);
  const close = useUxStore((s) => s.closeTyreModal);

  if (!modal || !modal.isOpen) return null;

  const isFront = modal.corner.startsWith("F");
  const isLeft = modal.corner.endsWith("L");
  const cornerFull = `${isFront ? "Front" : "Rear"} ${isLeft ? "Left" : "Right"}`;

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
          className="relative w-full max-w-xl rounded-xl border border-gold/40 bg-neutral-950 p-5 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_20px_rgba(207,163,73,0.15)] select-none text-white font-mono"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-gold/20 text-gold font-bold text-xs border border-gold/40">
                {modal.corner}
              </span>
              <span className="text-sm font-bold tracking-wider text-neutral-200">
                {cornerFull.toUpperCase()} TYRE & BRAKE DIAGNOSTICS
              </span>
            </div>
            <button
              onClick={close}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              ✕ ESC
            </button>
          </div>

          {/* Body Content */}
          <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
            {/* Tyre Thermals & Pressure */}
            <div className="p-3 rounded-lg bg-neutral-900/80 border border-white/10 flex flex-col gap-2.5">
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold border-b border-white/5 pb-1">
                Pirelli P-Zero ({modal.compound})
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Surface Temp:</span>
                <span className="text-emerald-400 font-bold text-sm">{modal.surfaceTempC}°C</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Core Bulk Temp:</span>
                <span className="text-emerald-400 font-bold text-sm">{modal.coreTempC}°C</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Hot Pressure:</span>
                <span className="text-gold font-bold text-sm">{modal.psi.toFixed(1)} PSI</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Operating Window:</span>
                <span className="text-emerald-400 font-bold text-[11px]">21.0 - 24.0 PSI (OPTIMAL)</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Wear Life:</span>
                <span className="text-amber-400 font-bold text-sm">{modal.wearPct}% Degraded</span>
              </div>
            </div>

            {/* Brake Disc Kinematics */}
            <div className="p-3 rounded-lg bg-neutral-900/80 border border-white/10 flex flex-col gap-2.5">
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold border-b border-white/5 pb-1">
                Brembo Carbon-Ceramic Disc
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Disc Caliper Temp:</span>
                <span className="text-amber-400 font-bold text-sm">{modal.brakeTempC}°C</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Peak Thermal Target:</span>
                <span className="text-neutral-300 font-bold text-sm">350°C - 1,000°C</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Thermal Fade Risk:</span>
                <span className="text-emerald-400 font-bold text-[11px]">LOW (0.8% GLUSH)</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-400">Brake Duct Aperture:</span>
                <span className="text-cyan-400 font-bold text-sm">Stage 3 (High Flow)</span>
              </div>
            </div>
          </div>

          {/* Tyre Carcass Gradient Map */}
          <div className="mt-4 p-3 rounded-lg bg-neutral-900/60 border border-white/10">
            <div className="flex justify-between text-[10px] text-neutral-400 mb-1.5">
              <span>INNER SHOULDER (CAMBER)</span>
              <span>CENTER TREAD</span>
              <span>OUTER SHOULDER</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40">
                <span className="text-[9px] text-emerald-400 block font-bold">103°C</span>
                <span className="text-[8px] text-neutral-400">Camber Load</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40">
                <span className="text-[9px] text-emerald-400 block font-bold">99°C</span>
                <span className="text-[8px] text-neutral-400">Traction Crown</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40">
                <span className="text-[9px] text-emerald-400 block font-bold">96°C</span>
                <span className="text-[8px] text-neutral-400">Lateral Wall</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between text-[10px] text-neutral-400 border-t border-white/10 pt-2.5">
            <span className="text-gold">FIA Technical Regulations Article 10.8 Compliant</span>
            <button
              onClick={close}
              className="px-3 py-1 rounded bg-gold/20 hover:bg-gold/30 text-gold border border-gold/50 font-bold transition-colors"
            >
              CLOSE DIAGNOSTICS
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

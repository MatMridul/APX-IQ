"use client";

import { useEffect, useRef } from "react";
import { SourceBadge } from "./primitives";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useTelemetryStore } from "@/store/telemetryStore";
import { PanelHeader } from "./PanelHeader";
import { demoFrame } from "@/lib/cockpit/demo";
import { scheduler } from "@/lib/cockpit/scheduler";
import { useUxStore } from "@/store/uxStore";
import { soundFx } from "@/lib/cockpit/soundFx";

/**
 * BottomInstruments — Broadcast & Esports High-Octane Chassis Telemetry:
 *  - Tyre Pressures: 4-corner clickable diagnostics gauges with target operating window brackets
 *  - Brake Bias: Mechanical balance lever with interactive click/drag and live front/rear split
 */

const CORNERS = ["FL", "FR", "RL", "RR"] as const;
const PHASE = [0.0, 1.3, 2.4, 3.6];

export function BottomInstruments() {
  const { source } = useLiveOrDemo();
  const brakeBiasPct = useUxStore((s) => s.brakeBiasPct);
  const setBrakeBias = useUxStore((s) => s.setBrakeBias);
  const openTyreModal = useUxStore((s) => s.openTyreModal);

  // Tyre pressure refs
  const psiRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Brake bias refs
  const biasShown = useRef(56.4);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const clickFlash = useRef<HTMLSpanElement | null>(null);
  const prevBias = useRef<number>(56.4);

  useEffect(() => {
    // Flash indicator when bias changes
    if (prevBias.current !== brakeBiasPct) {
      const delta = brakeBiasPct - prevBias.current;
      if (clickFlash.current && Math.abs(delta) > 0.05) {
        clickFlash.current.textContent = `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}%`;
        clickFlash.current.style.opacity = "1";
        setTimeout(() => {
          if (clickFlash.current) clickFlash.current.style.opacity = "0";
        }, 850);
      }
      prevBias.current = brakeBiasPct;
    }
  }, [brakeBiasPct]);

  useEffect(() => {
    // Tyre pressures — 5 Hz discrete updates
    const psiIv = setInterval(() => {
      const state = useTelemetryStore.getState();
      const isLive = state.isConnected && state.telemetry !== null;
      const livePressures = state.telemetry?.tyresPressure;

      const t = performance.now() / 1000;
      let f;
      try {
        f = demoFrame(t);
      } catch {
        f = { lap: 1, brake: 0, throttle: 0.5 };
      }

      CORNERS.forEach((c, i) => {
        let psi: number;
        if (isLive && livePressures && livePressures[i] != null && livePressures[i] > 0) {
          psi = livePressures[i];
        } else {
          const warm = Math.min(1, f.lap * 0.12);
          psi =
            20.6 +
            warm * 2.2 +
            1.15 * Math.sin(t / 9 + PHASE[i]) +
            (i >= 2 ? f.brake * 0.5 : f.throttle * 0.2);
        }

        const el = psiRefs.current[i];
        if (el) el.textContent = psi.toFixed(1);

        const bar = barRefs.current?.[i];
        if (bar) {
          const frac = Math.min(1, Math.max(0, (psi - 20) / 4.2));
          bar.style.width = `${frac * 100}%`;
          const isOptimal = psi >= 21.0 && psi <= 23.5;
          bar.style.background = isOptimal ? "var(--color-signal-go)" : "var(--color-signal-caution)";
          bar.style.boxShadow = isOptimal
            ? "0 0 8px rgba(34,197,94,0.6)"
            : "0 0 8px rgba(234,179,8,0.6)";
        }
      });
    }, 200);

    // Smooth needle lerp
    const unsub = scheduler.add((_t, dt) => {
      const safeDt = Math.max(0.001, Math.min(0.2, Number.isFinite(dt) ? dt : 0.016));
      const target = useUxStore.getState().brakeBiasPct;
      biasShown.current += (target - biasShown.current) * (1 - Math.exp(-8 * safeDt));
      if (!Number.isFinite(biasShown.current)) biasShown.current = 56.4;
      if (needleRef.current) {
        const leftPct = Math.min(100, Math.max(0, ((biasShown.current - 50) / 14) * 100));
        needleRef.current.style.left = `${leftPct.toFixed(2)}%`;
      }
    });

    return () => {
      clearInterval(psiIv);
      unsub();
    };
  }, []);

  const rearSplit = (100 - brakeBiasPct).toFixed(1);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const newBias = 50.0 + frac * 14.0;
    soundFx.playButtonClick();
    setBrakeBias(Number(newBias.toFixed(1)));
  };

  return (
    <div className="w-full h-full flex items-stretch gap-2.5 select-none">
      
      {/* ── TYRE PRESSURE ─────────────────────────────────────────── */}
      <div className="apx-panel flex-1 h-full flex flex-col p-2.5 bg-gradient-to-b from-[#111116] to-[#08080B] border border-gold/30 shadow-[0_0_20px_rgba(0,0,0,0.8)] relative">
        <PanelHeader label="Tyre Press · PSI" right={<SourceBadge source={source} />} />

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 flex-1 content-center">
          {CORNERS.map((c, i) => (
            <div
              key={c}
              onClick={() => {
                const psiVal = psiRefs.current[i] ? parseFloat(psiRefs.current[i]!.textContent || "21.6") : 21.6;
                openTyreModal({
                  corner: c,
                  surfaceTempC: c.startsWith("F") ? 98 : 88,
                  coreTempC: c.startsWith("F") ? 104 : 95,
                  brakeTempC: c.startsWith("F") ? 645 : 440,
                  psi: psiVal,
                  wearPct: c.startsWith("F") ? 10 : 12,
                  compound: "C4 SOFT",
                });
              }}
              className="p-1.5 rounded-lg bg-black/40 ring-1 ring-white/5 hover:ring-gold/50 hover:bg-black/80 transition-all cursor-pointer select-none"
              title={`Click for ${c} Detailed Diagnostics`}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-[9px] tracking-[0.14em] text-silver/60 font-bold">
                  {c}
                </span>
                <span
                  ref={(el) => {
                    psiRefs.current[i] = el;
                  }}
                  className="font-mono text-xs font-black text-white tabular-nums tracking-tight"
                >
                  21.6
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden mt-1">
                <div
                  ref={(el) => {
                    if (barRefs.current) barRefs.current[i] = el;
                  }}
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: "45%", background: "var(--color-signal-go)" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center font-mono text-[8px] tracking-[0.12em] text-silver/40 pt-1 border-t border-white/5">
          <span>MIN 19</span>
          <span className="text-signal-go font-bold">WINDOW 21–24 PSI</span>
          <span>MAX 25</span>
        </div>
      </div>

      {/* ── BRAKE BIAS ────────────────────────────────────────────── */}
      <div className="apx-panel flex-1 h-full flex flex-col p-2.5 bg-gradient-to-b from-[#111116] to-[#08080B] border border-gold/30 shadow-[0_0_20px_rgba(0,0,0,0.8)] relative">
        <div className="flex items-center justify-between mb-1">
          <PanelHeader label="Brake Bias" className="!mb-0" right={<SourceBadge source={source} />} />
          <div className="flex items-center gap-1.5">
            <span
              ref={clickFlash}
              className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/40 shadow-[0_0_8px_rgba(207,163,73,0.5)] transition-opacity duration-300"
              style={{ opacity: 0 }}
            />
            <span className="font-mono text-xs font-black text-white tabular-nums">
              {brakeBiasPct.toFixed(1)}<span className="text-gold text-[9px]"> % F</span>
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div
            onClick={handleTrackClick}
            className="relative h-7 flex items-center cursor-pointer group"
            title="Click or drag to adjust Front/Rear Brake Balance"
          >
            {/* Track Line */}
            <div className="w-full h-1.5 rounded-full bg-white/10 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/40 via-gold/50 to-green-500/40"
                style={{ width: "100%" }}
              />
            </div>

            {/* Target Operating Zone Shading (54-58%) */}
            <div
              className="absolute h-3 rounded-sm bg-gold/15 border-x border-gold/50 shadow-[0_0_8px_rgba(207,163,73,0.2)] pointer-events-none"
              style={{ left: "28.5%", width: "43%" }}
            />

            {/* Glowing Indicator Needle */}
            <div
              ref={needleRef}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-6 rounded-full bg-gold shadow-[0_0_12px_rgba(207,163,73,0.9)] border border-white pointer-events-none transition-transform group-hover:scale-110"
              style={{
                left: "45.7%",
                transition: "none",
              }}
            />
          </div>

          <div className="flex justify-between font-mono text-[8px] tracking-[0.12em] text-silver/50">
            <span>50% REAR</span>
            <span className="text-white font-bold tracking-wider">{brakeBiasPct.toFixed(1)} : {rearSplit}</span>
            <span>64% FRONT</span>
          </div>
        </div>

        <div className="text-center font-mono text-[8px] tracking-[0.16em] uppercase text-silver/40">
          CLICK OR DRAG TO CALIBRATE BIAS
        </div>
      </div>
    </div>
  );
}

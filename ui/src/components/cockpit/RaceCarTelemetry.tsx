"use client";

import { useEffect, useRef } from "react";
import { MicroLabel } from "./primitives";

/**
 * RaceCarTelemetry — 2022-regulation F1 top view (proportions from the
 * real car: 2.0 m width, ~5.6 m length, 72 cm front / 86 cm rear tyres,
 * halo, wheel covers, floor edges, coke-bottle sidepods) rendered in
 * the house gold-line/carbon style.
 *
 * Thermal readouts live OUTSIDE the silhouette (corner blocks) and are
 * demo-driven at 5 Hz: surface/inner tyre temps color-lerped cold→hot,
 * brake temps spiking under braking, wheel glow tracking brake energy.
 */

const CORNERS = ["FL", "FR", "RL", "RR"] as const;
const PHASE = [0.4, 1.7, 2.9, 3.8];

/** temp → hue: cold 210° (blue) → optimal 130° (green) → hot 0° (red) */
function tempColor(t: number, cold: number, optimal: number, hot: number): string {
  let norm: number;
  if (t < optimal) norm = ((t - cold) / (optimal - cold)) * 0.5;
  else norm = 0.5 + Math.min(1, (t - optimal) / (hot - optimal)) * 0.5;
  const hue = 210 - 210 * Math.min(1, Math.max(0, norm));
  return `hsl(${hue}, 80%, 55%)`;
}

export function RaceCarTelemetry() {
  const surfRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const innerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const brkRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const glowRefs = useRef<Array<SVGCircleElement | null>>([]);
  const wearRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      const t = performance.now() / 1000;
      const brake = demoBrake(t);
      const lap = demoLap(t);
      CORNERS.forEach((c, i) => {
        const surf = 88 + 13 * Math.sin(t / 9 + PHASE[i]) + brake * 6 + (i >= 2 ? 4 : 0);
        const inner = surf + 7 + 3 * Math.sin(t / 6 + PHASE[i]);
        const brk = 380 + brake * 460 + 45 * Math.sin(t / 4.5 + PHASE[i]);

        const sc = tempColor(surf, 60, 96, 130);
        const bc = tempColor(brk, 350, 600, 950);

        if (surfRefs.current[i]) {
          surfRefs.current[i].textContent = `${Math.round(surf)}°C`;
          surfRefs.current[i].style.color = sc;
        }
        if (innerRefs.current[i]) {
          innerRefs.current[i].textContent = `${Math.round(inner)}°C`;
          innerRefs.current[i].style.color = tempColor(inner, 70, 105, 140);
        }
        if (brkRefs.current[i]) {
          brkRefs.current[i].textContent = `${Math.round(brk)}°C`;
          brkRefs.current[i].style.color = bc;
        }
        // Wheel glow tracks brake energy
        const glow = glowRefs.current[i];
        if (glow) glow.style.opacity = String(0.12 + brake * 0.55);
      });
      if (wearRef.current) wearRef.current.textContent = String(6 + (Math.floor(lap) % 30));
    }, 200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="apx-panel w-full h-full relative flex flex-col p-2">
      <PanelHeader label="Car · Thermals" />

      <div className="flex-1 relative min-h-0 flex items-center justify-center">
        {/* Directional cues (audit: front/rear were indistinguishable) */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.3em] text-gold/60">
          FRONT
        </span>
        <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.3em] text-silver/40">
          REAR
        </span>

        {/* ── Corner thermal blocks (outside the silhouette) ───────── */}
        {CORNERS.map((c, i) => (
          <div
            key={c}
            className={`absolute flex flex-col gap-px ${
              i < 2 ? "top-[13%]" : "top-[58%]"
            } ${i % 2 === 0 ? "left-0 items-start" : "right-0 items-end text-right"}`}
          >
            <span className="font-mono text-[10px] tracking-[0.18em] text-white font-bold">
              {c}
            </span>
            <span className="font-mono text-[8px] tracking-[0.12em] text-silver/40">
              SURF
            </span>
            <span
              ref={(el) => {
                surfRefs.current[i] = el;
              }}
              className="font-mono text-[13px] font-bold tabular-nums transition-colors duration-500"
              style={{ color: "var(--color-signal-go)" }}
            >
              90°C
            </span>
            <span className="font-mono text-[8px] tracking-[0.12em] text-silver/40">
              INNER
            </span>
            <span
              ref={(el) => {
                innerRefs.current[i] = el;
              }}
              className="font-mono text-[11px] tabular-nums transition-colors duration-500"
              style={{ color: "var(--color-silver)" }}
            >
              97°C
            </span>
            <span className="font-mono text-[8px] tracking-[0.12em] text-silver/40 mt-0.5">
              BRK
            </span>
            <span
              ref={(el) => {
                brkRefs.current[i] = el;
              }}
              className="font-mono text-[11px] tabular-nums transition-colors duration-500"
              style={{ color: "var(--color-signal-caution)" }}
            >
              420°C
            </span>
          </div>
        ))}

        {/* ── The car (flex-centered, audit 2: was left-anchored) ──── */}
        <svg
          viewBox="0 0 200 380"
          className="relative h-full w-auto max-w-[68%]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="carbon-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#23252b" />
              <stop offset="55%" stopColor="#15161a" />
              <stop offset="100%" stopColor="#0c0d10" />
            </linearGradient>
            <linearGradient id="wing-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a2c33" />
              <stop offset="100%" stopColor="#101114" />
            </linearGradient>
            <radialGradient id="tyre-warm" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff7a18" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#ff4d00" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff4d00" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="body-highlight" cx="50%" cy="22%" r="80%">
              <stop offset="0%" stopColor="#8a93a5" stopOpacity="0.28" />
              <stop offset="55%" stopColor="#8a93a5" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#8a93a5" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ground shadow */}
          <ellipse cx="100" cy="192" rx="96" ry="182" fill="rgba(0,0,0,0.5)" />

          {/* body shading pass (audit 13): top-light sheen over chassis+cover */}
          <ellipse cx="100" cy="150" rx="30" ry="120" fill="url(#body-highlight)" />

          {/* ── FLOOR ──────────────────────────────────────────────── */}
          <path
            d="M 56 176 L 144 176 L 146 296 L 118 306 L 82 306 L 54 296 Z"
            fill="#0a0b0d"
            stroke="rgba(207,163,73,0.35)"
            strokeWidth="0.8"
          />
          {/* floor-edge wings */}
          <line x1="56" y1="182" x2="56" y2="292" stroke="rgba(207,163,73,0.5)" strokeWidth="1" />
          <line x1="144" y1="182" x2="144" y2="292" stroke="rgba(207,163,73,0.5)" strokeWidth="1" />

          {/* ── DIFFUSER ───────────────────────────────────────────── */}
          <path d="M 74 332 L 126 332 L 134 352 L 66 352 Z" fill="#101115" stroke="rgba(207,163,73,0.4)" strokeWidth="0.8" />
          <line x1="88" y1="334" x2="84" y2="351" stroke="rgba(207,163,73,0.3)" strokeWidth="0.7" />
          <line x1="100" y1="334" x2="100" y2="351" stroke="rgba(207,163,73,0.3)" strokeWidth="0.7" />
          <line x1="112" y1="334" x2="116" y2="351" stroke="rgba(207,163,73,0.3)" strokeWidth="0.7" />

          {/* ── SIDEPODS ───────────────────────────────────────────── */}
          <path
            d="M 88 168 L 64 172 C 56 190 56 226 66 252 L 88 262 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.55)" strokeWidth="0.9"
          />
          <path
            d="M 112 168 L 136 172 C 144 190 144 226 134 252 L 112 262 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.55)" strokeWidth="0.9"
          />
          {/* sidepod inlets */}
          <rect x="63" y="174" width="7" height="14" rx="2" fill="#050506" stroke="rgba(207,163,73,0.5)" strokeWidth="0.6" />
          <rect x="130" y="174" width="7" height="14" rx="2" fill="#050506" stroke="rgba(207,163,73,0.5)" strokeWidth="0.6" />

          {/* ── ENGINE COVER + AIRBOX + FIN ────────────────────────── */}
          <rect x="91" y="146" width="18" height="16" rx="5" fill="#050506" stroke="rgba(207,163,73,0.6)" strokeWidth="0.8" />
          <path
            d="M 88 168 L 112 168 C 112 220 108 268 104 296 L 96 296 C 92 268 88 220 88 168 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.6)" strokeWidth="0.9"
          />
          <path d="M 98 208 L 102 208 L 101.5 292 L 98.5 292 Z" fill="rgba(207,163,73,0.35)" />

          {/* ── COCKPIT + HALO ─────────────────────────────────────── */}
          <ellipse cx="100" cy="158" rx="13" ry="20" fill="#050506" stroke="rgba(207,163,73,0.55)" strokeWidth="0.8" />
          <path
            d="M 76 170 Q 100 148 124 170"
            fill="none" stroke="#3a3d45" strokeWidth="5.5" strokeLinecap="round"
          />
          <path
            d="M 76 170 Q 100 148 124 170"
            fill="none" stroke="rgba(207,163,73,0.5)" strokeWidth="1" strokeLinecap="round"
          />
          <line x1="100" y1="150" x2="100" y2="164" stroke="#3a3d45" strokeWidth="4" />

          {/* ── CHASSIS / NOSE ─────────────────────────────────────── */}
          <path
            d="M 88 96 L 112 96 L 112 176 L 88 176 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.55)" strokeWidth="0.9"
          />
          <path
            d="M 74 30 C 80 52 84 74 88 96 L 112 96 C 116 74 120 52 126 30 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.6)" strokeWidth="0.9"
          />
          {/* nose cape line */}
          <path d="M 78 52 C 86 60 114 60 122 52" fill="none" stroke="rgba(207,163,73,0.4)" strokeWidth="0.8" />

          {/* ── FRONT WING ─────────────────────────────────────────── */}
          <rect x="10" y="4" width="9" height="30" rx="1.5" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.6)" strokeWidth="0.8" />
          <rect x="181" y="4" width="9" height="30" rx="1.5" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.6)" strokeWidth="0.8" />
          <path d="M 19 10 C 60 16 140 16 181 10 L 181 15 C 140 21 60 21 19 15 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.65)" strokeWidth="0.9" />
          <path d="M 19 20 C 60 26 140 26 181 20 L 181 25 C 140 31 60 31 19 25 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.5)" strokeWidth="0.8" />
          <path d="M 19 29 C 60 35 140 35 181 29 L 181 33 C 140 38 60 38 19 33 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.4)" strokeWidth="0.7" />

          {/* ── REAR WING ──────────────────────────────────────────── */}
          <rect x="42" y="318" width="10" height="52" rx="1.5" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.6)" strokeWidth="0.8" />
          <rect x="148" y="318" width="10" height="52" rx="1.5" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.6)" strokeWidth="0.8" />
          {/* swan neck */}
          <path d="M 96 296 L 104 296 L 103 336 L 97 336 Z" fill="#15161a" stroke="rgba(207,163,73,0.4)" strokeWidth="0.7" />
          {/* main + DRS flap */}
          <path d="M 52 340 L 148 340 L 148 350 L 52 350 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.65)" strokeWidth="0.9" />
          <path d="M 52 326 L 148 326 L 148 335 L 52 335 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.5)" strokeWidth="0.8" />
          <line x1="52" y1="330.5" x2="148" y2="330.5" stroke="rgba(207,163,73,0.35)" strokeWidth="0.6" />
          {/* rain light */}
          <rect x="96.5" y="352" width="7" height="10" rx="1.5" fill="#3d0a0d" stroke="rgba(239,68,68,0.7)" strokeWidth="0.7" />

          {/* ── WHEELS ─────────────────────────────────────────────── */}
          {[["F", 37, 132], ["F", 163, 132], ["R", 30, 295], ["R", 170, 295]].map(
            ([end, cx, cy], i) => {
              const w = end === "F" ? 30 : 40;
              const h = end === "F" ? 72 : 86;
              return (
                <g key={i}>
                  {/* brake-energy glow (ref-driven opacity) */}
                  <circle
                    ref={(el) => {
                      glowRefs.current[i] = el;
                    }}
                    cx={cx as number}
                    cy={cy as number}
                    r={h / 2.6}
                    fill="url(#tyre-warm)"
                    style={{ opacity: 0.15, transition: "opacity 400ms" }}
                  />
                  <rect
                    x={(cx as number) - w / 2}
                    y={(cy as number) - h / 2}
                    width={w}
                    height={h}
                    rx={w / 2.6}
                    fill="#0c0c0f"
                    stroke="rgba(207,163,73,0.65)"
                    strokeWidth="1.1"
                  />
                  {/* 2022 wheel-cover disc */}
                  <circle cx={cx as number} cy={cy as number} r={w / 3.1} fill="#131418" stroke="rgba(207,163,73,0.4)" strokeWidth="0.8" />
                  <circle cx={cx as number} cy={cy as number} r={w / 7} fill="none" stroke="rgba(207,163,73,0.35)" strokeWidth="0.7" />
                </g>
              );
            }
          )}

          {/* ── SUSPENSION ─────────────────────────────────────────── */}
          <g stroke="#2c2f36" strokeWidth="2.4" strokeLinecap="round">
            <line x1="88" y1="116" x2="52" y2="126" />
            <line x1="88" y1="134" x2="52" y2="138" />
            <line x1="112" y1="116" x2="148" y2="126" />
            <line x1="112" y1="134" x2="148" y2="138" />
            <line x1="90" y1="278" x2="50" y2="288" />
            <line x1="90" y1="296" x2="50" y2="300" />
            <line x1="110" y1="278" x2="150" y2="288" />
            <line x1="110" y1="296" x2="150" y2="300" />
          </g>
        </svg>

        {/* ── Compound + age badge ─────────────────────────────────── */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-white border border-red-500/60 bg-red-500/15 rounded px-1.5 py-px">
            C4
          </span>
          <MicroLabel>
            LAP <span ref={wearRef} className="text-white">6</span> ON SET
          </MicroLabel>
        </div>
      </div>
    </div>
  );
}

/* ── demo accessors (kept tiny; full frame not needed here) ───────── */
import { demoFrame } from "@/lib/cockpit/demo";
import { PanelHeader } from "./PanelHeader";
function demoBrake(t: number) {
  return demoFrame(t).brake;
}
function demoLap(t: number) {
  return demoFrame(t).lap;
}

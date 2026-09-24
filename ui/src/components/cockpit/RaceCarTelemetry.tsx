import { useEffect, useRef } from "react";
import { Flame, Cpu } from "lucide-react";
import { SourceBadge } from "./primitives";
import { useLiveOrDemo, getActiveFrame } from "@/hooks/useLiveOrDemo";
import { cockpitCursor, lapProfile, TRACK_LEN } from "@/lib/cockpit/demo";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useUxStore } from "@/store/uxStore";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";

/**
 * RaceCarTelemetry — Broadcast & Esports High-Octane Chassis & Thermal HUD:
 *  - 2022-regulation F1 top view with dynamic carbon-ceramic incandescent brake discs
 *  - 4-corner tactical HUD pods (FL, FR, RL, RR) with dynamic thermal health mini-bars
 *  - Official F1 broadcast tyre compound badge (C4 Soft / Stint Laps)
 *  - 5 Hz RAF telemetry loop with zero React re-renders
 */

const CORNERS = ["FL", "FR", "RL", "RR"] as const;
const PHASE = [0.4, 1.7, 2.9, 3.8];

/** Temp -> Hue: cold 210° (cyan/blue) -> optimal 140° (neon green) -> hot 0° (neon red) */
function tempColor(t: number, cold: number, optimal: number, hot: number): string {
  if (!Number.isFinite(t)) return "hsl(210, 90%, 55%)";
  let norm: number;
  if (t < optimal) {
    const range = Math.max(1, optimal - cold);
    norm = ((t - cold) / range) * 0.5;
  } else {
    const range = Math.max(1, hot - optimal);
    norm = 0.5 + Math.min(1, (t - optimal) / range) * 0.5;
  }
  const hue = 210 - 210 * Math.min(1, Math.max(0, norm));
  return `hsl(${hue}, 90%, 55%)`;
}

export function RaceCarTelemetry() {
  const surfRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const innerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const brkRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const wearRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);
  const glowRefs = useRef<Array<SVGCircleElement | null>>([]);
  const wearRef = useRef<HTMLSpanElement | null>(null);
  const avgWearRef = useRef<HTMLSpanElement | null>(null);
  const compoundRef = useRef<HTMLSpanElement | null>(null);
  const compoundDotRef = useRef<HTMLSpanElement | null>(null);
  const { source } = useLiveOrDemo();

  useEffect(() => {
    const iv = setInterval(() => {
      const t = performance.now() / 1000;
      const state = useTelemetryStore.getState();
      const isLive = state.isConnected && state.telemetry !== null;

      const { data: f } = getActiveFrame(t);
      const isScrubbing = !isLive && cockpitCursor.dist !== null;
      let brake = f ? f.brake : 0;
      const lap = f ? f.lap : 1;

      let scrubBrake = brake;
      if (isScrubbing) {
        const norm = Math.max(0, Math.min(1, cockpitCursor.dist! / TRACK_LEN));
        const prof = lapProfile(600);
        const pLen = prof.dist.length;
        const pIdx = Math.min(pLen - 1, Math.max(0, Math.floor(norm * pLen)));
        scrubBrake = prof.brake[pIdx] ?? 0;
        brake = scrubBrake;
      }

      const liveSurfs = state.telemetry?.tyreTemps;
      const liveInners = state.telemetry?.tyreInnerTemps;
      const liveBrakes = state.telemetry?.brakesTemp;
      const liveWear = state.carDamage?.tyresWear;

      CORNERS.forEach((c, i) => {
        let surf: number;
        if (isLive && liveSurfs && liveSurfs[i] != null && liveSurfs[i] > 0) {
          surf = liveSurfs[i];
        } else if (isScrubbing) {
          surf = 88 + scrubBrake * 26 + (i >= 2 ? 4 : 0);
        } else {
          surf = 88 + 13 * Math.sin(t / 9 + PHASE[i]) + brake * 6 + (i >= 2 ? 4 : 0);
        }

        let inner: number;
        if (isLive && liveInners && liveInners[i] != null && liveInners[i] > 0) {
          inner = liveInners[i];
        } else if (isScrubbing) {
          inner = surf + 7 + scrubBrake * 8;
        } else {
          inner = surf + 7 + 3 * Math.sin(t / 6 + PHASE[i]);
        }

        let brk: number;
        if (isLive && liveBrakes && liveBrakes[i] != null && liveBrakes[i] > 0) {
          brk = liveBrakes[i];
        } else if (isScrubbing) {
          brk = 380 + scrubBrake * 560 + (i >= 2 ? -40 : 0);
        } else {
          brk = 380 + brake * 460 + 45 * Math.sin(t / 4.5 + PHASE[i]);
        }

        let wearPct: number;
        if (isLive && liveWear && liveWear[i] != null) {
          wearPct = liveWear[i];
        } else {
          wearPct = 4 + ((Math.floor(lap) * 2.2 + i * 1.3) % 40);
        }

        const sc = tempColor(surf, 60, 96, 125);
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
        if (wearRefs.current[i]) {
          wearRefs.current[i].textContent = `${Math.round(wearPct)}%`;
          wearRefs.current[i].style.color = wearPct > 60 ? "#EF4444" : wearPct > 35 ? "#F59E0B" : "#A3A3A3";
        }
        if (barRefs.current[i]) {
          const frac = Math.min(1, Math.max(0, (surf - 60) / 65));
          barRefs.current[i]!.style.width = `${frac * 100}%`;
          barRefs.current[i]!.style.backgroundColor = sc;
          barRefs.current[i]!.style.boxShadow = `0 0 8px ${sc}`;
        }

        // Wheel brake-energy incandescent thermal glow (Task 2.3)
        const glow = glowRefs.current[i];
        if (glow) {
          const isExtreme = brk > 550 || brake > 0.45;
          const glowIntensity = isLive && brk > 0 
            ? Math.min(1, Math.max(0.12, (brk - 300) / 580)) 
            : Math.min(1, 0.12 + brake * 0.88);
          glow.style.opacity = String(glowIntensity);
          const scale = isExtreme
            ? 1 + (isLive ? glowIntensity * 0.28 : brake * 0.28)
            : 1 + (isLive ? glowIntensity * 0.12 : brake * 0.12);
          glow.style.transform = `scale(${scale})`;
        }
      });

      // Tyre age & compound in live mode
      if (isLive) {
        const age = state.carStatus?.tyresAgeLaps ?? state.lapData?.lap ?? 1;
        if (wearRef.current) wearRef.current.textContent = String(age);

        if (liveWear && avgWearRef.current && Array.isArray(liveWear) && liveWear.length > 0) {
          const validPoints = liveWear.slice(0, 4).filter((w) => typeof w === "number" && Number.isFinite(w));
          const avg = validPoints.length > 0 ? Math.round(validPoints.reduce((a, b) => a + b, 0) / validPoints.length) : 12;
          avgWearRef.current.textContent = `${avg}%`;
        }

        const compoundName = typeof state.carStatus?.tyreCompound === "string"
          ? state.carStatus.tyreCompound.toUpperCase()
          : "PIRELLI MEDIUM";
        if (compoundRef.current) compoundRef.current.textContent = `PIRELLI ${compoundName}`;
      } else {
        if (wearRef.current) wearRef.current.textContent = String(6 + (Math.floor(lap) % 30));
        if (avgWearRef.current) avgWearRef.current.textContent = `${Math.round(8 + ((Math.floor(lap) * 2.2) % 40))}%`;
        if (compoundRef.current) compoundRef.current.textContent = "PIRELLI C4 SOFT";
      }
    }, 180);

    return () => clearInterval(iv);
  }, []);

  const carStatus = useTelemetryStore((s) => s.carStatus);
  const visualCompound = carStatus?.visualTyreCompound;
  const compoundLabel = visualCompound === 16 ? "SOFT" : visualCompound === 17 ? "MED" : visualCompound === 18 ? "HARD" : visualCompound === 7 ? "INTER" : visualCompound === 8 ? "WET" : "SOFT";
  const compoundColor = visualCompound === 16 ? "text-red-400 bg-red-500/20 border-red-500/40" : visualCompound === 17 ? "text-yellow-400 bg-yellow-500/20 border-yellow-500/40" : visualCompound === 18 ? "text-neutral-200 bg-neutral-200/20 border-neutral-200/40" : visualCompound === 7 ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/40" : visualCompound === 8 ? "text-blue-400 bg-blue-500/20 border-blue-500/40" : "text-red-400 bg-red-500/20 border-red-500/40";

  return (
    <div className="apx-panel w-full h-full relative flex flex-col p-2.5 bg-gradient-to-b from-[#111116] via-[#0A0A0E] to-[#070709] border border-gold/30 shadow-[0_0_25px_rgba(0,0,0,0.85)]">
      <PanelHeader
        label="Car · Thermals & Chassis"
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => useUxStore.getState().openPuModal()}
              className="px-2 py-0.5 rounded bg-gold/15 hover:bg-gold/30 text-gold border border-gold/40 text-[9px] font-mono font-bold tracking-wider transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Open FIA Power Unit & Engine Diagnostics (Packet 10)"
            >
              <Cpu size={11} />
              <span>PU HEALTH</span>
            </button>
            <SourceBadge source={source} />
          </div>
        }
      />

      <div className="flex-1 relative min-h-0 flex items-center justify-center">
        {/* Directional broadcast cues */}
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.25em] text-gold/70 font-bold">
          ▲ FRONT AERO
        </span>
        <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.25em] text-silver/40">
          ▼ REAR DIFFUSER
        </span>

        {/* ── 4-CORNER TACTICAL HUD PODS ─────────────────────────────────── */}
        {CORNERS.map((c, i) => (
          <div
            key={c}
            onClick={() => {
              const state = useTelemetryStore.getState();
              const surfs = state.telemetry?.tyreTemps;
              const inners = state.telemetry?.tyreInnerTemps;
              const brakes = state.telemetry?.brakesTemp;
              const wear = state.carDamage?.tyresWear;
              const s = surfs && surfs[i] ? surfs[i] : (c.startsWith("F") ? 98 : 88);
              const inn = inners && inners[i] ? inners[i] : (s + 6);
              const brk = brakes && brakes[i] ? brakes[i] : (c.startsWith("F") ? 645 : 440);
              const w = wear && wear[i] ? wear[i] : (c.startsWith("F") ? 10 : 12);

              useUxStore.getState().openTyreModal({
                corner: c,
                surfaceTempC: s,
                coreTempC: inn,
                brakeTempC: brk,
                psi: c.startsWith("F") ? 22.0 : 20.6,
                wearPct: w,
                compound: "C4 SOFT",
              });
            }}
            className={cn(
              "absolute flex flex-col gap-1 p-2 rounded-xl bg-black/75 ring-1 ring-white/10 shadow-[0_0_15px_rgba(0,0,0,0.9)] backdrop-blur-md z-20 min-w-[76px] cursor-pointer hover:ring-gold/50 hover:bg-black/90 transition-all active:scale-95 select-none",
              i < 2 ? "top-[16%]" : "top-[56%]",
              i % 2 === 0
                ? "left-[1%] items-end text-right"
                : "right-[1%] items-start text-left"
            )}
            title={`Click for ${c} Tyre & Brake Diagnostics`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] tracking-[0.16em] text-white font-black">
                {c}
              </span>
              <span className={cn("font-mono text-[8px] px-1 py-px rounded font-bold border", compoundColor)}>
                {compoundLabel}
              </span>
            </div>


            {/* Surface Temperature */}
            <div className="flex flex-col gap-0.5 w-full">
              <div className="flex items-baseline justify-between gap-1">
                <span className="font-mono text-[8px] tracking-[0.12em] text-silver/50">SURF</span>
                <span
                  ref={(el) => {
                    surfRefs.current[i] = el;
                  }}
                  className="font-mono text-[13px] font-black tabular-nums transition-colors duration-300"
                  style={{ color: "var(--color-signal-go)" }}
                >
                  90°C
                </span>
              </div>
              {/* Thermal gradient mini-bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  ref={(el) => {
                    barRefs.current[i] = el;
                  }}
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: "60%", backgroundColor: "var(--color-signal-go)" }}
                />
              </div>
            </div>

            {/* Inner Tyre Temp */}
            <div className="flex items-baseline justify-between gap-2 w-full pt-0.5 border-t border-white/5">
              <span className="font-mono text-[8px] tracking-[0.12em] text-silver/50">CORE</span>
              <span
                ref={(el) => {
                  innerRefs.current[i] = el;
                }}
                className="font-mono text-[10px] tabular-nums font-bold text-silver"
              >
                97°C
              </span>
            </div>

            {/* Brake Rotor Temp */}
            <div className="flex items-baseline justify-between gap-2 w-full">
              <span className="font-mono text-[8px] tracking-[0.12em] text-silver/50 flex items-center gap-0.5">
                <Flame size={8} className="text-signal-caution" /> BRK
              </span>
              <span
                ref={(el) => {
                  brkRefs.current[i] = el;
                }}
                className="font-mono text-[10px] tabular-nums font-bold text-signal-caution"
              >
                420°C
              </span>
            </div>

            {/* Tyre Degradation / Wear % */}
            <div className="flex items-baseline justify-between gap-2 w-full pt-0.5 border-t border-white/5">
              <span className="font-mono text-[8px] tracking-[0.12em] text-silver/50">WEAR</span>
              <span
                ref={(el) => {
                  wearRefs.current[i] = el;
                }}
                className="font-mono text-[10px] tabular-nums font-bold text-neutral-300"
              >
                12%
              </span>
            </div>
          </div>
        ))}

        {/* ── 2022 F1 CAR SILHOUETTE (SVG) ─────────────────────────────────── */}
        <svg
          viewBox="0 0 200 380"
          className="relative h-full w-auto max-w-[66%] drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="carbon-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#252830" />
              <stop offset="55%" stopColor="#131418" />
              <stop offset="100%" stopColor="#0B0B0E" />
            </linearGradient>
            <linearGradient id="wing-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2F323B" />
              <stop offset="100%" stopColor="#111215" />
            </linearGradient>
            <radialGradient id="brake-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="22%" stopColor="#FFF275" stopOpacity="0.95" />
              <stop offset="48%" stopColor="#FF6B00" stopOpacity="0.85" />
              <stop offset="78%" stopColor="#DC2626" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0" />
            </radialGradient>
            <filter id="brake-incandescent-bloom" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="body-highlight" cx="50%" cy="22%" r="80%">
              <stop offset="0%" stopColor="#8A93A5" stopOpacity="0.35" />
              <stop offset="55%" stopColor="#8A93A5" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8A93A5" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ground shadow */}
          <ellipse cx="100" cy="192" rx="96" ry="182" fill="rgba(0,0,0,0.6)" />

          {/* Body sheen */}
          <ellipse cx="100" cy="150" rx="30" ry="120" fill="url(#body-highlight)" />

          {/* ── FLOOR ──────────────────────────────────────────────── */}
          <path
            d="M 56 176 L 144 176 L 146 296 L 118 306 L 82 306 L 54 296 Z"
            fill="#090A0D"
            stroke="rgba(207,163,73,0.4)"
            strokeWidth="0.8"
          />
          <line x1="56" y1="182" x2="56" y2="292" stroke="rgba(207,163,73,0.6)" strokeWidth="1" />
          <line x1="144" y1="182" x2="144" y2="292" stroke="rgba(207,163,73,0.6)" strokeWidth="1" />

          {/* ── REAR DIFFUSER & BEAM WING ──────────────────────────── */}
          <rect x="60" y="336" width="80" height="6" rx="1" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.5)" strokeWidth="0.8" />
          <path d="M 70 348 L 130 348 L 136 362 L 64 362 Z" fill="#0D0E12" stroke="rgba(207,163,73,0.45)" strokeWidth="0.8" />
          <line x1="85" y1="350" x2="81" y2="361" stroke="rgba(207,163,73,0.35)" strokeWidth="0.8" />
          <line x1="100" y1="350" x2="100" y2="361" stroke="rgba(207,163,73,0.35)" strokeWidth="0.8" />
          <line x1="115" y1="350" x2="119" y2="361" stroke="rgba(207,163,73,0.35)" strokeWidth="0.8" />

          {/* ── SIDEPODS ───────────────────────────────────────────── */}
          <path
            d="M 88 168 L 64 172 C 56 190 56 226 66 252 L 88 262 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.65)" strokeWidth="1"
          />
          <path
            d="M 112 168 L 136 172 C 144 190 144 226 134 252 L 112 262 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.65)" strokeWidth="1"
          />
          <rect x="63" y="174" width="7" height="14" rx="2" fill="#050506" stroke="rgba(207,163,73,0.6)" strokeWidth="0.6" />
          <rect x="130" y="174" width="7" height="14" rx="2" fill="#050506" stroke="rgba(207,163,73,0.6)" strokeWidth="0.6" />

          {/* ── ENGINE COVER + AIRBOX + FIN ────────────────────────── */}
          <rect x="91" y="146" width="18" height="16" rx="5" fill="#050506" stroke="rgba(207,163,73,0.7)" strokeWidth="0.8" />
          <path
            d="M 88 168 L 112 168 C 112 220 108 268 104 296 L 96 296 C 92 268 88 220 88 168 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.7)" strokeWidth="1"
          />
          <path d="M 98 208 L 102 208 L 101.5 292 L 98.5 292 Z" fill="rgba(207,163,73,0.4)" />

          {/* ── COCKPIT + HALO ─────────────────────────────────────── */}
          <ellipse cx="100" cy="158" rx="13" ry="20" fill="#050506" stroke="rgba(207,163,73,0.6)" strokeWidth="0.8" />
          <path
            d="M 76 170 Q 100 148 124 170"
            fill="none" stroke="#3E424B" strokeWidth="6" strokeLinecap="round"
          />
          <path
            d="M 76 170 Q 100 148 124 170"
            fill="none" stroke="rgba(207,163,73,0.6)" strokeWidth="1" strokeLinecap="round"
          />
          <line x1="100" y1="150" x2="100" y2="164" stroke="#3E424B" strokeWidth="4.5" />

          {/* ── NOSE & FRONT WING ──────────────────────────────────── */}
          <path
            d="M 88 96 L 112 96 L 112 176 L 88 176 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.65)" strokeWidth="0.9"
          />
          <path
            d="M 74 30 C 80 52 84 74 88 96 L 112 96 C 116 74 120 52 126 30 Z"
            fill="url(#carbon-body)" stroke="rgba(207,163,73,0.7)" strokeWidth="1"
          />
          <rect x="10" y="4" width="9" height="30" rx="1.5" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.7)" strokeWidth="0.8" />
          <rect x="181" y="4" width="9" height="30" rx="1.5" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.7)" strokeWidth="0.8" />
          <path d="M 19 10 C 60 16 140 16 181 10 L 181 15 C 140 21 60 21 19 15 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.7)" strokeWidth="1" />
          <path d="M 19 20 C 60 26 140 26 181 20 L 181 25 C 140 31 60 31 19 25 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.55)" strokeWidth="0.8" />

          {/* ── REAR WING ──────────────────────────────────────────── */}
          <rect x="42" y="318" width="10" height="52" rx="1.5" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.7)" strokeWidth="0.8" />
          <rect x="148" y="318" width="10" height="52" rx="1.5" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.7)" strokeWidth="0.8" />
          <path d="M 52 340 L 148 340 L 148 350 L 52 350 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.7)" strokeWidth="1" />
          <path d="M 52 326 L 148 326 L 148 335 L 52 335 Z" fill="url(#wing-grad)" stroke="rgba(207,163,73,0.55)" strokeWidth="0.8" />

          {/* ── WHEELS & INCANDESCENT BRAKE GLOWS ───────────────────── */}
          {[["F", 37, 132], ["F", 163, 132], ["R", 30, 295], ["R", 170, 295]].map(
            ([end, cx, cy], i) => {
              const w = end === "F" ? 30 : 40;
              const h = end === "F" ? 72 : 86;
              return (
                <g key={i}>
                  {/* Dynamic Glowing Carbon-Ceramic Brake Disc Incandescence */}
                  <circle
                    ref={(el) => {
                      glowRefs.current[i] = el;
                    }}
                    cx={cx as number}
                    cy={cy as number}
                    r={h / 2.2}
                    fill="url(#brake-glow)"
                    filter="url(#brake-incandescent-bloom)"
                    style={{
                      opacity: 0.15,
                      transformOrigin: `${cx}px ${cy}px`,
                      transition: "opacity 180ms ease-out, transform 180ms ease-out",
                    }}
                  />

                  {/* Wheel Tyre Body */}
                  <rect
                    x={(cx as number) - w / 2}
                    y={(cy as number) - h / 2}
                    width={w}
                    height={h}
                    rx={w / 2.6}
                    fill="#0A0B0E"
                    stroke="rgba(207,163,73,0.75)"
                    strokeWidth="1.2"
                  />
                  {/* 2022 Aerodynamic Wheel-Cover Disc */}
                  <circle cx={cx as number} cy={cy as number} r={w / 3.1} fill="#14161C" stroke="rgba(207,163,73,0.5)" strokeWidth="0.9" />
                  <circle cx={cx as number} cy={cy as number} r={w / 7} fill="#1E2028" stroke="rgba(207,163,73,0.4)" strokeWidth="0.8" />
                </g>
              );
            }
          )}

          {/* Suspension Wishbones */}
          <g stroke="#353842" strokeWidth="2.6" strokeLinecap="round">
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

        {/* ── Official F1 Compound & Age Broadcast Badge ─────────────────── */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 border border-gold/40 shadow-[0_0_12px_rgba(207,163,73,0.15)] backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span
              ref={compoundDotRef}
              className={cn(
                "w-2 h-2 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)]",
                visualCompound === 17
                  ? "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]"
                  : visualCompound === 18
                    ? "bg-neutral-200 shadow-[0_0_6px_rgba(229,229,229,0.8)]"
                    : visualCompound === 7
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                      : visualCompound === 8
                        ? "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]"
                        : "bg-red-500"
              )}
            />
            <span ref={compoundRef} className="font-mono text-[10px] font-black text-white tracking-wider uppercase">
              PIRELLI C4 SOFT
            </span>
          </div>
          <div className="h-3 w-px bg-white/20" />
          <span className="font-mono text-[9px] text-silver/80 tracking-[0.14em] uppercase">
            WEAR <span ref={avgWearRef} className="text-white font-bold">12%</span> · LAP <span ref={wearRef} className="text-white font-bold">7</span> ON SET
          </span>
        </div>

      </div>
    </div>
  );
}

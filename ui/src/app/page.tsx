"use client";

import Link from "next/link";
import { TRACK_IDS } from "@/utils/constants";
import { formatLapTime } from "@/utils/format";
import { useTelemetryStore } from "@/store/telemetryStore";
import ConnectionStatus from "@/components/f1/ConnectionStatus";
import { LABEL_STYLE, NO_SIGNAL } from "@/design/system";

/**
 * Landing — role portals + live pulse.
 *
 * User flow (docs/internal/ux_user_stories.md):
 *   ENGINEER    -> /dashboard               (live cockpit)
 *   STRATEGIST  -> /dashboard/intelligence  (Mission Control)
 *   SYSTEM      -> /debug                   (raw inspector)
 *
 * Portals are ALWAYS visible; the live pulse is a bonus, not a gate.
 */

const PORTALS = [
  {
    role: "ENGINEER",
    tag: "LIVE TELEMETRY",
    href: "/dashboard",
    blurb:
      "Real-time cockpit: speed, gear, shift lights, tyre thermals and track position at race pace.",
    cta: "ENTER COCKPIT",
  },
  {
    role: "STRATEGIST",
    tag: "ANALYSIS",
    href: "/dashboard/intelligence",
    blurb:
      "Mission Control: ghost-lap deltas, corner analysis, AI debriefs and setup exploration.",
    cta: "OPEN MISSION CONTROL",
  },
  {
    role: "SYSTEM",
    tag: "OPERATOR",
    href: "/debug",
    blurb:
      "Raw socket health, packet payloads and connection state. Debug-grade honesty.",
    cta: "INSPECT SYSTEM",
  },
] as const;

function LivePulse() {
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const lapData = useTelemetryStore((s) => s.lapData);

  if (!telemetry) return null;

  return (
    <div className="apx-panel w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8 py-10 px-8 text-center">
      <div>
        <div className="font-mono text-silver/60 mb-2" style={LABEL_STYLE}>
          SPEED
        </div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-gold font-display text-7xl leading-none">
            {Math.round(telemetry.speed)}
          </span>
          <span className="text-silver/50 font-mono text-xl font-bold">KPH</span>
        </div>
      </div>
      <div>
        <div className="font-mono text-silver/60 mb-2" style={LABEL_STYLE}>
          RPM
        </div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-white font-display text-7xl leading-none">
            {telemetry.rpm.toLocaleString()}
          </span>
          <span className="text-silver/50 font-mono text-xl font-bold">REV</span>
        </div>
      </div>
      <div>
        <div className="font-mono text-silver/60 mb-2" style={LABEL_STYLE}>
          GEAR
        </div>
        <span className="text-white font-display text-7xl leading-none">
          {telemetry.gear === 0 ? "N" : telemetry.gear === -1 ? "R" : telemetry.gear}
        </span>
      </div>
      <div>
        <div className="font-mono text-silver/60 mb-2" style={LABEL_STYLE}>
          LAST LAP
        </div>
        <span className="text-white font-display text-7xl leading-none">
          {lapData?.lastLapTime ? formatLapTime(lapData.lastLapTime) : NO_SIGNAL}
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const session = useTelemetryStore((s) => s.session);
  const isConnected = useTelemetryStore((s) => s.isConnected);
  const lapData = useTelemetryStore((s) => s.lapData);

  return (
    <main className="min-h-screen flex flex-col bg-[hsl(var(--color-apx-black))] text-silver">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="grid grid-cols-3 items-center px-8 h-16 border-b border-gold/30 bg-carbon">
        <h1 className="text-gold text-2xl font-black tracking-tight justify-self-start">
          APX IQ
        </h1>

        <div className="flex items-center justify-center gap-10">
          <div className="flex flex-col items-center">
            <span className="font-mono text-silver/50" style={LABEL_STYLE}>
              SESSION
            </span>
            <span className="text-white font-bold leading-none">RACE</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="font-mono text-silver/50" style={LABEL_STYLE}>
              TRACK
            </span>
            <span className="text-white font-bold uppercase leading-none">
              {session?.trackId !== undefined
                ? TRACK_IDS[session.trackId] ?? "UNKNOWN"
                : "WAITING"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-5">
          <div className="flex flex-col items-end">
            <span className="font-mono text-silver/50" style={LABEL_STYLE}>
              LAP
            </span>
            <span className="text-gold font-mono text-xl font-bold leading-none">
              {lapData?.lap ?? 0}
              <span className="text-sm text-silver">/{session?.totalLaps ?? "—"}</span>
            </span>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-14 py-20 px-6">
        <div className="text-center max-w-3xl">
          <span className="font-mono text-gold/90" style={{ ...LABEL_STYLE, fontSize: 12 }}>
            REAL-TIME MOTORSPORT INTELLIGENCE
          </span>
          <h2 className="text-white font-display text-6xl md:text-7xl font-extrabold leading-tight mt-4">
            Digital <span className="text-gold">Pit Wall</span>
          </h2>
          <p className="mt-5 text-lg text-silver/80">
            Live telemetry ingestion, race-strategy simulation and engineering
            analytics — for F1 titles 2020 through 25.
          </p>
        </div>

        {/* Live pulse — only when data flows; portals never hide */}
        <LivePulse />

        {/* ── Role portals: one destination per persona ─────────────────── */}
        <div className="grid w-full max-w-6xl grid-cols-1 md:grid-cols-3 gap-6">
          {PORTALS.map((p) => (
            <Link
              key={p.role}
              href={p.href}
              className="apx-panel group flex flex-col cursor-pointer hover:border-gold-light/60 hover:-translate-y-0.5 hover:shadow-panel-hover transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gold text-xl font-bold tracking-wide">{p.role}</h3>
                <span className="font-mono text-[10px] tracking-[0.14em] text-silver/60 border border-white/10 rounded-full px-2 py-0.5">
                  {p.tag}
                </span>
              </div>
              <p className="text-sm text-silver/80 leading-relaxed mb-6 flex-1">
                {p.blurb}
              </p>
              <div className="font-mono text-xs tracking-[0.12em] text-gold border-t border-carbon-light pt-4 flex items-center">
                <span>{"> "}{p.cta}</span>
                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-6 text-center border-t border-carbon-light">
        <span className="font-mono text-xs tracking-[0.14em] text-silver/50">
          APX IQ · DIGITAL PIT WALL · F1 2020–25
        </span>
      </footer>
    </main>
  );
}

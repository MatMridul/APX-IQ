"use client";

import React from "react";
import { StatusBar } from "./StatusBar";
import { RaceCarTelemetry } from "./RaceCarTelemetry";
import { CentralTelemetry } from "./CentralTelemetry";
import { BottomInstruments } from "./BottomInstruments";
import { TrackMap } from "./TrackMap";
import { TelemetryRibbon } from "./TelemetryRibbon";
import { BattlePanel } from "./BattlePanel";
import { InsightFeed } from "./InsightFeed";
import { usePrefs } from "@/lib/cockpit/preferences";

/**
 * DashboardCanvas — 16:9 broadcast pit wall, deterministic percentage
 * grid (source coordinate reference 726×408).
 *
 *   LEFT   : thermal car (9–62) · instruments (64–97)
 *   CENTER : wheel cluster (9–52) · telemetry ribbon (54–97)
 *   RIGHT  : circuit map (9–48) · battle (50–72) · insights (74–97)
 *   TOP    : status bar (1–7.5)
 *
 * All instruments consume the demo signal generator (SIM-badged) until
 * the wiring phase swaps in live store frames.
 */

function Region({
  top,
  left,
  width,
  height,
  z = 10,
  children,
}: {
  top: string;
  left: string;
  width: string;
  height: string;
  z?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{ top, left, width, height, zIndex: z }}
    >
      {children}
    </div>
  );
}

export const DashboardCanvas: React.FC = () => {
  const { density } = usePrefs();
  return (
    <div
      className={`relative w-full h-full bg-[#070709] text-silver overflow-hidden select-none border border-[#B7A06A]/45 rounded-xl density-${density}`}
      style={{
        boxShadow:
          "inset 0 0 35px rgba(0,0,0,0.95), 0 0 45px rgba(0,0,0,0.9)",
      }}
    >
      {/* Background circuit / carbon texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111115] via-[#08080A] to-[#040405] opacity-90" />

      {/* ── Status bar ─────────────────────────────────────────────── */}
      <Region top="1%" left="1%" width="98%" height="6.5%" z={20}>
        <StatusBar demoTime />
      </Region>

      {/* ── LEFT column ────────────────────────────────────────────── */}
      <Region top="9%" left="1%" width="27%" height="53%">
        <RaceCarTelemetry />
      </Region>
      <Region top="64%" left="1%" width="27%" height="33%">
        <BottomInstruments />
      </Region>

      {/* ── CENTER column ──────────────────────────────────────────── */}
      <Region top="9%" left="30%" width="39%" height="43%" z={30}>
        <CentralTelemetry />
      </Region>
      <Region top="54%" left="30%" width="39%" height="43%">
        <TelemetryRibbon />
      </Region>

      {/* ── RIGHT column ───────────────────────────────────────────── */}
      <Region top="9%" left="71%" width="28%" height="39%">
        <TrackMap />
      </Region>
      <Region top="50%" left="71%" width="28%" height="22%">
        <BattlePanel />
      </Region>
      <Region top="74%" left="71%" width="28%" height="23%">
        <InsightFeed />
      </Region>
    </div>
  );
};

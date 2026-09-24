"use client";

import React from "react";
import { PitWallTelemetryRibbon } from "./PitWallTelemetryRibbon";
import { RaceCarTelemetry } from "./RaceCarTelemetry";
import { CentralTelemetry } from "./CentralTelemetry";
import { BottomInstruments } from "./BottomInstruments";
import { TrackMap } from "./TrackMap";
import { TelemetryRibbon } from "./TelemetryRibbon";
import { BattlePanel } from "./BattlePanel";
import { InsightFeed } from "./InsightFeed";
import { TelemetryStandbyOverlay } from "./TelemetryStandbyOverlay";
import { usePrefs } from "@/lib/cockpit/preferences";
import { useUxStore } from "@/store/uxStore";

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
  const openConnect = useUxStore((s) => s.openConnectModal);
  const openGuide = useUxStore((s) => s.openGuideModal);

  return (
    <div
      className={`relative w-full h-full bg-carbon-twill text-silver overflow-hidden select-none border border-white/[0.15] rounded-xl density-${density}`}
      style={{
        boxShadow:
          "inset 0 0 35px rgba(0,0,0,0.95), 0 0 45px rgba(0,0,0,0.9)",
      }}
    >
      {/* Background circuit / carbon texture + engineered field grid */}
      <div className="absolute inset-0 bg-radial from-amber-500/[0.03] via-transparent to-black/80 opacity-90 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Pit Wall Telemetry & FIA Race Control Ribbon (docked full-width) ── */}
      <Region top="0.6%" left="0.4%" width="99.2%" height="6.8%" z={20}>
        <PitWallTelemetryRibbon />
      </Region>

      {/* ── LEFT column ────────────────────────────────────────────── */}
      <Region top="9%" left="1%" width="27.2%" height="53%">
        <RaceCarTelemetry />
      </Region>
      <Region top="64%" left="1%" width="27.2%" height="33%">
        <BottomInstruments />
      </Region>

      {/* ── CENTER column (Optimized for Wider Widescreen F1 Steering Wheel) ── */}
      <Region top="8.8%" left="29.2%" width="41.6%" height="44.2%" z={30}>
        <CentralTelemetry />
      </Region>
      <Region top="54.2%" left="29.2%" width="41.6%" height="43.8%">
        <TelemetryRibbon />
      </Region>

      {/* ── RIGHT column ───────────────────────────────────────────── */}
      <Region top="9%" left="71.8%" width="27.2%" height="39%">
        <TrackMap />
      </Region>
      <Region top="50%" left="71%" width="28%" height="22%">
        <BattlePanel />
      </Region>
      <Region top="74%" left="71%" width="28%" height="23%">
        <InsightFeed />
      </Region>

      {/* ── Standby / Waiting for Telemetry Overlay ─────────────────── */}
      <TelemetryStandbyOverlay
        onOpenConnect={openConnect}
        onOpenGuide={openGuide}
      />
    </div>
  );
};

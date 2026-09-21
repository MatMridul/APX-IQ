"use client";

/**
 * Cockpit & Workstation primitives — honesty contract made visible.
 * Standardizes telemetry provenance across all 4 surfaces:
 *   - LIVE: Active UDP stream from F1 2020-25
 *   - SIM: High-fidelity synthetic/demo signal generator (preserved and honored)
 *   - REPLAY: Historical session playback
 *   - OFFLINE: Standby, awaiting stream
 *   - NoSignal: Absent data rendered as em-dash + micro-label
 */

export type ProvenanceMode = "LIVE" | "SIM" | "REPLAY" | "OFFLINE" | "NO_SIGNAL";

export function NoSignal({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1" title="No active data signal">
      <span className="text-neutral-500 font-mono text-xs leading-none">—</span>
      {label ? (
        <span className="font-mono text-[9px] tracking-[0.14em] text-neutral-400 uppercase">
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function SimBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[9px] tracking-[0.18em] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 select-none ${className}`}
      title="SIM — Driven by the demo telemetry generator (Honesty Contract)"
    >
      SIM
    </span>
  );
}

export function LiveBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.18em] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5 select-none ${className}`}
      title="LIVE — Ingesting 60Hz UDP telemetry stream"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      LIVE
    </span>
  );
}

export function ReplayBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[9px] tracking-[0.18em] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded px-1.5 py-0.5 select-none ${className}`}
      title="REPLAY — Historical session telemetry playback"
    >
      REPLAY
    </span>
  );
}

export function OfflineBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.14em] font-bold text-neutral-400 bg-neutral-900 border border-neutral-700/60 rounded px-1.5 py-0.5 select-none ${className}`}
      title="OFFLINE — Telemetry stream standby"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
      OFFLINE
    </span>
  );
}

export function MicroLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[9px] tracking-[0.14em] text-neutral-400 uppercase font-semibold select-none ${className}`}
    >
      {children}
    </span>
  );
}

export function SourceBadge({
  source,
  className = "",
}: {
  source: ProvenanceMode;
  className?: string;
}) {
  switch (source) {
    case "LIVE":
      return <LiveBadge className={className} />;
    case "SIM":
      return <SimBadge className={className} />;
    case "REPLAY":
      return <ReplayBadge className={className} />;
    case "OFFLINE":
      return <OfflineBadge className={className} />;
    default:
      return <NoSignal />;
  }
}


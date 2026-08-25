"use client";

/**
 * Cockpit primitives — honesty contract made visible.
 * NoSignal: absent data renders as em-dash + micro-label, never a guess.
 * SimBadge: marks anything driven by the demo signal generator.
 */

export function NoSignal({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5" title="No data source">
      <span className="text-silver/30 font-display leading-none">—</span>
      {label ? (
        <span className="font-mono text-[9px] tracking-[0.14em] text-silver/30 uppercase">
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function SimBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-mono text-[9px] tracking-[0.18em] text-signal-caution/90 border border-signal-caution/40 rounded px-1.5 py-px select-none ${className}`}
      title="Driven by the demo signal generator — not live telemetry"
    >
      SIM
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
      className={`font-mono text-[10px] tracking-[0.14em] text-silver/50 uppercase ${className}`}
    >
      {children}
    </span>
  );
}

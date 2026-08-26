"use client";

import React from "react";

/**
 * PanelHeader — standardized instrument heading (design/README.md):
 * gold accent tick + bright label, optional right-side slot.
 * Makes headings pop without increasing size.
 */

export function PanelHeader({
  label,
  right,
  className = "",
}: {
  label: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="w-[3px] h-3 rounded-sm bg-gold shadow-[0_0_6px_rgba(207,163,73,0.7)]" />
        <span className="font-mono text-[10px] tracking-[0.16em] text-white/90 uppercase font-bold">
          {label}
        </span>
      </div>
      {right}
    </div>
  );
}

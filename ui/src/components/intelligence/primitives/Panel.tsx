/**
 * Panel - Base container component for all dashboard and intelligence panels
 * Implements the canonical recipe per docs/frontend/DESIGN_SPEC.md §4:
 * Carbon bg · border rgba(191,149,63,0.3) · 2px radius · top gold shimmer ·
 * 4 gold corner accents · optional header (MicroLabel title + status dot) · faint dot texture
 */

import React from "react";
import { cn } from "@/lib/utils";
import { MicroLabel } from "@/components/cockpit/primitives";

export type PanelVariant = "default" | "highlight" | "danger" | "success" | "ghost";

const panelVariants: Record<PanelVariant, string> = {
  default: "bg-carbon border-gold/30",
  highlight: "bg-carbon border-gold/60 shadow-[0_0_20px_rgba(207,163,73,0.15)]",
  danger: "bg-carbon border-signal-stop/40",
  success: "bg-carbon border-signal-go/40",
  ghost: "bg-transparent border-white/10",
};

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  title?: string;
  /** Renders an extra element in the panel header (right side) */
  headerRight?: React.ReactNode;
  variant?: PanelVariant;
}

export function Panel({
  children,
  className,
  contentClassName,
  title,
  headerRight,
  variant = "default",
}: PanelProps) {
  return (
    <div
      className={cn(
        "relative border rounded-[2px] overflow-hidden flex flex-col group transition-all duration-300",
        "hover:shadow-[0_0_15px_rgba(207,163,73,0.1)]",
        panelVariants[variant],
        className
      )}
    >
      {/* Top shimmer line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-50 pointer-events-none" />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/30 pointer-events-none" />

      {/* Panel header */}
      {title && (
        <div className="px-3 py-1.5 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
          <MicroLabel className="text-white/90 font-bold">{title}</MicroLabel>
          <div className="flex items-center gap-2">
            {headerRight}
            <div className="w-1.5 h-1.5 rounded-full bg-gold/50 animate-pulse shadow-[0_0_5px_rgba(207,163,73,0.8)]" />
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          "p-3 flex-1 flex flex-col relative z-10 min-h-0 w-full h-full",
          contentClassName
        )}
      >
        {children}
      </div>

      {/* Background dot texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "4px 4px",
        }}
      />
    </div>
  );
}

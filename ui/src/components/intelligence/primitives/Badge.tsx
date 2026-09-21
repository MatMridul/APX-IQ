/**
 * Badge - Status indicator chip
 * Used for connection status, DRS, flags, and other statuses
 */

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "gold" | "success" | "danger" | "warning";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-silver border-white/10",
  gold: "bg-gold/20 text-gold border-gold/30",
  success: "bg-signal-go/15 text-signal-go border-signal-go/30",
  danger: "bg-signal-stop/15 text-signal-stop border-signal-stop/30",
  warning: "bg-signal-caution/15 text-signal-caution border-signal-caution/30",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  /** Adds a pulsing dot indicator */
  pulse?: boolean;
}

export function Badge({
  children,
  variant = "default",
  className,
  pulse = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border tracking-wider",
        badgeVariants[variant],
        className
      )}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </span>
  );
}

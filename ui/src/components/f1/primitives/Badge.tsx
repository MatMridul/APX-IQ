/**
 * Badge - Status indicator chip
 * Used for connection status, DRS, flags, and other statuses
 */

import { cn } from '@/lib/utils';
import type { BadgeVariant } from '@/lib/theme';
import { badgeVariants } from '@/lib/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  /** Adds a pulsing dot indicator */
  pulse?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  className,
  pulse = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border tracking-wider',
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

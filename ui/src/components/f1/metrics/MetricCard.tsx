/**
 * MetricCard - Compact stat display with label and value
 * Used for key metrics grid
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MetricColor } from '@/lib/theme';
import { metricColorVariants } from '@/lib/theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: MetricColor;
  className?: string;
  /** Optional icon */
  icon?: React.ReactNode;
}

export function MetricCard({
  label,
  value,
  unit,
  color = 'white',
  className,
  icon,
}: MetricCardProps) {
  return (
    <div className={cn(
      'flex flex-col items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3',
      'hover:bg-white/10 hover:border-gold/30 transition-all duration-200',
      className
    )}>
      {/* Label with optional icon */}
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-silver/80">
          {label}
        </span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <motion.span
          key={String(value)}
          initial={{ opacity: 0.8, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'text-4xl font-mono font-black leading-none tabular-nums',
            metricColorVariants[color]
          )}
        >
          {value}
        </motion.span>
        {unit && (
          <span className="text-sm text-silver/60 font-bold">{unit}</span>
        )}
      </div>
    </div>
  );
}

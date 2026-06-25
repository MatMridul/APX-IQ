/**
 * MetricValue - Animated single-stat display
 * Used for speed, RPM, temperatures, and other numeric values
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MetricSize, MetricColor } from '@/lib/theme';
import { metricSizeVariants, metricColorVariants } from '@/lib/theme';

interface MetricValueProps {
  /** Label shown above the value */
  label: string;
  /** The numeric or string value to display */
  value: string | number;
  /** Unit label shown after the value */
  unit?: string;
  size?: MetricSize;
  color?: MetricColor;
  className?: string;
  /** Whether to animate changes */
  animated?: boolean;
}

export function MetricValue({
  label,
  value,
  unit,
  size = 'md',
  color = 'white',
  className,
  animated = true,
}: MetricValueProps) {
  const ValueEl = animated ? motion.span : 'span';
  const animProps = animated
    ? { key: String(value), initial: { opacity: 0.8, y: 2 }, animate: { opacity: 1, y: 0 } }
    : {};

  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <span className="text-[10px] bg-white/10 w-fit px-1 rounded text-silver font-bold uppercase tracking-wider mb-1">
          {label}
        </span>
      )}
      <div className="flex items-baseline gap-1">
        <ValueEl
          {...animProps}
          className={cn(
            'font-mono font-bold leading-none tracking-tight',
            metricSizeVariants[size],
            metricColorVariants[color]
          )}
        >
          {value}
        </ValueEl>
        {unit && (
          <span className="text-sm text-silver/60 font-medium">{unit}</span>
        )}
      </div>
    </div>
  );
}

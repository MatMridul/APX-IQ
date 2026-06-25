/**
 * BarGauge - Animated bar gauge for throttle, brake, fuel, RPM, etc.
 * Supports both horizontal and vertical orientations
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GaugeColor } from '@/lib/theme';
import { gaugeColorVariants } from '@/lib/theme';

interface BarGaugeProps {
  /** Current value */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  color?: GaugeColor;
  /** Optional label below the gauge */
  label?: string;
  /** Vertical orientation for pedal inputs */
  vertical?: boolean;
  /** Show percentage readout */
  showValue?: boolean;
  className?: string;
}

export function BarGauge({
  value,
  max = 100,
  color = 'green',
  label,
  vertical = false,
  showValue = true,
  className,
}: BarGaugeProps) {
  const percent = Math.min((value / max) * 100, 100);
  const { bar, glow } = gaugeColorVariants[color];

  if (vertical) {
    return (
      <div className={cn('h-full w-full flex flex-col items-center gap-1 relative', className)}>
        {showValue && (
          <div className="absolute top-2 w-full text-center z-10 pointer-events-none">
            <span className="text-3xl font-mono font-black text-white drop-shadow-md">
              {Math.round(percent)}%
            </span>
          </div>
        )}

        <div className="flex-1 w-full bg-black/40 rounded relative border border-white/20 flex flex-col-reverse overflow-hidden">
          {/* Tick marks */}
          <div className="absolute inset-x-0 top-0 bottom-0 z-20 flex flex-col justify-between py-1 pointer-events-none">
            <div className="w-full h-[2px] bg-white shadow-[0_0_4px_rgba(255,255,255,1)]" />
            <div className="w-full h-[1px] bg-white/50" />
            <div className="w-full h-[1px] bg-white/80" />
            <div className="w-full h-[1px] bg-white/50" />
            <div className="w-full h-[2px] bg-white shadow-[0_0_4px_rgba(255,255,255,1)]" />
          </div>

          <motion.div
            className={cn('w-full relative z-10', bar, glow)}
            initial={{ height: '0%' }}
            animate={{ height: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {label && (
          <span className="text-[10px] text-silver font-bold uppercase tracking-wider">
            {label}
          </span>
        )}
      </div>
    );
  }

  // Horizontal
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between text-[10px] text-silver font-bold mb-1">
          <span>{label}</span>
          {showValue && <span>{Math.round(percent)}%</span>}
        </div>
      )}
      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className={cn('h-full', bar)}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
        />
      </div>
    </div>
  );
}

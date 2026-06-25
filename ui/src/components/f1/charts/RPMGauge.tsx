/**
 * RPMGauge - Horizontal RPM bar with redline warning
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apxColors, thresholds } from '@/lib/theme';

interface RPMGaugeProps {
  rpm: number;
  maxRPM: number;
  /** Current gear for display */
  gear?: number;
}

export function RPMGauge({ rpm, maxRPM, gear }: RPMGaugeProps) {
  const rpmMax = maxRPM || 15000;
  const percent = Math.min((rpm / rpmMax) * 100, 100);
  const isRedline = percent >= thresholds.rpm.redline * 100;
  const isOptimal = percent >= thresholds.rpm.optimal * 100;

  // Color transitions: white → yellow → red
  const barColor = isRedline
    ? 'bg-red-600'
    : isOptimal
    ? 'bg-yellow-400'
    : 'bg-white';

  const glowColor = isRedline
    ? 'shadow-[0_0_12px_rgba(239,68,68,0.8)]'
    : isOptimal
    ? 'shadow-[0_0_12px_rgba(234,179,8,0.6)]'
    : '';

  return (
    <div className="w-full flex flex-col gap-1.5">
      {/* Label row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-silver/80">ENGINE RPM</span>
          {isRedline && (
            <span className="text-[9px] font-black text-red-500 tracking-widest animate-pulse">
              REDLINE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {gear !== undefined && (
            <span className="text-xs font-mono text-silver">
              GEAR <span className="text-white font-black">
                {gear === 0 ? 'N' : gear === -1 ? 'R' : gear}
              </span>
            </span>
          )}
          <span className="text-xs font-mono text-white font-bold tabular-nums">
            {rpm.toLocaleString()} <span className="text-silver/60 font-normal">/ {rpmMax.toLocaleString()}</span>
          </span>
          <span className={cn(
            'text-xs font-mono font-black tabular-nums',
            isRedline ? 'text-red-500' : isOptimal ? 'text-yellow-400' : 'text-silver'
          )}>
            {Math.round(percent)}%
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-4 w-full bg-black/40 rounded border border-white/10 overflow-hidden relative">
        {/* Redline zone background */}
        <div
          className="absolute top-0 right-0 h-full bg-red-900/30"
          style={{ width: `${(1 - thresholds.rpm.redline) * 100}%` }}
        />
        {/* Optimal zone background */}
        <div
          className="absolute top-0 h-full bg-yellow-900/20"
          style={{
            left: `${thresholds.rpm.optimal * 100}%`,
            width: `${(thresholds.rpm.redline - thresholds.rpm.optimal) * 100}%`,
          }}
        />

        <motion.div
          className={cn('h-full rounded-r', barColor, glowColor)}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
        />
      </div>
    </div>
  );
}

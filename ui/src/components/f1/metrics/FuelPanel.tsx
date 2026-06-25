/**
 * FuelPanel - Fuel remaining, burn rate, laps remaining
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { thresholds } from '@/lib/theme';
import type { CarStatusData } from '@/hooks/useTelemetry';

interface FuelPanelProps {
  carStatus: CarStatusData | null;
  /** Estimated burn rate from derived metrics */
  burnRate: number;
}

export function FuelPanel({ carStatus, burnRate }: FuelPanelProps) {
  const fuel = carStatus?.fuelInTank ?? 0;
  const lapsLeft = carStatus?.fuelRemainingLaps;
  const validLapsLeft =
    lapsLeft !== undefined && lapsLeft > -10 && lapsLeft < 200
      ? lapsLeft
      : null;

  const fuelPercent = Math.min((fuel / 110) * 100, 100);
  const isLow = validLapsLeft !== null && validLapsLeft < thresholds.fuel.low;
  const isWarning =
    validLapsLeft !== null && validLapsLeft < thresholds.fuel.warning;

  const fuelBarColor = isLow
    ? 'from-red-900 to-red-500'
    : isWarning
    ? 'from-yellow-900 to-yellow-500'
    : 'from-blue-900 to-blue-500';

  return (
    <div className="flex flex-col gap-3 h-full justify-between">
      {/* Top row: remaining + laps */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-[10px] bg-white/10 w-fit px-1 rounded text-silver font-bold uppercase tracking-wider mb-1">
            Remaining
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-mono font-black text-white tabular-nums leading-none">
              {fuel > 0 ? fuel.toFixed(1) : '--.-'}
            </span>
            <span className="text-sm text-silver/60 font-bold">KG</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] bg-white/10 w-fit px-1 rounded text-silver font-bold uppercase tracking-wider mb-1">
            Laps Left
          </span>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-2xl font-mono font-black tabular-nums leading-none',
              isLow ? 'text-red-400 animate-pulse' : isWarning ? 'text-yellow-400' : 'text-green-400'
            )}>
              {validLapsLeft !== null ? validLapsLeft.toFixed(1) : '-.-'}
            </span>
            <span className="text-sm text-silver/60 font-bold">LAPS</span>
          </div>
        </div>
      </div>

      {/* Burn rate */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-silver/60 uppercase tracking-wider">
          Est. Burn Rate
        </span>
        <span className="text-sm font-mono font-bold text-silver tabular-nums">
          {burnRate > 0 ? `${burnRate.toFixed(1)} kg/lap` : '-- kg/lap'}
        </span>
      </div>

      {/* Fuel bar */}
      <div className="w-full h-5 bg-black rounded border border-gold/20 overflow-hidden relative">
        <div className="absolute inset-0 flex items-center pl-2 text-[10px] font-bold z-10 text-white mix-blend-difference">
          {fuel > 0 ? `${Math.round(fuelPercent)}%` : 'NO DATA'}
        </div>
        <motion.div
          className={cn('h-full bg-gradient-to-r', fuelBarColor)}
          animate={{ width: `${fuelPercent}%` }}
          transition={{ type: 'tween', duration: 0.3 }}
        />
      </div>

      {/* Low fuel warning */}
      {isLow && (
        <div className="flex items-center justify-center gap-2 py-1 bg-red-500/10 border border-red-500/30 rounded animate-pulse">
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
            ⚠ Low Fuel Warning
          </span>
        </div>
      )}
    </div>
  );
}

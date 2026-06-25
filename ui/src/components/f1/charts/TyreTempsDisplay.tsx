/**
 * TyreTempsDisplay - 4-tyre visual with temperature color coding and optimal range indicator
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getTyreTempClass, tyreTempRanges, thresholds } from '@/lib/theme';

interface TyreTempsDisplayProps {
  temps: number[]; // [FL, FR, RL, RR]
}

const TYRE_LABELS = ['FL', 'FR', 'RL', 'RR'];

function TyreTile({ label, temp }: { label: string; temp: number }) {
  const colorClass = getTyreTempClass(temp);
  const isOptimal =
    temp >= thresholds.tyreTemp.optimalMin && temp <= thresholds.tyreTemp.optimalMax;
  const isCold = temp < thresholds.tyreTemp.cold;
  const isCritical = temp >= thresholds.tyreTemp.critical;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Tyre visual */}
      <div className="w-12 h-16 rounded border border-white/15 bg-black/50 relative overflow-hidden flex items-end">
        <motion.div
          className={cn('w-full transition-colors duration-500 opacity-70', colorClass)}
          animate={{
            height: `${Math.min(((temp - 50) / 80) * 100, 100)}%`,
          }}
          transition={{ type: 'tween', duration: 0.3 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Status badge */}
        {isCritical && (
          <div className="absolute top-1 inset-x-0 flex justify-center">
            <span className="text-[8px] font-black text-red-400 animate-pulse">HOT</span>
          </div>
        )}
        {isCold && (
          <div className="absolute top-1 inset-x-0 flex justify-center">
            <span className="text-[8px] font-black text-blue-400">COLD</span>
          </div>
        )}
      </div>

      {/* Label */}
      <span className="text-[10px] font-bold text-silver">{label}</span>

      {/* Temperature */}
      <span className={cn(
        'text-sm font-mono font-bold tabular-nums leading-none',
        isCritical ? 'text-red-400' : isOptimal ? 'text-green-400' : isCold ? 'text-blue-400' : 'text-yellow-400'
      )}>
        {temp > 0 ? `${Math.round(temp)}°` : '--°'}
      </span>
    </div>
  );
}

export function TyreTempsDisplay({ temps }: TyreTempsDisplayProps) {
  return (
    <div className="flex flex-col gap-3 h-full justify-between">
      {/* Tyre grid */}
      <div className="flex items-end justify-around flex-1">
        {TYRE_LABELS.map((label, i) => (
          <TyreTile key={label} label={label} temp={temps?.[i] ?? 0} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-1 pt-1 border-t border-white/5">
        {[
          { label: 'Cold', color: 'bg-blue-500' },
          { label: 'Optimal', color: 'bg-green-500' },
          { label: 'Hot', color: 'bg-yellow-500' },
          { label: 'Critical', color: 'bg-red-600' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full', color)} />
            <span className="text-[9px] text-silver/60 font-bold">{label}</span>
          </div>
        ))}
        <span className="text-[9px] text-silver/40">Optimal: {thresholds.tyreTemp.optimalMin}–{thresholds.tyreTemp.optimalMax}°C</span>
      </div>
    </div>
  );
}

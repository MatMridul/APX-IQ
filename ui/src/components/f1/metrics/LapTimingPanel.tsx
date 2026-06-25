/**
 * LapTimingPanel - Current lap time, sector splits, last lap, position
 */

'use client';

import { cn } from '@/lib/utils';
import { formatLapTime } from '@/utils/format';
import type { LapData } from '@/hooks/useTelemetry';
import type { SectorStatus } from '@/lib/theme';
import { sectorColors } from '@/lib/theme';

interface LapTimingPanelProps {
  lapData: LapData | null;
  totalLaps?: number;
  /** Best sector times in ms [s1, s2, s3] for delta coloring */
  bestSectors?: [number, number, number];
}

function SectorRow({
  label,
  timeMs,
  status = 'neutral',
}: {
  label: string;
  timeMs: number | undefined | null;
  status?: SectorStatus;
}) {
  const formatted = timeMs ? (timeMs / 1000).toFixed(3) : '-.---';
  return (
    <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded border border-white/5">
      <span className="text-[10px] font-bold text-silver uppercase tracking-wider">{label}</span>
      <span className={cn('font-mono font-bold text-base tabular-nums', sectorColors[status])}>
        {formatted}
      </span>
    </div>
  );
}

export function LapTimingPanel({ lapData, totalLaps, bestSectors }: LapTimingPanelProps) {
  const sector1Status: SectorStatus =
    lapData?.sector1 && bestSectors?.[0]
      ? lapData.sector1 < bestSectors[0]
        ? 'personalBest'
        : lapData.sector1 < bestSectors[0] * 1.01
        ? 'improved'
        : 'slower'
      : lapData?.sector1 ? 'neutral' : 'invalid';

  const sector2Status: SectorStatus =
    lapData?.sector2 && bestSectors?.[1]
      ? lapData.sector2 < bestSectors[1]
        ? 'personalBest'
        : lapData.sector2 < bestSectors[1] * 1.01
        ? 'improved'
        : 'slower'
      : lapData?.sector2 ? 'neutral' : 'invalid';

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Current lap time — hero display */}
      <div className="flex flex-col items-center py-2 border-b border-white/5">
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gold/80 mb-1">
          Current Lap
        </span>
        <span className="text-6xl font-mono font-black text-white tabular-nums leading-none">
          {formatLapTime(lapData?.currentLapTime)}
        </span>
      </div>

      {/* Sector times */}
      <div className="flex flex-col gap-1">
        <SectorRow label="S1" timeMs={lapData?.sector1} status={sector1Status} />
        <SectorRow label="S2" timeMs={lapData?.sector2} status={sector2Status} />
        <SectorRow label="S3" timeMs={undefined} status="invalid" />
      </div>

      {/* Last lap + position + delta */}
      <div className="flex gap-2 mt-auto">
        <div className="flex-1 flex flex-col items-center bg-white/5 border border-white/10 rounded p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-silver/70">Last Lap</span>
          <span className="font-mono font-black text-white text-lg tabular-nums">
            {formatLapTime(lapData?.lastLapTime)}
          </span>
        </div>
        <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded p-2 px-3">
          <span className="text-[9px] font-bold uppercase tracking-wider text-silver/70">Pos</span>
          <span className="font-mono font-black text-gold text-lg">
            {lapData?.position ?? '-'}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center bg-white/5 border border-white/10 rounded p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-silver/70">Gap Ahead</span>
          <span className="font-mono font-black text-gold text-lg tabular-nums">
            {lapData?.deltaToFront !== undefined
              ? `+${lapData.deltaToFront.toFixed(3)}`
              : '-.---'}
          </span>
        </div>
      </div>
    </div>
  );
}

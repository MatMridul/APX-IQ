/**
 * SpeedChart - Real-time speed trace with current/avg/max reference lines
 */

'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  ReferenceLine,
  Tooltip,
} from 'recharts';
import { apxColors, chartConfig } from '@/lib/theme';
import type { HistoryPoint } from '@/hooks/useTelemetry';

interface SpeedChartProps {
  history: HistoryPoint[];
  avgSpeed: number;
  maxSpeed: number;
}

export function SpeedChart({ history, avgSpeed, maxSpeed }: SpeedChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={history} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis domain={[0, 380]} hide />

        {/* Max speed reference */}
        <ReferenceLine
          y={maxSpeed}
          stroke={apxColors.alert}
          strokeDasharray="4 3"
          strokeOpacity={0.6}
          strokeWidth={1}
        />

        {/* Avg speed reference */}
        <ReferenceLine
          y={avgSpeed}
          stroke={apxColors.silver}
          strokeDasharray="4 3"
          strokeOpacity={0.5}
          strokeWidth={1}
        />

        <Line
          type="monotone"
          dataKey="speed"
          stroke={apxColors.chartSpeed}
          strokeWidth={chartConfig.strokeWidth}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

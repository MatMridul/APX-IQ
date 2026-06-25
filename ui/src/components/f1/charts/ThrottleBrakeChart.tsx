/**
 * ThrottleBrakeChart - F1-style overlapping throttle and brake traces
 * Green = throttle, Red = brake
 */

'use client';

import {
  ComposedChart,
  Line,
  Area,
  ResponsiveContainer,
  YAxis,
  ReferenceLine,
  Legend,
} from 'recharts';
import { apxColors, chartConfig } from '@/lib/theme';
import type { HistoryPoint } from '@/hooks/useTelemetry';

interface ThrottleBrakeChartProps {
  history: HistoryPoint[];
}

export function ThrottleBrakeChart({ history }: ThrottleBrakeChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={history} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis domain={[0, 100]} hide />

        {/* 50% reference line */}
        <ReferenceLine y={50} stroke={apxColors.silver} strokeOpacity={0.15} strokeWidth={1} />

        {/* Throttle area fill */}
        <Area
          type="monotone"
          dataKey="throttle"
          stroke={apxColors.chartThrottle}
          strokeWidth={2}
          fill={apxColors.chartThrottle}
          fillOpacity={0.12}
          dot={false}
          isAnimationActive={false}
        />

        {/* Brake area fill */}
        <Area
          type="monotone"
          dataKey="brake"
          stroke={apxColors.chartBrake}
          strokeWidth={2}
          fill={apxColors.chartBrake}
          fillOpacity={0.12}
          dot={false}
          isAnimationActive={false}
        />

        {/* Throttle line on top */}
        <Line
          type="monotone"
          dataKey="throttle"
          stroke={apxColors.chartThrottle}
          strokeWidth={chartConfig.strokeWidth}
          dot={false}
          isAnimationActive={false}
        />

        {/* Brake line on top */}
        <Line
          type="monotone"
          dataKey="brake"
          stroke={apxColors.chartBrake}
          strokeWidth={chartConfig.strokeWidth}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

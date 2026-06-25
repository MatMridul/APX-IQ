/**
 * DashboardFooter - Live analytics stats bar
 * Shows derived metrics: avg speed, max speed, brake bias, tyre stress, uptime
 */

'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DerivedMetrics } from '@/hooks/useTelemetry';

interface DashboardFooterProps {
  derived: DerivedMetrics;
  isConnected: boolean;
}

function FooterStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex-1 bg-carbon border border-white/5 rounded flex items-center justify-center gap-2 px-3 py-1.5">
      <Activity size={10} className="text-gold shrink-0" />
      <span className={cn(
        'text-xs font-mono font-bold',
        highlight ? 'text-gold' : 'text-silver/70'
      )}>
        {label}: <span className={highlight ? 'text-gold' : 'text-silver'}>{value}</span>
      </span>
    </div>
  );
}

export function DashboardFooter({ derived, isConnected }: DashboardFooterProps) {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => setUptime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const uptimeStr = [
    String(Math.floor(uptime / 3600)).padStart(2, '0'),
    String(Math.floor((uptime % 3600) / 60)).padStart(2, '0'),
    String(uptime % 60).padStart(2, '0'),
  ].join(':');

  return (
    <div className="col-span-12 flex gap-2 h-full">
      <FooterStat label="AVG SPEED" value={`${derived.avgSpeed} km/h`} highlight={derived.avgSpeed > 200} />
      <FooterStat label="MAX SPEED" value={`${derived.maxSpeed} km/h`} highlight />
      <FooterStat label="BRAKE BIAS" value={`${derived.brakeBias}%`} />
      <FooterStat label="FULL THROTTLE" value={`${derived.throttleBias}%`} />
      <FooterStat label="COASTING" value={`${derived.coasting}%`} />
      <FooterStat label="TYRE STRESS" value={`±${derived.tyreStress}°C`} highlight={derived.tyreStress > 15} />
      <FooterStat label="UPTIME" value={uptimeStr} />
      <FooterStat
        label="SIGNAL"
        value={isConnected ? 'LIVE 60Hz' : 'OFFLINE'}
        highlight={isConnected}
      />
    </div>
  );
}

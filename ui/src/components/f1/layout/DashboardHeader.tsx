/**
 * DashboardHeader - Shared top bar for all dashboard pages
 * Shows logo, session info, lap counter, connection status, and nav
 */

'use client';

import Link from 'next/link';
import { Signal, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusColors } from '@/lib/theme';
import { TRACK_IDS } from '@/utils/constants';
import type { LapData, SessionData } from '@/hooks/useTelemetry';

interface DashboardHeaderProps {
  isConnected: boolean;
  session: SessionData | null;
  lapData: LapData | null;
  gameVersion?: string;
}

export function DashboardHeader({
  isConnected,
  session,
  lapData,
  gameVersion,
}: DashboardHeaderProps) {
  const statusStyle = isConnected ? statusColors.connected : statusColors.disconnected;
  const trackName = session?.trackId !== undefined
    ? (TRACK_IDS[session.trackId] ?? 'UNKNOWN')
    : 'WAITING...';

  return (
    <header className="col-span-12 grid grid-cols-12 items-center bg-carbon border-b-2 border-gold px-6 rounded-t-lg shrink-0">
      {/* LEFT: Logo */}
      <div className="col-span-3 flex items-center gap-3">
        <h1 className="text-3xl font-black italic tracking-tighter text-white">
          <span className="text-gold">APX</span> IQ
        </h1>
        {gameVersion && (
          <span className="text-[10px] font-bold bg-gold/20 border border-gold/30 text-gold px-2 py-0.5 rounded tracking-widest">
            {gameVersion}
          </span>
        )}
      </div>

      {/* CENTER: Session info */}
      <div className="col-span-6 flex items-center justify-center gap-12">
        <SessionStat label="Session" value="RACE" />
        <div className="h-8 w-[1px] bg-white/10" />
        <SessionStat label="Track" value={trackName} />
        <div className="h-8 w-[1px] bg-white/10" />
        <SessionStat
          label="Weather"
          value={session?.weather !== undefined ? WEATHER_IDS[session.weather] ?? 'CLEAR' : '---'}
        />
      </div>

      {/* RIGHT: Lap counter + nav + status */}
      <div className="col-span-3 flex items-center justify-end gap-4">
        {/* Lap counter */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-silver/60 font-bold tracking-wider">LAP</span>
          <span className="text-2xl font-mono font-bold text-gold leading-none tabular-nums">
            {lapData?.lap ?? 0}
            <span className="text-sm text-silver">/{session?.totalLaps ?? '-'}</span>
          </span>
        </div>

        {/* Intelligence button */}
        <Link href="/dashboard/intelligence">
          <button className="px-3 py-2 bg-gold/20 hover:bg-gold/30 border border-gold/50 rounded flex items-center gap-2 text-gold font-bold transition-all">
            <Brain size={15} />
            <span className="text-xs tracking-wider">INTEL</span>
          </button>
        </Link>

        {/* Connection status */}
        <div className={cn(
          'px-3 py-1.5 rounded flex items-center gap-2 border',
          statusStyle.border, statusStyle.bg
        )}>
          <Signal
            size={15}
            className={cn(statusStyle.icon, isConnected && 'animate-pulse')}
          />
          <span className={cn('text-xs font-bold', statusStyle.text)}>
            {isConnected ? 'LIVE' : 'NO SIGNAL'}
          </span>
        </div>
      </div>
    </header>
  );
}

// Small helper sub-component
function SessionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-silver/60 font-bold tracking-wider">{label.toUpperCase()}</span>
      <span className="text-base font-bold text-white leading-none uppercase">{value}</span>
    </div>
  );
}

// Weather ID lookup
const WEATHER_IDS: Record<number, string> = {
  0: 'CLEAR',
  1: 'LIGHT CLOUD',
  2: 'OVERCAST',
  3: 'LIGHT RAIN',
  4: 'HEAVY RAIN',
  5: 'STORM',
};

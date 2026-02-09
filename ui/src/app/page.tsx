"use client";
import Link from "next/link";
import { TRACK_IDS } from "@/utils/constants";
import { formatLapTime } from "@/utils/format";
import { useTelemetry } from "@/hooks/useTelemetry";
import ConnectionStatus from "@/components/f1/ConnectionStatus";

export default function Home() {
  const { telemetry, session, isConnected, lapData } = useTelemetry();

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'hsl(var(--color-apx-black))',
      color: 'hsl(var(--color-apx-silver))'
    }}>

      {/* Top Header / Telemetry Bar */}
      <header className="grid grid-cols-12 items-center px-8" style={{
        height: '60px',
        borderBottom: '1px solid hsl(var(--color-apx-gold) / 0.3)',
        background: 'hsl(var(--color-apx-carbon))'
      }}>
        {/* LEFT: LOGO */}
        <div className="col-span-3 flex items-center">
          <h1 className="text-gold" style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.05em' }}>APX IQ</h1>
        </div>

        {/* CENTER: SESSION INFO */}
        <div className="col-span-6 flex items-center justify-center" style={{ gap: '10rem' }}>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-silver/60 font-bold tracking-wider">SESSION</span>
            <span className="text-lg font-bold text-white leading-none">RACE</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-silver/60 font-bold tracking-wider">TRACK</span>
            <span className="text-lg font-bold text-white leading-none uppercase">
              {session?.trackId !== undefined ? TRACK_IDS[session.trackId] ?? 'UNKNOWN' : 'WAITING...'}
            </span>
          </div>
        </div>

        {/* RIGHT: CONNECTION STATUS */}
        <div className="col-span-3 flex items-center justify-end" style={{ gap: '4rem', fontSize: '0.8rem' }}>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-silver/60 font-bold tracking-wider">LAP</span>
            <span className="text-2xl font-mono font-bold text-gold leading-none">
              {lapData?.lap ?? 0}<span className="text-sm text-silver">/{session?.totalLaps ?? '-'}</span>
            </span>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '3rem', padding: '4rem 0' }}>

        {/* Intro / Identity */}
        <div style={{ textAlign: 'center', maxWidth: '800px' }}>
          <span className="text-gold font-mono" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.9rem' }}>
            Real-Time Motorsport Intelligence
          </span>
          <h2 style={{
            fontSize: '4rem',
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: '1rem',
            color: 'white'
          }}>
            Digital <span className="text-gold">Pit Wall</span>
          </h2>
          <p style={{ marginTop: '1.5rem', fontSize: '1.25rem', color: 'hsl(var(--color-apx-silver))' }}>
            Advanced telemetry ingestion, race strategy simulation, and engineering analytics for the F1 25/22 platform.
          </p>
        </div>

        {/* Live Telemetry Panel (Replaces Engineer Panel for now) */}
        {telemetry && (
          <>
            <div className="apx-panel" style={{ width: '100%', maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2rem', textAlign: 'center', padding: '3rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="font-mono text-silver mb-2" style={{ fontSize: '1rem', letterSpacing: '0.1em' }}>SPEED</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', justifyContent: 'center' }}>
                  <div className="text-gold" style={{ fontSize: '8rem', fontWeight: 700, lineHeight: 1 }}>{Math.round(telemetry.speed)}</div>
                  <div className="text-silver/50" style={{ fontSize: '2rem', fontWeight: 700 }}>KPH</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="font-mono text-silver mb-2" style={{ fontSize: '1rem', letterSpacing: '0.1em' }}>RPM</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', justifyContent: 'center' }}>
                  <div className="text-white" style={{ fontSize: '8rem', fontWeight: 700, lineHeight: 1 }}>{Math.round(telemetry.rpm)}</div>
                  <div className="text-silver/50" style={{ fontSize: '2rem', fontWeight: 700 }}>REV</div>
                </div>
              </div>
              <div>
                <div className="font-mono text-silver mb-2" style={{ fontSize: '1rem', letterSpacing: '0.1em' }}>GEAR</div>
                <div className="text-white" style={{ fontSize: '5rem', fontWeight: 700, lineHeight: 1 }}>{telemetry.gear === 0 ? 'N' : telemetry.gear === -1 ? 'R' : telemetry.gear}</div>
              </div>
              <div>
                <div className="font-mono text-silver mb-2" style={{ fontSize: '1rem', letterSpacing: '0.1em' }}>DRS</div>
                <div className={telemetry.drs ? "text-green-500" : "text-silver"} style={{ fontSize: '5rem', fontWeight: 700, lineHeight: 1 }}>
                  {telemetry.drs ? "ON" : "OFF"}
                </div>
              </div>
            </div>

            {/* Lap Timing Panel */}
            <div className="apx-panel" style={{ width: '100%', maxWidth: '1000px', padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div className="font-mono text-gold mb-2" style={{ fontSize: '1rem', letterSpacing: '0.2em' }}>CURRENT LAP</div>
                <div className="text-white font-mono" style={{ fontSize: '6rem', fontWeight: 700, lineHeight: 1 }}>
                  {lapData?.currentLapTime ? (lapData.currentLapTime / 1000).toFixed(3) : '0.000'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                <div>
                  <div className="font-mono text-silver mb-1" style={{ fontSize: '1rem' }}>LAST LAP</div>
                  <div className="text-white font-mono" style={{ fontSize: '3rem', fontWeight: 700 }}>
                    {formatLapTime(lapData?.lastLapTime)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-silver mb-1" style={{ fontSize: '1rem' }}>DELTA</div>
                  <div className="text-green-500 font-mono" style={{ fontSize: '3rem', fontWeight: 700 }}>
                    -0.124
                  </div>
                </div>
                <div>
                  <div className="font-mono text-silver mb-1" style={{ fontSize: '1rem' }}>POS</div>
                  <div className="text-gold font-mono" style={{ fontSize: '3rem', fontWeight: 700 }}>
                    {lapData?.position ?? '-'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}


        {/* Dashboard Entry Points */}
        {!telemetry && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem',
            width: '100%',
            marginTop: '2rem'
          }}>

            {/* Engineer Panel */}
            <Link href="/dashboard" className="contents">
              <div className="apx-panel cursor-pointer hover:border-gold hover:scale-[1.02] transition-all duration-300">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 className="text-gold" style={{ fontSize: '1.5rem', fontWeight: 700 }}>ENGINEER</h3>
                  <span className="font-mono text-silver" style={{ fontSize: '0.75rem' }}>[ACCESS GRANTED]</span>
                </div>
                <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
                  Real-time telemetry analysis. Speed, RPM, Gears, and G-Force vectoring monitoring.
                </p>
                <div className="font-mono" style={{ fontSize: '0.9rem', color: 'hsl(var(--color-apx-gold))', borderTop: '1px solid hsl(var(--color-apx-carbon-light))', paddingTop: '1rem' }}>
                  &gt; WAITING FOR TELEMETRY...
                </div>
              </div>
            </Link>

            {/* Strategist Panel */}
            <Link href="/dashboard" className="contents">
              <div className="apx-panel cursor-pointer hover:border-gold hover:scale-[1.02] transition-all duration-300">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 className="text-gold" style={{ fontSize: '1.5rem', fontWeight: 700 }}>STRATEGIST</h3>
                  <span className="font-mono text-silver" style={{ fontSize: '0.75rem' }}>[ACCESS GRANTED]</span>
                </div>
                <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
                  Pit window prediction, tire degradation curves, and race outcome probability models.
                </p>
                <div className="font-mono" style={{ fontSize: '0.9rem', color: 'hsl(var(--color-apx-gold))', borderTop: '1px solid hsl(var(--color-apx-carbon-light))', paddingTop: '1rem' }}>
                  &gt; LAUNCH_SIMULATION.EXE
                </div>
              </div>
            </Link>

            {/* System Panel */}
            <Link href="/dashboard" className="contents">
              <div className="apx-panel cursor-pointer hover:border-gold hover:scale-[1.02] transition-all duration-300">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 className="text-gold" style={{ fontSize: '1.5rem', fontWeight: 700 }}>SYSTEM</h3>
                  <span className="font-mono text-silver" style={{ fontSize: '0.75rem' }}>[ADMIN]</span>
                </div>
                <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
                  UDP Packet health, database latency metrics, and congestion control monitoring.
                </p>
                <div className="font-mono" style={{ fontSize: '0.9rem', color: 'hsl(var(--color-apx-gold))', borderTop: '1px solid hsl(var(--color-apx-carbon-light))', paddingTop: '1rem' }}>
                  &gt; VIEW_LOGS.EXE
                </div>
              </div>
            </Link>

          </div>
        )}

      </div>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem',
        textAlign: 'center',
        borderTop: '1px solid hsl(var(--color-apx-carbon-light))',
        fontSize: '0.875rem'
      }}>
        <span className="font-mono text-silver">APX IQ SYSTEM V1.0 // ANTIGRAVITY AI</span>
      </footer>

    </main>
  );
}

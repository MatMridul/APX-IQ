export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'hsl(var(--color-apx-black))',
      color: 'hsl(var(--color-apx-silver))'
    }}>

      {/* Top Header / Telemetry Bar */}
      <header style={{
        height: '60px',
        borderBottom: '1px solid hsl(var(--color-apx-gold) / 0.3)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
        justifyContent: 'space-between',
        background: 'hsl(var(--color-apx-carbon))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="text-gold" style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.05em' }}>APX IQ</h1>
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'hsl(var(--color-apx-gold-dim))' }}>
            // SESSION: INACTIVE
          </span>
        </div>

        <div className="font-mono" style={{ fontSize: '0.8rem', display: 'flex', gap: '2rem' }}>
          <span>SYS_STATUS: <span className="text-gold">ONLINE</span></span>
          <span>DB_LATENCY: <span className="text-gold">12ms</span></span>
          <span>UDP_PORT: <span className="text-silver">20777</span></span>
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

        {/* Dashboard Entry Points */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem',
          width: '100%',
          marginTop: '2rem'
        }}>

          {/* Engineer Panel */}
          <div className="apx-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className="text-gold" style={{ fontSize: '1.5rem', fontWeight: 700 }}>ENGINEER</h3>
              <span className="font-mono text-silver" style={{ fontSize: '0.75rem' }}>[ACCESS GRANTED]</span>
            </div>
            <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
              Real-time telemetry analysis. Speed, RPM, Gears, and G-Force vectoring monitoring.
            </p>
            <div className="font-mono" style={{ fontSize: '0.9rem', color: 'hsl(var(--color-apx-gold))', borderTop: '1px solid hsl(var(--color-apx-carbon-light))', paddingTop: '1rem' }}>
              &gt; LAUNCH_MODULE.EXE
            </div>
          </div>

          {/* Strategist Panel */}
          <div className="apx-panel">
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

          {/* System Panel */}
          <div className="apx-panel">
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

        </div>

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

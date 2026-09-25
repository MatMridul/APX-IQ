import Link from "next/link";
import { Gauge, Sparkles, Radio } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#06080d] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
      
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl mx-auto flex flex-col items-center gap-8">
        
        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold tracking-widest">
          <Radio size={13} className="animate-pulse" />
          <span>SESSION TERMINATED · SIGNAL LOST</span>
        </div>

        {/* 404 display */}
        <div className="flex flex-col items-center gap-2">
          <span className="font-black italic text-[120px] sm:text-[160px] leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-400 via-amber-300 to-amber-600 drop-shadow-[0_0_60px_rgba(245,158,11,0.3)] select-none">
            404
          </span>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </div>

        {/* Error label */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight font-mono text-white">
            LAP NOT FOUND
          </h1>
          <p className="text-sm text-neutral-400 font-sans leading-relaxed max-w-md">
            This route doesn&apos;t exist in the telemetry registry. The page you&apos;re looking for may have been removed or never existed.
          </p>
        </div>

        {/* Data readout */}
        <div className="w-full max-w-sm grid grid-cols-3 gap-3 font-mono text-[10px]">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
            <span className="text-neutral-500 uppercase">STATUS</span>
            <span className="text-red-400 font-bold">404 ERR</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
            <span className="text-neutral-500 uppercase">CIRCUIT</span>
            <span className="text-amber-400 font-bold">UNKNOWN</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
            <span className="text-neutral-500 uppercase">SIGNAL</span>
            <span className="text-neutral-400 font-bold">0.0 Hz</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs font-bold">
          <Link
            href="/"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)] active:scale-95"
          >
            <Gauge size={16} />
            <span>RETURN TO BASE</span>
          </Link>

          <Link
            href="/dashboard"
            className="px-6 py-3.5 rounded-xl bg-[#141720]/90 hover:bg-[#1c202a] border border-white/15 hover:border-amber-400/40 text-neutral-200 hover:text-white uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Sparkles size={16} className="text-amber-400" />
            <span>COCKPIT HUD</span>
          </Link>
        </div>

        {/* Footer brand */}
        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
          APX IQ · MOTORSPORT INTELLIGENCE PLATFORM
        </span>
      </div>
    </div>
  );
}

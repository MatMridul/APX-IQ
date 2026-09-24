"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Sparkles,
  Search,
  Gamepad2,
  HelpCircle,
  Volume2,
  VolumeX,
  Radio,
  Layers,
  Activity,
  ShieldCheck,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveOrDemo } from "@/hooks/useLiveOrDemo";
import { useUxStore } from "@/store/uxStore";

export function GlobalHeader({
  activeBreadcrumb,
}: {
  activeBreadcrumb?: string;
}) {
  const pathname = usePathname();
  const { source, isConnected } = useLiveOrDemo();

  const isLive = isConnected && source === "LIVE";
  const openConnect = useUxStore((s) => s.openConnectModal);
  const openGuide = useUxStore((s) => s.openGuideModal);
  const openCommand = useUxStore((s) => s.openCommandPalette);
  const openFinalClassification = useUxStore((s) => s.openFinalClassification);
  const soundEnabled = useUxStore((s) => s.soundEnabled);
  const toggleSound = useUxStore((s) => s.toggleSound);

  const getPageTitle = () => {
    if (activeBreadcrumb) return activeBreadcrumb;
    if (pathname === "/dashboard") return "COCKPIT DDU";
    if (pathname === "/dashboard/intelligence") return "MISSION CONTROL";
    if (pathname === "/privacy") return "PRIVACY & GOVERNANCE";
    if (pathname === "/debug") return "OBSERVABILITY";
    return "COMMAND PORTAL";
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 rounded-2xl bg-[#0f1218]/90 border border-white/[0.12] shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl w-full sticky top-3 z-50">
      
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-black italic text-lg tracking-tighter text-amber-400 group-hover:drop-shadow-[0_0_10px_rgba(245,158,11,0.6)] transition-all">
            APX<span className="text-white">·IQ</span>
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
        </Link>

        <ChevronRight size={13} className="text-neutral-600 hidden sm:inline" />

        <span className="text-[10px] font-mono text-neutral-300 font-bold uppercase tracking-widest hidden sm:inline bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
          {getPageTitle()}
        </span>
      </div>

      {/* Center Navigation Links */}
      <nav className="hidden md:flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/[0.06] font-mono text-xs font-bold">
        <Link
          href="/"
          className={cn(
            "px-3 py-1 rounded-lg transition-all",
            pathname === "/" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-neutral-400 hover:text-white"
          )}
        >
          COMMAND PORTAL
        </Link>
        <Link
          href="/dashboard"
          className={cn(
            "px-3 py-1 rounded-lg transition-all",
            pathname === "/dashboard" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-neutral-400 hover:text-white"
          )}
        >
          COCKPIT HUD
        </Link>
        <Link
          href="/dashboard/intelligence"
          className={cn(
            "px-3 py-1 rounded-lg transition-all",
            pathname === "/dashboard/intelligence" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-neutral-400 hover:text-white"
          )}
        >
          MISSION CONTROL
        </Link>
        <Link
          href="/debug"
          className={cn(
            "px-3 py-1 rounded-lg transition-all",
            pathname === "/debug" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-neutral-400 hover:text-white"
          )}
        >
          OBSERVABILITY
        </Link>
      </nav>

      {/* Right: Quick Tools & Status */}
      <div className="flex items-center gap-2 font-mono text-xs">
        
        {/* Quick Command Palette Trigger (⌘K) */}
        <button
          onClick={openCommand}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white text-[10px] uppercase transition-all cursor-pointer"
          title="Open Command Palette (⌘K / Ctrl+K)"
        >
          <Search size={12} className="text-amber-400" />
          <span>SEARCH</span>
          <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-[8px] text-neutral-400">
            ⌘K
          </kbd>
        </button>

        {/* Pair Game Trigger */}
        <button
          onClick={openConnect}
          className={cn(
            "px-3 py-1.5 rounded-xl text-[10px] tracking-wider uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95",
            isLive
              ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-neutral-300 hover:text-white"
          )}
          title="Pair F1 Game Telemetry (Hotkey: C)"
        >
          <Gamepad2 size={13} className={isLive ? "text-emerald-400" : "text-amber-400"} />
          <span>{isLive ? "F1 LIVE" : "PAIR F1"}</span>
        </button>

        {/* FIA Classification & Race Results */}
        <button
          onClick={openFinalClassification}
          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-[10px] uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          title="Official FIA Final Classification & Points (Packet 8 / Hotkey: R)"
        >
          <Trophy size={13} className="text-amber-400" />
          <span className="hidden sm:inline">RESULTS</span>
        </button>

        {/* Platform Guide Modal Trigger */}
        <button
          onClick={openGuide}
          className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white text-[10px] uppercase transition-all flex items-center gap-1.5 cursor-pointer"
          title="Open User Guide (Hotkey: ?)"
        >
          <HelpCircle size={13} />
          <span className="hidden sm:inline">GUIDE</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          className={cn(
            "px-2.5 py-1.5 rounded-xl text-[10px] uppercase transition-all flex items-center gap-1.5 cursor-pointer",
            soundEnabled
              ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-500"
          )}
          title={soundEnabled ? "Audio SFX Active (Click to Mute)" : "Audio Muted (Click to Enable)"}
        >
          {soundEnabled ? <Volume2 size={13} className="text-amber-400 animate-pulse" /> : <VolumeX size={13} />}
          <span className="hidden sm:inline">{soundEnabled ? "SFX" : "MUTE"}</span>
        </button>
      </div>
    </header>
  );
}

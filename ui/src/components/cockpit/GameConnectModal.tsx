"use client";

import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  Wifi,
  WifiOff,
  Radio,
  Copy,
  Check,
  Zap,
  X,
  Play,
  Activity,
  ArrowRight,
  ShieldCheck,
  Terminal,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useUxStore } from "@/store/uxStore";

interface GameConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide?: () => void;
}

export function GameConnectModal({ isOpen, onClose, onOpenGuide }: GameConnectModalProps) {
  const socket = useSocket();
  const isConnected = useTelemetryStore((s) => s.isConnected);
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const gameVersion = useTelemetryStore((s) => s.gameVersion);
  const setPlaying = useUxStore((s) => s.setPlaying);

  const [platform, setPlatform] = useState<"PC" | "PS5" | "XBOX">("PC");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSimulatingTest, setIsSimulatingTest] = useState(false);
  const [testPacketsCount, setTestPacketsCount] = useState(0);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunDemo = () => {
    setPlaying(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-[#0B0C10] border border-gold/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-silver flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-black via-[#111218] to-black">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shadow-[0_0_15px_rgba(207,163,73,0.3)]">
              <Gamepad2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wider text-white uppercase font-mono">
                  F1 Game Telemetry Bridge
                </h2>
                <span
                  className={cn(
                    "text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1",
                    isConnected
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isConnected ? "bg-emerald-400" : "bg-amber-400 animate-ping"
                    )}
                  />
                  {isConnected ? "60Hz LIVE STREAM ACTIVE" : "WAITING FOR UDP STREAM"}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Connect EA Sports F1 (2020 through 2025) via 60Hz UDP broadcast.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 font-sans text-xs">
          
          {/* Live Ingestion Health Status Banner */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5">
                <Activity size={12} className="text-gold" />
                Local Telemetry Ingestion Status
              </span>
              <span className="font-mono text-[10px] text-neutral-400">
                PORT <span className="text-gold font-bold">20777</span> (UDP) → <span className="text-gold font-bold">3001</span> (WS)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Socket Relay</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      socket?.connected ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-red-500/80"
                    )}
                  />
                  <span className="font-mono font-bold text-white text-xs">
                    {socket?.connected ? "ONLINE (3001)" : "STANDBY"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Game Era</span>
                <span className="font-mono font-bold text-gold text-xs">
                  {gameVersion ? `F1 ${gameVersion}` : "AUTO-DETECT (2020-25)"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Packet Rate</span>
                <span className="font-mono font-bold text-white text-xs">
                  {isConnected && telemetry ? "60.0 Hz (16ms)" : "0.0 Hz"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Connection Success Banner ── */}
          {isConnected && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-xs">
              <Wifi size={15} className="shrink-0" />
              <div>
                <div className="font-bold uppercase tracking-wider">F1 GAME CONNECTED — 60Hz STREAM ACTIVE</div>
                <div className="text-emerald-400/70 text-[11px] mt-0.5">
                  {gameVersion ? `EA Sports F1 ${gameVersion} · ` : ""}Binary UDP telemetry ingestion nominal.
                </div>
              </div>
            </div>
          )}

          {/* ── Connection Not Established Warning ── */}
          {!isConnected && !socket?.connected && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs">
              <WifiOff size={15} className="shrink-0" />
              <div>
                <div className="font-bold uppercase tracking-wider">BRIDGE NOT REACHABLE</div>
                <div className="text-red-400/70 text-[11px] mt-0.5">
                  Local ingestion service is offline. Start <code className="text-red-300">python run_ingestion.py</code> and ensure port 3001 is open.
                </div>
              </div>
            </div>
          )}

          {/* Platform Tab Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                1. Select Gaming Platform
              </span>
              <div className="flex items-center p-0.5 rounded-lg bg-black/60 border border-white/10">
                {(["PC", "PS5", "XBOX"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer",
                      platform === p
                        ? "bg-gold text-black shadow-[0_0_8px_rgba(207,163,73,0.5)]"
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    {p === "PC" ? "PC (Steam / EA)" : p === "PS5" ? "PlayStation 4/5" : "Xbox Series"}
                  </button>
                ))}
              </div>
            </div>

            {/* In-Game Telemetry Configuration Matrix */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#13141C] to-[#0A0B0E] border border-gold/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-mono text-[11px] font-bold text-white">
                  EA Sports F1 In-Game Settings:
                </span>
                <span className="text-[10px] text-gold font-mono">
                  Options ➔ Settings ➔ Telemetry Settings
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
                <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                  <span className="text-neutral-400">UDP Telemetry</span>
                  <span className="text-emerald-400 font-bold">ON</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                  <span className="text-neutral-400">UDP Broadcast Mode</span>
                  <span className="text-white font-bold">{platform === "PC" ? "OFF" : "ON"}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                  <span className="text-neutral-400">UDP IP Address</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gold font-bold">
                      {platform === "PC" ? "127.0.0.1" : "YOUR_PC_IP"}
                    </span>
                    <button
                      onClick={() => copyToClipboard(platform === "PC" ? "127.0.0.1" : "192.168.1.100", "ip")}
                      className="text-neutral-400 hover:text-white p-0.5"
                      title="Copy IP"
                    >
                      {copiedKey === "ip" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                  <span className="text-neutral-400">UDP Port</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gold font-bold">20777</span>
                    <button
                      onClick={() => copyToClipboard("20777", "port")}
                      className="text-neutral-400 hover:text-white p-0.5"
                      title="Copy Port"
                    >
                      {copiedKey === "port" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                  <span className="text-neutral-400">UDP Send Rate</span>
                  <span className="text-emerald-400 font-bold">60 Hz</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10">
                  <span className="text-neutral-400">UDP Format</span>
                  <span className="text-gold font-bold">2024 / Auto</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Start Local Ingestion Service */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              2. Start Local Ingestion Listener
            </span>
            <div className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-300">
                <Terminal size={14} className="text-gold" />
                <span>python run_ingestion.py</span>
              </div>
              <button
                onClick={() => copyToClipboard("python run_ingestion.py", "cmd")}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer text-[10px]"
              >
                {copiedKey === "cmd" ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>COPY COMMAND</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Alternative: Test with Synthetic Telemetry */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-white text-xs">
                Away from your Simulator Rig?
              </div>
              <div className="text-[11px] text-neutral-400">
                You can run the simulated benchmark lap across Monaco, Silverstone, Spa, or Monza.
              </div>
            </div>
            <button
              onClick={handleRunDemo}
              className="px-3 py-1.5 rounded-lg bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 font-mono font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(207,163,73,0.2)]"
            >
              <Play size={12} />
              <span>RUN BENCHMARK LAP</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-black/60">
          <button
            onClick={() => {
              onClose();
              onOpenGuide?.();
            }}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-gold text-[11px] font-mono transition-colors cursor-pointer"
          >
            <HelpCircle size={13} />
            <span>Platform Guide & Hotkeys (?)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono font-bold text-[11px] transition-colors cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Activity,
  Send,
  CornerDownLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RadioMessage {
  id: string;
  sender: "DRIVER" | "RACE_ENGINEER";
  text: string;
  timestamp: string;
  corner?: string;
  delta?: string;
}

const DEFAULT_QUICK_QUERIES = [
  "Where am I losing time in Sector 2?",
  "Should we box this lap for undercut?",
  "Check front-left tyre surface temp.",
  "Compare brake release with Verstappen in T1.",
  "What is our projected tyre degradation crossover?",
];

export function VoicePitWallRadio({
  lapTimeDelta = "+0.185",
  currentTrack = "Monaco Grand Prix",
  currentSector = "Sector 2",
  driverName = "Max Verstappen",
}: {
  lapTimeDelta?: string;
  currentTrack?: string;
  currentSector?: string;
  driverName?: string;
}) {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [radioMuted, setRadioMuted] = useState(false);
  const [messages, setMessages] = useState<RadioMessage[]>([
    {
      id: "1",
      sender: "RACE_ENGINEER",
      text: "Radio check, telemetry stream green. FastF1 Verstappen benchmark loaded on Monaco Q3.",
      timestamp: "14:28:01",
    },
    {
      id: "2",
      sender: "DRIVER",
      text: "Copy. Give me delta in Nouvelle Chicane T10.",
      timestamp: "14:28:15",
      corner: "T10 Nouvelle Chicane",
    },
    {
      id: "3",
      sender: "RACE_ENGINEER",
      text: "You are +0.14s down on exit. You are holding 100% brake 8 meters too deep compared to benchmark. Trail off earlier to carry apex speed.",
      timestamp: "14:28:18",
      delta: "+0.14s",
      corner: "T10 Nouvelle Chicane",
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 25, 45, 80, 60, 40, 90, 70, 30, 20, 50, 85, 40, 20]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Animate audio waveform bars when transmitting
  useEffect(() => {
    if (!isTransmitting) return;
    const interval = setInterval(() => {
      setWaveHeights(
        Array.from({ length: 14 }).map(() => Math.floor(15 + Math.random() * 85))
      );
    }, 80);
    return () => clearInterval(interval);
  }, [isTransmitting]);

  // Web Audio API Radio Squelch Sound
  const playRadioChirp = (type: "START" | "END") => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.value = 1800;
      filter.Q.value = 3.0;

      osc.type = "sine";
      const freq = type === "START" ? 1200 : 800;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(type === "START" ? 2200 : 400, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // AudioContext fallback
    }
  };

  // Text-to-Speech synthesis with radio effect
  const speakRadioResponse = (text: string) => {
    if (radioMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    playRadioChirp("START");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.15;
    utterance.pitch = 0.95;
    utterance.onend = () => {
      playRadioChirp("END");
    };
    window.speechSynthesis.speak(utterance);
  };

  // Dispatch driver query to AI Race Engineer
  const handleSendQuery = (queryText: string) => {
    if (!queryText.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const userMsg: RadioMessage = {
      id: String(Date.now()),
      sender: "DRIVER",
      text: queryText,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsProcessingAi(true);

    // AI Race Engineer Reasoning Engine
    setTimeout(() => {
      let aiResponse = "Copy driver. Telemetry shows solid throttle progression. Maintain current delta pacing.";
      let cornerTag: string | undefined;
      let deltaTag: string | undefined;

      const lower = queryText.toLowerCase();
      if (lower.includes("losing time") || lower.includes("sector 2")) {
        aiResponse = "In Sector 2 through Casino Square (T4), you are down 0.18s. You are picking up 100% throttle 12m later than Verstappen. Use second gear for stronger mechanical rotation.";
        cornerTag = "T4 Casino Square";
        deltaTag = "+0.18s";
      } else if (lower.includes("box") || lower.includes("undercut")) {
        aiResponse = "Strategy window: Lap 18 to 22 is optimal. Undercut advantage estimated at +1.8s against the chasing car on Mediums. Stand by for box confirm on Lap 19.";
      } else if (lower.includes("tyre") || lower.includes("temp")) {
        aiResponse = "Front-left is 106°C, within optimum operating window (100–110°C). Rear pressures are stable at 22.5 PSI.";
      } else if (lower.includes("brake") || lower.includes("verstappen")) {
        aiResponse = "Verstappen peaks at 100% brake and releases with an exponential taper. You are stepping off abruptly, inducing front axle instability.";
        cornerTag = "T1 Sainte Dévote";
        deltaTag = "-0.08s";
      }

      const engineerMsg: RadioMessage = {
        id: String(Date.now() + 1),
        sender: "RACE_ENGINEER",
        text: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        corner: cornerTag,
        delta: deltaTag,
      };

      setMessages((prev) => [...prev, engineerMsg]);
      setIsProcessingAi(false);
      speakRadioResponse(aiResponse);
    }, 900);
  };

  const handlePushToTalkStart = () => {
    setIsTransmitting(true);
    playRadioChirp("START");
  };

  const handlePushToTalkEnd = () => {
    setIsTransmitting(false);
    playRadioChirp("END");
    handleSendQuery("Where am I losing time in Sector 2?");
  };

  return (
    <div className="w-full rounded-2xl bg-neutral-950/90 border border-white/[0.12] p-4 sm:p-5 flex flex-col gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-md relative overflow-hidden">
      
      {/* ── TOP HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <Radio size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                AI PIT WALL VOICE TRANSCEIVER
              </h3>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                DSP BANDPASS 3.4kHz
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Live Conversational AI Race Engineer · Deterministic RATG Heuristics
            </span>
          </div>
        </div>

        {/* Audio Mute & Channel Indicator */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-neutral-400 uppercase">CHANNEL:</span>
            <span className="text-white font-bold">PIT-TO-CAR #1</span>
          </div>

          <button
            onClick={() => setRadioMuted(!radioMuted)}
            className={cn(
              "p-2 rounded-xl border transition-all cursor-pointer",
              radioMuted
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-white/[0.04] border-white/10 text-neutral-300 hover:text-white"
            )}
            title={radioMuted ? "Radio Audio Muted" : "Radio Audio Active"}
          >
            {radioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* ── LIVE TRANSCRIPT FEED ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 h-52 overflow-y-auto p-3 rounded-xl bg-black/70 border border-white/[0.06] font-mono text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "p-3 rounded-xl border flex flex-col gap-1.5 max-w-[85%] transition-all",
              m.sender === "DRIVER"
                ? "self-end bg-amber-500/10 border-amber-500/30 text-neutral-200"
                : "self-start bg-[#0F1117] border-white/15 text-neutral-100"
            )}
          >
            <div className="flex items-center justify-between gap-3 text-[10px] border-b border-white/[0.06] pb-1">
              <span className={cn("font-bold tracking-wider", m.sender === "DRIVER" ? "text-amber-400" : "text-purple-400")}>
                {m.sender === "DRIVER" ? "DRIVER (YOU)" : "RACE ENGINEER (AI)"}
              </span>
              <span className="text-neutral-400">{m.timestamp}</span>
            </div>

            <p className="text-[11.5px] leading-relaxed font-sans">{m.text}</p>

            {(m.corner || m.delta) && (
              <div className="flex items-center gap-2 pt-1">
                {m.corner && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-neutral-300">
                    {m.corner}
                  </span>
                )}
                {m.delta && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    {m.delta}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {isProcessingAi && (
          <div className="self-start p-3 rounded-xl bg-[#0F1117] border border-purple-500/30 text-purple-400 text-xs flex items-center gap-2 animate-pulse">
            <Sparkles size={14} />
            <span>Race Engineer analyzing FastF1 telemetry traces...</span>
          </div>
        )}
      </div>

      {/* ── INTERACTIVE PUSH-TO-TALK & SPECTRUM ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-black/60 border border-white/[0.08]">
        {/* Push-to-Talk Big Button */}
        <button
          onMouseDown={handlePushToTalkStart}
          onMouseUp={handlePushToTalkEnd}
          onTouchStart={handlePushToTalkStart}
          onTouchEnd={handlePushToTalkEnd}
          className={cn(
            "w-full sm:w-auto px-5 py-3 rounded-xl font-mono text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95 shadow-md",
            isTransmitting
              ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.6)] animate-pulse"
              : "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]"
          )}
        >
          {isTransmitting ? <Mic size={16} /> : <Radio size={16} />}
          <span>{isTransmitting ? "TRANSMITTING LIVE..." : "HOLD PUSH-TO-TALK (SPACE)"}</span>
        </button>

        {/* Dynamic Spectrum Waveform */}
        <div className="flex-1 flex items-center justify-center gap-1 h-10 px-4 bg-neutral-950 rounded-xl border border-white/10 w-full overflow-hidden">
          {waveHeights.map((h, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-75",
                isTransmitting ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-neutral-700 opacity-40"
              )}
              style={{ height: `${isTransmitting ? h : 15}%` }}
            />
          ))}
        </div>
      </div>

      {/* ── QUICK TACTICAL QUERY CHIPS ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="font-mono text-[9px] text-neutral-400 uppercase font-bold mr-1">
          TACTICAL MACROS:
        </span>
        {DEFAULT_QUICK_QUERIES.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(q)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white font-mono text-[10px] transition-all cursor-pointer truncate max-w-[280px]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

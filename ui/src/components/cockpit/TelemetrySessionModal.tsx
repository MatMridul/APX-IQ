"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  Download,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Gauge,
  Activity,
  Disc,
  FileSpreadsheet,
  FileCode,
  X,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { useTelemetryRecorder } from "@/lib/cockpit/telemetryRecorder";
import { telemetryStorage, RecordedSessionMeta } from "@/lib/cockpit/telemetryStorage";
import { useUxStore } from "@/store/uxStore";
import { cn } from "@/lib/utils";

interface TelemetrySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TelemetrySessionModal({ isOpen, onClose }: TelemetrySessionModalProps) {
  const {
    isRecording,
    sessionName,
    trackName,
    elapsedS,
    sampleCount,
    currentSpeed,
    maxSpeed,
    savedSessions,
    activeReplaySession,
    replayFrames,
    replayIndex,
    startRecording,
    stopRecording,
    discardRecording,
    refreshSavedSessions,
    loadSessionForReplay,
    setReplayIndex,
    deleteSession,
  } = useTelemetryRecorder();

  const [inputName, setInputName] = useState(sessionName);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshSavedSessions();
    }
  }, [isOpen, refreshSavedSessions]);

  // Replay playhead animation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isPlayingReplay && replayFrames.length > 0) {
        const dt = (now - lastTime) / 1000;
        // ~30 frames per second playback
        const advance = Math.max(1, Math.round(dt * 30));
        setReplayIndex((replayIndex + advance) % replayFrames.length);
      }
      lastTime = now;
      if (isPlayingReplay) {
        animId = requestAnimationFrame(loop);
      }
    };

    if (isPlayingReplay) {
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlayingReplay, replayFrames.length, replayIndex, setReplayIndex]);

  if (!isOpen) return null;

  const currentReplayFrame = replayFrames[replayIndex] || null;

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${ms}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-b from-[#0D0F15] to-[#07080B] border border-white/[0.12] rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden font-mono">
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Disc className={cn("w-4 h-4", isRecording && "animate-spin text-red-500")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm text-white tracking-wider">
                  TELEMETRY RECORDER & REPLAY ENGINE
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-gold/15 text-gold border border-gold/30">
                  INDEXED-DB
                </span>
              </div>
              <span className="text-[10px] text-silver/50 tracking-wider">
                60Hz Telemetry Data Acquisition · Frame Scrubbing · MoTeC CSV Export
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-silver/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── CONTENT BODY ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── SECTION 1: LIVE RECORDER BAR ─────────────────────────────── */}
          <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-silver/60 uppercase tracking-widest">
                  LIVE SESSION RECORDER
                </span>
                {isRecording && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    RECORDING ACTIVE
                  </span>
                )}
              </div>

              {/* Live metrics pill */}
              <div className="flex items-center gap-4 text-[9px] text-silver/60 tabular-nums">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-gold" />
                  <span>{formatSec(elapsedS)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>{sampleCount} SAMPLES</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3 h-3 text-emerald-400" />
                  <span>MAX {maxSpeed} KMH</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                disabled={isRecording}
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Session Run Title..."
                className="flex-1 px-3 py-2 bg-neutral-900/90 border border-white/10 rounded-lg text-xs text-white placeholder-silver/40 focus:outline-none focus:border-gold/50 disabled:opacity-50"
              />

              {!isRecording ? (
                <button
                  onClick={() => startRecording(inputName || "Session Run", trackName)}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
                >
                  <Disc className="w-4 h-4" />
                  START RECORDING
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => stopRecording()}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] cursor-pointer"
                  >
                    <Disc className="w-4 h-4 animate-spin" />
                    SAVE RECORDING
                  </button>
                  <button
                    onClick={() => discardRecording()}
                    className="px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-silver/60 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    DISCARD
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 2: INTERACTIVE REPLAY & SCRUBBING ENGINE ──────────── */}
          {activeReplaySession && replayFrames.length > 0 && (
            <div className="rounded-xl border border-gold/30 bg-gradient-to-b from-gold/[0.03] to-transparent p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-gold" />
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                    ACTIVE REPLAY: {activeReplaySession.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-silver/60 tabular-nums">
                  <span>
                    FRAME: <strong className="text-white">{replayIndex + 1}</strong> / {replayFrames.length}
                  </span>
                  <span>
                    TIME: <strong className="text-white">{currentReplayFrame?.t.toFixed(2)}s</strong> / {activeReplaySession.durationS}s
                  </span>
                </div>
              </div>

              {/* Telemetry frame snapshot telemetry readouts */}
              {currentReplayFrame && (
                <div className="grid grid-cols-6 gap-2 mb-4">
                  <div className="p-2 rounded bg-black/60 border border-white/10 text-center">
                    <span className="text-[7.5px] text-silver/50 block">SPEED</span>
                    <span className="font-display text-base font-black text-amber-400 tabular-nums">
                      {currentReplayFrame.speed}
                    </span>
                    <span className="text-[7px] text-silver/40 block">KMH</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/10 text-center">
                    <span className="text-[7.5px] text-silver/50 block">GEAR</span>
                    <span className="font-display text-base font-black text-white tabular-nums">
                      {currentReplayFrame.gear === 0 ? "N" : currentReplayFrame.gear}
                    </span>
                    <span className="text-[7px] text-silver/40 block">{currentReplayFrame.rpm} RPM</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/10 text-center">
                    <span className="text-[7.5px] text-silver/50 block">THROTTLE</span>
                    <span className="font-display text-base font-black text-emerald-400 tabular-nums">
                      {currentReplayFrame.throttle}%
                    </span>
                    <span className="text-[7px] text-silver/40 block">INPUT</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/10 text-center">
                    <span className="text-[7.5px] text-silver/50 block">BRAKE</span>
                    <span className="font-display text-base font-black text-red-400 tabular-nums">
                      {currentReplayFrame.brake}%
                    </span>
                    <span className="text-[7px] text-silver/40 block">INPUT</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/10 text-center">
                    <span className="text-[7.5px] text-silver/50 block">DRS</span>
                    <span className={cn("font-display text-base font-black tabular-nums", currentReplayFrame.drs ? "text-emerald-400" : "text-silver/40")}>
                      {currentReplayFrame.drs ? "OPEN" : "CLOSED"}
                    </span>
                    <span className="text-[7px] text-silver/40 block">ZONE</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/10 text-center">
                    <span className="text-[7.5px] text-silver/50 block">DISTANCE</span>
                    <span className="font-display text-base font-black text-cyan-400 tabular-nums">
                      {Math.round(currentReplayFrame.lapDist)}
                    </span>
                    <span className="text-[7px] text-silver/40 block">METRES</span>
                  </div>
                </div>
              )}

              {/* Scrubber slider track */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, replayFrames.length - 1)}
                  value={replayIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setReplayIndex(idx);
                    if (currentReplayFrame) {
                      useUxStore.getState().seekToDistance(currentReplayFrame.lapDist);
                    }
                  }}
                  className="w-full accent-gold cursor-pointer"
                />

                {/* Scrubber playback controls */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-colors cursor-pointer"
                    >
                      {isPlayingReplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isPlayingReplay ? "PAUSE REPLAY" : "PLAY REPLAY"}
                    </button>
                    <button
                      onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))}
                      className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-[9px] text-silver/70 transition-colors cursor-pointer"
                    >
                      ◀ 1 FRAME
                    </button>
                    <button
                      onClick={() => setReplayIndex(Math.min(replayFrames.length - 1, replayIndex + 1))}
                      className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-[9px] text-silver/70 transition-colors cursor-pointer"
                    >
                      1 FRAME ▶
                    </button>
                    <button
                      onClick={() => setReplayIndex(0)}
                      className="p-1 rounded bg-white/[0.05] hover:bg-white/10 text-silver/70 transition-colors cursor-pointer"
                      title="Reset to beginning"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Corner quick jumps */}
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-silver/40 uppercase mr-1">APEX:</span>
                    {["T1", "T4", "T7", "T11", "T14"].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          const distMap: Record<string, number> = {
                            T1: 340,
                            T4: 1240,
                            T7: 2230,
                            T11: 3320,
                            T14: 4040,
                          };
                          const targetDist = distMap[t] || 0;
                          const foundIdx = replayFrames.findIndex((f) => f.lapDist >= targetDist);
                          if (foundIdx !== -1) setReplayIndex(foundIdx);
                          useUxStore.getState().seekToDistance(targetDist, t);
                        }}
                        className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/[0.05] hover:bg-white/10 text-gold border border-gold/20 hover:border-gold/50 cursor-pointer"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 3: SAVED SESSIONS LIBRARY ────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-silver/60 uppercase tracking-widest">
                SAVED SESSIONS LIBRARY ({savedSessions.length})
              </span>
              <span className="text-[8px] text-silver/40">STORED IN LOCAL BROWSER STORAGE</span>
            </div>

            {savedSessions.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-black/20">
                <Disc className="w-8 h-8 mx-auto text-silver/20 mb-2" />
                <span className="text-xs text-silver/50 block">No recorded telemetry sessions yet.</span>
                <span className="text-[10px] text-silver/30 block mt-1">
                  Start recording above or click REC in the pit wall ribbon to capture high-speed telemetry runs!
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {savedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      activeReplaySession?.id === session.id
                        ? "border-gold/60 bg-gold/[0.05]"
                        : "border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full bg-gold/40" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-wide">
                            {session.name}
                          </span>
                          <span className="text-[8px] text-gold font-bold px-1.5 py-0.2 rounded bg-gold/10 border border-gold/20">
                            {session.trackName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[8.5px] text-silver/50 mt-1 tabular-nums">
                          <span>{new Date(session.dateIso).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{session.durationS}s DURATION</span>
                          <span>•</span>
                          <span>{session.frameCount} FRAMES</span>
                          <span>•</span>
                          <span>MAX {session.maxSpeedKph} KMH</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => loadSessionForReplay(session.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 text-[9px] font-bold transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        REPLAY & SCRUB
                      </button>
                      <button
                        onClick={() => telemetryStorage.exportCsv(session.id, session.name)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-silver/80 text-[9px] font-bold transition-colors cursor-pointer"
                        title="Download CSV for MoTeC / Excel"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                        CSV
                      </button>
                      <button
                        onClick={() => telemetryStorage.exportJson(session)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-silver/80 text-[9px] font-bold transition-colors cursor-pointer"
                        title="Download JSON Telemetry File"
                      >
                        <FileCode className="w-3 h-3 text-cyan-400" />
                        JSON
                      </button>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="p-1 rounded bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-500/20 hover:border-red-500/40 text-[9px] transition-colors cursor-pointer"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

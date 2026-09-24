"use client";

import { create } from "zustand";
import { scheduler } from "@/lib/cockpit/scheduler";
import { getActiveFrame } from "@/hooks/useLiveOrDemo";
import {
  telemetryStorage,
  RecordedSessionMeta,
  RecordedTelemetryFrame,
} from "./telemetryStorage";

interface RecorderState {
  isRecording: boolean;
  activeSessionId: string | null;
  sessionName: string;
  trackName: string;
  elapsedS: number;
  sampleCount: number;
  currentSpeed: number;
  maxSpeed: number;
  savedSessions: RecordedSessionMeta[];
  activeReplaySession: RecordedSessionMeta | null;
  replayFrames: RecordedTelemetryFrame[];
  replayIndex: number;

  // Actions
  startRecording: (name?: string, track?: string) => void;
  stopRecording: () => Promise<RecordedSessionMeta | null>;
  discardRecording: () => void;
  refreshSavedSessions: () => Promise<void>;
  loadSessionForReplay: (sessionId: string) => Promise<void>;
  setReplayIndex: (index: number) => void;
  deleteSession: (sessionId: string) => Promise<void>;
}

// In-memory buffer of frames captured during active recording
let recordedBuffer: RecordedTelemetryFrame[] = [];
let recordingStartTime = 0;
let lastSampleTime = 0;
const SAMPLE_INTERVAL_S = 0.033; // ~30Hz sampling for high efficiency & smooth scrubbing

export const useTelemetryRecorder = create<RecorderState>((set, get) => ({
  isRecording: false,
  activeSessionId: null,
  sessionName: "Monaco Q3 Stint",
  trackName: "Monaco GP",
  elapsedS: 0,
  sampleCount: 0,
  currentSpeed: 0,
  maxSpeed: 0,
  savedSessions: [],
  activeReplaySession: null,
  replayFrames: [],
  replayIndex: 0,

  startRecording: (name = "Session Run", track = "Monaco GP") => {
    recordedBuffer = [];
    recordingStartTime = performance.now();
    lastSampleTime = 0;

    const id = `session-${Date.now()}`;
    set({
      isRecording: true,
      activeSessionId: id,
      sessionName: name,
      trackName: track,
      elapsedS: 0,
      sampleCount: 0,
      currentSpeed: 0,
      maxSpeed: 0,
    });
  },

  stopRecording: async () => {
    const { isRecording, activeSessionId, sessionName, trackName, maxSpeed } = get();
    if (!isRecording || !activeSessionId || recordedBuffer.length === 0) {
      set({ isRecording: false, activeSessionId: null });
      return null;
    }

    const durationS = Math.max(1, (performance.now() - recordingStartTime) / 1000);
    const speedSum = recordedBuffer.reduce((acc, f) => acc + f.speed, 0);
    const avgSpeed = Math.round(speedSum / recordedBuffer.length);

    const meta: RecordedSessionMeta = {
      id: activeSessionId,
      name: sessionName,
      trackName,
      dateIso: new Date().toISOString(),
      durationS: Number(durationS.toFixed(1)),
      frameCount: recordedBuffer.length,
      avgSpeedKph: avgSpeed,
      maxSpeedKph: Math.round(maxSpeed),
      bestLapMs: 71890,
    };

    await telemetryStorage.saveSession(meta, recordedBuffer);
    set({ isRecording: false, activeSessionId: null });
    await get().refreshSavedSessions();
    return meta;
  },

  discardRecording: () => {
    recordedBuffer = [];
    set({
      isRecording: false,
      activeSessionId: null,
      elapsedS: 0,
      sampleCount: 0,
    });
  },

  refreshSavedSessions: async () => {
    const sessions = await telemetryStorage.listSessions();
    set({ savedSessions: sessions });
  },

  loadSessionForReplay: async (sessionId: string) => {
    const sessions = get().savedSessions;
    const meta = sessions.find((s) => s.id === sessionId);
    if (!meta) return;

    const frames = await telemetryStorage.loadFrames(sessionId);
    set({
      activeReplaySession: meta,
      replayFrames: frames,
      replayIndex: 0,
    });
  },

  setReplayIndex: (index: number) => {
    const maxIdx = Math.max(0, get().replayFrames.length - 1);
    set({ replayIndex: Math.min(maxIdx, Math.max(0, index)) });
  },

  deleteSession: async (sessionId: string) => {
    await telemetryStorage.deleteSession(sessionId);
    await get().refreshSavedSessions();
    if (get().activeReplaySession?.id === sessionId) {
      set({ activeReplaySession: null, replayFrames: [], replayIndex: 0 });
    }
  },
}));

// Initialize scheduler subscriber to capture frames at 30Hz when recording is active
if (typeof window !== "undefined") {
  scheduler.add((t) => {
    const state = useTelemetryRecorder.getState();
    if (!state.isRecording) return;

    const now = performance.now() / 1000;
    if (now - lastSampleTime < SAMPLE_INTERVAL_S) return;
    lastSampleTime = now;

    const { data: f } = getActiveFrame(t);
    if (!f) return;

    const frame: RecordedTelemetryFrame = {
      t: Number(((performance.now() - recordingStartTime) / 1000).toFixed(3)),
      lap: f.lap,
      lapDist: Number(f.lapDist.toFixed(1)),
      speed: Number(f.speed.toFixed(1)),
      rpm: Math.round(f.rpm),
      gear: f.gear,
      throttle: Number((f.throttle * 100).toFixed(1)),
      brake: Number((f.brake * 100).toFixed(1)),
      steer: Number((f.steer * 100).toFixed(1)),
      drs: f.drs,
      ersPct: Number((f.ersPct * 100).toFixed(1)),
      deltaMs: Math.round(f.deltaMs),
      fuelKg: Number(f.fuelKg.toFixed(1)),
    };

    recordedBuffer.push(frame);

    const elapsed = Math.round((performance.now() - recordingStartTime) / 1000);
    const newMax = Math.max(state.maxSpeed, f.speed);

    // Throttled UI state updates every ~250ms to keep zero UI overhead
    if (recordedBuffer.length % 8 === 0) {
      useTelemetryRecorder.setState({
        elapsedS: elapsed,
        sampleCount: recordedBuffer.length,
        currentSpeed: Math.round(f.speed),
        maxSpeed: Math.round(newMax),
      });
    }
  });
}

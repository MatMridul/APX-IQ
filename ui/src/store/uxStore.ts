"use client";

import { create } from "zustand";
import { soundFx } from "@/lib/cockpit/soundFx";

export type DduMode = "RACE" | "QUALY" | "TYRES" | "CHASSIS";
export type GpScenario = "monaco" | "silverstone" | "spa" | "monza";

export interface TyreModalState {
  corner: "FL" | "FR" | "RL" | "RR";
  surfaceTempC: number;
  coreTempC: number;
  brakeTempC: number;
  psi: number;
  wearPct: number;
  compound: string;
  isOpen: boolean;
}

export interface InsightModalState {
  id: string;
  type: "COACH" | "BATTLE" | "TYRE" | "AERO";
  title: string;
  deltaS: string;
  sector: string;
  apexDiff: string;
  entrySpeedDiff: string;
  recommendation: string;
  setupFix: string;
  isOpen: boolean;
}

interface UxStoreState {
  // Playback & Scrubber Controls
  isPlaying: boolean;
  playbackSpeed: number; // 0.5, 1, 2, 5
  manualScrubDist: number | null; // Metres
  activeCornerTarget: string | null;
  
  // Audio Feedback
  soundEnabled: boolean;

  // Active Scenario
  scenario: GpScenario;

  // Steering Wheel Interactive Actuators
  brakeBiasPct: number; // e.g. 56.4
  stratMode: number; // 1 to 12
  mfdMode: DduMode;
  hppMode: number; // 1 to 8
  drsOverride: boolean;
  overtakeActive: boolean;
  pitLimiterActive: boolean;
  radioOpen: boolean;
  radioTranscript: string | null;

  // Modals / Drawers
  tyreModal: TyreModalState | null;
  insightModal: InsightModalState | null;
  isConnectModalOpen: boolean;
  isGuideModalOpen: boolean;

  // Actions
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  seekToDistance: (distM: number | null, cornerName?: string) => void;
  toggleSound: () => void;
  setScenario: (sc: GpScenario) => void;

  // Wheel Controls Actions
  adjustBrakeBias: (delta: number) => void;
  setBrakeBias: (val: number) => void;
  cycleStrat: () => void;
  cycleHpp: () => void;
  setMfdMode: (mode: DduMode) => void;
  cycleMfdMode: () => void;
  toggleDrsOverride: () => void;
  toggleOvertake: () => void;
  togglePitLimiter: () => void;
  triggerRadio: () => void;
  closeRadio: () => void;

  // Modal Actions
  openTyreModal: (data: Omit<TyreModalState, "isOpen">) => void;
  closeTyreModal: () => void;
  openInsightModal: (data: Omit<InsightModalState, "isOpen">) => void;
  closeInsightModal: () => void;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  openGuideModal: () => void;
  closeGuideModal: () => void;
}

export const useUxStore = create<UxStoreState>((set, get) => ({
  isPlaying: false,
  playbackSpeed: 1,
  manualScrubDist: null,
  activeCornerTarget: null,
  soundEnabled: true,
  scenario: "monaco",

  brakeBiasPct: 56.4,
  stratMode: 6,
  mfdMode: "RACE",
  hppMode: 4,
  drsOverride: false,
  overtakeActive: false,
  pitLimiterActive: false,
  radioOpen: false,
  radioTranscript: null,

  tyreModal: null,
  insightModal: null,
  isConnectModalOpen: false,
  isGuideModalOpen: false,

  togglePlay: () => {
    const next = !get().isPlaying;
    soundFx.playButtonClick();
    set({ isPlaying: next });
  },

  setPlaying: (playing) => set({ isPlaying: playing }),

  setPlaybackSpeed: (speed) => {
    soundFx.playButtonClick();
    set({ playbackSpeed: speed });
  },

  seekToDistance: (distM, cornerName) => {
    soundFx.playButtonClick();
    set({ manualScrubDist: distM, activeCornerTarget: cornerName ?? null });
  },

  toggleSound: () => {
    const next = !get().soundEnabled;
    soundFx.enabled = next;
    if (next) soundFx.playButtonClick();
    set({ soundEnabled: next });
  },

  setScenario: (scenario) => {
    soundFx.playButtonClick();
    set({ scenario, manualScrubDist: null, activeCornerTarget: null });
  },

  adjustBrakeBias: (delta) => {
    soundFx.playButtonClick();
    set((s) => ({
      brakeBiasPct: Math.min(64.0, Math.max(50.0, Number((s.brakeBiasPct + delta).toFixed(1)))),
    }));
  },

  setBrakeBias: (val) => {
    set({ brakeBiasPct: Math.min(64.0, Math.max(50.0, Number(val.toFixed(1)))) });
  },

  cycleStrat: () => {
    soundFx.playRotaryClick();
    set((s) => ({ stratMode: (s.stratMode % 12) + 1 }));
  },

  cycleHpp: () => {
    soundFx.playRotaryClick();
    set((s) => ({ hppMode: (s.hppMode % 8) + 1 }));
  },

  setMfdMode: (mode) => {
    soundFx.playRotaryClick();
    set({ mfdMode: mode });
  },

  cycleMfdMode: () => {
    soundFx.playRotaryClick();
    const modes: DduMode[] = ["RACE", "QUALY", "TYRES", "CHASSIS"];
    const nextIdx = (modes.indexOf(get().mfdMode) + 1) % modes.length;
    set({ mfdMode: modes[nextIdx] });
  },

  toggleDrsOverride: () => {
    const next = !get().drsOverride;
    soundFx.playDrsTone(next);
    set({ drsOverride: next });
  },

  toggleOvertake: () => {
    const next = !get().overtakeActive;
    soundFx.playButtonClick();
    set({ overtakeActive: next });
  },

  togglePitLimiter: () => {
    const next = !get().pitLimiterActive;
    if (next) soundFx.playPitLimiterPulse();
    else soundFx.playButtonClick();
    set({ pitLimiterActive: next });
  },

  triggerRadio: () => {
    soundFx.playRadioBeep();
    const messages = [
      "Radio check. Hamilton +0.75s behind with DRS — defend inside on Turn 1.",
      "Box this lap, box this lap. Fitting Hard compound tyres.",
      "Engine mode STRAT 7 available for the main straight. Push to pass.",
      "Tyre thermals look stable. FL core temp at 104°C, maintain delta.",
    ];
    const transcript = messages[Math.floor(Math.random() * messages.length)];
    set({ radioOpen: true, radioTranscript: transcript });
  },

  closeRadio: () => {
    soundFx.playButtonClick();
    set({ radioOpen: false, radioTranscript: null });
  },

  openTyreModal: (data) => {
    soundFx.playButtonClick();
    set({ tyreModal: { ...data, isOpen: true } });
  },

  closeTyreModal: () => {
    soundFx.playButtonClick();
    set({ tyreModal: null });
  },

  openInsightModal: (data) => {
    soundFx.playButtonClick();
    set({ insightModal: { ...data, isOpen: true } });
  },

  closeInsightModal: () => {
    soundFx.playButtonClick();
    set({ insightModal: null });
  },

  openConnectModal: () => {
    soundFx.playButtonClick();
    set({ isConnectModalOpen: true });
  },

  closeConnectModal: () => {
    soundFx.playButtonClick();
    set({ isConnectModalOpen: false });
  },

  openGuideModal: () => {
    soundFx.playButtonClick();
    set({ isGuideModalOpen: true });
  },

  closeGuideModal: () => {
    soundFx.playButtonClick();
    set({ isGuideModalOpen: false });
  },
}));

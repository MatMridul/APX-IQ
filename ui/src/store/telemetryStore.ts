/**
 * APX IQ Telemetry Store — Zustand
 *
 * Replaces useState chains in useTelemetry.
 * Components subscribe only to what they need → zero unnecessary re-renders.
 *
 * Usage:
 *   const speed   = useTelemetryStore(s => s.telemetry?.speed ?? 0);
 *   const derived = useTelemetryStore(s => s.derived);
 */

import { create } from "zustand";
import type {
  TelemetryData,
  LapData,
  SessionData,
  CarStatusData,
  HistoryPoint,
  DerivedMetrics,
} from "@/hooks/useTelemetry";

const HISTORY_SIZE = 300; // ~5 s at 60 Hz

const initialDerived: DerivedMetrics = {
  avgSpeed:      0,
  maxSpeed:      0,
  brakeBias:     0,
  throttleBias:  0,
  coasting:      0,
  fuelBurnRate:  0,
  rpmPercent:    0,
  lapProgress:   0,
  tyreStress:    0,
  gForceProxy:   0,
};

// ─── State shape ────────────────────────────────────────────────────────────

interface TelemetryState {
  telemetry:   TelemetryData | null;
  lapData:     LapData       | null;
  session:     SessionData   | null;
  carStatus:   CarStatusData | null;
  isConnected: boolean;
  gameVersion: string | null;

  history:  HistoryPoint[];
  derived:  DerivedMetrics;

  // Setters called by the RAF loop in useTelemetry
  setTelemetry:   (d: TelemetryData)   => void;
  setLapData:     (d: LapData)         => void;
  setSession:     (d: SessionData)     => void;
  setCarStatus:   (d: CarStatusData)   => void;
  setIsConnected: (v: boolean)         => void;
  setGameVersion: (v: string)          => void;
  pushHistory:    (p: HistoryPoint)    => void;
  setDerived:     (d: DerivedMetrics)  => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useTelemetryStore = create<TelemetryState>((set) => ({
  telemetry:   null,
  lapData:     null,
  session:     null,
  carStatus:   null,
  isConnected: false,
  gameVersion: null,
  history:     [],
  derived:     initialDerived,

  setTelemetry:   (telemetry)   => set({ telemetry }),
  setLapData:     (lapData)     => set({ lapData }),
  setSession:     (session)     => set({ session }),
  setCarStatus:   (carStatus)   => set({ carStatus }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setGameVersion: (gameVersion) => set({ gameVersion }),
  setDerived:     (derived)     => set({ derived }),

  pushHistory: (point) =>
    set((state) => ({
      history: state.history.length >= HISTORY_SIZE
        ? [...state.history.slice(1), point]
        : [...state.history, point],
    })),
}));

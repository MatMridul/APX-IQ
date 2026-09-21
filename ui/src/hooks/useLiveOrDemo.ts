/**
 * useLiveOrDemo — The single source seam (TRD §2.1, PRD P0-DH3, P0-CK1).
 *
 * Decides provenance once:
 *   - isConnected && telemetry present → LIVE
 *   - demo mode (offline fallback) → SIM
 *   - otherwise → NO_SIGNAL
 */

import { useTelemetryStore } from "@/store/telemetryStore";
import { demoFrame, type Frame } from "@/lib/cockpit/demo";

export type Provenance = "LIVE" | "SIM" | "NO_SIGNAL";

export interface SourcedFrame<T> {
  data: T | null;
  source: Provenance;
}

/**
 * Builds a Frame object from the current live Zustand store state.
 */
export function buildLiveFrame(t: number, state: ReturnType<typeof useTelemetryStore.getState>): Frame {
  const { telemetry, lapData, session, carStatus, derived } = state;
  const trackLength = Math.max(1, session?.trackLength || 4260);
  const rawLapDist = lapData?.lapDistance ?? 0;
  const lapDist = Number.isFinite(rawLapDist) ? rawLapDist : 0;
  const sector: 1 | 2 | 3 =
    lapDist < trackLength / 3 ? 1 : lapDist < (2 * trackLength) / 3 ? 2 : 3;

  const maxRPM = Math.max(6000, carStatus?.maxRPM || 15000);
  const rpm = Math.max(0, telemetry?.rpm ?? 0);
  const rpmRange = Math.max(1000, maxRPM - 5200);
  const rpmPct = Math.min(1, Math.max(0, (rpm - 5200) / rpmRange));

  // Real flag mapping from vehicle FIA flags
  let flag: "none" | "yellow" = "none";
  if (carStatus?.vehicleFiaFlags === 3 || session?.safetyCarStatus === 1 || session?.safetyCarStatus === 2) {
    flag = "yellow";
  }

  // Real ERS storage percentage (4MJ battery maximum)
  const ersPct = carStatus?.ersStoreEnergy != null && Number.isFinite(carStatus.ersStoreEnergy)
    ? Math.min(1, Math.max(0, carStatus.ersStoreEnergy / 4_000_000))
    : 0.85;

  const gapAheadS = lapData?.deltaToFrontMs != null && Number.isFinite(lapData.deltaToFrontMs) && lapData.deltaToFrontMs > 0
    ? lapData.deltaToFrontMs / 1000
    : lapData?.deltaToFront && Number.isFinite(lapData.deltaToFront)
      ? Math.abs(lapData.deltaToFront) / 1000
      : 0;

  // Live delta vs personal best from session history if available, else delta to leader/front
  let deltaMs = 0;
  if (state.sessionHistory?.bestLapTimeLapNum && state.sessionHistory.bestLapTimeLapNum > 0 && lapData?.currentLapTime) {
    const bestLapIdx = state.sessionHistory.bestLapTimeLapNum - 1;
    const bestLap = state.sessionHistory.laps[bestLapIdx];
    if (bestLap && bestLap.lapTimeMs > 0) {
      deltaMs = lapData.currentLapTime - bestLap.lapTimeMs;
    }
  }
  if (deltaMs === 0) {
    deltaMs = lapData?.deltaToLeaderMs ?? lapData?.deltaToFrontMs ?? lapData?.deltaToFront ?? 0;
  }
  if (!Number.isFinite(deltaMs)) deltaMs = 0;

  return {
    t,
    rpm,
    rpmPct,
    gear: telemetry?.gear ?? 0,
    speed: telemetry?.speed ?? 0,
    throttle: telemetry?.throttle ?? 0,
    brake: telemetry?.brake ?? 0,
    steer: telemetry?.steer ?? 0,
    lapDist,
    trackLen: trackLength,
    lap: lapData?.lap ?? 1,
    sector,
    drs: Boolean(telemetry?.drs),
    fuelKg: carStatus?.fuelInTank ?? 0,
    ersPct,
    deltaMs,
    flag,
    gapAheadS,
    gapBehindS: 0,
    position: lapData?.position ?? 1,
  };
}

/**
 * Procedural synchronous accessor for the 60 Hz canvas loop (Domain A).
 * Reads mutable store directly with zero React re-renders.
 */
export function getActiveFrame(t: number): SourcedFrame<Frame> {
  const state = useTelemetryStore.getState();
  if (state.isConnected && state.telemetry) {
    return {
      data: buildLiveFrame(t, state),
      source: "LIVE",
    };
  }
  return {
    data: demoFrame(t),
    source: "SIM",
  };
}

/**
 * React hook for components needing to know the current active data provenance.
 */
export function useLiveOrDemo(): {
  source: Provenance;
  isConnected: boolean;
  hasTelemetry: boolean;
} {
  const isConnected = useTelemetryStore((s) => s.isConnected);
  const hasTelemetry = useTelemetryStore((s) => s.telemetry !== null);

  const source: Provenance = isConnected && hasTelemetry ? "LIVE" : "SIM";

  return {
    source,
    isConnected,
    hasTelemetry,
  };
}

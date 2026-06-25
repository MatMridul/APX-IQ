/**
 * useTelemetry
 *
 * Connects Socket.IO → Zustand store.
 * Components should read from useTelemetryStore directly for granular
 * subscriptions.  This hook just wires up the socket listeners and RAF loop.
 *
 * Call once at the top of the app (e.g. in a provider or layout component).
 * After that any component can do:
 *
 *   const speed = useTelemetryStore(s => s.telemetry?.speed ?? 0);
 */

import { useEffect, useRef, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useTelemetryStore } from "@/store/telemetryStore";

// ─── Public types (re-exported for consumers) ────────────────────────────────

export type TelemetryData = {
  speed:     number;
  throttle:  number;   // 0–1
  brake:     number;   // 0–1
  gear:      number;
  rpm:       number;
  drs:       number;
  tyreTemps: number[]; // [FL, FR, RL, RR]
};

export type LapData = {
  currentLapTime: number;
  lastLapTime:    number;
  sector1:        number;
  sector2:        number;
  position:       number;
  lap:            number;
  totalDistance:  number;
  lapDistance:    number;
  deltaToFront?:  number;
};

export type SessionData = {
  trackId:     number;
  weather:     number;
  totalLaps:   number;
  trackLength?: number;
  uid?:        string;
};

export type CarStatusData = {
  fuelInTank:        number;
  fuelRemainingLaps: number;
  maxRPM:            number;
  drsAllowed:        number;
  tyreCompound:      number;
};

export type HistoryPoint = {
  t:        number;  // timestamp ms
  speed:    number;
  rpm:      number;
  throttle: number;  // 0–100
  brake:    number;  // 0–100
  gear:     number;
};

export type DerivedMetrics = {
  avgSpeed:     number;
  maxSpeed:     number;
  brakeBias:    number;
  throttleBias: number;
  coasting:     number;
  fuelBurnRate: number;
  rpmPercent:   number;
  lapProgress:  number;
  tyreStress:   number;
  gForceProxy:  number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OPTIMAL_TYRE_TEMP = 90;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTelemetry() {
  const socket = useSocket();
  const store  = useTelemetryStore;

  // Incoming-data refs — updated by socket, consumed by RAF
  const telRef    = useRef<TelemetryData   | null>(null);
  const lapRef    = useRef<LapData         | null>(null);
  const sesRef    = useRef<SessionData     | null>(null);
  const statusRef = useRef<CarStatusData   | null>(null);

  // Session-level accumulators (survive re-renders)
  const sessionMaxSpeed = useRef(0);
  const prevFuel        = useRef<number | null>(null);
  const fuelBurnEst     = useRef(0);

  // ── Derived metric computation ─────────────────────────────────────────────
  const computeDerived = useCallback(
    (hist: HistoryPoint[]): DerivedMetrics => {
      const cur    = telRef.current;
      const ses    = sesRef.current;
      const lap    = lapRef.current;
      const status = statusRef.current;

      if (!hist.length || !cur) {
        return {
          avgSpeed: 0, maxSpeed: sessionMaxSpeed.current,
          brakeBias: 0, throttleBias: 0, coasting: 0,
          fuelBurnRate: fuelBurnEst.current, rpmPercent: 0,
          lapProgress: 0, tyreStress: 0, gForceProxy: 0,
        };
      }

      const n = hist.length;
      let sumSpeed = 0, brakeF = 0, throttleF = 0, coastF = 0;

      for (const p of hist) {
        sumSpeed += p.speed;
        if (p.brake > p.throttle && p.brake > 5)   brakeF++;
        if (p.throttle > 80)                         throttleF++;
        if (p.throttle < 5 && p.brake < 5)          coastF++;
      }

      if (cur.speed > sessionMaxSpeed.current) sessionMaxSpeed.current = cur.speed;

      // Fuel burn estimate
      if (status?.fuelInTank != null) {
        if (prevFuel.current !== null && prevFuel.current > status.fuelInTank) {
          const burn = prevFuel.current - status.fuelInTank;
          fuelBurnEst.current = fuelBurnEst.current
            ? fuelBurnEst.current * 0.9 + burn * 10 * 0.1
            : burn * 10;
        }
        prevFuel.current = status.fuelInTank;
      }

      const lapProgress =
        ses?.trackLength && lap?.lapDistance
          ? Math.min((lap.lapDistance / ses.trackLength) * 100, 100)
          : 0;

      const tyreStress = cur.tyreTemps?.length
        ? cur.tyreTemps.reduce((s, t) => s + Math.abs(t - OPTIMAL_TYRE_TEMP), 0) / cur.tyreTemps.length
        : 0;

      const maxRPM  = status?.maxRPM || 15000;
      const rpmPct  = Math.min((cur.rpm / maxRPM) * 100, 100);
      const gForce  = Math.abs(cur.throttle * 100 - cur.brake * 100) / 100;

      return {
        avgSpeed:     Math.round(sumSpeed / n),
        maxSpeed:     Math.round(sessionMaxSpeed.current),
        brakeBias:    Math.round((brakeF    / n) * 100),
        throttleBias: Math.round((throttleF / n) * 100),
        coasting:     Math.round((coastF    / n) * 100),
        fuelBurnRate: Math.round(fuelBurnEst.current * 10) / 10,
        rpmPercent:   Math.round(rpmPct),
        lapProgress,
        tyreStress:   Math.round(tyreStress),
        gForceProxy:  Math.round(gForce * 100) / 100,
      };
    },
    [],
  );

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const { setIsConnected, setGameVersion } = store.getState();

    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onTelemetry  = (d: TelemetryData)   => { telRef.current    = d; };
    const onLap        = (d: LapData)          => { lapRef.current    = d; };
    const onSession    = (d: SessionData)      => { sesRef.current    = d; };
    const onCarStatus  = (d: CarStatusData)    => { statusRef.current = d; };
    const onVersion    = (d: { version: string }) => setGameVersion(d.version);

    socket.on("connect",           onConnect);
    socket.on("disconnect",        onDisconnect);
    socket.on("telemetry_update",  onTelemetry);
    socket.on("lap_update",        onLap);
    socket.on("session_update",    onSession);
    socket.on("car_status_update", onCarStatus);
    socket.on("game_version",      onVersion);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off("connect",           onConnect);
      socket.off("disconnect",        onDisconnect);
      socket.off("telemetry_update",  onTelemetry);
      socket.off("lap_update",        onLap);
      socket.off("session_update",    onSession);
      socket.off("car_status_update", onCarStatus);
      socket.off("game_version",      onVersion);
    };
  }, [socket]);

  // ── RAF loop — pushes socket data into Zustand store ──────────────────────
  useEffect(() => {
    let frameId: number;

    const loop = () => {
      const {
        setTelemetry, setLapData, setSession, setCarStatus,
        pushHistory, setDerived, history,
      } = store.getState();

      const cur    = telRef.current;
      const lap    = lapRef.current;
      const ses    = sesRef.current;
      const status = statusRef.current;

      if (cur) {
        const point: HistoryPoint = {
          t:        Date.now(),
          speed:    cur.speed,
          rpm:      cur.rpm,
          throttle: Math.round(cur.throttle * 100),
          brake:    Math.round(cur.brake    * 100),
          gear:     cur.gear,
        };
        pushHistory(point);
        setTelemetry(cur);
        setDerived(computeDerived(store.getState().history));
      }

      if (lap)    setLapData(lap);
      if (ses)    setSession(ses);
      if (status) setCarStatus(status);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [computeDerived]);
}

// ─── Convenience selector hook (backwards-compatible) ────────────────────────
export function useTelemetryData() {
  return useTelemetryStore((s) => ({
    telemetry:   s.telemetry,
    lapData:     s.lapData,
    session:     s.session,
    carStatus:   s.carStatus,
    isConnected: s.isConnected,
    gameVersion: s.gameVersion,
    history:     s.history,
    derived:     s.derived,
  }));
}

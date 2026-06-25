import { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';

export type TelemetryData = {
    speed: number;
    throttle: number;
    brake: number;
    gear: number;
    rpm: number;
    drs: number;
    tyreTemps: number[]; // [FL, FR, RL, RR]
};

export type LapData = {
    currentLapTime: number;
    lastLapTime: number;
    sector1: number;
    sector2: number;
    position: number;
    lap: number;
    totalDistance: number;
    lapDistance: number;
    deltaToFront?: number;
};

export type SessionData = {
    trackId: number;
    weather: number;
    totalLaps: number;
    trackLength?: number;
    uid?: string;
};

export type CarStatusData = {
    fuelInTank: number;
    fuelRemainingLaps: number;
    maxRPM: number;
    drsAllowed: number;
    tyreCompound: number;
};

export type HistoryPoint = {
    t: number;          // timestamp ms
    speed: number;
    rpm: number;
    throttle: number;   // 0–100
    brake: number;      // 0–100
    gear: number;
};

// Derived / computed analytics
export type DerivedMetrics = {
    avgSpeed: number;        // rolling average over history window
    maxSpeed: number;        // session max
    brakeBias: number;       // % of time brake > throttle
    throttleBias: number;    // % of time throttle > 80%
    coasting: number;        // % of time both < 5%
    fuelBurnRate: number;    // kg per lap estimated
    rpmPercent: number;      // rpm as % of maxRPM
    lapProgress: number;     // 0–100% of current lap distance
    tyreStress: number;      // max tyre temp deviation from optimal (90°C)
    gForceProxy: number;     // abs(throttle - brake) / 100 — lateral load proxy
};

const HISTORY_SIZE = 300; // ~5s at 60Hz
const OPTIMAL_TYRE_TEMP = 90;

export const useTelemetry = () => {
    const socket = useSocket();
    const [telemetry, setTelemetry]     = useState<TelemetryData | null>(null);
    const [lapData, setLapData]         = useState<LapData | null>(null);
    const [session, setSession]         = useState<SessionData | null>(null);
    const [carStatus, setCarStatus]     = useState<CarStatusData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [history, setHistory]         = useState<HistoryPoint[]>([]);
    const [derived, setDerived]         = useState<DerivedMetrics>({
        avgSpeed: 0, maxSpeed: 0, brakeBias: 0, throttleBias: 0,
        coasting: 0, fuelBurnRate: 0, rpmPercent: 0, lapProgress: 0,
        tyreStress: 0, gForceProxy: 0,
    });

    // Refs — updated by socket listeners, consumed by RAF loop
    const telemetryRef  = useRef<TelemetryData | null>(null);
    const lapRef        = useRef<LapData | null>(null);
    const sessionRef    = useRef<SessionData | null>(null);
    const carStatusRef  = useRef<CarStatusData | null>(null);
    const historyRef    = useRef<HistoryPoint[]>([]);

    // Session-level accumulators (never reset by RAF)
    const sessionMaxSpeed = useRef(0);
    const prevFuel        = useRef<number | null>(null);
    const fuelBurnRef     = useRef(0);

    // Compute derived metrics from current history buffer
    const computeDerived = useCallback((
        hist: HistoryPoint[],
        cur: TelemetryData | null,
        lap: LapData | null,
        ses: SessionData | null,
        status: CarStatusData | null,
    ): DerivedMetrics => {
        if (!hist.length || !cur) {
            return {
                avgSpeed: 0, maxSpeed: sessionMaxSpeed.current, brakeBias: 0,
                throttleBias: 0, coasting: 0, fuelBurnRate: fuelBurnRef.current,
                rpmPercent: 0, lapProgress: 0, tyreStress: 0, gForceProxy: 0,
            };
        }

        const n = hist.length;
        let sumSpeed = 0, brakeFrames = 0, throttleFrames = 0, coastFrames = 0;

        for (const p of hist) {
            sumSpeed += p.speed;
            if (p.brake > p.throttle && p.brake > 5)   brakeFrames++;
            if (p.throttle > 80)                         throttleFrames++;
            if (p.throttle < 5 && p.brake < 5)          coastFrames++;
        }

        // Session max
        if (cur.speed > sessionMaxSpeed.current) sessionMaxSpeed.current = cur.speed;

        // Fuel burn rate — estimated over laps
        if (status?.fuelInTank != null) {
            if (prevFuel.current !== null && prevFuel.current > status.fuelInTank) {
                const burn = prevFuel.current - status.fuelInTank;
                // Smooth with previous estimate
                fuelBurnRef.current = fuelBurnRef.current
                    ? fuelBurnRef.current * 0.9 + burn * 10 * 0.1   // scale to per-lap
                    : burn * 10;
            }
            prevFuel.current = status.fuelInTank;
        }

        // Lap progress
        const lapProgress = (ses?.trackLength && lap?.lapDistance)
            ? Math.min((lap.lapDistance / ses.trackLength) * 100, 100)
            : 0;

        // Tyre stress — avg deviation from optimal across all 4
        const tyreStress = cur.tyreTemps?.length
            ? cur.tyreTemps.reduce((sum, t) => sum + Math.abs(t - OPTIMAL_TYRE_TEMP), 0) / cur.tyreTemps.length
            : 0;

        // RPM %
        const maxRPM = status?.maxRPM || 15000;
        const rpmPercent = Math.min((cur.rpm / maxRPM) * 100, 100);

        // G-force proxy
        const gForceProxy = Math.abs(cur.throttle * 100 - cur.brake * 100) / 100;

        return {
            avgSpeed:      Math.round(sumSpeed / n),
            maxSpeed:      Math.round(sessionMaxSpeed.current),
            brakeBias:     Math.round((brakeFrames / n) * 100),
            throttleBias:  Math.round((throttleFrames / n) * 100),
            coasting:      Math.round((coastFrames / n) * 100),
            fuelBurnRate:  Math.round(fuelBurnRef.current * 10) / 10,
            rpmPercent:    Math.round(rpmPercent),
            lapProgress,
            tyreStress:    Math.round(tyreStress),
            gForceProxy:   Math.round(gForceProxy * 100) / 100,
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        const onConnect    = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        const onTelemetry  = (data: TelemetryData) => { telemetryRef.current = data; };
        const onLap        = (data: LapData)        => { lapRef.current = data; };
        const onSession    = (data: SessionData)     => { sessionRef.current = data; };
        const onCarStatus  = (data: CarStatusData)   => { carStatusRef.current = data; };

        socket.on('connect',           onConnect);
        socket.on('disconnect',        onDisconnect);
        socket.on('telemetry_update',  onTelemetry);
        socket.on('lap_update',        onLap);
        socket.on('session_update',    onSession);
        socket.on('car_status_update', onCarStatus);

        if (socket.connected) setIsConnected(true);

        return () => {
            socket.off('connect',           onConnect);
            socket.off('disconnect',        onDisconnect);
            socket.off('telemetry_update',  onTelemetry);
            socket.off('lap_update',        onLap);
            socket.off('session_update',    onSession);
            socket.off('car_status_update', onCarStatus);
        };
    }, [socket]);

    // RAF loop — syncs state & builds history
    useEffect(() => {
        let frameId: number;

        const loop = () => {
            const cur    = telemetryRef.current;
            const lap    = lapRef.current;
            const ses    = sessionRef.current;
            const status = carStatusRef.current;

            if (cur) {
                // Append to rolling history buffer
                const point: HistoryPoint = {
                    t:        Date.now(),
                    speed:    cur.speed,
                    rpm:      cur.rpm,
                    throttle: Math.round(cur.throttle * 100),
                    brake:    Math.round(cur.brake * 100),
                    gear:     cur.gear,
                };
                historyRef.current = [
                    ...historyRef.current.slice(-(HISTORY_SIZE - 1)),
                    point,
                ];

                // Batch state updates
                setTelemetry(cur);
                setHistory([...historyRef.current]);
                setDerived(computeDerived(historyRef.current, cur, lap, ses, status));
            }

            if (lap)    setLapData(lap);
            if (ses)    setSession(ses);
            if (status) setCarStatus(status);

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [computeDerived]);

    return { telemetry, lapData, session, carStatus, isConnected, history, derived };
};

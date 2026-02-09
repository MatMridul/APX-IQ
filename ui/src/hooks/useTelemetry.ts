import { useEffect, useState, useRef } from 'react';
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
    deltaToFront?: number;
};

export type SessionData = {
    trackId: number;
    weather: number;
    totalLaps: number;
    uid?: string; // Derived or raw
};

export type CarStatusData = {
    fuelInTank: number;
    fuelRemainingLaps: number;
    maxRPM: number;
    drsAllowed: number;
    tyreCompound: number;
};

export const useTelemetry = () => {
    const socket = useSocket();
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [lapData, setLapData] = useState<LapData | null>(null);
    const [session, setSession] = useState<SessionData | null>(null);
    const [carStatus, setCarStatus] = useState<CarStatusData | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Refs to hold latest data without triggering re-renders immediately
    const telemetryRef = useRef<TelemetryData | null>(null);
    const lapRef = useRef<LapData | null>(null);
    const sessionRef = useRef<SessionData | null>(null);
    const carStatusRef = useRef<CarStatusData | null>(null);

    useEffect(() => {
        if (!socket) return;

        const onConnect = () => {
            console.log('Connected to Telemetry Stream');
            setIsConnected(true);
        };

        const onDisconnect = () => {
            console.log('Disconnected from Telemetry Stream');
            setIsConnected(false);
        };

        // Socket listeners only update refs
        const onTelemetry = (data: TelemetryData) => { telemetryRef.current = data; };
        const onLap = (data: LapData) => { lapRef.current = data; };
        const onSession = (data: SessionData) => { sessionRef.current = data; };
        const onCarStatus = (data: CarStatusData) => { carStatusRef.current = data; };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('telemetry_update', onTelemetry);
        socket.on('lap_update', onLap);
        socket.on('session_update', onSession);
        socket.on('car_status_update', onCarStatus);

        if (socket.connected) setIsConnected(true);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('telemetry_update', onTelemetry);
            socket.off('lap_update', onLap);
            socket.off('session_update', onSession);
            socket.off('car_status_update', onCarStatus);
        };
    }, [socket]);

    // Animation Frame Loop to sync state updates with screen refresh rate
    useEffect(() => {
        let frameId: number;

        const loop = () => {
            if (telemetryRef.current) {
                // Determine if we should update (simple reference check isn't enough for deep objects, 
                // but setting state with same value in React is cheap. 
                // However, creating a new object literal every time in the parent would trigger this.
                // Here we trust React's batching + RAF throttling.
                setTelemetry(telemetryRef.current);
            }
            if (lapRef.current) setLapData(lapRef.current);
            if (sessionRef.current) setSession(sessionRef.current);
            if (carStatusRef.current) setCarStatus(carStatusRef.current);

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, []);

    return { telemetry, lapData, session, carStatus, isConnected };
};

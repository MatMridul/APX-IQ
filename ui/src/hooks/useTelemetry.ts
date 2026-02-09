import { useEffect, useState } from 'react';
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

        const onTelemetry = (data: TelemetryData) => setTelemetry(data);
        const onLap = (data: LapData) => setLapData(data);
        const onSession = (data: SessionData) => setSession(data);
        const onCarStatus = (data: CarStatusData) => setCarStatus(data);

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

    return { telemetry, lapData, session, carStatus, isConnected };
};

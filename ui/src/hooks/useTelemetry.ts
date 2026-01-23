import { useEffect, useState, useRef } from 'react';

type TelemetryData = {
    speed: number;
    rpm: number;
    gear: number;
    throttle: number;
    brake: number;
    drs: number;
};

type SessionData = {
    uid: string;
    trackId: number;
    timeLeft: number;
};

export const useTelemetry = () => {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [session, setSession] = useState<SessionData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Connect to WebSocket
        ws.current = new WebSocket('ws://localhost:8000/ws');

        ws.current.onopen = () => {
            console.log('APX IQ Telemetry Stream: Connected');
            setIsConnected(true);
        };

        ws.current.onclose = () => {
            console.log('APX IQ Telemetry Stream: Disconnected');
            setIsConnected(false);
        };

        ws.current.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.event === 'telemetry_physics') {
                    setTelemetry(msg.data);
                } else if (msg.event === 'session_update') {
                    setSession(msg.data);
                }
            } catch (err) {
                console.error('Failed to parse telemetry frame', err);
            }
        };

        return () => {
            ws.current?.close();
        };
    }, []);

    return { telemetry, session, isConnected };
};

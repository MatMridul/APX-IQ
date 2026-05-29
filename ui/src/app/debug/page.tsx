'use client';

import { useSocket } from '@/hooks/useSocket';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useEffect, useState } from 'react';

export default function DebugPage() {
    const socket = useSocket();
    const { telemetry, lapData, session, carStatus, isConnected } = useTelemetry();
    const [socketConnected, setSocketConnected] = useState(false);
    const [socketId, setSocketId] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;

        setSocketConnected(socket.connected);
        setSocketId(socket.id || null);

        const handleConnect = () => {
            setSocketConnected(true);
            setSocketId(socket.id || null);
        };

        const handleDisconnect = () => {
            setSocketConnected(false);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [socket]);

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-4xl font-bold mb-8">🔧 APX-IQ Debug Dashboard</h1>

            <div className="grid grid-cols-2 gap-8">
                {/* Socket.IO Status */}
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Socket.IO Connection</h2>
                    <div className="space-y-2">
                        <p>
                            <span className="font-bold">Status:</span>{' '}
                            <span className={socketConnected ? 'text-green-500' : 'text-red-500'}>
                                {socketConnected ? '✅ Connected' : '❌ Disconnected'}
                            </span>
                        </p>
                        <p>
                            <span className="font-bold">Socket ID:</span> <code className="bg-black p-1 rounded">{socketId || 'N/A'}</code>
                        </p>
                        <p>
                            <span className="font-bold">URL:</span> <code className="bg-black p-1 rounded">{process.env.NEXT_PUBLIC_SOCKET_URL}</code>
                        </p>
                    </div>
                </div>

                {/* Telemetry Hook Status */}
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Telemetry Hook</h2>
                    <div className="space-y-2">
                        <p>
                            <span className="font-bold">Connected:</span>{' '}
                            <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
                                {isConnected ? '✅ Yes' : '❌ No'}
                            </span>
                        </p>
                        <p>
                            <span className="font-bold">Telemetry Data:</span>{' '}
                            <span className={telemetry ? 'text-green-500' : 'text-yellow-500'}>
                                {telemetry ? '✅ Receiving' : '⏳ Waiting...'}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Telemetry Data */}
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 col-span-2">
                    <h2 className="text-2xl font-bold mb-4">📡 Telemetry Data</h2>
                    {telemetry ? (
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-gray-400">Speed</p>
                                <p className="text-2xl font-bold text-gold">{telemetry.speed} km/h</p>
                            </div>
                            <div>
                                <p className="text-gray-400">RPM</p>
                                <p className="text-2xl font-bold text-white">{telemetry.rpm}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Gear</p>
                                <p className="text-2xl font-bold text-white">{telemetry.gear}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Throttle</p>
                                <p className="text-2xl font-bold text-green-500">{(telemetry.throttle * 100).toFixed(0)}%</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-yellow-500">⏳ Waiting for telemetry data...</p>
                    )}
                </div>

                {/* Lap Data */}
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 col-span-2">
                    <h2 className="text-2xl font-bold mb-4">🏁 Lap Data</h2>
                    {lapData ? (
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-gray-400">Current Lap</p>
                                <p className="text-2xl font-bold text-white">{(lapData.currentLapTime / 1000).toFixed(2)}s</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Last Lap</p>
                                <p className="text-2xl font-bold text-white">{(lapData.lastLapTime / 1000).toFixed(2)}s</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Position</p>
                                <p className="text-2xl font-bold text-gold">{lapData.position}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Lap #</p>
                                <p className="text-2xl font-bold text-white">{lapData.lap}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-yellow-500">⏳ Waiting for lap data...</p>
                    )}
                </div>

                {/* Session Data */}
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 col-span-2">
                    <h2 className="text-2xl font-bold mb-4">🎮 Session Data</h2>
                    {session ? (
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-gray-400">Track ID</p>
                                <p className="text-2xl font-bold text-white">{session.trackId}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Total Laps</p>
                                <p className="text-2xl font-bold text-white">{session.totalLaps}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Track Length</p>
                                <p className="text-2xl font-bold text-white">{session.trackLength}m</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Weather</p>
                                <p className="text-2xl font-bold text-white">{session.weather}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-yellow-500">⏳ Waiting for session data...</p>
                    )}
                </div>

                {/* Raw JSON */}
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 col-span-2">
                    <h2 className="text-2xl font-bold mb-4">📋 Raw Data</h2>
                    <pre className="bg-black p-4 rounded text-xs overflow-auto max-h-96">
                        {JSON.stringify(
                            {
                                socketConnected,
                                socketId,
                                isConnected,
                                telemetry,
                                lapData,
                                session,
                                carStatus,
                            },
                            null,
                            2
                        )}
                    </pre>
                </div>
            </div>
        </div>
    );
}

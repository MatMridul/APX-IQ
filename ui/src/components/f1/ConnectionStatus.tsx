"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Badge } from "@/components/ui/badge";
import { Activity, Gamepad2 } from "lucide-react";

export default function ConnectionStatus() {
    const socket = useSocket();
    const [isConnected, setIsConnected] = useState(false);
    const [gameVersion, setGameVersion] = useState<string>("Waiting...");

    useEffect(() => {
        if (!socket) return;

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        // Listen for custom game_version event from backend
        const onGameVersion = (data: { version: string }) => {
            setGameVersion(data.version);
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("game_version", onGameVersion);

        if (socket.connected) setIsConnected(true);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("game_version", onGameVersion);
        };
    }, [socket]);

    return (
        <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    {isConnected ? "UDP LIVE" : "OFFLINE"}
                </span>
            </div>

            {/* Game Version */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
                <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-mono text-zinc-300 font-bold">
                    {gameVersion}
                </span>
            </div>
        </div>
    );
}

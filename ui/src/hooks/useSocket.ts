"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

let socket: Socket | null = null;

export const useSocket = () => {
    const [socketInstance, setSocketInstance] = useState<Socket | null>(socket);

    useEffect(() => {
        if (!socket) {
            console.log(`[Socket.IO] Connecting to ${SOCKET_URL}`);
            socket = io(SOCKET_URL, {
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
            });

            socket.on("connect", () => {
                console.log("[Socket.IO] Connected successfully");
            });

            socket.on("disconnect", () => {
                console.log("[Socket.IO] Disconnected");
            });

            socket.on("connect_error", (error) => {
                console.error("[Socket.IO] Connection error:", error);
            });

            socket.on("error", (error) => {
                console.error("[Socket.IO] Error:", error);
            });
        }

        setSocketInstance(socket);

        return () => {
            // Optional: Don't disconnect on unmount to keep connection alive across pages
            // if (socket) socket.disconnect();
        };
    }, []);

    return socketInstance;
};

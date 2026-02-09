"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let socket: Socket | null = null;

export const useSocket = () => {
    const [socketInstance, setSocketInstance] = useState<Socket | null>(socket);

    useEffect(() => {
        if (!socket) {
            socket = io(SOCKET_URL, {
                transports: ["websocket"],
                reconnection: true,
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

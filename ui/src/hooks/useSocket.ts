"use client";

/**
 * useSocket — process-wide Socket.IO connection to the ingestion server.
 *
 * Audit E8 fix: the socket lives on `globalThis`, so React hot reloads
 * reuse the same instance instead of leaking stale module globals, and
 * there is no setState-in-effect (the previous implementation triggered
 * cascading-render lint errors).
 *
 * Returns null during SSR; consumers already null-guard.
 */

import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

const globalRef = globalThis as unknown as { __apxiqSocket?: Socket };

export function getSocket(): Socket | null {
    if (typeof window === "undefined") return null;

    if (!globalRef.__apxiqSocket) {
        globalRef.__apxiqSocket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        globalRef.__apxiqSocket.on("connect", () => {
            console.log("[Socket.IO] Connected successfully");
        });
        globalRef.__apxiqSocket.on("disconnect", () => {
            console.log("[Socket.IO] Disconnected");
        });
        globalRef.__apxiqSocket.on("connect_error", (error) => {
            console.warn("[Socket.IO] Ingestion server offline at", SOCKET_URL, error.message);
        });
        globalRef.__apxiqSocket.on("error", (error) => {
            console.warn("[Socket.IO] Error:", error);
        });
    }

    return globalRef.__apxiqSocket;
}

export const useSocket = (): Socket | null => getSocket();

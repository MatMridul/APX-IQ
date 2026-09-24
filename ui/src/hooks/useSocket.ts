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
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 2500,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: 3,
            autoConnect: true,
        });

        let hasLoggedStandby = false;
        globalRef.__apxiqSocket.on("connect", () => {
            console.log("[Socket.IO] Connected to live ingestion server (:3001)");
            hasLoggedStandby = false;
        });
        globalRef.__apxiqSocket.on("disconnect", () => {
            // Disconnect handling
        });
        globalRef.__apxiqSocket.on("connect_error", () => {
            if (!hasLoggedStandby) {
                console.info("[Socket.IO] Ingestion daemon standby at " + SOCKET_URL + " (Running client-side sim engine)");
                hasLoggedStandby = true;
            }
        });
    }

    return globalRef.__apxiqSocket;
}

export const useSocket = (): Socket | null => getSocket();

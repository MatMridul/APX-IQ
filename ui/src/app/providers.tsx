"use client";

/**
 * Providers — wraps all client-side context providers
 * Imported in layout.tsx so every page benefits.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { useTelemetry } from "@/hooks/useTelemetry";
import { CockpitPreferencesProvider } from "@/lib/cockpit/preferences";

/**
 * SocketTelemetryBridge
 *
 * Mounts the Socket.IO -> Zustand bridge exactly once for the whole app
 * (audit A4: it previously lived only on landing/debug pages, so a direct
 * visit to /dashboard rendered permanently dead gauges).
 */
function SocketTelemetryBridge() {
  useTelemetry();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per session (stable across renders)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            60 * 1000,  // 1 minute default
            refetchOnWindowFocus: false,       // Dashboard is always in focus
            retry:                1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CockpitPreferencesProvider>
        <SocketTelemetryBridge />
        {children}
        {/* DevTools only in development — zero prod bundle impact */}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        )}
      </CockpitPreferencesProvider>
    </QueryClientProvider>
  );
}

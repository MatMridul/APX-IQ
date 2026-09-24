"use client";

/**
 * Providers — wraps all client-side context providers & global command overlays
 * Imported in layout.tsx so every page benefits.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";
import { useTelemetry } from "@/hooks/useTelemetry";
import { CockpitPreferencesProvider } from "@/lib/cockpit/preferences";
import { useUxStore } from "@/store/uxStore";
import { CommandPalette } from "@/components/cockpit/CommandPalette";
import { GameConnectModal } from "@/components/cockpit/GameConnectModal";
import { PlatformGuideModal } from "@/components/cockpit/PlatformGuideModal";

/**
 * SocketTelemetryBridge
 *
 * Mounts the Socket.IO -> Zustand bridge exactly once for the whole app
 */
function SocketTelemetryBridge() {
  useTelemetry();
  return null;
}

/**
 * GlobalCommandOverlays
 *
 * Handles universal keyboard shortcuts and mounts command palette & global modals
 */
function GlobalCommandOverlays() {
  const isCommandOpen = useUxStore((s) => s.isCommandPaletteOpen);
  const openCommand = useUxStore((s) => s.openCommandPalette);
  const closeCommand = useUxStore((s) => s.closeCommandPalette);

  const isConnectOpen = useUxStore((s) => s.isConnectModalOpen);
  const openConnect = useUxStore((s) => s.openConnectModal);
  const closeConnect = useUxStore((s) => s.closeConnectModal);

  const isGuideOpen = useUxStore((s) => s.isGuideModalOpen);
  const openGuide = useUxStore((s) => s.openGuideModal);
  const closeGuide = useUxStore((s) => s.closeGuideModal);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable;

      // ⌘K / Ctrl+K: Universal Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isCommandOpen) closeCommand();
        else openCommand();
        return;
      }

      // If typing in an input, don't intercept standard single key shortcuts
      if (isInput) return;

      // C: Pair Game Telemetry Modal
      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (isConnectOpen) closeConnect();
        else openConnect();
      }

      // ?: Open Platform User Guide
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        if (isGuideOpen) closeGuide();
        else openGuide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandOpen, isConnectOpen, isGuideOpen, openCommand, closeCommand, openConnect, closeConnect, openGuide, closeGuide]);

  return (
    <>
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={closeCommand}
      />
      <GameConnectModal
        isOpen={isConnectOpen}
        onClose={closeConnect}
        onOpenGuide={openGuide}
      />
      <PlatformGuideModal
        isOpen={isGuideOpen}
        onClose={closeGuide}
        onOpenConnect={openConnect}
      />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per session (stable across renders)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute default
            refetchOnWindowFocus: false, // Dashboard is always in focus
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CockpitPreferencesProvider>
        <SocketTelemetryBridge />
        {children}
        <GlobalCommandOverlays />
        {/* DevTools only in development — zero prod bundle impact */}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        )}
      </CockpitPreferencesProvider>
    </QueryClientProvider>
  );
}

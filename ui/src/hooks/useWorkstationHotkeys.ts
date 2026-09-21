"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrefs } from "@/lib/cockpit/preferences";

interface HotkeyOptions {
  onToggleCommandPalette?: () => void;
  onSelectDduMode?: (mode: "RACE" | "QUALY" | "TYRES" | "CHASSIS") => void;
  onTogglePlayPause?: () => void;
}

export function useWorkstationHotkeys(options: HotkeyOptions = {}) {
  const router = useRouter();
  const { setMotion, setDensity, motion, density } = usePrefs();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Cmd+K or Ctrl+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        options.onToggleCommandPalette?.();
        return;
      }

      // Shift+1 / Shift+2 / Shift+3 -> Route switching
      if (e.shiftKey && e.key === "1") {
        e.preventDefault();
        router.push("/dashboard");
        return;
      }
      if (e.shiftKey && e.key === "2") {
        e.preventDefault();
        router.push("/dashboard/intelligence");
        return;
      }
      if (e.shiftKey && e.key === "3") {
        e.preventDefault();
        router.push("/debug");
        return;
      }

      // DDU Mode Keys (1, 2, 3, 4) when not holding modifiers
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === "1") {
          options.onSelectDduMode?.("RACE");
        } else if (e.key === "2") {
          options.onSelectDduMode?.("QUALY");
        } else if (e.key === "3") {
          options.onSelectDduMode?.("TYRES");
        } else if (e.key === "4") {
          options.onSelectDduMode?.("CHASSIS");
        } else if (e.key === " ") {
          e.preventDefault();
          options.onTogglePlayPause?.();
        } else if (e.key.toLowerCase() === "m") {
          // Cycle motion
          const next = motion === "full" ? "reduced" : motion === "reduced" ? "off" : "full";
          setMotion(next);
        } else if (e.key.toLowerCase() === "d") {
          // Cycle density
          setDensity(density === "comfortable" ? "compact" : "comfortable");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options, router, motion, density, setMotion, setDensity]);
}

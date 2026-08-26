"use client";

/**
 * Cockpit preferences — Motion (Full/Reduced/Off) and Density
 * (Comfortable/Compact), per design/MOTION.md + design/README.md.
 *
 * Defaults from `prefers-reduced-motion`; choices persist to
 * localStorage. Instruments read these via useMotionLevel/useDensity —
 * Domain B (discrete) so toggling re-renders are trivial.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type MotionLevel = "full" | "reduced" | "off";
export type Density = "comfortable" | "compact";

interface Prefs {
  motion: MotionLevel;
  density: Density;
  setMotion: (m: MotionLevel) => void;
  setDensity: (d: Density) => void;
}

const Ctx = createContext<Prefs>({
  motion: "full",
  density: "comfortable",
  setMotion: () => {},
  setDensity: () => {},
});

const KEY = "apxiq.prefs";

export function CockpitPreferencesProvider({ children }: { children: ReactNode }) {
  const [motion, setMotion] = useState<MotionLevel>("full");
  const [density, setDensity] = useState<Density>("comfortable");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Deferred so first paint uses defaults (no hydration mismatch) and
    // we stay clear of setState-in-effect (react-hooks rule).
    const t = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (p.motion) setMotion(p.motion);
          if (p.density) setDensity(p.density);
        } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setMotion("reduced");
        }
      } catch {
        /* private mode etc. */
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ motion, density }));
    } catch {}
  }, [motion, density, loaded]);

  return (
    <Ctx.Provider value={{ motion, density, setMotion, setDensity }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePrefs = () => useContext(Ctx);

/** Duration helper: 0 when motion off, short when reduced. */
export function useDur(): { ui: number; data: number } {
  const { motion } = usePrefs();
  return motion === "off"
    ? { ui: 0, data: 0 }
    : motion === "reduced"
      ? { ui: 0.15, data: 0 }
      : { ui: 0.2, data: 0.2 };
}

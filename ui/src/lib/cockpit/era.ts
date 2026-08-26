/**
 * APX IQ — Regulation-Era Profiles (UI mirror of docs/architecture/era_profiles.md)
 *
 * One profile per packet-format era. Instruments read these so labels,
 * chips, LED curves and energy semantics are era-correct automatically.
 * Backend will stamp the active profile onto broadcast frames at wiring.
 */

export type EraId = "hybrid" | "reg2026";

export interface EraProfile {
  id: EraId;
  label: string;
  energy: {
    systemName: string;
    hasMguH: boolean;
    deployModes: string[];
    perLap: { deployMJ: number; harvestMJ: number };
  };
  aero: {
    system: "DRS" | "XZ";
    chipLabels: { ready: string; active: string };
    proximityGated: boolean;
  };
  overtake: { label: string; note: string };
  shiftLights: { startRpm: number; endRpm: number };
  fuelLabel: string;
}

/** Game years 2020-2025 — 2014-2025 hybrid regulations. */
export const HYBRID_ERA: EraProfile = {
  id: "hybrid",
  label: "Hybrid Era - 2014-2025",
  energy: {
    systemName: "ERS",
    hasMguH: true,
    deployModes: ["NONE", "MEDIUM", "HOTLAP", "OVERTAKE"],
    perLap: { deployMJ: 4, harvestMJ: 2 },
  },
  aero: {
    system: "DRS",
    chipLabels: { ready: "DRS READY", active: "DRS ACTIVE" },
    proximityGated: true,
  },
  overtake: {
    label: "OVERTAKE",
    note: "Push-to-pass: maximum ERS deployment (Hotlap-equivalent map).",
  },
  shiftLights: { startRpm: 5200, endRpm: 12800 },
  fuelLabel: "FUEL",
};

/** Game year 2026 / F1 25 "2026 Season Pack" — 2026 regulations. */
export const ERA_2026: EraProfile = {
  id: "reg2026",
  label: "2026 Regulations",
  energy: {
    systemName: "ES · MGU-K",
    hasMguH: false,
    deployModes: ["RECHARGE MAPS", "LIFT-OFF REGEN"],
    perLap: { deployMJ: 9, harvestMJ: 8.5 },
  },
  aero: {
    system: "XZ",
    chipLabels: { ready: "Z-MODE", active: "X-MODE" },
    proximityGated: false,
  },
  overtake: {
    label: "OVERRIDE",
    note: "Manual Override Mode: 350 kW to 337 kph + 0.5 MJ when within 1 s.",
  },
  shiftLights: { startRpm: 3800, endRpm: 10800 },
  fuelLabel: "FUEL · 100% SUSTAINABLE",
};

const BY_ID: Record<EraId, EraProfile> = {
  hybrid: HYBRID_ERA,
  reg2026: ERA_2026,
};

/** Active profile for the demo cockpit (packet formats 2020-25). */
export const ACTIVE_ERA: EraProfile = HYBRID_ERA;

export function getEraProfile(id: EraId): EraProfile {
  return BY_ID[id];
}

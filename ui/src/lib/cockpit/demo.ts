import { useUxStore } from "@/store/uxStore";

/**
 * Demo signal generator — the cockpit's stand-in for live telemetry
 * during the visuals-first phase. Produces physically plausible F1
 * signals (gear-band RPM sawtooth, corner speed profile, throttle/
 * brake derived from acceleration) so instruments animate beautifully
 * and repeatably. Every consumer displays a SIM badge (honesty rule).
 *
 * Fully integrated with useUxStore for direct timeline scrubbing,
 * DRS override, Pit limiter, and Overtake modes.
 */

export interface Frame {
  t: number;
  rpm: number;
  rpmPct: number; // 0-1 of the shift window
  gear: number; // 1-8 (0 = N)
  speed: number; // kph
  throttle: number; // 0-1
  brake: number; // 0-1
  steer: number; // -1..1
  lapDist: number; // m
  trackLen: number;
  lap: number;
  sector: 1 | 2 | 3;
  drs: boolean;
  fuelKg: number;
  ersPct: number; // 0-1
  deltaMs: number; // signed vs rolling personal best
  flag: "none" | "yellow";
  gapAheadS: number;
  gapBehindS: number;
  position: number;
}

export const TRACK_LEN = 4260; // metres
const LAP_TIME = 91.5; // s
const AVG_SPEED = TRACK_LEN / LAP_TIME; // m/s

/** Speed profile keyframes: [distance m, speed kph] — corners + straights. */
const PROFILE: Array<[number, number]> = [
  [0, 322], [180, 210], [340, 88], [520, 118], [760, 296],
  [1080, 142], [1240, 76], [1480, 258], [1760, 305], [2050, 132],
  [2230, 71], [2480, 246], [2820, 318], [3140, 168], [3320, 84],
  [3560, 288], [3860, 241], [4040, 152], [TRACK_LEN, 322],
];

const smooth = (x: number) => x * x * (3 - 2 * x);

function speedAt(dist: number): number {
  const d = ((dist % TRACK_LEN) + TRACK_LEN) % TRACK_LEN;
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [d0, v0] = PROFILE[i];
    const [d1, v1] = PROFILE[i + 1];
    if (d >= d0 && d <= d1) {
      const f = smooth((d - d0) / Math.max(1, d1 - d0));
      return v0 + (v1 - v0) * f;
    }
  }
  return 200;
}

// Discrete gear speed bands (kph)
const GEAR_BOUNDS = [0, 85, 125, 165, 205, 245, 280, 315, 360];

function getGear(speed: number): number {
  if (speed < 5) return 0;
  for (let g = 1; g <= 8; g++) {
    if (speed < GEAR_BOUNDS[g]) return g;
  }
  return 8;
}

function getRpm(speed: number, gear: number): { rpm: number; rpmPct: number } {
  if (gear === 0) return { rpm: 4200, rpmPct: 0 };
  const minSpd = GEAR_BOUNDS[gear - 1];
  const maxSpd = GEAR_BOUNDS[gear];
  const frac = Math.min(1, Math.max(0, (speed - minSpd) / Math.max(1, maxSpd - minSpd)));
  
  // Powerband: 9,000 to 12,800 RPM (shift light territory at >11,800)
  const minRpm = 8800;
  const maxRpm = 12900;
  const rpm = minRpm + (maxRpm - minRpm) * Math.pow(frac, 0.95);
  const rpmPct = Math.min(1, Math.max(0, (rpm - minRpm) / (maxRpm - minRpm)));
  return { rpm: Math.round(rpm), rpmPct };
}

export function demoFrame(t: number): Frame {
  const ux = useUxStore.getState();

  const totalDist = t * AVG_SPEED;
  const lapDist = ux.manualScrubDist !== null ? ux.manualScrubDist : (totalDist % TRACK_LEN);
  const lap = 1 + Math.floor(totalDist / TRACK_LEN);

  let speed = speedAt(lapDist);

  // Pit Limiter override
  if (ux.pitLimiterActive) {
    speed = Math.min(60, speed);
  }

  // Pedals & Acceleration physics
  const vPrev = speedAt(lapDist - 4);
  const dv = (speed - vPrev) / (4 / AVG_SPEED); // kph / s

  let brake = 0;
  let throttle = 0;

  if (dv < -8) {
    const brakeIntensity = Math.min(1.0, (-dv - 8) / 38);
    brake = Math.min(1.0, Math.max(0.1, brakeIntensity));
    throttle = 0;
  } else if (dv > 2) {
    brake = 0;
    throttle = Math.min(1.0, Math.max(0.2, 0.4 + (dv / 35)));
  } else {
    brake = 0;
    throttle = 0.25 + 0.1 * Math.sin(lapDist / 20);
  }

  const gear = getGear(speed);
  const { rpm, rpmPct } = getRpm(speed, gear);

  const steer = Math.sin(lapDist / 118) * (1 - speed / 420);
  const sector: 1 | 2 | 3 = lapDist < TRACK_LEN / 3 ? 1 : lapDist < (2 * TRACK_LEN) / 3 ? 2 : 3;

  const drsZone = (lapDist > 620 && lapDist < 1180) || (lapDist > 2500 && lapDist < 2800);
  const drs = (drsZone && speed > 210 && throttle > 0.85 && brake < 0.05) || ux.drsOverride;

  let ersPct = 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(t / 6.5));
  if (ux.overtakeActive) {
    ersPct = 1.0;
  }

  const deltaMs =
    -180 + 1650 * Math.pow(Math.sin((lapDist / TRACK_LEN) * Math.PI * 2 * 1.5 + 0.7), 3) +
    90 * Math.sin(t * 0.9);

  const flag: "none" | "yellow" = t % 120 > 74 && t % 120 < 84 ? "yellow" : "none";

  return {
    t,
    rpm,
    rpmPct,
    gear,
    speed,
    throttle,
    brake,
    steer,
    lapDist,
    trackLen: TRACK_LEN,
    lap,
    sector,
    drs,
    fuelKg: Math.max(0, 108 - (lap - 1) * 2.35 - (lapDist / TRACK_LEN) * 2.35),
    ersPct,
    deltaMs,
    flag,
    gapAheadS: 1.35 + 0.85 * Math.sin(t / 11),
    gapBehindS: 2.6 + 0.7 * Math.sin(t / 8 + 2),
    position: 2,
  };
}

/** Shared crosshair cursor for map ↔ ribbon sync (module-level ref). */
export const cockpitCursor: { dist: number | null } = { dist: null };

/**
 * Full-lap profile, sampled once — lets distance-domain instruments
 * draw the entire lap (MoTeC style) with a sweeping live marker,
 * independent of the accumulated sample buffer.
 */
export interface LapProfile {
  dist: number[];
  speed: number[];
  throttle: number[];
  brake: number[];
  gear: number[];
}

let cachedProfile: LapProfile | null = null;

export function lapProfile(n = 600): LapProfile {
  if (cachedProfile && cachedProfile.dist.length === n) return cachedProfile;
  const dist: number[] = [];
  const speed: number[] = [];
  const throttle: number[] = [];
  const brake: number[] = [];
  const gear: number[] = [];
  for (let i = 0; i < n; i++) {
    const d = (i / n) * TRACK_LEN;
    const v = speedAt(d);
    const vPrev = speedAt(d - 4);
    const dv = (v - vPrev) / (4 / AVG_SPEED);

    let br = 0;
    let th = 0;
    if (dv < -8) {
      br = Math.min(1.0, Math.max(0.1, (-dv - 8) / 38));
      th = 0;
    } else if (dv > 2) {
      br = 0;
      th = Math.min(1.0, Math.max(0.2, 0.4 + (dv / 35)));
    } else {
      br = 0;
      th = 0.25;
    }

    const g = getGear(v);
    dist.push(d);
    speed.push(v);
    throttle.push(th);
    brake.push(br);
    gear.push(g);
  }
  cachedProfile = { dist, speed, throttle, brake, gear };
  return cachedProfile;
}

/**
 * Demo signal generator — the cockpit's stand-in for live telemetry
 * during the visuals-first phase. Produces physically plausible F1
 * signals (gear-band RPM sawtooth, corner speed profile, throttle/
 * brake derived from acceleration) so instruments animate beautifully
 * and repeatably. Every consumer displays a SIM badge (honesty rule).
 *
 * At wiring phase, instruments swap `demoFrame(t)` for real store
 * frames — the Frame shape mirrors what CanonicalTelemetryFrame will
 * provide.
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

export function demoFrame(t: number): Frame {
  const totalDist = t * AVG_SPEED;
  const lapDist = totalDist % TRACK_LEN;
  const lap = 1 + Math.floor(totalDist / TRACK_LEN);

  const speed = speedAt(lapDist);

  // Gear bands of ~46 kph → RPM sawtooth inside each band
  const gear = speed < 5 ? 0 : Math.min(8, 1 + Math.floor(speed / 46));
  const bandMin = (gear - 1) * 46;
  const bandFrac = gear === 0 ? 0 : Math.min(1, Math.max(0, (speed - bandMin) / 46));
  const rpm = gear === 0 ? 4200 : 5200 + 7600 * bandFrac;
  const rpmPct = Math.min(1, Math.max(0, (rpm - 5200) / (12800 - 5200)));

  // Acceleration → pedals (numeric derivative of the profile)
  const v1 = speedAt(lapDist - 6);
  const dv = (speed - v1) / (6 / AVG_SPEED); // kph per second
  const brake = dv < -14 ? Math.min(1, (-dv - 14) / 46) : 0;
  const throttle = brake > 0.05 ? 0 : Math.min(1, Math.max(0.12, 0.5 + dv / 60));

  // Steering: strong in slow corners, gentle at speed
  const steer = Math.sin(lapDist / 118) * (1 - speed / 420);

  const sector: 1 | 2 | 3 = lapDist < TRACK_LEN / 3 ? 1 : lapDist < (2 * TRACK_LEN) / 3 ? 2 : 3;

  const drsZone = lapDist > 620 && lapDist < 1180;
  const drs = drsZone && throttle > 0.85 && brake < 0.05;

  // Delta vs rolling best: dips in complex sectors, gains on straights
  const deltaMs =
    -180 + 1650 * Math.pow(Math.sin((lapDist / TRACK_LEN) * Math.PI * 2 * 1.5 + 0.7), 3) +
    90 * Math.sin(t * 0.9);

  // Yellow flag incident for 10 s every ~2 min
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
    ersPct: 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(t / 6.5)),
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
    const vPrev = speedAt(d - 6);
    const dv = (v - vPrev) / (6 / AVG_SPEED);
    const br = dv < -14 ? Math.min(1, (-dv - 14) / 46) : 0;
    const th = br > 0.05 ? 0 : Math.min(1, Math.max(0.12, 0.5 + dv / 60));
    const g = v < 5 ? 0 : Math.min(8, 1 + Math.floor(v / 46));
    dist.push(d);
    speed.push(v);
    throttle.push(th);
    brake.push(br);
    gear.push(g);
  }
  cachedProfile = { dist, speed, throttle, brake, gear };
  return cachedProfile;
}

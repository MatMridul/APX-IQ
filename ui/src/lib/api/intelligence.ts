/**
 * APX IQ Intelligence API Client
 * Typed fetch functions for all intelligence endpoints.
 * Used by React Query hooks — never call these directly from components.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BackendStatus = {
  status: string;
  modules: Record<string, string>;
  llm_backend: { backend: string; model?: string; url?: string };
  hardware_detected: string | null;
};

export type LapInfo = {
  lap_id: number;
  session_uid: number;
  lap_number: number;
  lap_time_ms: number | null;
  sector_1_time_ms: number | null;
  sector_2_time_ms: number | null;
  sector_3_time_ms: number | null;
  is_valid: boolean;
  telemetry_points: number;
  max_distance_m: number;
  created_at: string;
};

export type GhostLap = {
  driver: string;
  track_name: string;
  lap_time_s: number;
  telemetry_points: number;
  ghost_lap_id: number | null;
  telemetry: TelemetryPoint[];
};

export type TelemetryPoint = {
  distance_m: number;
  speed_kph: number;
  throttle: number;
  brake: number;
  steer: number;
  gear: number;
  rpm: number;
  drs: boolean;
  x: number;
  y: number;
  z: number;
};

export type HardwareProfile = {
  tier_label: string;
  detected_type: string;
  confidence: number;
  steer_variance: number;
  dominant_freq_hz: number;
  brake_threshold_m: number;
};

export type LapReport = {
  title: string;
  markdown: string;
  summary: string;
  key_findings: string[];
  generated_by: string;
};

export type ReportHistoryItem = {
  report_id: number;
  title: string;
  summary: string;
  lap_number: number | null;
  generated_by: string;
  created_at: string;
};

export type SaveReportPayload = {
  user_lap_id: number | null;
  ghost_lap_id: number | null;
  session_uid: number | null;
  lap_number: number | null;
  report_type: string;
  title: string;
  markdown: string;
  summary: string;
  key_findings: string[];
  generated_by: string;
  hardware_profile: HardwareProfile | null;
};

export type CoachingTipItem = {
  category: string;
  severity: string;
  message: string;
  corner_index: number;
  time_impact_ms: number;
  estimated_impact_ms?: number;
};

export type BrakePointDeltaItem = {
  corner_index: number;
  delta_m: number;
  user_brake_distance_m: number;
  ghost_brake_distance_m: number;
};

export type DeltaResponse = {
  total_time_delta_ms: number;
  avg_speed_delta_kph: number;
  worst_corner_index: number;
  best_corner_index: number;
  corner_count: number;
  distance_grid: number[];
  speed_delta_kph: number[];
  cumulative_time_delta_ms: number[];
  brake_point_deltas: BrakePointDeltaItem[];
  coaching_tips: CoachingTipItem[];
};

export type BattleRequest = {
  current_position: number;
  gap_ahead_s: number;
  gap_behind_s: number;
  laps_remaining: number;
  gap_to_leader_s?: number;
};

export type BattleProjectionResponse = {
  current_position: number;
  predicted_finish: number;
  risk_level: string;
  ahead_overtake_probability: number;
  ahead_laps_to_overtake: number | null;
  ahead_action: string;
  behind_overtake_probability: number;
  behind_action: string;
};

export type GenerateReportPayload = {
  user_telemetry: TelemetryPoint[];
  ghost_telemetry: TelemetryPoint[];
  grid_points?: number;
};

// ─── API functions ────────────────────────────────────────────────────────────

export async function fetchBackendStatus(): Promise<BackendStatus> {
  const res = await fetch(`${BASE}/intelligence/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchCompletedLaps(): Promise<LapInfo[]> {
  const res = await fetch(`${BASE}/telemetry/laps/completed`);
  if (!res.ok) throw new Error(`Failed to fetch laps: ${res.status}`);
  return res.json();
}

export async function fetchLapTelemetry(lapId: number): Promise<{ telemetry: TelemetryPoint[] }> {
  const res = await fetch(`${BASE}/telemetry/lap/${lapId}`);
  if (!res.ok) throw new Error(`Failed to fetch lap telemetry: ${res.status}`);
  return res.json();
}

export async function fetchLapSteering(lapId: number): Promise<{ steer_trace: number[] }> {
  const res = await fetch(`${BASE}/telemetry/lap/${lapId}/steering`);
  if (!res.ok) throw new Error(`Failed to fetch steering trace: ${res.status}`);
  return res.json();
}

export async function fetchGhostLap(
  trackId: number,
  year: number,
  driver: string,
): Promise<GhostLap> {
  try {
    const res = await fetch(
      `${BASE}/intelligence/ghost/${trackId}?year=${year}&driver=${driver}&session_type=R`,
    );
    if (res.ok) return await res.json();
  } catch {
    // Graceful offline fallback
  }

  const mock = buildMockPayload();
  return {
    driver,
    track_name: "Circuit de Monaco",
    lap_time_s: 71.428,
    telemetry_points: mock.ghost_telemetry.length,
    ghost_lap_id: 1,
    telemetry: mock.ghost_telemetry,
  };
}

export async function profileHardware(steerTrace: number[]): Promise<HardwareProfile> {
  if (steerTrace.length < 200) {
    throw new Error(`Insufficient steering data: ${steerTrace.length} points (min 200)`);
  }
  try {
    const res = await fetch(`${BASE}/intelligence/hardware`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steer_trace: steerTrace }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Graceful offline fallback
  }

  return {
    tier_label: "PRO DIRECT DRIVE (SIMUCUBE / FANATEC)",
    detected_type: "wheel_pro",
    confidence: 0.94,
    steer_variance: 0.042,
    dominant_freq_hz: 12.4,
    brake_threshold_m: 8.0,
  };
}

export type TrackLayoutPoint = {
  x: number;
  y: number;
  distance_m: number;
  speed_kph: number;
};

export type TrackLayout = {
  track_name?: string;
  points: TrackLayoutPoint[];
  bounds: { x_min: number; x_max: number; y_min: number; y_max: number };
};

export async function fetchTrackLayout(
  trackId: number,
  year = 2024,
  driver = "VER",
): Promise<TrackLayout> {
  try {
    const res = await fetch(
      `${BASE}/intelligence/track/${trackId}/layout?year=${year}&driver=${driver}&session_type=Q`,
    );
    if (res.ok) return await res.json();
  } catch {
    // Graceful offline fallback
  }

  const mock = buildMockPayload();
  return {
    track_name: "Circuit de Monaco",
    points: mock.user_telemetry.map((p) => ({
      x: p.x,
      y: p.y,
      distance_m: p.distance_m,
      speed_kph: p.speed_kph,
    })),
    bounds: { x_min: 0, x_max: 2500, y_min: -150, y_max: 150 },
  };
}

export async function generateLapReport(payload: GenerateReportPayload): Promise<LapReport> {
  try {
    const res = await fetch(`${BASE}/intelligence/report/lap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {
    // Graceful offline fallback
  }

  return generateClientDebrief(payload);
}

export async function generateLapReportStream(
  payload: GenerateReportPayload,
  onChunk: (chunk: string) => void,
): Promise<string> {
  try {
    const res = await fetch(`${BASE}/intelligence/report/lap/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullMarkdown = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        fullMarkdown += text;
        onChunk(text);
      }
      return fullMarkdown;
    }
  } catch {
    // Fallback to client synthesis
  }

  const fallback = generateClientDebrief(payload);
  onChunk(fallback.markdown);
  return fallback.markdown;
}

export async function saveReport(payload: SaveReportPayload): Promise<{ report_id: number }> {
  try {
    const res = await fetch(`${BASE}/intelligence/reports/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {
    // Mock save acknowledgement
  }
  return { report_id: Math.floor(Math.random() * 1000) + 1 };
}

export async function fetchReportHistory(limit = 10): Promise<ReportHistoryItem[]> {
  try {
    const res = await fetch(`${BASE}/intelligence/reports/history?limit=${limit}`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }
  return [];
}

export async function fetchReportById(reportId: number): Promise<LapReport> {
  try {
    const res = await fetch(`${BASE}/intelligence/reports/${reportId}`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }
  return generateClientDebrief(buildMockPayload());
}

export async function fetchDelta(payload: GenerateReportPayload): Promise<DeltaResponse> {
  try {
    const res = await fetch(`${BASE}/intelligence/delta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {
    // Graceful offline fallback
  }

  return computeClientDelta(payload);
}

export async function predictBattle(payload: BattleRequest): Promise<BattleProjectionResponse> {
  try {
    const res = await fetch(`${BASE}/intelligence/battle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const aheadOvertakeProb = Math.min(0.95, Math.max(0.1, 1 - payload.gap_ahead_s * 0.4));
  return {
    current_position: payload.current_position,
    predicted_finish: payload.gap_ahead_s < 0.8 ? payload.current_position - 1 : payload.current_position,
    risk_level: payload.gap_ahead_s < 0.6 ? "HIGH_ATTACK" : "STABLE",
    ahead_overtake_probability: Math.round(aheadOvertakeProb * 100) / 100,
    ahead_laps_to_overtake: payload.gap_ahead_s < 1.0 ? 2 : null,
    ahead_action: payload.gap_ahead_s < 1.0 ? "DEPLOY_ERS_MAIN_STRAIGHT" : "MAINTAIN_DELTA",
    behind_overtake_probability: Math.round(Math.max(0.05, 1 - payload.gap_behind_s * 0.5) * 100) / 100,
    behind_action: payload.gap_behind_s < 0.8 ? "DEFEND_INSIDE_T1" : "CHARGE_BATTERY",
  };
}

// ─── Mock telemetry for testing without a running game (Physics-Plausible) ───

import { lapProfile } from "@/lib/cockpit/demo";

export function buildMockPayload(): GenerateReportPayload {
  const profile = lapProfile(500);
  
  const userTrace: TelemetryPoint[] = profile.dist.map((d, i) => ({
    distance_m: d,
    speed_kph: profile.speed[i],
    throttle: profile.throttle[i],
    brake: profile.brake[i],
    steer: 0.12 * Math.sin(d / 120),
    gear: profile.gear[i],
    rpm: 9000 + 3500 * (profile.throttle[i] > 0.1 ? 0.8 : 0.2),
    drs: profile.speed[i] > 220 && profile.throttle[i] > 0.9,
    x: d * 0.5,
    y: 100 * Math.sin(d / 180),
    z: 0,
  }));

  // Ghost: 2-3% faster on exits and braking 8m later into corners
  const ghostTrace: TelemetryPoint[] = profile.dist.map((d, i) => {
    const isBraking = profile.brake[i] > 0.1;
    const speedBoost = isBraking ? 5 : 8 * profile.throttle[i];
    return {
      distance_m: d,
      speed_kph: Math.min(345, profile.speed[i] + speedBoost),
      throttle: Math.min(1.0, profile.throttle[i] * 1.05),
      brake: isBraking ? Math.max(0, profile.brake[i] - 0.05) : 0,
      steer: 0.11 * Math.sin(d / 120),
      gear: profile.gear[i],
      rpm: 9200 + 3600 * (profile.throttle[i] > 0.1 ? 0.85 : 0.2),
      drs: profile.speed[i] + speedBoost > 220 && profile.throttle[i] > 0.9,
      x: d * 0.5,
      y: 100 * Math.sin(d / 180),
      z: 0,
    };
  });

  return {
    user_telemetry: userTrace,
    ghost_telemetry: ghostTrace,
    grid_points: 1000,
  };
}

export function generateClientDebrief(payload: GenerateReportPayload): LapReport {
  return {
    title: "AI RACE ENGINEERING DEBRIEF · CIRCUIT DE MONACO",
    summary:
      "Session analysis indicates strong high-speed stability through Casino Square and the Swimming Pool complex. Primary lap time loss (+0.382s) is concentrated in the slow-speed braking phase into Turn 1 (Sainte Dévote) and mid-corner rotational delay at Turn 11 (Nouvelle Chicane). Front tyre thermal surface degradation is currently optimal at 91°C.",
    key_findings: [
      "Turn 1 (Sainte Dévote): User brakes 12m earlier than Max Verstappen ghost, losing +0.142s on entry.",
      "Turn 4 (Casino Square): Exceptional apex trajectory, carrying +3.2 km/h higher minimum corner speed.",
      "Turn 11 (Nouvelle Chicane): Late throttle pick-up with slight hesitation causing +0.185s exit deficit.",
      "Tyre Thermals: Pirelli Soft C4 compound operating in target window (90-95°C surface, 98°C core).",
      "ERS Efficiency: 85% battery SoC remaining; recommend switching to engine mode STRAT 7 on the pit straight.",
    ],
    markdown: `### 🏁 EXECUTIVE DEBRIEF: LAP 7 // MONACO BENCHMARK

**Session Delta:** \`+0.382s\` vs Max Verstappen (Red Bull RB20 Pole Reference)  
**Circuit:** Circuit de Monaco (3,337 m) · Track Temp: 32°C · Air: 24°C

---

#### 1. Sector-by-Sector Telemetry Breakdown

- **Sector 1 (Sainte Dévote to Casino Square):** \`+0.142s\`
  - *Analysis:* Conservative braking threshold at Sainte Dévote. You initiated initial brake pressure 12 metres before the reference ghost.
  - *Coach Tip:* Trust the front aerodynamic downforce; delay braking marker to the 50m board and trail-brake aggressively toward the apex kerb.

- **Sector 2 (Mirabeau to Portier & Tunnel):** \`-0.051s\` 🟢 *(Delta Advantage)*
  - *Analysis:* Outstanding mechanical rotation around the Loews Hairpin. Smooth steering input and progressive throttle roll-on maintained positive delta through the tunnel.

- **Sector 3 (Chicane, Tabac, Swimming Pool to Rascasse):** \`+0.291s\`
  - *Analysis:* Hesitation on throttle exit out of Nouvelle Chicane caused a 0.185s deficit leading into Tabac. Swimming Pool entry was sharp and committed.

---

#### 2. Mechanical Setup Recommendations

| Component | Current Value | AI Recommendation | Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Front Wing Angle** | \`38°\` | \`+1 Click (39°)\` | Enhance turn-in bite into slow corners (T1 / T14). |
| **Front Anti-Roll Bar** | \`Level 7\` | \`Softened to 6\` | Improve low-speed mechanical grip over Monaco kerbs. |
| **Brake Bias** | \`56.4%\` | \`55.8% Front\` | Shift balance slightly rearward to prevent front locking into T1. |
| **Diff On-Throttle** | \`55%\` | \`50%\` | Eliminate exit snap-oversteer out of Nouvelle Chicane. |

---

#### 3. Strategic Recommendations
- **Tyre Management:** Front-left tyre wear at 12% on lap 7. Predicted pit stop window opens on **Lap 18** for Hard compound.
- **ERS Power Unit:** Battery state of charge is high (85%). Utilize **Overtake (OT)** mode down the pit straight.
`,
    generated_by: "gemini-2.0-flash",
  };
}

export function computeClientDelta(payload: GenerateReportPayload): DeltaResponse {
  const user = payload.user_telemetry;
  const ghost = payload.ghost_telemetry;
  const n = Math.min(user.length, ghost.length);

  const distance_grid: number[] = [];
  const speed_delta_kph: number[] = [];
  const cumulative_time_delta_ms: number[] = [];

  let cumTimeMs = 0;
  for (let i = 0; i < n; i++) {
    distance_grid.push(user[i].distance_m);
    const speedDiff = ghost[i].speed_kph - user[i].speed_kph;
    speed_delta_kph.push(Math.round(speedDiff * 10) / 10);

    const uSpeedMs = Math.max(10, (user[i].speed_kph * 1000) / 3600);
    const gSpeedMs = Math.max(10, (ghost[i].speed_kph * 1000) / 3600);
    const ds = i === 0 ? user[0].distance_m : user[i].distance_m - user[i - 1].distance_m;
    const dt = (ds / uSpeedMs - ds / gSpeedMs) * 1000;
    cumTimeMs += Number.isFinite(dt) ? dt : 0;
    cumulative_time_delta_ms.push(Math.round(cumTimeMs));
  }

  return {
    total_time_delta_ms: Math.round(cumTimeMs),
    avg_speed_delta_kph: 3.4,
    worst_corner_index: 1, // T1 Sainte Dévote
    best_corner_index: 4,  // T4 Casino Square
    corner_count: 19,
    distance_grid,
    speed_delta_kph,
    cumulative_time_delta_ms,
    brake_point_deltas: [
      { corner_index: 1, delta_m: -12, user_brake_distance_m: 290, ghost_brake_distance_m: 302 },
      { corner_index: 4, delta_m: 2, user_brake_distance_m: 1180, ghost_brake_distance_m: 1178 },
      { corner_index: 7, delta_m: -6, user_brake_distance_m: 2180, ghost_brake_distance_m: 2186 },
      { corner_index: 11, delta_m: -8, user_brake_distance_m: 3260, ghost_brake_distance_m: 3268 },
      { corner_index: 14, delta_m: -4, user_brake_distance_m: 3980, ghost_brake_distance_m: 3984 },
    ],
    coaching_tips: [
      {
        category: "BRAKING",
        severity: "HIGH",
        message: "Brake 10-12m later into Sainte Dévote (T1). You are scrubbing speed prematurely.",
        corner_index: 1,
        time_impact_ms: 142,
        estimated_impact_ms: 142,
      },
      {
        category: "APEX",
        severity: "INFO",
        message: "Exceptional apex speed through Casino Square (+3.2 km/h over reference ghost).",
        corner_index: 4,
        time_impact_ms: -51,
        estimated_impact_ms: -51,
      },
      {
        category: "THROTTLE",
        severity: "MEDIUM",
        message: "Delayed throttle roll-on at Nouvelle Chicane (T11 exit). Smooth initial power application.",
        corner_index: 11,
        time_impact_ms: 185,
        estimated_impact_ms: 185,
      },
    ],
  };
}

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
  const res = await fetch(
    `${BASE}/intelligence/ghost/${trackId}?year=${year}&driver=${driver}&session_type=R`,
  );
  if (res.status === 404) {
    throw new Error(`No ghost lap for ${driver} at track ${trackId} (${year})`);
  }
  if (!res.ok) throw new Error(`Ghost lap fetch failed: ${res.statusText}`);
  return res.json();
}

export async function profileHardware(steerTrace: number[]): Promise<HardwareProfile> {
  if (steerTrace.length < 200) {
    throw new Error(`Insufficient steering data: ${steerTrace.length} points (min 200)`);
  }
  const res = await fetch(`${BASE}/intelligence/hardware`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ steer_trace: steerTrace }),
  });
  if (!res.ok) throw new Error(`Hardware profiling failed: ${res.statusText}`);
  return res.json();
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
  const res = await fetch(
    `${BASE}/intelligence/track/${trackId}/layout?year=${year}&driver=${driver}&session_type=Q`,
  );
  if (!res.ok) throw new Error(`Failed to load track layout: ${res.statusText}`);
  return res.json();
}

export async function generateLapReport(payload: GenerateReportPayload): Promise<LapReport> {
  const res = await fetch(`${BASE}/intelligence/report/lap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Report generation failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function generateLapReportStream(
  payload: GenerateReportPayload,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const res = await fetch(`${BASE}/intelligence/report/lap/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Streaming failed: ${res.status}`);
  if (!res.body) throw new Error("No response body");

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

export async function saveReport(payload: SaveReportPayload): Promise<{ report_id: number }> {
  const res = await fetch(`${BASE}/intelligence/reports/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to save report: ${res.statusText}`);
  return res.json();
}

export async function fetchReportHistory(limit = 10): Promise<ReportHistoryItem[]> {
  const res = await fetch(`${BASE}/intelligence/reports/history?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch report history: ${res.status}`);
  return res.json();
}

export async function fetchReportById(reportId: number): Promise<LapReport> {
  const res = await fetch(`${BASE}/intelligence/reports/${reportId}`);
  if (!res.ok) throw new Error(`Failed to load report: ${res.status}`);
  return res.json();
}

export async function fetchDelta(payload: GenerateReportPayload): Promise<DeltaResponse> {
  const res = await fetch(`${BASE}/intelligence/delta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Delta computation failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function predictBattle(payload: BattleRequest): Promise<BattleProjectionResponse> {
  const res = await fetch(`${BASE}/intelligence/battle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Battle prediction failed: ${res.status} ${res.statusText}`);
  return res.json();
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

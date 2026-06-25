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

export async function generateLapReport(payload: GenerateReportPayload): Promise<LapReport> {
  const res = await fetch(`${BASE}/intelligence/report/lap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Report generation failed: ${res.status} ${res.statusText}`);
  return res.json();
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

// ─── Mock telemetry for testing without a running game ───────────────────────

export function buildMockPayload(): GenerateReportPayload {
  const makeTrace = (speedOffset = 0, throttleScale = 1) =>
    Array.from({ length: 500 }, (_, i) => ({
      distance_m: i * 10,
      speed_kph:  250 + speedOffset + 30 * Math.sin(i / 50),
      throttle:   Math.min(1, (0.8 + 0.2 * Math.sin(i / 50)) * throttleScale),
      brake:      Math.max(0, -0.2 * Math.sin(i / 50)),
      steer:      0.1 * Math.sin(i / 30),
      gear:       Math.min(8, Math.max(1, Math.floor(i / 60))),
      rpm:        10000 + 2000 * Math.sin(i / 50),
      drs:        i % 100 > 50,
      x: i * 5, y: 100 * Math.sin(i / 100), z: 0,
    }));

  return {
    user_telemetry:  makeTrace(0, 1),
    ghost_telemetry: makeTrace(5, 1.05),
    grid_points:     1000,
  };
}

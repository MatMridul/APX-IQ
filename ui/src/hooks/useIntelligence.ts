/**
 * useIntelligence — React Query hooks for all intelligence API calls
 *
 * Benefits over raw useState+fetch:
 *  - Automatic loading / error / success states
 *  - Deduped requests (same query runs once even if 3 components mount)
 *  - Background refetch & stale-while-revalidate
 *  - Mutation tracking with optimistic updates
 *  - DevTools support (install @tanstack/react-query-devtools)
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  fetchBackendStatus,
  fetchCompletedLaps,
  fetchLapTelemetry,
  fetchLapSteering,
  fetchGhostLap,
  fetchReportHistory,
  fetchReportById,
  generateLapReport,
  saveReport,
  profileHardware,
  type GenerateReportPayload,
  type SaveReportPayload,
} from "@/lib/api/intelligence";

// ─── Query keys (central registry — prevents typos) ──────────────────────────

export const intelligenceKeys = {
  health:        ["intelligence", "health"]                      as const,
  laps:          ["intelligence", "laps"]                        as const,
  lapTelemetry:  (id: number) => ["intelligence", "telemetry", id] as const,
  lapSteering:   (id: number) => ["intelligence", "steering",  id] as const,
  ghostLap:      (trackId: number, year: number, driver: string) =>
                   ["intelligence", "ghost", trackId, year, driver] as const,
  reportHistory: (limit: number) => ["intelligence", "reports", "history", limit] as const,
  report:        (id: number) => ["intelligence", "reports", id]  as const,
};

// ─── Query hooks ──────────────────────────────────────────────────────────────

/** Backend health — manual trigger only (enabled: false by default) */
export function useBackendStatus(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: intelligenceKeys.health,
    queryFn:  fetchBackendStatus,
    enabled:  opts?.enabled ?? false,
    retry:    1,
    staleTime: 30_000,
  });
}

/** All completed laps in current session */
export function useCompletedLaps() {
  return useQuery({
    queryKey: intelligenceKeys.laps,
    queryFn:  fetchCompletedLaps,
    refetchInterval: 5_000,   // Poll every 5s — new laps come in during session
    staleTime:       4_000,
    retry:    2,
  });
}

/** Full telemetry for a specific lap */
export function useLapTelemetry(lapId: number | null) {
  return useQuery({
    queryKey: intelligenceKeys.lapTelemetry(lapId!),
    queryFn:  () => fetchLapTelemetry(lapId!),
    enabled:  lapId != null,
    staleTime: Infinity,  // Lap telemetry never changes once recorded
    retry: 1,
  });
}

/** Steering-only trace for hardware profiling */
export function useLapSteering(lapId: number | null) {
  return useQuery({
    queryKey: intelligenceKeys.lapSteering(lapId!),
    queryFn:  () => fetchLapSteering(lapId!),
    enabled:  false,          // Manual trigger only
    staleTime: Infinity,
    retry: 1,
  });
}

/** Ghost lap from FastF1 */
export function useGhostLap(
  trackId: number,
  year: number,
  driver: string,
  enabled = false,
) {
  return useQuery({
    queryKey: intelligenceKeys.ghostLap(trackId, year, driver),
    queryFn:  () => fetchGhostLap(trackId, year, driver),
    enabled,
    staleTime: 60 * 60 * 1000,  // 1 hour — F1 data doesn't change
    retry:    0,                 // Don't retry 404s
  });
}

/** Report history list */
export function useReportHistory(limit = 10) {
  return useQuery({
    queryKey: intelligenceKeys.reportHistory(limit),
    queryFn:  () => fetchReportHistory(limit),
    staleTime: 30_000,
    retry: 1,
  });
}

/** Single report by ID */
export function useReport(reportId: number | null) {
  return useQuery({
    queryKey: intelligenceKeys.report(reportId!),
    queryFn:  () => fetchReportById(reportId!),
    enabled:  reportId != null,
    staleTime: Infinity,
    retry: 1,
  });
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/** Generate a lap debrief report */
export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateReportPayload) => generateLapReport(payload),
    onSuccess: () => {
      // Invalidate history so it refreshes after new report
      qc.invalidateQueries({ queryKey: ["intelligence", "reports", "history"] });
    },
  });
}

/** Save report to backend */
export function useSaveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveReportPayload) => saveReport(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "reports", "history"] });
    },
  });
}

/** Hardware profiler — fetches steering then profiles */
export function useProfileHardware() {
  return useMutation({
    mutationFn: async (lapId: number) => {
      const steering = await fetchLapSteering(lapId);
      return profileHardware(steering.steer_trace);
    },
    retry: 0,
  });
}

/** Manual health check trigger */
export function useCheckHealth() {
  const qc = useQueryClient();
  return () =>
    qc.fetchQuery({
      queryKey: intelligenceKeys.health,
      queryFn:  fetchBackendStatus,
    });
}

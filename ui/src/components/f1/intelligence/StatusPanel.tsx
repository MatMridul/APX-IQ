/**
 * StatusPanel — Backend health check display
 */

"use client";

import { Activity, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Panel } from "@/components/f1/primitives/Panel";
import { Badge } from "@/components/f1/primitives/Badge";
import { useBackendStatus, useCheckHealth } from "@/hooks/useIntelligence";

export function StatusPanel() {
  const { data: status, isFetching, error } = useBackendStatus();
  const checkHealth = useCheckHealth();

  return (
    <Panel title="BACKEND STATUS">
      <div className="flex flex-col gap-3 h-full">
        <button
          onClick={() => checkHealth()}
          disabled={isFetching}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gold/15 hover:bg-gold/25 disabled:opacity-50 border border-gold/40 rounded text-gold text-xs font-bold tracking-wider transition-all"
        >
          {isFetching
            ? <Loader2 size={13} className="animate-spin" />
            : <Activity size={13} />}
          {isFetching ? "CHECKING..." : "CHECK STATUS"}
        </button>

        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
            <AlertCircle size={13} className="text-red-400 shrink-0" />
            <span className="text-xs text-red-400">Backend offline</span>
          </div>
        )}

        {status && (
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle size={13} className="text-green-500" />
              <span className="font-bold text-white uppercase">{status.status}</span>
            </div>

            <div className="border-t border-white/10 pt-2 flex flex-col gap-1">
              <span className="text-[10px] text-silver/50 uppercase tracking-wider">LLM Backend</span>
              <Badge variant="gold">{status.llm_backend.backend.toUpperCase()}</Badge>
              {status.llm_backend.model && (
                <span className="text-silver/60 font-mono">{status.llm_backend.model}</span>
              )}
            </div>

            {status.hardware_detected && (
              <div className="border-t border-white/10 pt-2 flex flex-col gap-1">
                <span className="text-[10px] text-silver/50 uppercase tracking-wider">Hardware</span>
                <span className="text-white font-mono">{status.hardware_detected}</span>
              </div>
            )}

            <div className="border-t border-white/10 pt-2 flex flex-col gap-1">
              <span className="text-[10px] text-silver/50 uppercase tracking-wider">Modules</span>
              {Object.entries(status.modules).map(([mod, state]) => (
                <div key={mod} className="flex justify-between">
                  <span className="text-silver/60">{mod}</span>
                  <span className={state === "ok" ? "text-green-400" : "text-yellow-400"}>
                    {state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

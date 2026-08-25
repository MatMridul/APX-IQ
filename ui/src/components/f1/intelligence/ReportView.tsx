/**
 * ReportView — Displays a generated LapReport with markdown rendering
 */

"use client";

import { motion } from "framer-motion";
import { Zap, CheckCircle, Save, Loader2, Award, ChevronRight, Gauge } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Panel } from "@/components/f1/primitives/Panel";
import { Badge } from "@/components/f1/primitives/Badge";
import type { LapReport } from "@/lib/api/intelligence";

type MDProps = { children?: React.ReactNode };

const MD_COMPONENTS: Components = {
  h1: ({ children }: MDProps) => (
    <h1
      className="text-2xl font-black text-white tracking-wide mb-4 mt-6 flex items-center gap-2 border-b border-gold/30 pb-2"
      style={{ fontFamily: "var(--font-rajdhani)" }}
    >
      <span className="w-2 h-5 bg-gold rounded-sm inline-block" />
      {children}
    </h1>
  ),
  h2: ({ children }: MDProps) => (
    <h2
      className="text-lg font-bold text-gold uppercase tracking-wider mb-3 mt-6 flex items-center gap-2"
      style={{ fontFamily: "var(--font-rajdhani)" }}
    >
      <ChevronRight size={16} className="text-gold" />
      {children}
    </h2>
  ),
  h3: ({ children }: MDProps) => (
    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 mt-4 text-silver">
      {children}
    </h3>
  ),
  p: ({ children }: MDProps) => (
    <p className="text-silver/90 text-sm mb-4 leading-relaxed font-sans">{children}</p>
  ),
  hr: () => (
    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent my-6" />
  ),
  ul: ({ children }: MDProps) => (
    <ul className="space-y-2 mb-4 text-silver/90 text-sm">{children}</ul>
  ),
  li: ({ children }: MDProps) => (
    <li className="flex items-start gap-2 text-sm text-silver/90">
      <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0 shadow-[0_0_6px_rgba(207,163,73,0.8)]" />
      <div>{children}</div>
    </li>
  ),
  strong: ({ children }: MDProps) => (
    <strong className="text-gold font-bold">{children}</strong>
  ),
  code: ({ children }: MDProps) => (
    <code className="bg-gold/10 border border-gold/30 px-2 py-0.5 rounded text-gold font-mono text-xs">
      {children}
    </code>
  ),
  table: ({ children }: MDProps) => (
    <div className="w-full overflow-x-auto my-5 rounded-lg border border-gold/25 bg-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <table className="w-full text-left border-collapse text-xs font-mono">{children}</table>
    </div>
  ),
  thead: ({ children }: MDProps) => (
    <thead className="bg-white/5 border-b border-gold/30 text-gold font-bold tracking-wider uppercase text-[11px]">
      {children}
    </thead>
  ),
  tbody: ({ children }: MDProps) => (
    <tbody className="divide-y divide-white/5">{children}</tbody>
  ),
  tr: ({ children }: MDProps) => (
    <tr className="hover:bg-gold/[0.04] transition-colors">{children}</tr>
  ),
  th: ({ children }: MDProps) => (
    <th className="px-4 py-3 text-gold font-bold whitespace-nowrap">{children}</th>
  ),
  td: ({ children }: MDProps) => (
    <td className="px-4 py-3 text-silver/90 leading-normal">{children}</td>
  ),
  blockquote: ({ children }: MDProps) => (
    <blockquote className="border-l-2 border-gold bg-gold/5 px-4 py-2 my-4 text-xs text-silver/80 italic rounded-r">
      {children}
    </blockquote>
  ),
};

interface ReportViewProps {
  report:       LapReport;
  onSave:       () => void;
  isSaving?:    boolean;
  isStreaming?: boolean;
}

export function ReportView({ report, onSave, isSaving, isStreaming }: ReportViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
    >
      <Panel title={report.title}>
        {/* Header telemetry control bar */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold/10 border border-gold/30">
              <Zap size={13} className="text-gold" />
              <span className="text-xs font-mono text-gold font-bold">
                {report.generated_by.toUpperCase()}
              </span>
            </div>
            {isStreaming && (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> STREAMING REAL-TIME DEBRIEF
              </span>
            )}
          </div>
          <button
            onClick={onSave}
            disabled={isSaving || isStreaming}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gold text-black hover:bg-gold/90 disabled:opacity-50 font-bold rounded text-xs shadow-[0_0_12px_rgba(207,163,73,0.3)] transition-all"
          >
            {isSaving
              ? <><Loader2 size={12} className="animate-spin" /> SAVING...</>
              : <><Save size={12} /> SAVE REPORT</>}
          </button>
        </div>

        {/* Executive Summary Card */}
        <div className="mb-6 p-4 bg-gradient-to-br from-gold/10 to-transparent rounded-lg border border-gold/30 shadow-[0_0_15px_rgba(207,163,73,0.08)]">
          <div className="flex items-center gap-2 text-xs text-gold font-black mb-2 tracking-widest uppercase">
            <Award size={14} className="text-gold" />
            Executive Race Engineer Briefing
          </div>
          <p className="text-white text-sm leading-relaxed font-sans font-medium">{report.summary}</p>
        </div>

        {/* Key findings bullets */}
        {report.key_findings.length > 0 && (
          <div className="mb-6 bg-black/40 p-4 rounded-lg border border-white/10">
            <div className="text-[11px] text-silver/60 font-bold mb-3 tracking-widest uppercase flex items-center gap-1.5">
              <Gauge size={13} className="text-gold" />
              Critical Time Loss & Gain Factors
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {report.key_findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 bg-white/[0.02] p-2 rounded border border-white/5">
                  <CheckCircle size={14} className="text-gold mt-0.5 shrink-0" />
                  <span className="text-silver text-xs font-mono">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full markdown report with styled GFM tables */}
        <div className="border-t border-white/10 pt-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {report.markdown}
          </ReactMarkdown>
        </div>
      </Panel>
    </motion.div>
  );
}

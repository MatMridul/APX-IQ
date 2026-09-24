"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Gauge,
  Sparkles,
  Layers,
  Database,
  Sliders,
  Radio,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  Target,
  Wrench,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { soundFx } from "@/lib/cockpit/soundFx";

interface UserStory {
  id: string;
  role: string;
  badge: string;
  badgeColor: string;
  title: string;
  storyStatement: string;
  keyWorkflows: string[];
  primaryHref: string;
  primaryCta: string;
  icon: React.ElementType;
}

const USER_STORIES: UserStory[] = [
  {
    id: "driver",
    role: "SIM-RACER & ESPORTS DRIVER",
    badge: "60Hz LIVE DDU",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    title: "Zero-Latency In-Car Cockpit HUD & Voice Radio",
    storyStatement:
      "As a competitive sim racer, I want high-frequency 60Hz DDU instrumentation, progressive LED shift lights, and hands-free push-to-talk pit wall radio so I can monitor tire thermals and pace deltas without losing focus on track.",
    keyWorkflows: [
      "Sub-millisecond UDP 20777 frame decoding",
      "Tactile 10-pushbutton carbon fiber steering wheel",
      "Push-to-talk AI race engineer audio radio",
      "Dynamic purple/green sector split time delta",
    ],
    primaryHref: "/dashboard",
    primaryCta: "ENTER COCKPIT HUD",
    icon: Gauge,
  },
  {
    id: "engineer",
    role: "RACE TELEMETRY ENGINEER",
    badge: "FASTF1 API V2",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    title: "Official FIA FastF1 Ghost Benchmarking & Delta Slicing",
    storyStatement:
      "As a performance race engineer, I want to overlay my driver's throttle, braking, and steering telemetry against Max Verstappen's official pole lap using 1,000-point cubic spline spatial interpolation to identify apex time loss.",
    keyWorkflows: [
      "Max Verstappen & Lewis Hamilton official qualifying traces",
      "Corner-by-corner turn-in, apex, and exit delta matrices",
      "High-precision pedal dynamics profile comparison",
      "Multi-channel synchronized distance scrubbing",
    ],
    primaryHref: "/dashboard/intelligence",
    primaryCta: "LOAD FASTF1 BENCHMARKS",
    icon: Database,
  },
  {
    id: "dynamics",
    role: "VEHICLE DYNAMICS SPECIALIST",
    badge: "3D DIGITAL TWIN",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    title: "3D Spatial Aero Flow & Mechanical Setup Tuning",
    storyStatement:
      "As a vehicle dynamics engineer, I want to inspect live 3D aerodynamic particle streamlines, 4-corner tire thermal diffusion, and tweak front wing downforce and differential balance with instant lap time gain predictions.",
    keyWorkflows: [
      "Real-time Three.js WebGL 3D F1 chassis with aero particles",
      "Interactive 4-corner tire thermal heatmap HUD",
      "Exploded CAD mechanical assembly view",
      "Front wing, ARB, and brake bias setup sliders",
    ],
    primaryHref: "/dashboard/intelligence",
    primaryCta: "TUNE 3D DYNAMICS MATRIX",
    icon: Sliders,
  },
  {
    id: "strategist",
    role: "RACE STRATEGIST & TEAM PRINCIPAL",
    badge: "GEMINI 2.0 AI",
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    title: "Tire Degradation Crossover & AI Session Debriefs",
    storyStatement:
      "As a race strategist, I want predictive tire degradation curves, real-time undercut/overcut pit stop window triggers, and automated post-session AI debrief whitepapers to make winning tactical calls.",
    keyWorkflows: [
      "Stint degradation simulator with compound crossover",
      "Undercut & overcut pit window timing calculator",
      "AI-generated Markdown debrief whitepapers",
      "100% offline deterministic rule-safety guarantee",
    ],
    primaryHref: "/dashboard/intelligence",
    primaryCta: "SIMULATE RACE STRATEGY",
    icon: Sparkles,
  },
];

export function UserJourneyHub() {
  const [selectedStoryId, setSelectedStoryId] = useState<string>("driver");

  const active = USER_STORIES.find((s) => s.id === selectedStoryId) ?? USER_STORIES[0];
  const Icon = active.icon;

  return (
    <div className="w-full rounded-2xl bg-[#090A0E] border border-white/[0.12] p-5 sm:p-7 flex flex-col gap-6 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      
      {/* ── SECTION HEADER ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <Target size={18} />
          </div>
          <div>
            <h2 className="font-mono text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              MOTORSPORT PERSONAS &amp; INTERACTIVE USER STORIES
            </h2>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              Select a specialized motorsport discipline to explore its dedicated workflow
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl font-bold self-start sm:self-auto">
          4 INTEGRATED USER JOURNEYS
        </span>
      </div>

      {/* ── ROLE SELECTOR TABS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {USER_STORIES.map((s) => {
          const StoryIcon = s.icon;
          const isSelected = s.id === selectedStoryId;
          return (
            <button
              key={s.id}
              onClick={() => {
                soundFx.playButtonClick();
                setSelectedStoryId(s.id);
              }}
              className={cn(
                "p-3.5 rounded-xl border flex flex-col text-left justify-between gap-3 transition-all cursor-pointer group",
                isSelected
                  ? "bg-amber-500/10 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  : "bg-black/50 border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-[9px] font-bold text-neutral-400 tracking-wider">
                  {s.role}
                </span>
                <StoryIcon
                  size={16}
                  className={isSelected ? "text-amber-400 animate-pulse" : "text-neutral-500 group-hover:text-neutral-300"}
                />
              </div>
              <span className="font-mono text-xs font-bold text-white leading-snug">
                {s.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── ACTIVE STORY SPOTLIGHT DISPLAY ───────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-black/70 border border-white/[0.08] shadow-inner flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-4 flex-1">
          {/* Badge & Role */}
          <div className="flex items-center gap-3">
            <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded border ${active.badgeColor}`}>
              {active.badge}
            </span>
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
              {active.role}
            </span>
          </div>

          {/* Story Statement */}
          <blockquote className="text-sm sm:text-base text-neutral-200 leading-relaxed font-sans border-l-2 border-amber-400 pl-4 italic">
            &ldquo;{active.storyStatement}&rdquo;
          </blockquote>

          {/* Key Workflows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {active.keyWorkflows.map((w, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 font-mono text-[11px] text-neutral-300 bg-neutral-900/80 px-3 py-1.5 rounded-lg border border-white/[0.04]"
              >
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-2 shrink-0 self-stretch sm:self-auto justify-center">
          <Link
            href={active.primaryHref}
            className="px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-mono text-xs font-black tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
          >
            <Icon size={16} />
            <span>{active.primaryCta}</span>
            <ArrowRight size={15} />
          </Link>
          <span className="text-[9px] font-mono text-neutral-400 text-center uppercase font-semibold">
            INSTANT LAUNCH WORKSTATION
          </span>
        </div>
      </div>
    </div>
  );
}

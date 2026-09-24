"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, Cpu, Zap, Flame, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useUxStore } from "@/store/uxStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { cn } from "@/lib/utils";

interface ComponentCardProps {
  label: string;
  fullName: string;
  wear: number;
  poolLimit: string;
  description: string;
  icon: React.ReactNode;
}

function ComponentCard({ label, fullName, wear, poolLimit, description, icon }: ComponentCardProps) {
  // Wear color tiering: Green (<40%), Amber (40-70%), Crimson (>70%)
  const isCritical = wear >= 70;
  const isWarning = wear >= 40 && wear < 70;
  const statusColor = isCritical
    ? "text-red-400 bg-red-500/10 border-red-500/30"
    : isWarning
    ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
    : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

  const barColor = isCritical ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : isWarning ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]" : "bg-emerald-500 shadow-[0_0_10px_#10b981]";

  return (
    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gold">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">{label}</span>
              <span className="text-[10px] text-neutral-400 font-mono">({poolLimit})</span>
            </div>
            <div className="text-[10px] text-neutral-400 truncate max-w-[170px]">{fullName}</div>
          </div>
        </div>

        <div className={cn("px-2 py-0.5 rounded text-xs font-mono font-bold border", statusColor)}>
          {wear}%
        </div>
      </div>

      <div>
        <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden mb-1.5">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${Math.min(100, Math.max(0, wear))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] text-neutral-400">
          <span>{description}</span>
          <span className={cn("font-bold", isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400")}>
            {isCritical ? "CRITICAL WEAR" : isWarning ? "ELEVATED DEGRADE" : "NOMINAL"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PUComponentModal() {
  const isOpen = useUxStore((s) => s.isPuModalOpen);
  const close = useUxStore((s) => s.closePuModal);
  const carDamage = useTelemetryStore((s) => s.carDamage);
  const carStatus = useTelemetryStore((s) => s.carStatus);

  if (!isOpen) return null;

  // Real UDP packet 10 values with fallback to nominal values
  const ice = carDamage?.engineICEWear ?? 14;
  const tc = carDamage?.engineTCWear ?? 18;
  const mguk = carDamage?.engineMGUKWear ?? 11;
  const mguh = carDamage?.engineMGUHWear ?? 22;
  const es = carDamage?.engineESWear ?? 9;
  const ce = carDamage?.engineCEWear ?? 12;
  const gearbox = carDamage?.gearboxDamage ?? 8;
  const engineDamage = carDamage?.engineDamage ?? 0;

  const drsFault = carDamage?.drsFault ?? false;
  const ersFault = carDamage?.ersFault ?? false;
  const engineBlown = carDamage?.engineBlown ?? false;
  const engineSeized = carDamage?.engineSeized ?? false;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          className="relative w-full max-w-4xl rounded-2xl border border-gold/40 bg-neutral-950 p-6 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_25px_rgba(207,163,73,0.15)] select-none text-white font-mono flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gold/15 border border-gold/30 text-gold">
                <Cpu size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-wider text-white">
                    POWER UNIT & MECHANICAL RELIABILITY
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold/20 text-gold border border-gold/40">
                    PACKET 10 TELEMETRY
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  FIA 1.6L V6 Turbocharged Hybrid Architecture Diagnostics
                </div>
              </div>
            </div>

            <button
              onClick={close}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              ✕ ESC
            </button>
          </div>

          {/* Fault & Warning Annunciators Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className={cn(
              "p-2.5 rounded-xl border flex items-center justify-between text-xs",
              drsFault ? "bg-red-500/20 border-red-500/50 text-red-300" : "bg-neutral-900/60 border-white/5 text-neutral-400"
            )}>
              <span className="font-bold">DRS ACTUATOR</span>
              {drsFault ? (
                <span className="flex items-center gap-1 font-black text-red-400 animate-pulse">
                  <AlertTriangle size={13} /> FAULT
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                  <CheckCircle2 size={13} /> ARMED
                </span>
              )}
            </div>

            <div className={cn(
              "p-2.5 rounded-xl border flex items-center justify-between text-xs",
              ersFault ? "bg-red-500/20 border-red-500/50 text-red-300" : "bg-neutral-900/60 border-white/5 text-neutral-400"
            )}>
              <span className="font-bold">ERS DEPLOY</span>
              {ersFault ? (
                <span className="flex items-center gap-1 font-black text-red-400 animate-pulse">
                  <AlertTriangle size={13} /> FAULT
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                  <CheckCircle2 size={13} /> OPTIMAL
                </span>
              )}
            </div>

            <div className={cn(
              "p-2.5 rounded-xl border flex items-center justify-between text-xs",
              engineBlown ? "bg-red-950 border-red-500 text-red-200 animate-pulse" : "bg-neutral-900/60 border-white/5 text-neutral-400"
            )}>
              <span className="font-bold">BLOWN ENGINE</span>
              {engineBlown ? (
                <span className="flex items-center gap-1 font-black text-red-400">
                  <ShieldAlert size={13} /> BLOWN
                </span>
              ) : (
                <span className="text-emerald-400 text-[10px]">SAFE</span>
              )}
            </div>

            <div className={cn(
              "p-2.5 rounded-xl border flex items-center justify-between text-xs",
              engineSeized ? "bg-red-950 border-red-500 text-red-200 animate-pulse" : "bg-neutral-900/60 border-white/5 text-neutral-400"
            )}>
              <span className="font-bold">SEIZED MOTOR</span>
              {engineSeized ? (
                <span className="flex items-center gap-1 font-black text-red-400">
                  <ShieldAlert size={13} /> SEIZED
                </span>
              ) : (
                <span className="text-emerald-400 text-[10px]">SAFE</span>
              )}
            </div>
          </div>

          {/* 6-Core PU Component Reliability Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <ComponentCard
              label="ICE"
              fullName="Internal Combustion Engine"
              wear={ice}
              poolLimit="Pool: 2/4"
              description="Piston rings, cylinder lining, crankshaft"
              icon={<Flame size={16} />}
            />
            <ComponentCard
              label="TC"
              fullName="Turbocharger"
              wear={tc}
              poolLimit="Pool: 2/4"
              description="Compressor turbine, bearings, shaft spool"
              icon={<Activity size={16} />}
            />
            <ComponentCard
              label="MGU-K"
              fullName="Motor Generator Unit - Kinetic"
              wear={mguk}
              poolLimit="Pool: 2/4"
              description="120kW recovery rotor & regenerative stator"
              icon={<Zap size={16} />}
            />
            <ComponentCard
              label="MGU-H"
              fullName="Motor Generator Unit - Heat"
              wear={mguh}
              poolLimit="Pool: 2/4"
              description="100k RPM exhaust gas energy harvest"
              icon={<Activity size={16} />}
            />
            <ComponentCard
              label="ES"
              fullName="Energy Store (Battery)"
              wear={es}
              poolLimit="Pool: 1/2"
              description="4MJ/lap lithium-ion pack cell health"
              icon={<Zap size={16} />}
            />
            <ComponentCard
              label="CE"
              fullName="Control Electronics"
              wear={ce}
              poolLimit="Pool: 1/2"
              description="High-voltage inverters, CAN bus sensors"
              icon={<Cpu size={16} />}
            />
          </div>

          {/* Drivetrain & Ancillary Transmissions */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-silver">
                <Activity size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">8-Speed Quick-Shift Seamless Gearbox</div>
                <div className="text-[11px] text-neutral-400">
                  Dog-rings, bevel gears, hydraulic shift forks & differential lock
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="text-right">
                <div className="text-xs text-neutral-400">Drivetrain Wear</div>
                <div className={cn("text-base font-bold", gearbox > 50 ? "text-red-400" : gearbox > 25 ? "text-amber-400" : "text-emerald-400")}>
                  {gearbox}% Damage
                </div>
              </div>

              <div className="text-right pl-4 border-l border-white/10">
                <div className="text-xs text-neutral-400">Total PU Health</div>
                <div className="text-base font-bold text-gold">
                  {Math.max(0, 100 - engineDamage)}%
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

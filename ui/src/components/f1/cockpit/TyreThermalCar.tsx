/**
 * TyreThermalCar — 4-Corner Decoupled Thermal & Brake Chassis Visualization
 * Displays decoupled Surface (T_surf) vs Core (T_inner) tyre temperatures,
 * incandescent brake rotor heat rings, and dynamic thermal hazard glow.
 */

"use client";

import React from "react";
import { AlertTriangle, Disc } from "lucide-react";
import { cn } from "@/lib/utils";

interface TyreData {
  surfaceTemp: number;
  innerTemp: number;
  brakeTemp: number;
  pressurePsi?: number;
}

interface TyreThermalCarProps {
  tyres?: {
    fl: TyreData;
    fr: TyreData;
    rl: TyreData;
    rr: TyreData;
  };
  brakeBiasPercent?: number;
  className?: string;
}

export const TyreThermalCar: React.FC<TyreThermalCarProps> = ({
  tyres = {
    fl: { surfaceTemp: 94, innerTemp: 102, brakeTemp: 780, pressurePsi: 23.5 },
    fr: { surfaceTemp: 96, innerTemp: 104, brakeTemp: 812, pressurePsi: 23.6 },
    rl: { surfaceTemp: 98, innerTemp: 108, brakeTemp: 650, pressurePsi: 21.8 },
    rr: { surfaceTemp: 101, innerTemp: 111, brakeTemp: 678, pressurePsi: 22.0 },
  },
  brakeBiasPercent = 58.0,
  className,
}) => {
  // Helper to colorize tyre temperatures
  const getTempColor = (surf: number, inner: number) => {
    // Overheated core
    if (inner > 108 || surf > 115) return "text-red-400 border-red-500/50 bg-red-950/40";
    // Optimal window (90°C - 105°C)
    if (surf >= 85 && surf <= 105) return "text-emerald-400 border-emerald-500/50 bg-emerald-950/40";
    // Cold (< 85°C)
    return "text-cyan-400 border-cyan-500/50 bg-cyan-950/40";
  };

  // Helper to get brake disc incandescent glow style
  const getBrakeDiscGlow = (temp: number) => {
    if (temp > 800) {
      return "border-amber-500 bg-gradient-to-r from-amber-500/40 to-red-600/40 shadow-[0_0_18px_#FF6D00]";
    }
    if (temp > 600) {
      return "border-amber-600/70 bg-gradient-to-r from-amber-600/30 to-amber-700/20 shadow-[0_0_12px_#FF9100]";
    }
    return "border-zinc-700 bg-zinc-900/60";
  };

  const renderWheelPod = (label: "FL" | "FR" | "RL" | "RR", data: TyreData, align: "left" | "right") => {
    const isGraining = data.surfaceTemp - data.innerTemp > 12 && data.surfaceTemp > 104;
    const isBlistering = data.innerTemp > 108;

    return (
      <div className={cn("flex flex-col gap-1.5 font-mono", align === "right" ? "items-end text-right" : "items-start text-left")}>
        {/* Label & Temps */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-black text-gold uppercase tracking-wider">{label}</span>
          {(isGraining || isBlistering) && (
            <AlertTriangle size={11} className="text-amber-400 animate-pulse" />
          )}
        </div>

        {/* Dual Temperature Readout: Surface / Carcass */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1 text-xs">
            <span className="text-white font-bold">{Math.round(data.surfaceTemp)}°</span>
            <span className="text-silver/40">/</span>
            <span className="text-silver/70 font-semibold">{Math.round(data.innerTemp)}°C</span>
          </div>
          <span className="text-[9px] text-silver/40 uppercase tracking-tighter">SURF / CORE</span>
        </div>

        {/* Brake Disc Glow Ring & Temperature */}
        <div className={cn("flex items-center gap-2 mt-1", align === "right" ? "flex-row-reverse" : "flex-row")}>
          <div
            className={cn(
              "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              getBrakeDiscGlow(data.brakeTemp)
            )}
          >
            <div className="w-2 h-2 rounded-full bg-white/40" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xs font-bold text-amber-400">{Math.round(data.brakeTemp)}°C</span>
            <span className="text-[9px] text-silver/40 uppercase">ROTOR</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative rounded-3xl p-4 bg-gradient-to-b from-[#121215] to-[#08080A] border border-white/10 shadow-[0_0_25px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden",
        className
      )}
    >
      {/* Carbon fiber texture */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#CFA349_0.5px,transparent_0.5px)] [background-size:10px_10px]" />

      {/* ── TOP: Header Title ────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-[11px] font-black text-gold uppercase tracking-widest font-mono">
            4-CORNER THERMAL & BRAKE DISSOCIATION
          </span>
        </div>
        <span className="text-[10px] font-mono text-silver/50 uppercase">PIRELLI P-ZERO</span>
      </div>

      {/* ── CENTER: Car Skeleton Layout (Left Pods | SVG Car | Right Pods) ── */}
      <div className="relative z-10 grid grid-cols-12 items-center my-auto py-2">
        
        {/* Left Wheels: Front Left (FL) & Rear Left (RL) */}
        <div className="col-span-3 flex flex-col justify-between h-56 py-2">
          {renderWheelPod("FL", tyres.fl, "left")}
          {renderWheelPod("RL", tyres.rl, "left")}
        </div>

        {/* Center: Stylized Formula 1 Car SVG Silhouette in Champagne Gold */}
        <div className="col-span-6 flex items-center justify-center relative">
          <svg viewBox="0 0 200 400" className="w-40 h-56 drop-shadow-[0_0_15px_rgba(207,163,73,0.25)]">
            {/* Front Wing */}
            <path d="M 20 40 L 180 40 L 170 60 L 30 60 Z" fill="#CFA349" fillOpacity="0.8" stroke="#FFFFFF" strokeWidth="1" />
            <path d="M 10 35 L 30 65 L 15 65 Z" fill="#E10600" />
            <path d="M 190 35 L 170 65 L 185 65 Z" fill="#E10600" />
            
            {/* Nosecone */}
            <path d="M 85 45 L 115 45 L 110 130 L 90 130 Z" fill="#E5B95C" stroke="#FFFFFF" strokeWidth="0.5" />
            
            {/* Front Suspension Arms */}
            <line x1="88" y1="95" x2="35" y2="85" stroke="#888888" strokeWidth="2" />
            <line x1="88" y1="105" x2="35" y2="105" stroke="#888888" strokeWidth="2" />
            <line x1="112" y1="95" x2="165" y2="85" stroke="#888888" strokeWidth="2" />
            <line x1="112" y1="105" x2="165" y2="105" stroke="#888888" strokeWidth="2" />

            {/* Front Wheels */}
            <rect x="18" y="65" width="22" height="55" rx="5" fill="#151515" stroke="#CFA349" strokeWidth="1.5" />
            <rect x="160" y="65" width="22" height="55" rx="5" fill="#151515" stroke="#CFA349" strokeWidth="1.5" />

            {/* Cockpit & Halo */}
            <path d="M 70 130 Q 100 120 130 130 L 140 250 L 60 250 Z" fill="#18181C" stroke="#CFA349" strokeWidth="1" />
            <path d="M 85 145 Q 100 135 115 145 L 110 200 L 90 200 Z" fill="#050505" stroke="#FFFFFF" strokeWidth="0.5" />
            <ellipse cx="100" cy="180" rx="8" ry="10" fill="#E10600" />

            {/* Sidepods & Engine Cover */}
            <path d="M 55 170 L 45 240 L 75 290 L 125 290 L 155 240 L 145 170 Z" fill="#CFA349" fillOpacity="0.75" />

            {/* Rear Suspension Arms */}
            <line x1="75" y1="300" x2="35" y2="310" stroke="#888888" strokeWidth="2" />
            <line x1="75" y1="320" x2="35" y2="330" stroke="#888888" strokeWidth="2" />
            <line x1="125" y1="300" x2="165" y2="310" stroke="#888888" strokeWidth="2" />
            <line x1="125" y1="320" x2="165" y2="330" stroke="#888888" strokeWidth="2" />

            {/* Rear Wheels */}
            <rect x="15" y="295" width="26" height="65" rx="6" fill="#151515" stroke="#CFA349" strokeWidth="1.5" />
            <rect x="159" y="295" width="26" height="65" rx="6" fill="#151515" stroke="#CFA349" strokeWidth="1.5" />

            {/* Rear Wing */}
            <rect x="40" y="360" width="120" height="22" rx="3" fill="#E10600" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="100" y1="340" x2="100" y2="375" stroke="#CFA349" strokeWidth="3" />
          </svg>
        </div>

        {/* Right Wheels: Front Right (FR) & Rear Right (RR) */}
        <div className="col-span-3 flex flex-col justify-between h-56 py-2">
          {renderWheelPod("FR", tyres.fr, "right")}
          {renderWheelPod("RR", tyres.rr, "right")}
        </div>
      </div>

      {/* ── BOTTOM: Tyre Pressure Bars & Brake Bias Balance ───────────────── */}
      <div className="relative z-10 grid grid-cols-2 gap-3 pt-3 border-t border-white/10 font-mono text-xs">
        
        {/* Tyre Pressures */}
        <div className="flex flex-col gap-1 p-2 bg-black/40 rounded-lg border border-white/5">
          <div className="flex justify-between text-[10px] text-silver/50 uppercase font-bold">
            <span>TYRE PRESS (PSI)</span>
            <span className="text-emerald-400">OPTIMAL</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-bold text-white">
            <span>F: {tyres.fl.pressurePsi?.toFixed(1) ?? "23.5"}</span>
            <span>R: {tyres.rl.pressurePsi?.toFixed(1) ?? "21.8"}</span>
          </div>
        </div>

        {/* Brake Bias Slider */}
        <div className="flex flex-col gap-1 p-2 bg-black/40 rounded-lg border border-white/5">
          <div className="flex justify-between text-[10px] text-silver/50 uppercase font-bold">
            <span>BRAKE BIAS</span>
            <span className="text-gold font-bold">{brakeBiasPercent.toFixed(1)}%</span>
          </div>
          {/* Bias Bar with slider indicator */}
          <div className="w-full h-2 bg-zinc-800 rounded-full relative overflow-hidden mt-1">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-gold rounded-full"
              style={{ width: `${brakeBiasPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

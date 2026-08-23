/**
 * RaceCarTelemetry — Phase 2A: Race Car + Wheel Telemetry Instrument
 *
 * Geometry: Fits within the CAR & WHEEL region (x: 6.7%, y: 15.0%, w: 20.8%, h: 65.4%)
 * Visual: Compact top-down metallic champagne gold Formula 1 chassis,
 * 4 decoupled wheels with glowing incandescent brake rotor rings and thermal readouts.
 */

"use client";

import React from "react";

export const RaceCarTelemetry: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between select-none">
      
      {/* ── SVG LAYER: Formula 1 Chassis & Glowing Rotor Rings ────────────── */}
      <svg
        viewBox="0 0 300 480"
        className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(0,0,0,0.9)]"
      >
        <defs>
          {/* Metallic Gold Body Gradient */}
          <linearGradient id="goldCarBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#99783D" />
            <stop offset="25%" stopColor="#D8BE7A" />
            <stop offset="50%" stopColor="#FFF1BE" />
            <stop offset="75%" stopColor="#D8BE7A" />
            <stop offset="100%" stopColor="#99783D" />
          </linearGradient>

          {/* Dark Carbon Aero Gradient */}
          <linearGradient id="carbonAero" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#25252A" />
            <stop offset="100%" stopColor="#101014" />
          </linearGradient>

          {/* Incandescent Brake Rotor Glow Radial Gradient */}
          <radialGradient id="brakeGlowHot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF4500" stopOpacity="1" />
            <stop offset="50%" stopColor="#FF8C00" stopOpacity="0.8" />
            <stop offset="85%" stopColor="#FF3B00" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF1E00" stopOpacity="0" />
          </radialGradient>

          {/* Glowing Rotor Disc Radial */}
          <radialGradient id="rotorDiscGlow" cx="50%" cy="50%" r="50%">
            <stop offset="20%" stopColor="#1A1A1D" />
            <stop offset="60%" stopColor="#FF6B00" />
            <stop offset="90%" stopColor="#FF2A00" />
            <stop offset="100%" stopColor="#FF8C00" />
          </radialGradient>

          {/* Rotor Glow Filter */}
          <filter id="rotorNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── 4 WHEELS (TYRES) & BRAKE ROTOR RINGS ──────────────────────────── */}

        {/* FRONT LEFT (FL) */}
        <g id="wheel-fl">
          {/* Tyre */}
          <rect x="52" y="78" width="22" height="64" rx="4" fill="#141416" stroke="#2D2D32" strokeWidth="1.5" />
          {/* Glowing Incandescent Brake Rotor Ring */}
          <circle cx="28" cy="110" r="16" fill="url(#rotorDiscGlow)" stroke="#FF8C00" strokeWidth="1.5" filter="url(#rotorNeonGlow)" />
          <circle cx="28" cy="110" r="10" fill="#0C0C0E" stroke="#FF4500" strokeWidth="1" />
          <circle cx="28" cy="110" r="4" fill="#FF8C00" />
        </g>

        {/* FRONT RIGHT (FR) */}
        <g id="wheel-fr">
          {/* Tyre */}
          <rect x="226" y="78" width="22" height="64" rx="4" fill="#141416" stroke="#2D2D32" strokeWidth="1.5" />
          {/* Glowing Incandescent Brake Rotor Ring */}
          <circle cx="272" cy="110" r="16" fill="url(#rotorDiscGlow)" stroke="#FF8C00" strokeWidth="1.5" filter="url(#rotorNeonGlow)" />
          <circle cx="272" cy="110" r="10" fill="#0C0C0E" stroke="#FF4500" strokeWidth="1" />
          <circle cx="272" cy="110" r="4" fill="#FF8C00" />
        </g>

        {/* REAR LEFT (RL) */}
        <g id="wheel-rl">
          {/* Tyre */}
          <rect x="48" y="322" width="26" height="74" rx="5" fill="#141416" stroke="#2D2D32" strokeWidth="1.5" />
          {/* Glowing Incandescent Brake Rotor Ring */}
          <circle cx="28" cy="359" r="16" fill="url(#rotorDiscGlow)" stroke="#FF7700" strokeWidth="1.5" filter="url(#rotorNeonGlow)" />
          <circle cx="28" cy="359" r="10" fill="#0C0C0E" stroke="#FF3B00" strokeWidth="1" />
          <circle cx="28" cy="359" r="4" fill="#FF7700" />
        </g>

        {/* REAR RIGHT (RR) */}
        <g id="wheel-rr">
          {/* Tyre */}
          <rect x="226" y="322" width="26" height="74" rx="5" fill="#141416" stroke="#2D2D32" strokeWidth="1.5" />
          {/* Glowing Incandescent Brake Rotor Ring */}
          <circle cx="272" cy="359" r="16" fill="url(#rotorDiscGlow)" stroke="#FF7700" strokeWidth="1.5" filter="url(#rotorNeonGlow)" />
          <circle cx="272" cy="359" r="10" fill="#0C0C0E" stroke="#FF3B00" strokeWidth="1" />
          <circle cx="272" cy="359" r="4" fill="#FF7700" />
        </g>

        {/* ── SUSPENSION WISHBONES ─────────────────────────────────────────── */}
        <g stroke="#606068" strokeWidth="1.5" opacity="0.85">
          {/* Front Left Wishbones */}
          <line x1="130" y1="100" x2="74" y2="92" />
          <line x1="130" y1="120" x2="74" y2="124" />
          {/* Front Right Wishbones */}
          <line x1="170" y1="100" x2="226" y2="92" />
          <line x1="170" y1="120" x2="226" y2="124" />
          {/* Rear Left Wishbones */}
          <line x1="124" y1="345" x2="74" y2="352" />
          <line x1="124" y1="375" x2="74" y2="380" />
          {/* Rear Right Wishbones */}
          <line x1="176" y1="345" x2="226" y2="352" />
          <line x1="176" y1="375" x2="226" y2="380" />
        </g>

        {/* ── FORMULA 1 CAR CHASSIS ────────────────────────────────────────── */}

        {/* Front Wing Assembly */}
        <g id="front-wing">
          <path
            d="M 50 48 L 250 48 L 244 68 L 56 68 Z"
            fill="url(#carbonAero)"
            stroke="#B7A06A"
            strokeWidth="0.75"
          />
          {/* Wing Flaps */}
          <path d="M 60 52 L 240 52 L 236 62 L 64 62 Z" fill="#1C1C20" />
          {/* Endplates */}
          <rect x="46" y="42" width="6" height="30" rx="1.5" fill="#B7A06A" />
          <rect x="248" y="42" width="6" height="30" rx="1.5" fill="#B7A06A" />
          {/* Nosecone Attachment */}
          <polygon points="144,48 156,48 153,68 147,68" fill="#B7A06A" />
        </g>

        {/* Nosecone & Forward Monocoque */}
        <path
          d="M 143 55 L 157 55 L 164 150 L 136 150 Z"
          fill="url(#goldCarBody)"
          stroke="#EAD196"
          strokeWidth="0.5"
        />

        {/* Cockpit Surround & Halo Structure */}
        <path
          d="M 120 150 Q 150 140 180 150 L 194 285 L 106 285 Z"
          fill="url(#goldCarBody)"
          stroke="#554420"
          strokeWidth="0.5"
        />

        {/* Halo Strut & Opening */}
        <path
          d="M 134 165 Q 150 155 166 165 L 160 225 L 140 225 Z"
          fill="#101014"
          stroke="#000000"
          strokeWidth="1"
        />
        {/* Driver Helmet (Muted Champagne) */}
        <ellipse cx="150" cy="205" rx="8" ry="11" fill="#C5A059" stroke="#1A1A1E" strokeWidth="1" />
        <path d="M 144 200 L 156 200 L 155 204 L 145 204 Z" fill="#101012" />

        {/* Sidepods & Aerodynamic Inlets */}
        <path
          d="M 106 175 L 86 215 L 106 315 L 194 315 L 214 215 L 194 175 Z"
          fill="url(#goldCarBody)"
          stroke="#8A6E30"
          strokeWidth="0.75"
        />
        {/* Sidepod Radiator Air Intakes (Black) */}
        <polygon points="90,195 106,182 106,230 92,238" fill="#0C0C0E" stroke="#252528" strokeWidth="0.5" />
        <polygon points="210,195 194,182 194,230 208,238" fill="#0C0C0E" stroke="#252528" strokeWidth="0.5" />

        {/* Engine Cover & Shark Fin */}
        <path
          d="M 136 225 L 164 225 L 158 375 L 142 375 Z"
          fill="url(#carbonAero)"
          stroke="#B7A06A"
          strokeWidth="0.5"
        />
        {/* Dorsal Fin Line */}
        <line x1="150" y1="230" x2="150" y2="370" stroke="#B7A06A" strokeWidth="1" opacity="0.8" />

        {/* Rear Wing Assembly */}
        <g id="rear-wing">
          <rect x="74" y="395" width="152" height="24" rx="2" fill="url(#carbonAero)" stroke="#B7A06A" strokeWidth="0.75" />
          <rect x="84" y="401" width="132" height="12" rx="1" fill="#101012" />
          {/* Endplates */}
          <rect x="70" y="388" width="6" height="38" rx="1" fill="#B7A06A" />
          <rect x="224" y="388" width="6" height="38" rx="1" fill="#B7A06A" />
          {/* Rear Wing Pylons */}
          <line x1="138" y1="375" x2="138" y2="400" stroke="#77777F" strokeWidth="2" />
          <line x1="162" y1="375" x2="162" y2="400" stroke="#77777F" strokeWidth="2" />
        </g>
      </svg>

      {/* ── HTML OVERLAY: 4-CORNER THERMAL & BRAKE TEXT LABELS ────────────── */}

      {/* FRONT LEFT (FL) TEXT */}
      <div className="absolute top-[2%] left-[-4%] flex flex-col font-mono text-[9px] leading-tight pointer-events-none">
        <span className="font-bold text-white uppercase text-[10px]">FL</span>
        <span className="text-silver/80 font-semibold">94°C / 102°C</span>
      </div>
      <div className="absolute top-[26%] left-[-4%] flex flex-col font-mono text-[9px] leading-tight pointer-events-none">
        <span className="font-bold text-white uppercase text-[10px]">FL</span>
        <span className="text-amber-400 font-bold text-[10px]">780°C</span>
      </div>

      {/* FRONT RIGHT (FR) TEXT */}
      <div className="absolute top-[2%] right-[-4%] flex flex-col items-end text-right font-mono text-[9px] leading-tight pointer-events-none">
        <span className="font-bold text-white uppercase text-[10px]">FR</span>
        <span className="text-silver/80 font-semibold">96°C / 104°C</span>
      </div>
      <div className="absolute top-[26%] right-[-4%] flex flex-col items-end text-right font-mono text-[9px] leading-tight pointer-events-none">
        <span className="font-bold text-white uppercase text-[10px]">FR</span>
        <span className="text-amber-400 font-bold text-[10px]">812°C</span>
      </div>

      {/* REAR LEFT (RL) TEXT */}
      <div className="absolute top-[54%] left-[-4%] flex flex-col font-mono text-[9px] leading-tight pointer-events-none">
        <span className="font-bold text-white uppercase text-[10px]">RL</span>
        <span className="text-silver/80 font-semibold">98°C / 108°C</span>
      </div>
      <div className="absolute top-[78%] left-[-4%] flex flex-col font-mono text-[9px] leading-tight pointer-events-none">
        <span className="font-bold text-white uppercase text-[10px]">RL</span>
        <span className="text-amber-400 font-bold text-[10px]">650°C</span>
      </div>

      {/* REAR RIGHT (RR) TEXT */}
      <div className="absolute top-[54%] right-[-4%] flex flex-col items-end text-right font-mono text-[9px] leading-tight pointer-events-none">
        <span className="font-bold text-white uppercase text-[10px]">RR</span>
        <span className="text-silver/80 font-semibold">101°C / 111°C</span>
      </div>
      <div className="absolute top-[78%] right-[-4%] flex flex-col items-end text-right font-mono text-[9px] leading-tight pointer-events-none">
        <span className="font-bold text-white uppercase text-[10px]">RR</span>
        <span className="text-amber-400 font-bold text-[10px]">678°C</span>
      </div>

    </div>
  );
};

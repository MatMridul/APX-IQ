/**
 * RaceCarTelemetry — Phase 2A Reconstruction (Iteration 3 / Final)
 *
 * Reference: Nano Banana APX IQ cockpit visualization
 *
 * Visual character: engineering instrumentation schematic
 * — predominantly dark carbon chassis
 * — selective gold on exposed top-panel edges and wing endplates
 * — restrained amber thermal glow inside tyre bodies only
 * — unified wide monocoque+sidepod form (not two separate pods)
 * — compact telemetry labels: one block per corner, monospace
 *
 * viewBox: 0 0 220 450
 * Car: y:10..440. Labels sit outside car body in SVG coordinate space.
 */

"use client";

import React from "react";

export const RaceCarTelemetry: React.FC = () => {
  return (
    <div className="relative w-full h-full select-none">
      <svg
        viewBox="0 0 220 450"
        className="w-full h-full overflow-visible"
        style={{ filter: "drop-shadow(0 2px 18px rgba(0,0,0,0.97))" }}
      >
        <defs>
          {/* ══ Gradients ═══════════════════════════════════════════════════ */}

          {/* Carbon main — near-black with very subtle central warmth */}
          <linearGradient id="c_carbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#090909" />
            <stop offset="40%"  stopColor="#14120F" />
            <stop offset="50%"  stopColor="#1A1712" />
            <stop offset="60%"  stopColor="#14120F" />
            <stop offset="100%" stopColor="#090909" />
          </linearGradient>

          {/* Gold top-lit surface — for nose and cockpit shoulder panels */}
          <linearGradient id="c_goldTop" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#4A3010" />
            <stop offset="20%"  stopColor="#A07020" />
            <stop offset="50%"  stopColor="#C89030" />
            <stop offset="80%"  stopColor="#A07020" />
            <stop offset="100%" stopColor="#4A3010" />
          </linearGradient>

          {/* Wing surfaces — almost-black, tiny warm tint */}
          <linearGradient id="c_wing" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stopColor="#161410" />
            <stop offset="100%" stopColor="#090909" />
          </linearGradient>

          {/* Body lateral — almost entirely dark carbon, only thin gold edge accent */}
          <linearGradient id="c_bodyL" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#0A0908" />
            <stop offset="3%"   stopColor="#7A5818" />
            <stop offset="10%"  stopColor="#1A1810" />
            <stop offset="100%" stopColor="#100E0C" />
          </linearGradient>
          <linearGradient id="c_bodyR" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%"   stopColor="#0A0908" />
            <stop offset="3%"   stopColor="#7A5818" />
            <stop offset="10%"  stopColor="#1A1810" />
            <stop offset="100%" stopColor="#100E0C" />
          </linearGradient>

          {/* Nosecone — gold → dark, top-lit */}
          <linearGradient id="c_nose" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stopColor="#BF8C28" />
            <stop offset="30%" stopColor="#7A5218" />
            <stop offset="100%" stopColor="#141210" />
          </linearGradient>

          {/* Tyre rubber */}
          <radialGradient id="t_front" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1C1810" />
            <stop offset="55%"  stopColor="#0E0E0E" />
            <stop offset="100%" stopColor="#070707" />
          </radialGradient>
          <radialGradient id="t_rear" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1E1A10" />
            <stop offset="55%"  stopColor="#0E0E0E" />
            <stop offset="100%" stopColor="#070707" />
          </radialGradient>

          {/* Thermal brake glow — front hot (780/812°C) */}
          <radialGradient id="g_frontHot" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FF8800" stopOpacity="0.92" />
            <stop offset="30%"  stopColor="#CC5000" stopOpacity="0.60" />
            <stop offset="60%"  stopColor="#802800" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0"   />
          </radialGradient>

          {/* Thermal brake glow — rear medium (650/678°C) */}
          <radialGradient id="g_rearMed" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#E06800" stopOpacity="0.75" />
            <stop offset="30%"  stopColor="#A03800" stopOpacity="0.44" />
            <stop offset="60%"  stopColor="#601800" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0"   />
          </radialGradient>

          {/* Hub */}
          <radialGradient id="t_hub" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#2A2418" />
            <stop offset="100%" stopColor="#0C0A08" />
          </radialGradient>

          {/* Soft bloom behind hot tyre (external halo) */}
          <filter id="f_bloom" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>

          {/* Inner glow (tyre glow composite) */}
          <filter id="f_inner" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* ─── Ambient bloom behind hot tyres ──────────────────────────── */}
        <ellipse cx="34"  cy="114" rx="22" ry="30" fill="#FF6000" opacity="0.12" filter="url(#f_bloom)" />
        <ellipse cx="186" cy="114" rx="22" ry="30" fill="#FF6800" opacity="0.14" filter="url(#f_bloom)" />
        <ellipse cx="31"  cy="355" rx="26" ry="34" fill="#E04800" opacity="0.09" filter="url(#f_bloom)" />
        <ellipse cx="189" cy="355" rx="26" ry="34" fill="#E05000" opacity="0.10" filter="url(#f_bloom)" />

        {/* ════════════════════════════════════════════════════════════════
            FRONT WING  (top of car, y:20..50)
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="front-wing">
          {/* Main blade — wide, thin, spans x:14..206 */}
          <path d="M 15 30 L 205 30 L 201 46 L 19 46 Z"
            fill="url(#c_wing)" stroke="#A88025" strokeWidth="0.9" />
          {/* Second element */}
          <path d="M 26 33 L 194 33 L 191 43 L 29 43 Z"
            fill="#090909" stroke="#4A3808" strokeWidth="0.4" />
          {/* Cascade — central section */}
          <path d="M 56 35 L 164 35 L 162 43 L 58 43 Z"
            fill="#080808" />
          {/* Left endplate */}
          <rect x="11" y="22" width="5" height="28" rx="1.5" fill="#A88025" />
          {/* Right endplate */}
          <rect x="204" y="22" width="5" height="28" rx="1.5" fill="#A88025" />
          {/* Brake duct inlet indicators — small red marks */}
          <polygon points="11,22 22,22 11,34" fill="#B01400" opacity="0.88" />
          <polygon points="209,22 198,22 209,34" fill="#B01400" opacity="0.88" />
          {/* Nose pylon mounts */}
          <rect x="104" y="30" width="4" height="16" rx="1" fill="#806018" />
          <rect x="112" y="30" width="4" height="16" rx="1" fill="#806018" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            FRONT TYRES  (y:76..148)
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="front-tyres">
          {/* FL */}
          <rect x="16" y="76" width="36" height="76" rx="9"
            fill="url(#t_front)" stroke="#A88025" strokeWidth="1.2" />
          <rect x="16" y="76" width="36" height="76" rx="9"
            fill="url(#g_frontHot)" filter="url(#f_inner)" />
          <rect x="20" y="80" width="28" height="68" rx="7"
            fill="none" stroke="#1A160A" strokeWidth="1" opacity="0.65" />
          <ellipse cx="34" cy="114" rx="9" ry="11"
            fill="url(#t_hub)" stroke="#282010" strokeWidth="0.8" />
          <ellipse cx="34" cy="114" rx="3" ry="3.5" fill="#0C0A08" />

          {/* FR */}
          <rect x="168" y="76" width="36" height="76" rx="9"
            fill="url(#t_front)" stroke="#A88025" strokeWidth="1.2" />
          <rect x="168" y="76" width="36" height="76" rx="9"
            fill="url(#g_frontHot)" filter="url(#f_inner)" />
          <rect x="172" y="80" width="28" height="68" rx="7"
            fill="none" stroke="#1A160A" strokeWidth="1" opacity="0.65" />
          <ellipse cx="186" cy="114" rx="9" ry="11"
            fill="url(#t_hub)" stroke="#282010" strokeWidth="0.8" />
          <ellipse cx="186" cy="114" rx="3" ry="3.5" fill="#0C0A08" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            FRONT SUSPENSION
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="front-suspension" stroke="#403820" strokeWidth="1.1" opacity="0.85">
          {/* FL wishbones */}
          <line x1="52"  y1="84"  x2="98"  y2="94"  />
          <line x1="52"  y1="140" x2="98"  y2="130" />
          {/* FR wishbones */}
          <line x1="168" y1="84"  x2="122" y2="94"  />
          <line x1="168" y1="140" x2="122" y2="130" />
          {/* push-rods */}
          <line x1="52"  y1="112" x2="98"  y2="110" strokeWidth="0.6" opacity="0.45" />
          <line x1="168" y1="112" x2="122" y2="110" strokeWidth="0.6" opacity="0.45" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            NOSECONE (y:46..95)
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="nose">
          {/* Main taper */}
          <path d="M 93 46 L 127 46 L 121 95 L 99 95 Z"
            fill="url(#c_nose)" stroke="#6A4A14" strokeWidth="0.6" />
          {/* Centre ridge highlight */}
          <line x1="110" y1="46" x2="110" y2="95"
            stroke="#BF8C28" strokeWidth="0.5" opacity="0.45" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            MONOCOQUE & COCKPIT  (y:95..168)
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="cockpit">
          {/* Forward monocoque — gold top surface */}
          <path d="M 99 95 L 121 95 L 130 132 L 90 132 Z"
            fill="url(#c_goldTop)" stroke="#604010" strokeWidth="0.5" />

          {/* Cockpit shoulder structure */}
          <path d="M 86 132 L 134 132 L 138 160 L 82 160 Z"
            fill="url(#c_goldTop)" stroke="#704A18" strokeWidth="0.6" />

          {/* Cockpit void */}
          <path d="M 94 137 Q 110 127 126 137 L 132 160 L 88 160 Z"
            fill="#050507" stroke="#0E0E0C" strokeWidth="0.5" />

          {/* Halo — gold structural arch */}
          <path d="M 94 140 Q 110 130 126 140"
            fill="none" stroke="#BF8C28" strokeWidth="2.4" strokeLinecap="round" />
          {/* Halo centre strut */}
          <line x1="110" y1="130" x2="110" y2="142"
            stroke="#BF8C28" strokeWidth="1.7" />

          {/* Helmet */}
          <ellipse cx="110" cy="151" rx="8" ry="9"
            fill="#A07830" stroke="#0C0A08" strokeWidth="0.8" />
          <path d="M 103 148 L 117 148 L 116 152 L 104 152 Z"
            fill="#07090E" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            UNIFIED BODY — monocoque + sidepods as ONE wide form
            This is the key fix: a single wide body shape, not two pods
            Dark carbon with gold accent only at the outermost left/right edges
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="bodywork">
          {/* ── LEFT BODY PANEL (includes sidepod outer skin) */}
          {/* Runs from cockpit shoulder down to rear taper */}
          <path
            d="M 44 164
               C 44 164, 82 162, 86 168
               L 90 285
               L 52 290
               C 48 280, 44 260, 44 240
               Z"
            fill="url(#c_bodyL)"
            stroke="#5A3A10"
            strokeWidth="0.7"
          />
          {/* Left sidepod inlet opening */}
          <path d="M 48 174 L 84 173 L 86 198 L 52 196 Z"
            fill="#040404" stroke="#181408" strokeWidth="0.5" />
          {/* Left floor edge accent */}
          <line x1="46" y1="220" x2="52" y2="286"
            stroke="#A88025" strokeWidth="0.45" opacity="0.30" />

          {/* ── RIGHT BODY PANEL */}
          <path
            d="M 176 164
               C 176 164, 138 162, 134 168
               L 130 285
               L 168 290
               C 172 280, 176 260, 176 240
               Z"
            fill="url(#c_bodyR)"
            stroke="#5A3A10"
            strokeWidth="0.7"
          />
          <path d="M 172 174 L 136 173 L 134 198 L 168 196 Z"
            fill="#040404" stroke="#181408" strokeWidth="0.5" />
          <line x1="174" y1="220" x2="168" y2="286"
            stroke="#A88025" strokeWidth="0.45" opacity="0.30" />

          {/* ── CENTRAL ENGINE COVER SPINE */}
          {/* Fills between left and right panels — pure dark carbon */}
          <path
            d="M 86 168 L 134 168 L 130 285 L 90 285 Z"
            fill="url(#c_carbon)"
            stroke="#201C10"
            strokeWidth="0.4"
          />
          {/* Engine cover centre ridge */}
          <line x1="110" y1="168" x2="110" y2="285"
            stroke="#A88025" strokeWidth="0.65" opacity="0.35" />
          {/* Horizontal panel seams */}
          <line x1="88" y1="215" x2="132" y2="215"
            stroke="#201C10" strokeWidth="0.5" opacity="0.55" />
          <line x1="88" y1="252" x2="132" y2="252"
            stroke="#201C10" strokeWidth="0.5" opacity="0.45" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            REAR BODY TAPER & DIFFUSER  (y:285..325)
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="rear-body">
          {/* Gearbox/diffuser taper — dark */}
          <path d="M 52 290 L 168 290 L 163 320 L 57 320 Z"
            fill="url(#c_carbon)" stroke="#3A2E0A" strokeWidth="0.6" />
          {/* Beam wing mount */}
          <path d="M 57 320 L 163 320 L 160 335 L 60 335 Z"
            fill="#090909" stroke="#A88025" strokeWidth="0.5" />
          {/* Exhaust exits — subtle warm dot */}
          <ellipse cx="93"  cy="304" rx="4" ry="5.5"
            fill="#12100A" stroke="#4A3008" strokeWidth="0.5" />
          <ellipse cx="127" cy="304" rx="4" ry="5.5"
            fill="#12100A" stroke="#4A3008" strokeWidth="0.5" />
          <ellipse cx="93"  cy="304" rx="1.5" ry="2"
            fill="#3A1800" opacity="0.5" />
          <ellipse cx="127" cy="304" rx="1.5" ry="2"
            fill="#3A1800" opacity="0.5" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            REAR SUSPENSION
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="rear-suspension" stroke="##403820" strokeWidth="1.1" opacity="0.85">
          {/* RL */}
          <line x1="52"  y1="325" x2="82"  y2="308" stroke="#403820" />
          <line x1="52"  y1="378" x2="82"  y2="363" stroke="#403820" />
          <line x1="52"  y1="351" x2="82"  y2="342" stroke="#403820" strokeWidth="0.6" opacity="0.45" />
          {/* RR */}
          <line x1="168" y1="325" x2="138" y2="308" stroke="#403820" />
          <line x1="168" y1="378" x2="138" y2="363" stroke="#403820" />
          <line x1="168" y1="351" x2="138" y2="342" stroke="#403820" strokeWidth="0.6" opacity="0.45" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            REAR TYRES  (y:320..405) — wider and taller than front
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="rear-tyres">
          {/* RL */}
          <rect x="12" y="320" width="42" height="86" rx="10"
            fill="url(#t_rear)" stroke="#A88025" strokeWidth="1.3" />
          <rect x="12" y="320" width="42" height="86" rx="10"
            fill="url(#g_rearMed)" filter="url(#f_inner)" />
          <rect x="16" y="324" width="34" height="78" rx="8"
            fill="none" stroke="#1A1608" strokeWidth="1" opacity="0.6" />
          <ellipse cx="33" cy="363" rx="10" ry="13"
            fill="url(#t_hub)" stroke="#282010" strokeWidth="0.8" />
          <ellipse cx="33" cy="363" rx="4" ry="4.5" fill="#0A0806" />

          {/* RR */}
          <rect x="166" y="320" width="42" height="86" rx="10"
            fill="url(#t_rear)" stroke="#A88025" strokeWidth="1.3" />
          <rect x="166" y="320" width="42" height="86" rx="10"
            fill="url(#g_rearMed)" filter="url(#f_inner)" />
          <rect x="170" y="324" width="34" height="78" rx="8"
            fill="none" stroke="#1A1608" strokeWidth="1" opacity="0.6" />
          <ellipse cx="187" cy="363" rx="10" ry="13"
            fill="url(#t_hub)" stroke="#282010" strokeWidth="0.8" />
          <ellipse cx="187" cy="363" rx="4" ry="4.5" fill="#0A0806" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            REAR WING  (y:413..440)
        ═══════════════════════════════════════════════════════════════════ */}
        <g id="rear-wing">
          {/* Main element */}
          <path d="M 15 415 L 205 415 L 201 431 L 19 431 Z"
            fill="url(#c_wing)" stroke="#A88025" strokeWidth="0.9" />
          {/* Second element */}
          <path d="M 26 419 L 194 419 L 192 427 L 28 427 Z"
            fill="#080808" stroke="#3A2A08" strokeWidth="0.4" />
          {/* Endplates */}
          <rect x="11" y="408" width="6" height="27" rx="1.5" fill="#A88025" />
          <rect x="203" y="408" width="6" height="27" rx="1.5" fill="#A88025" />
          {/* Support pylons */}
          <line x1="99"  y1="335" x2="99"  y2="415" stroke="#6A4A18" strokeWidth="1.2" />
          <line x1="121" y1="335" x2="121" y2="415" stroke="#6A4A18" strokeWidth="1.2" />
          {/* DRS actuator */}
          <line x1="99" y1="375" x2="121" y2="375" stroke="#3A2A08" strokeWidth="0.7" />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            TELEMETRY LABELS — compact, monospace, one block per corner
            FL/FR aligned with front tyre centre (y≈114)
            RL/RR aligned with rear tyre centre (y≈363)
        ═══════════════════════════════════════════════════════════════════ */}

        {/* FL — left side */}
        <g id="label-fl" fontFamily="'JetBrains Mono','Fira Code','Courier New',monospace">
          <text x="2"  y="96"  fontSize="8"   fill="#E8E0D0" fontWeight="700" letterSpacing="0.8">FL</text>
          <text x="2"  y="106" fontSize="6.5" fill="#8A8070">94°C/102°C</text>
          <text x="2"  y="115" fontSize="6.5" fill="#FF8400" fontWeight="700">780°C</text>
        </g>

        {/* FR — right side */}
        <g id="label-fr" fontFamily="'JetBrains Mono','Fira Code','Courier New',monospace" textAnchor="end">
          <text x="218" y="96"  fontSize="8"   fill="#E8E0D0" fontWeight="700" letterSpacing="0.8">FR</text>
          <text x="218" y="106" fontSize="6.5" fill="#8A8070">96°C/104°C</text>
          <text x="218" y="115" fontSize="6.5" fill="#FF8400" fontWeight="700">812°C</text>
        </g>

        {/* RL — left side */}
        <g id="label-rl" fontFamily="'JetBrains Mono','Fira Code','Courier New',monospace">
          <text x="2"  y="342" fontSize="8"   fill="#E8E0D0" fontWeight="700" letterSpacing="0.8">RL</text>
          <text x="2"  y="352" fontSize="6.5" fill="#8A8070">98°C/108°C</text>
          <text x="2"  y="361" fontSize="6.5" fill="#D87000" fontWeight="700">650°C</text>
        </g>

        {/* RR — right side */}
        <g id="label-rr" fontFamily="'JetBrains Mono','Fira Code','Courier New',monospace" textAnchor="end">
          <text x="218" y="342" fontSize="8"   fill="#E8E0D0" fontWeight="700" letterSpacing="0.8">RR</text>
          <text x="218" y="352" fontSize="6.5" fill="#8A8070">101°C/111°C</text>
          <text x="218" y="361" fontSize="6.5" fill="#D87000" fontWeight="700">678°C</text>
        </g>

      </svg>
    </div>
  );
};

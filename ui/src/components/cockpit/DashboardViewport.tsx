"use client";

import React, { PropsWithChildren, useState, useEffect } from "react";
import { Smartphone, X } from "lucide-react";
import Link from "next/link";
import { TyreThermalModal } from "./TyreThermalModal";
import { AiCoachModal } from "./AiCoachModal";
import { RadioToast } from "./RadioToast";

export const DashboardViewport: React.FC<PropsWithChildren> = ({ children }) => {
  const [showMobileBanner, setShowMobileBanner] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setShowMobileBanner(window.innerWidth < 1024);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  return (
    <div className="w-screen h-screen bg-[#020203] p-px overflow-hidden select-none relative">
      {showMobileBanner && (
        <div className="absolute top-2 left-2 right-2 z-50 p-2.5 rounded-xl bg-neutral-950/95 border border-amber-500/40 shadow-[0_0_25px_rgba(0,0,0,0.9)] backdrop-blur-md flex items-center justify-between text-xs font-mono text-white gap-2">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-amber-400 shrink-0" />
            <span className="text-[10px] text-neutral-300">
              For best fidelity, rotate to <strong className="text-amber-400">landscape</strong> or view on desktop.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/dashboard/intelligence"
              className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold"
            >
              Mission Control
            </Link>
            <button
              onClick={() => setShowMobileBanner(false)}
              className="p-1 text-neutral-400 hover:text-white"
              aria-label="Dismiss banner"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
      <div className="relative w-full h-full">{children}</div>

      {/* Interactive Global Modals & Notifications */}
      <TyreThermalModal />
      <AiCoachModal />
      <RadioToast />
    </div>
  );
};

/**
 * DashboardViewport — Fluid Responsive 16:9 Viewport Container
 *
 * Guarantees a deterministic 16:9 aspect ratio at all window sizes
 * (1280×720, 1920×1080, 2560×1440) without component reflow,
 * column stacking, or sidebar collapse.
 */

"use client";

import React, { PropsWithChildren } from "react";

export const DashboardViewport: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="w-screen h-screen bg-[#020203] flex items-center justify-center p-1 sm:p-1.5 overflow-hidden select-none">
      {/* 16:9 Aspect Ratio Frame Container */}
      <div
        className="relative shadow-2xl overflow-hidden w-full h-full"
        style={{
          maxWidth: "min(calc(100vw - 8px), calc((100vh - 8px) * 16 / 9))",
          maxHeight: "min(calc((100vw - 8px) * 9 / 16), calc(100vh - 8px))",
          aspectRatio: "16 / 9",
        }}
      >
        {children}
      </div>
    </div>
  );
};

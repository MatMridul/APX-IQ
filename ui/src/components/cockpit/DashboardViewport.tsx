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
    <div className="w-screen h-screen bg-[#030305] flex items-center justify-center p-2 overflow-hidden select-none">
      {/* 16:9 Aspect Ratio Frame Container */}
      <div
        className="relative shadow-2xl rounded-2xl overflow-hidden"
        style={{
          width: "min(calc(100vw - 16px), calc((100vh - 16px) * 16 / 9))",
          height: "min(calc((100vw - 16px) * 9 / 16), calc(100vh - 16px))",
          aspectRatio: "16 / 9",
        }}
      >
        {children}
      </div>
    </div>
  );
};

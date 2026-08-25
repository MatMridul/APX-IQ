/**
 * DashboardViewport — full-bleed cockpit surface.
 *
 * The redesign uses a fluid percentage grid (no fixed 16:9 dependency),
 * so the canvas now fills the entire viewport edge-to-edge. Padding is
 * a 1px breathing line for the frame border.
 */

"use client";

import React, { PropsWithChildren } from "react";

export const DashboardViewport: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="w-screen h-screen bg-[#020203] p-px overflow-hidden select-none">
      <div className="relative w-full h-full">{children}</div>
    </div>
  );
};

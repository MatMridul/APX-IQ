"use client";

/**
 * APX IQ — Race Engineering Cockpit
 * Phase 1: Spatial Geometry & Canvas Foundation
 */

import React from "react";
import { DashboardViewport } from "@/components/cockpit/DashboardViewport";
import { DashboardCanvas } from "@/components/cockpit/DashboardCanvas";

export default function DashboardPage() {
  return (
    <DashboardViewport>
      <DashboardCanvas />
    </DashboardViewport>
  );
}

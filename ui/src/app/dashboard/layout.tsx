import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cockpit HUD | APX IQ",
  description: "Real-time 60Hz cockpit HUD — monitor speed, RPM, tyres, DRS, ERS, lap deltas and sector splits from your F1 game telemetry stream.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

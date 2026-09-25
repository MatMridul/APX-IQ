import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mission Control | APX IQ",
  description: "Post-race strategy suite — FastF1 ghost benchmarking, multi-channel delta telemetry, vehicle dynamics setup matrix, and AI pit-wall debrief coaching.",
};

export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

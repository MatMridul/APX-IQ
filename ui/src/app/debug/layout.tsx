import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debug | APX IQ",
  description: "System diagnostics and socket inspector — observability mesh for Socket.IO transport, UDP 60Hz ingestion health, and raw Zustand store state.",
};

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

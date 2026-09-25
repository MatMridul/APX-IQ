import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | APX IQ",
  description: "APX IQ data governance policy — local-first architecture, zero ad trackers, full telemetry sovereignty. Your driving data stays on your machine.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

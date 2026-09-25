import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "APX IQ | Motorsport Intelligence",
  description: "Real-time F1 Telemetry & Strategy Platform — ingest 60Hz UDP telemetry, benchmark against official FIA FastF1 reference laps, and analyse vehicle dynamics with AI pit-wall coaching.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className="font-sans bg-apx-black text-white"
        suppressHydrationWarning={true}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

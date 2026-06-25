import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@fontsource/rajdhani/400.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "APX IQ | Motorsport Intelligence",
  description: "Real-time F1 Telemetry & Strategy Platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-apx-black text-white`}
        style={{ "--font-rajdhani": "'Rajdhani', sans-serif" } as React.CSSProperties}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}

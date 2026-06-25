import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";

export default {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                // APX IQ Design System
                "apx-black": "#0B0B0D",
                "carbon":    "#1C1F24",
                "carbon-light": "#252930",
                "gold":      "#CFA349",
                "gold-dark": "#bf953f",
                "gold-light":"#fcf6ba",
                "silver":    "#9FA6B2",
                "alert":     "#D72638",
            },
            fontFamily: {
                sans:    ["var(--font-inter)"],
                mono:    ["var(--font-jetbrains-mono)"],
                display: ["var(--font-rajdhani)"],  // Hero numbers
            },
            animation: {
                // Gold pulse for live indicators
                "pulse-gold": "pulse-gold 2s cubic-bezier(0.4,0,0.6,1) infinite",
                // Subtle scan line across panels
                "scan": "scan 3s linear infinite",
                // Fade up on load
                "fade-up": "fade-up 0.4s ease-out",
            },
            keyframes: {
                "pulse-gold": {
                    "0%, 100%": { opacity: "1" },
                    "50%":       { opacity: "0.4" },
                },
                "scan": {
                    "0%":   { transform: "translateY(-100%)" },
                    "100%": { transform: "translateY(100%)" },
                },
                "fade-up": {
                    "0%":   { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [tailwindAnimate, containerQueries],
} satisfies Config;

import type { Config } from "tailwindcss";

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
                // F1 Dashboard Palette
                "apx-black": "#0B0B0D",
                "carbon": "#1C1F24",
                "gold": "#CFA349",
                "silver": "#9FA6B2",
                "alert": "#D72638",
            },
            fontFamily: {
                sans: ['var(--font-inter)'], // Use Inter as default sans
                mono: ['var(--font-jetbrains-mono)'], // Use JetBrains for data
            },
        },
    },
    plugins: [],
} satisfies Config;

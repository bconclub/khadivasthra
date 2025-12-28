import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#800000", // Maroon
                    light: "#a52a2a",
                    dark: "#4a0404",
                },
                secondary: {
                    DEFAULT: "#FDFBF7", // Cream
                    dark: "#f5f0e6",
                },
                accent: {
                    DEFAULT: "#D4AF37", // Gold
                },
                text: {
                    DEFAULT: "#1a1a1a",
                    muted: "#666666",
                }
            },
            fontFamily: {
                sans: ['var(--font-geist-sans)', 'sans-serif'], // Keep geist or switch? User said "Malayalam + English friendly fonts".
                // Use default for now, maybe add google fonts later.
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
export default config;

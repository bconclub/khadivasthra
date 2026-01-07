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
                coral: {
                    DEFAULT: "#E8657B",
                    dark: "#D64D6A",
                },
                cream: {
                    DEFAULT: "#F5E6D3",
                },
                orange: {
                    DEFAULT: "#F5A623",
                    dark: "#E09620",
                },
                white: "#FFFFFF",
                text: {
                    DEFAULT: "#1A1A1A",
                    muted: "#4A4A4A",
                },
                // Legacy support
                primary: {
                    DEFAULT: "#E8657B", // Coral Pink
                    foreground: "#FFFFFF",
                },
                secondary: {
                    DEFAULT: "#F5A623", // Orange
                    foreground: "#FFFFFF",
                },
                accent: {
                    DEFAULT: "#E8657B", // Coral Pink
                    foreground: "#FFFFFF",
                },
            },
            fontFamily: {
                sans: ['var(--font-outfit)', 'sans-serif'],
                serif: ['var(--font-playfair)', 'serif'],
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

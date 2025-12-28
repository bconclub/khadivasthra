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
                    DEFAULT: "#8B1538", // Deep Maroon
                    foreground: "#FDF8F3",
                    light: "#A01840",
                    dark: "#660D26",
                },
                secondary: {
                    DEFAULT: "#FDF8F3", // Cream White
                    dark: "#F5E6D3", // Warm Beige
                    foreground: "#3D2314",
                },
                accent: {
                    DEFAULT: "#E85A6B", // Coral Pink
                    foreground: "#FFFFFF",
                    light: "#FADBD8", // Soft Pink
                },
                gold: {
                    DEFAULT: "#C9A962", // Gold
                    light: "#DBC183",
                },
                text: {
                    DEFAULT: "#4A4A4A", // Charcoal
                    heading: "#3D2314", // Dark Brown
                    muted: "#8A8A8A",
                },
                background: "#FDF8F3",
            },
            fontFamily: {
                sans: ['var(--font-outfit)', 'sans-serif'],
                serif: ['var(--font-playfair)', 'serif'],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "luxury-pattern": "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A962' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            },
        },
    },
    plugins: [],
};
export default config;

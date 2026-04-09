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
        pitch: {
          DEFAULT: "#1a3d2e",
          light: "#234d3a",
          line: "rgba(255,255,255,0.22)",
        },
        surface: {
          DEFAULT: "#0f1419",
          raised: "#161c24",
          border: "#252d38",
        },
        accent: {
          DEFAULT: "#22c55e",
          muted: "#16a34a",
          glow: "rgba(34, 197, 94, 0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.35)",
        glow: "0 0 40px rgba(34, 197, 94, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;

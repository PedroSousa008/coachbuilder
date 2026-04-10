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
          DEFAULT: "#131316",
          light: "#1a1a1f",
          line: "rgba(255, 255, 255, 0.2)",
        },
        surface: {
          DEFAULT: "#0f1419",
          raised: "#161c24",
          border: "#252d38",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          muted: "rgb(var(--accent-muted-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.35)",
        glow: "0 0 40px rgb(var(--accent-rgb) / 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;

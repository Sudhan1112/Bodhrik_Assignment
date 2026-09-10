import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F1412",
        ivory: "#F7F5F1",
        teal: "#0F6E56",
        "teal-dark": "#0A5240",
        sage: "#3F6B54",
        coral: "#B23A2F",
        border: "#E4E0D9",
        mist: "#EFEEE9",
        muted: "#5C6561",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
        sans: [
          "Segoe UI",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 12px 40px rgba(15, 20, 18, 0.08)",
        lift: "0 8px 24px rgba(15, 20, 18, 0.1)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.45s ease-out both",
        pulseSoft: "pulseSoft 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;

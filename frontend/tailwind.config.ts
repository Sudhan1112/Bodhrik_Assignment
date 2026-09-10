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
        ink: "#121C18",
        paper: "#D5D8D2",
        brass: "#9A6B2F",
        sage: "#3F6B54",
        clay: "#8C3A32",
        hairline: "#B4B8B2",
        mist: "#E8EAE5",
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
    },
  },
  plugins: [],
};
export default config;

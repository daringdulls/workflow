import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Aptos", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        hotel: {
          50: "#eef5fd",
          100: "#dbeafe",
          400: "#5598e7",
          DEFAULT: "#2a78d6",
          600: "#256abf",
          700: "#184f95",
          900: "#0d366b",
        },
        design: {
          50: "#f7f5ff",
          100: "#eee9ff",
          200: "#ddd4ff",
          400: "#8b73e6",
          DEFAULT: "#6847d8",
          600: "#5b3bc4",
          700: "#482e9f",
          900: "#281b58",
        },
        freelance: {
          50: "#e8f9f2",
          100: "#c7f0df",
          400: "#3fca97",
          DEFAULT: "#1baf7a",
          600: "#169e6b",
          700: "#0f7d54",
          900: "#0a5238",
        },
        status: {
          good: "#0ca30c",
          warning: "#d97a06",
          serious: "#ec835a",
          critical: "#d03b3b",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(42, 32, 79, 0.03), 0 8px 28px rgba(42, 32, 79, 0.045)",
        "card-hover": "0 16px 38px -12px rgba(72, 46, 159, 0.18), 0 4px 12px rgba(42, 32, 79, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;

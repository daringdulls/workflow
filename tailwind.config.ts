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
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          DEFAULT: "#2563eb",
        },
        navy: {
          50: "#f8fafc",
          100: "#eef2f7",
          400: "#334155",
          700: "#1e293b",
          800: "#152238",
          900: "#0f172a",
          950: "#0a1120",
          DEFAULT: "#0f172a",
        },
        surface: "#F8FAFC",
        "surface-alt": "#EFF6FF",
        success: {
          DEFAULT: "#10b981",
          50: "#ecfdf5",
          600: "#059669",
        },
        warning: {
          DEFAULT: "#f59e0b",
          50: "#fffbeb",
          600: "#d97706",
        },
        danger: {
          DEFAULT: "#ef4444",
          50: "#fef2f2",
          600: "#dc2626",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 16px 36px -12px rgba(37, 99, 235, 0.18), 0 4px 12px rgba(15, 23, 42, 0.06)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;

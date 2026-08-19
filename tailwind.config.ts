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
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
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
          50: "#f1eefb",
          100: "#e4defa",
          400: "#7a6bc9",
          DEFAULT: "#4a3aa7",
          600: "#3d2f8c",
          700: "#2f2470",
          900: "#1c1546",
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
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
        "card-hover": "0 4px 10px -2px rgba(15, 23, 42, 0.10), 0 2px 4px -2px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;

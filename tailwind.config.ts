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
          50: "#f4f6ff",
          100: "#e8ecff",
          200: "#d5dcff",
          400: "#8192df",
          DEFAULT: "#6476cc",
          600: "#5868b8",
          700: "#465494",
          900: "#293259",
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
        card: "0 1px 2px rgba(51, 65, 85, 0.025), 0 10px 30px rgba(90, 104, 145, 0.045)",
        "card-hover": "0 18px 40px -14px rgba(92, 110, 174, 0.18), 0 4px 12px rgba(51, 65, 85, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;

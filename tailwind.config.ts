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
        hotel: {
          DEFAULT: "#2563eb",
          light: "#dbeafe",
        },
        design: {
          DEFAULT: "#9333ea",
          light: "#f3e8ff",
        },
        freelance: {
          DEFAULT: "#0d9488",
          light: "#ccfbf1",
        },
      },
    },
  },
  plugins: [],
};
export default config;

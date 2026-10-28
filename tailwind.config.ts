import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd3ff",
          300: "#8eb6ff",
          400: "#598dff",
          500: "#3366f5",
          600: "#1f4ad9",
          700: "#1a3bb0",
          800: "#1b358b",
          900: "#1c316e",
        },
        ink: { DEFAULT: "#0f172a", soft: "#334155", muted: "#64748b" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)" },
    },
  },
  plugins: [],
};
export default config;

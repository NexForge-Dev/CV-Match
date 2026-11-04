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
        // Hairlines and surfaces: every card, table and divider uses these.
        line: { DEFAULT: "#e2e8f0", strong: "#cbd5e1" },
        // Evidence statuses. The same four colours mean the same thing on every screen.
        found: { DEFAULT: "#059669", soft: "#ecfdf5", line: "#a7f3d0", ink: "#065f46" },
        partial: { DEFAULT: "#d97706", soft: "#fffbeb", line: "#fde68a", ink: "#92400e" },
        missing: { DEFAULT: "#dc2626", soft: "#fef2f2", line: "#fecaca", ink: "#991b1b" },
        unclear: { DEFAULT: "#94a3b8", soft: "#f1f5f9", line: "#e2e8f0", ink: "#475569" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Readouts only: scores, version tags and evidence references.
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.05)",
        raised: "0 12px 32px -8px rgba(15,23,42,.18), 0 2px 6px rgba(15,23,42,.06)",
      },
    },
  },
  plugins: [],
};
export default config;

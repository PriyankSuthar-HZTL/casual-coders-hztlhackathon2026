import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutrals (zinc-inspired)
        ink: "#18181b",
        "ink-soft": "#27272a",
        paper: "#fafafa",
        "paper-2": "#f4f4f5",
        "paper-3": "#fafafa",
        line: "#e4e4e7",
        "line-strong": "#d4d4d8",
        muted: "#71717a",
        "muted-soft": "#a1a1aa",
        // Primary (indigo — Linear-adjacent)
        accent: "#4f46e5",
        "accent-2": "#4338ca",
        "accent-soft": "#e0e7ff",
        "accent-muted": "#eef2ff",
        // Semantic
        "brand-green": "#059669",
        "green-soft": "#d1fae5",
        "green-muted": "#ecfdf5",
        "brand-yellow": "#d97706",
        "yellow-soft": "#fef3c7",
        "brand-red": "#dc2626",
        "red-soft": "#fef2f2",
        card: "#ffffff",
        "card-hi": "#ffffff",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.06)",
        "card-md":
          "0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.05)",
        "card-lg":
          "0 12px 40px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.05)",
        // Legacy names → softer elevation (kept for gradual migration)
        hard: "0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.06)",
        "hard-sm":
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.05)",
        "hard-hover":
          "0 8px 24px -8px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.06)",
        "btn-accent": "0 1px 2px rgba(79, 70, 229, 0.25)",
        "btn-ink": "0 1px 2px rgba(15, 23, 42, 0.08)",
        "btn-active": "0 0 0 1px rgba(79, 70, 229, 0.35)",
        "step-active": "0 0 0 2px rgba(79, 70, 229, 0.2)",
        focus: "0 0 0 3px rgba(79, 70, 229, 0.22)",
        scrim: "0 24px 48px -12px rgba(0, 0, 0, 0.35)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        stageIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scrimIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        connPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.24s ease both",
        "stage-in": "stageIn 0.32s ease both",
        "scrim-in": "scrimIn 0.18s ease both",
        "conn-pulse": "connPulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

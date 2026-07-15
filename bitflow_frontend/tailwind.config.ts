import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // ── Color palette — industrial phosphor terminal ─────────────────────
      colors: {
        // Backgrounds (darkest → lightest)
        void:    "#07080a",   // page bg
        pit:     "#0d0e11",   // panel bg
        shaft:   "#13141a",   // editor bg
        surface: "#1a1b22",   // raised elements (toolbar, tab bar)
        rim:     "#22232d",   // borders
        muted:   "#2e3040",   // disabled / inactive borders

        // Text
        dim:     "#4a4d60",   // placeholder, line numbers
        ghost:   "#7a7d96",   // secondary labels
        pale:    "#b0b3cc",   // body text
        bright:  "#e8eaf6",   // primary text / headings

        // Phosphor green accent
        phosphor: {
          DEFAULT: "#00e87a",
          dim:     "#00b05c",
          glow:    "#00ff88",
          faint:   "#003d22",
        },

        // Status colours
        danger:  "#ff4f4f",
        warn:    "#ffb84d",
        info:    "#4db8ff",
      },

      // ── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        // UI labels, headings — loaded in layout.tsx
        display: ["var(--font-display)", "monospace"],
        // Code, terminal output — loaded in layout.tsx
        mono:    ["var(--font-mono)", "monospace"],
      },

      // ── Animations ───────────────────────────────────────────────────────
      keyframes: {
        // Cursor blink in terminal
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        // Subtle pulse for the run button while simulating
        pulse_soft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        // Slide-up for terminal lines appearing
        slide_up: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        // Glow throb for status dot
        glow: {
          "0%, 100%": { boxShadow: "0 0 4px 1px #00e87a66" },
          "50%":      { boxShadow: "0 0 10px 3px #00e87acc" },
        },
        // Floating up and down for the 3D chip
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-15px)" },
        },
      },
      animation: {
        blink:      "blink 1.1s step-end infinite",
        pulse_soft: "pulse_soft 1.5s ease-in-out infinite",
        slide_up:   "slide_up 0.15s ease-out both",
        glow:       "glow 2s ease-in-out infinite",
        float:      "float 4s ease-in-out infinite",
      },

      // ── Spacing extras ───────────────────────────────────────────────────
      height: {
        toolbar:  "48px",
        tabbar:   "36px",
        terminal: "240px",
      },
    },
  },
  plugins: [],
};

export default config;

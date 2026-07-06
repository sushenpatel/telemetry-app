/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#080D17",
          900: "#0B1220",
          800: "#121B2E",
          700: "#1A2740",
          600: "#223349",
          500: "#334966",
        },
        ink: {
          100: "#E7ECF3",
          300: "#AEBACB",
          500: "#8592A8",
        },
        signal: {
          cyan: "#4CD9C0",
          amber: "#F5A623",
          red: "#F2545B",
          slate: "#5B6B84",
        },
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(76, 217, 192, 0.06), 0 8px 24px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

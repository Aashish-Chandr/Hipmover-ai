import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Jamie McKaye Design System Tokens
        ink: {
          0: "#0B0C0E",
          1: "#121418",
          2: "#181B20",
          3: "#20242B",
        },
        paper: {
          0: "#F4F5F7",
          1: "#C5CAD2",
          2: "#7E8590",
          3: "#525863",
        },
        hairline: {
          DEFAULT: "rgba(244, 245, 247, 0.08)",
          strong: "rgba(244, 245, 247, 0.16)",
          subtle: "rgba(244, 245, 247, 0.04)",
        },
        chrome: {
          hi: "#FFFFFF",
          mid: "#AEB4BD",
          lo: "#4A4F57",
        },
        // DigitalOcean Accent Signals
        do: {
          blue: {
            DEFAULT: "#0069FF",
            hover: "#0053cc",
            light: "#E5F2FF",
            subtle: "#0069FF1A",
          },
          navy: {
            DEFAULT: "#080C1E",
            deep: "#0B0C0E",
            card: "#121418",
            border: "rgba(244, 245, 247, 0.08)",
            muted: "#7E8590",
          },
          cyan: "#00D2D3",
          teal: "#00E096",
          purple: "#7048E8",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-poppins)",
          "'Poppins'",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        poppins: [
          "var(--font-poppins)",
          "'Poppins'",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      boxShadow: {
        "hairline-glow": "0 0 30px rgba(244, 245, 247, 0.04)",
        "do-glow": "0 0 25px rgba(0, 105, 255, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        master: {
          bg: "#0a0d0a",       // near-black background
          panel: "#12160f",    // slightly lighter panel background
          green: "#4a6b52",    // muted green, primary accent
          gold: "#c9a24b",     // warm gold/amber, highlights + active states
          brown: "#5a4632",    // earthy brown, secondary elements
          text: "#e8e6df",     // off-white body text
          muted: "#8a897f",    // muted secondary text
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
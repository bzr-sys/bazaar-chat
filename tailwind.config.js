/* eslint-env node */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Bazaar dashboard look: DaisyUI "business" greys with the @bzr/brand
      // bronze primary (brand/src/tokens.ts in the bazaar monorepo).
      colors: {
        bzr: {
          deep: "#141414",
          bar: "#181818",
          bg: "#1c1c1c",
          side: "#202020",
          field: "#262626",
          bubble: "#2c2c2c",
          hover: "#2e2e2e",
          line: "#333333",
          edge: "#444444",
          text: "#ececec",
          soft: "#c4c4c4",
          muted: "#a3a3a3",
          primary: "#db9a59",
          gold: "#eabf7d",
          "primary-dim": "#4a3a2a",
          "primary-edge": "#6b4e2e",
          "primary-tint": "#3a2c1f",
          danger: "#f2a08a",
        },
      },
      borderRadius: {
        bzr: "3px",
      },
    },
  },
  plugins: [],
};

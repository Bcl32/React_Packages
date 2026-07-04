// Shared Tailwind preset: the single source of truth for the colour palette.
// Consumed at build time (Node/jiti) via `presets: [require("@bcl32/themes/tailwind-preset")]`
// — never bundled for the browser, so it stays plain CJS (`.cjs` because the
// package is "type": "module"). themes.json values are already hsl()-wrapped.
const { createThemes } = require("tw-colors");
const themes = require("./src/themes.json");

module.exports = {
  theme: {
    extend: {
      // Backs @bcl32/utils Button's `shine` variant (animate-shine); lives in
      // the preset so every consumer app gets it without hand-copying.
      keyframes: {
        shine: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        shine: "shine 8s ease-in-out infinite",
      },
    },
  },
  plugins: [
    // produceCssVariable must stay `--${name}`: the runtime theme editor
    // (Theming.tsx) overrides the same variable names via style.setProperty.
    createThemes(themes, { produceCssVariable: (colorName) => `--${colorName}` }),
  ],
};

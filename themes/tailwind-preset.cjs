// Shared Tailwind preset: the single source of truth for the colour palette.
// Consumed at build time (Node/jiti) via `presets: [require("@bcl32/themes/tailwind-preset")]`
// — never bundled for the browser, so it stays plain CJS (`.cjs` because the
// package is "type": "module"). themes.json values are already hsl()-wrapped.
const { createThemes } = require("tw-colors");
const themes = require("./src/themes.json");

// A theme is dark when its background lightness is < 50% — the same rule as
// isLightTheme() in ./src/themeMeta, re-derived here rather than imported
// because this file is CJS consumed by Node at build time and themeMeta is TS.
// Deriving it from themes.json means the two cannot drift as themes are added
// or retuned.
const darkThemes = Object.keys(themes).filter((name) => {
  const match = /hsl\(\s*[\d.]+\s+[\d.]+%\s+([\d.]+)%/.exec(themes[name].background);
  return match ? Number(match[1]) < 50 : true;
});

// One combined selector rather than one per theme — a selector list here would
// emit a separate copy of every `dark:` rule for each dark theme.
const darkRoots = `:is(${darkThemes.map((t) => `[data-theme="${t}"]`).join(",")})`;

module.exports = {
  // Tailwind's stock default is `darkMode: "media"`, which gates every `dark:`
  // utility on the OS `prefers-color-scheme` — completely independent of the
  // `data-theme` attribute ThemeProvider sets. That left `dark:` classes inert
  // under the five dark themes not named "dark", painting light-mode colours
  // over a dark background, and inverted on the light themes when the OS was
  // dark. Binding the variant to `data-theme` funnels the OS preference through
  // a single point — "system" resolving to light/dark in ThemeProvider — and
  // lets everything downstream follow the selected theme.
  //
  // `:where()` contributes no specificity, so utility ordering is unchanged.
  darkMode: ["variant", `&:where(${darkRoots}, ${darkRoots} *)`],
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

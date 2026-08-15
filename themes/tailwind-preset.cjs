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
      //
      // The dialog-* pairs back @bcl32/utils DialogButton, and are here for a
      // sharper reason than convenience. They used to be written at the call
      // site as arbitrary values (`animate-[dialog-content-hide_200ms]`), which
      // emit the `animation` shorthand but never consult `keyframes` — so every
      // consumer app had to hand-copy the four @keyframes blocks into its own
      // index.css, and an app that didn't got a dialog that opens and cannot
      // close: Radix's Presence reads the computed animation-name on
      // data-state="closed" and waits for an `animationend` that never fires
      // when the keyframes are undefined, leaving the dialog mounted at full
      // opacity with Escape and the X button both apparently dead. Naming the
      // animations here makes Tailwind emit the @keyframes wherever the utility
      // is used, so the contract travels with the component.
      keyframes: {
        shine: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "dialog-overlay-show": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dialog-overlay-hide": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "dialog-content-show": {
          from: { opacity: "0", transform: "translate(-50%, -50%) scale(0.95)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "dialog-content-hide": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, -50%) scale(0.95)" },
        },
      },
      animation: {
        shine: "shine 8s ease-in-out infinite",
        // Durations live here rather than at the call site, which is where the
        // arbitrary-value form had to restate 200ms four times.
        "dialog-overlay-show": "dialog-overlay-show 200ms",
        "dialog-overlay-hide": "dialog-overlay-hide 200ms",
        "dialog-content-show": "dialog-content-show 200ms",
        "dialog-content-hide": "dialog-content-hide 200ms",
      },
    },
  },
  plugins: [
    // produceCssVariable must stay `--${name}`: the runtime theme editor
    // (Theming.tsx) overrides the same variable names via style.setProperty.
    createThemes(themes, { produceCssVariable: (colorName) => `--${colorName}` }),
  ],
};

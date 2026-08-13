---
"@bcl32/themes": major
---

Bind Tailwind's `dark:` variant to `data-theme` instead of the OS colour scheme.

The preset now sets `darkMode`. Previously it set nothing, so Tailwind fell back
to its stock `darkMode: "media"` and compiled every `dark:` utility into
`@media (prefers-color-scheme: dark)` — gated on the viewer's **operating system**
and completely independent of the `data-theme` attribute `ThemeProvider` writes.
The two systems shared the word "dark" and nothing else.

Because six of the nine themes are dark-background (`dark`, `green`, `yellow`,
`red`, `purple`, `dark-blue`), the mismatch was the normal case rather than an
edge case: selecting any of the five not named `dark` on an OS set to light left
every `dark:` class inert, painting light-mode colours over a dark background;
the light themes inverted the same way on an OS set to dark.

`darkMode` is now a `variant` keyed off the dark themes, derived from
`themes.json` by the same background-lightness rule as `isLightTheme` so the two
cannot drift as themes are added or retuned. All six collapse into one `:is()`
selector — a selector list would emit a separate copy of every `dark:` rule per
theme. `:where()` contributes no specificity, so utility ordering is unchanged.

OS preference is not lost, it just enters at one point: the `system` theme still
resolves to `light`/`dark` in `ThemeProvider`, and everything downstream follows
`data-theme`.

**Breaking for consumers.** Every existing `dark:` utility changes what it
responds to. Apps whose `dark:` pairs were authored and eyeballed under an
OS-matched theme will look the same; apps relying on OS-following behaviour, or
carrying `dark:` pairs never checked against the non-`dark` dark themes, will
render differently. This is a major bump specifically so the change cannot arrive
through a `^4` caret — each app opts in and gets a visual pass. A consumer that
genuinely wants the old behaviour can set `darkMode: "media"` in its own
`tailwind.config.js`, which overrides the preset.

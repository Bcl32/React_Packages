# @bcl32/themes

## 5.1.0

### Minor Changes

- 1fd05f7: Add the card backdrop palette: `surface-1 … surface-8` on every theme.

  The sibling of `chart-1 … chart-5`, but tuned for fills rather than marks, so
  grouped cards and sections can carry their own subtle backdrop instead of a
  wall of identical frames. Chart colours were the wrong shape for this: their
  lightnesses differ by more than 20 points within a theme, so equal tints of
  them read as unequal weights.

  Each theme's eight share one lightness and one saturation, both derived from
  that theme's own `card`/`accent`, and differ only in hue — spread on a
  perceptually-corrected ladder anchored on the theme's `primary`. One lightness
  across the family is what lets `card-foreground` stay the single text colour
  for all eight (worst measured ratio 8.8:1), so there are no
  `surface-N-foreground` tokens to keep in step. Values are opaque, so a nested
  surface can apply its own alpha without two tints multiplying.

  - `scripts/seed-surface-palette.mjs` (`pnpm seed-surfaces`) generates them.
    Idempotent — a theme that already has `surface-1` is skipped, so values
    hand-tuned in the theme editor survive a re-run; `--force` reseeds,
    `--dry-run` prints, `--count N` resizes the family (resampling the hue curve,
    so the perceptual spacing survives a different size). It also splices the
    matching `style_metadata.json` entries, which is what puts the tokens under
    the editor's new **Cards** tab rather than silently under "Sidebar & Extra".
  - `SURFACE_COUNT` is exported from `contrastCheck` and **derived from
    themes.json**, not declared — the same choice `LIGHT_THEMES` and the preset's
    dark-theme list already make. It is the minimum across themes, so an index
    below it resolves under every theme.
  - `CONTRAST_PAIRS` grows with it, checking every backdrop against
    `card-foreground`, so a hand-tune that drifts too dark is caught in the editor.
  - `ThemeExample` draws the family, sized from the same derived count.

  The seeder's `DEFAULT_SURFACE_COUNT` is now the only place the number 8 appears
  anywhere in the monorepo: resizing the palette is one `--count N --force` run
  and nothing else, in any package.

## 5.0.1

### Patch Changes

- 25838eb: fix(utils,themes): move dialog keyframes into the preset as named animations
- Updated dependencies [25838eb]
  - @bcl32/utils@2.10.1

## 5.0.0

### Major Changes

- 6834040: Bind Tailwind's `dark:` variant to `data-theme` instead of the OS colour scheme.

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

### Minor Changes

- 6834040: Tune `warning` / `warning-foreground` per theme.

  `warning` was the one token `themes.json` never varied — `hsl(38 92% 50%)` in all
  nine themes, with the same `warning-foreground` beneath it, while `primary`,
  `destructive` and `success` were all tuned per theme. That fixed mid-amber only
  ever contrasted against dark surfaces: on the light themes `text-warning`
  measured **1.97:1**, so the token could not be used for text and consumers fell
  back to hardcoded `text-amber-700 dark:text-amber-300` pairs.

  Each theme now gets its own value, following the same shape as `success`: the
  light themes (`light`, `light-blue`, `light-gold`) take a dark amber around 32-34%
  lightness with a near-white foreground, and the six dark themes take a 50%
  lightness amber with a dark foreground. Hue is shifted per theme where the
  default amber would have collided with that theme's own palette — `yellow` and
  `light-gold` move toward orange to clear their amber/gold `primary`, and `red`
  moves yellower to stay clear of both its `primary` and `destructive`.

  Every theme now clears WCAG AA (4.5:1) on all three of: `text-warning` on
  `background`, `text-warning` on a `bg-warning/10` tint, and `warning-foreground`
  on solid `warning`. Worst case is 4.53:1 (`yellow`, on tint). Perceptual
  separation from each theme's `primary`, `destructive` and `success` is ΔE ≥ 25.7
  (worst: `yellow` vs `destructive`).

  Consumers currently working around the old value with hardcoded amber pairs can
  switch to `text-warning` / `bg-warning` and drop the `dark:` variant.

## 4.1.0

### Minor Changes

- 23f5a19: Self-labelling filter charts on a shared chart palette.

  Filter charts draw their own header instead of relying on the consuming app to
  label them from outside. Histogram, PieChartFilter and BarChartFilter take an
  optional `title`, falling back to a humanized field name, so a chart is
  self-describing wherever it is dropped. `ChartMetadata.title?: string` is new —
  additive, hence minor. Single-series charts drop their now-redundant legend.

  Themes: the chart palette is reworked across the theme set so `--chart-1..n`
  read as one deliberate ramp per theme rather than unrelated accents. No presets
  added or removed, so nothing breaks — but every consuming app's chart colours
  change on upgrade.

  Consumers that hand-rolled a label above each chart (e.g. the app-side
  `entry.type !== "bar"` header block) should drop it and pass `title` through the
  chart metadata instead, or the label will render twice.

## 4.0.0

### Major Changes

- 793ff57: Rework the bundled theme presets: 10 themes become 9, and every dark theme is
  brought onto one surface/text structure.

  BREAKING: the `blue` and `dark-green` presets are **removed**. Any app that
  persisted either name (localStorage `vite-ui-theme`) or referenced it directly
  will no longer match a `[data-theme]` selector. `ThemeProvider` now guards
  against this — an unrecognised stored name falls back to `defaultTheme` instead
  of applying a `data-theme` no stylesheet defines (previously the palette
  silently fell back to the `:root` default while `theme_type` still classified
  the dead name, so light surfaces could render while `theme_type` reported
  `"dark"`).

  - **`dark-blue` rebuilt** as the merge of the old `blue` and `dark-blue`, taking
    the working half of each: `dark-blue`'s surface elevation (`blue` had `card`
    _darker_ than `background`, so cards sank into the page) and `blue`'s
    differentiated tokens (`dark-blue` assigned one identical value to `muted`,
    `border`, `input`, `secondary`, `accent` and `sidebar-accent`, flattening
    every surface). Then pushed bluer — background saturation 70%→88%, hue
    206→212 — now that `dark` no longer competes.
  - **`dark` retuned to neutral grey.** It was a blue slate whose background had a
    wider RGB channel spread (21) than `dark-blue`'s own (18); it is now
    achromatic (spread 2) with a near-white `primary`, so it reads as the neutral
    dark rather than a second blue theme.
  - **New `red` preset**, following the `purple`/`dark-blue` structure. `primary`
    and `destructive` are separated on three axes — hue (8° vs 350°), lightness
    (62% vs 42%) and text colour (dark vs white) — so a primary action never
    reads as a destructive one.
  - **`purple` fixed and brightened.** Its `card`/`popover` sat _below_
    `background` (11%/10% vs 13%), so cards sank; the ladder now rises
    9→11→13→14. Its text was also the dimmest of any dark theme and is lifted to
    match `dark-blue` (body 83%→95%, body contrast 11.3:1→16.5:1).

  `dark`, `dark-blue` and `red` now pass every WCAG AA text pair, chart-vs-surface
  and chart-separation check. `light`, `green`, `yellow`, `light-blue` and
  `light-gold` are unchanged and retain pre-existing contrast issues.

### Patch Changes

- Updated dependencies [b783f68]
  - @bcl32/utils@2.7.1

## 3.0.0

### Major Changes

- c8193b9: Theme editor overhaul with persistent per-theme customization.

  - Save/Reset in the editor: token edits diff against the base palette and persist per theme in localStorage (`bcl32-theme-overrides`); ThemeProvider re-applies saved overrides on load and clears stale inline variables on theme switch (stylesheet = base, inline vars = saved diff only).
  - Compact theme dialog: scrollable body, redesigned theme cards (miniature sidebar/page preview with donut chart, text samples and button) that reflect saved and in-progress customizations, active-theme ring + check, keyboard operable.
  - Token editor: group tabs (Main/Charts/Sidebar & Extra) exposing all 36 tokens, token search across groups, WCAG AA contrast warnings on failing fg/bg pairs, per-card copy-hex, fixed-height grid so the dialog no longer resizes between groups.
  - New ImportTheme component: paste Copy Theme JSON or CSS to apply + save as the active theme's customization; Copy Theme now emits valid JSON and inline "Copied!" feedback instead of alert().
  - ThemeProvider: follows OS light/dark changes live; `useTheme()` now exposes `resolved_theme`.
  - New subpath exports: `themeOverrides`, `contrastCheck`, `ImportTheme`; new colour utils `relativeLuminance` / `contrastRatio`.

  BREAKING: `ThemeGenerator` props changed — `main_styles` removed, `onEdited` callback added (token metadata now resolved internally). The dead opacity slider and inverted alpha handling were removed from `ColourControls`; `hslToHex` callers should pass alpha 1.

## 2.3.0

### Minor Changes

- a6f2de4: Add `success` / `success-foreground` tokens to all 10 themes (green hues
  tuned per theme, WCAG-checked foreground pairing) and rework
  `chart-1`..`chart-5` into categorical five-hue palettes in the 9 themes
  that previously shipped monochrome same-hue ramps (`purple` already had a
  categorical set and is unchanged). Each palette anchors chart-1 near the
  theme's primary hue and is validated for CVD separation and >=3:1
  contrast against the theme's background and card surfaces.

## 2.2.0

### Minor Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

### Patch Changes

- Updated dependencies [449d4de]
  - @bcl32/utils@2.5.0

## 2.1.5

### Patch Changes

- c1d7749: chore: bump workspace dependency floors to latest versions

## 2.1.4

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/utils@2.3.5

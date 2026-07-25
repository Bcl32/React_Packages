---
"@bcl32/themes": major
---

Theme editor overhaul with persistent per-theme customization.

- Save/Reset in the editor: token edits diff against the base palette and persist per theme in localStorage (`bcl32-theme-overrides`); ThemeProvider re-applies saved overrides on load and clears stale inline variables on theme switch (stylesheet = base, inline vars = saved diff only).
- Compact theme dialog: scrollable body, redesigned theme cards (miniature sidebar/page preview with donut chart, text samples and button) that reflect saved and in-progress customizations, active-theme ring + check, keyboard operable.
- Token editor: group tabs (Main/Charts/Sidebar & Extra) exposing all 36 tokens, token search across groups, WCAG AA contrast warnings on failing fg/bg pairs, per-card copy-hex, fixed-height grid so the dialog no longer resizes between groups.
- New ImportTheme component: paste Copy Theme JSON or CSS to apply + save as the active theme's customization; Copy Theme now emits valid JSON and inline "Copied!" feedback instead of alert().
- ThemeProvider: follows OS light/dark changes live; `useTheme()` now exposes `resolved_theme`.
- New subpath exports: `themeOverrides`, `contrastCheck`, `ImportTheme`; new colour utils `relativeLuminance` / `contrastRatio`.

BREAKING: `ThemeGenerator` props changed — `main_styles` removed, `onEdited` callback added (token metadata now resolved internally). The dead opacity slider and inverted alpha handling were removed from `ColourControls`; `hslToHex` callers should pass alpha 1.

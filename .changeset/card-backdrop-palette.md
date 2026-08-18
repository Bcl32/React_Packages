---
"@bcl32/themes": minor
---

Add the card backdrop palette: `surface-1 … surface-8` on every theme.

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

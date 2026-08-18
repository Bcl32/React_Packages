---
"@bcl32/datatable": minor
---

Sections view: `sectionTone` — give each group its own backdrop from the
theme's card palette (`surface-1 … surface-8`, new in @bcl32/themes).

Defaults to `"none"`, which is exactly today's neutral `card`/`background`
frame, so no existing consumer changes until it opts in. `"index"` colours by
top-level position with sub-sections inheriting their parent's hue — a group is
a top-level section *and everything under it*, not one colour per rendered box.
A function form maps the section's own value instead, for when "Kitchen" should
be the same hue on every page and reordering must not reshuffle the colours.

Settable on `DataTable` or per view def, like the other section props.

- `SectionWrapperInfo` gains `rootIndex` — the position of a section's
  top-level ancestor.
- `GroupSections` exports `themeSurfaceCount()`, `sectionToneStyle()`,
  `resolveSectionTone()` and the `SectionTone` type.

**The palette size is never written down here.** `themeSurfaceCount()` reads
the `--surface-N` custom properties off the running document and counts what is
actually there; backdrops are applied as `hsl(var(--surface-N))` inline styles
rather than `bg-surface-N` classes. So growing the palette in @bcl32/themes
needs no change in this package and no version bump — and an app on an older
@bcl32/themes measures zero and degrades to the neutral frame instead of
painting with a token that doesn't exist.

The probe is one `getComputedStyle` per sections render (not per section),
memoized per `data-theme`, and skipped entirely when `sectionTone` is `"none"`.
The memo is keyed rather than global because nothing guarantees two themes
define the same number, and a stale count resolves to a `var()` with no
definition — measured as transparent, i.e. a section that loses its backdrop on
a theme switch.
- The "no value" bucket is never tinted, whatever the resolver returns: it
  already signals itself with muted text and a dashed frame, and colouring it
  would make absence look like another group.

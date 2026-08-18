---
"@bcl32/datatable": minor
---

Sections view: `sectionsPacking` — 2D dense packing, so a page of
variable-height sections stops stranding vertical gaps.

CSS grid's dense auto-placement only back-fills *horizontally*, so a short
section beside a tall one left a hole nothing could reach. Sections now measure
their own height and take a `grid-row: span N` in coarse 48px modules, which
gives the flow something to pack against on both axes. 48 is load-bearing: a
collapsed header measures 46px, and a 44px module would ceil it to 2 and leave
a dead sliver under every collapsed section.

Tile sizes become **targets rather than auto-fill minimums**. Each section
computes an integer column count from its measured content width and admits one
extra column when the resulting tile shrink is within 12% — the measured gap
between "still looks like the size you picked" and "visibly smaller" (largest
accepted 9.9%, smallest rejected 14.8%). Rows then fill exactly instead of
leaving a chrome-induced empty track. Width is read from
`getBoundingClientRect()`, not `clientWidth`, because the rounding in the
latter flips column counts at the boundary.

Sub-sections are content-sized: a nested grid mirrors its parent's track count,
pinned children map proportionally through `spanTierTracks`, and an auto child
takes `clamp(ceil(sqrt(n)), 1, cap)` tracks — a narrow bias, since trading a
row for width reads better in a gallery than one long line.

`sectionsPacking` picks the strategy, on `DataTable` or per view def like the
other section props:

| mode | what it trades |
|---|---|
| `rows` | no packing at all — the pre-2.15 layout, exactly |
| `packed` | fills gaps, sub-sections stay equal-width |
| `fit-wide` | content-sized sub-sections, single-row bias |
| `fit-narrow` | content-sized sub-sections, stacks vertically (**default**) |
| `uniform` | every tile the same size (tolerance 0), pins still win |
| `tight` | 8px row module — masonry-close |

`fit-narrow` is the default because it is what the measurements favoured; a
consumer that wants the old behaviour byte-for-byte passes `rows`.

- The height observer stores **raw pixels** and `sectionRowSpan(h, modulePx)`
  derives the span at render. Quantizing at measurement time would freeze the
  geometry on the old module across a mode switch, because a ResizeObserver
  does not re-fire when nothing resized.
- Track counts ride CSS custom properties (`--sec-tracks`, `--sec-col-span`)
  consumed through `md:[…:var(…)]` classes, not inline styles — an inline style
  would beat the below-`md` single-column media query and break small screens.
- `SectionWrapperProps` gains `style`. A consumer's `renderSectionWrapper` must
  merge **both** `className` and `style` onto its element or sections will not
  pack; the wrapper is where the span lives, since the package's own
  `<section>` is one level inside the grid item.
- Measuring every section on every render deadlocks against framer-motion's
  commit-phase reflows (Maximum update depth). The layout effect measures only
  span-less sections; the ResizeObserver owns every update after that, and
  fires on `observe()` so nothing is missed.

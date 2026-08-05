---
"@bcl32/filters": minor
"@bcl32/utils": minor
---

feat(filters): compact the filter panel, and pin the name filter first

**Density.** The panel spent most of its height on chrome rather than controls: a
24px line of body text above every filter, three nested padded wrappers around
the grid, and a control set sized for a form rather than a toolbar. Measured on a
six-filter page at 1600px, the panel went from 276px to 170px and the cards from
104px tall / 322px wide to 45–72px / 252px.

- New internal `FilterHeader` gives all four filter types one caption row
  (`text-[11px]` uppercase, 16px) in place of three different label sizes and two
  different ✕ paddings. It carries the any/all and equals/contains rule pill, an
  `actions` slot, and the remove ✕.
- Controls step down together: comboboxes and text inputs to `h-8`/`text-xs`,
  toggle buttons to `h-6`, colour swatches to 24px, number inputs to `h-6` with a
  `h-1` slider track and a 28px histogram strip.
- `TimeFilter` drops its From/To captions for an arrow between the two triggers,
  and its Shortcuts/Reset buttons become icon-only — neither label fit beside a
  long field title in a narrower column.
- The panel's `pt-2` / `py-2` / `pb-1` wrapper stack collapses to one `py-1.5`,
  and `p-2` comes off the number and time cards, so every filter type now sits on
  the same rhythm.
- The grid goes from `1/2/3/4` at `gap-2` to `1/2/3/4/5` at `gap-x-3 gap-y-1.5`.
  `AllFilters` gets a `1/2/3` grid of its own — it was stacking every filter in a
  single column.

**`prettyOptionLabel`** (internal) formats enum-backed options for the
combobox/dropdown displays and the active-filter summary chip, which previously
disagreed with what the toggle buttons rendered. It rewrites *only* pure
lowercase snake tokens, so `in_progress` → `In progress` while `eSUN` and
`Black PLA` are untouched.

**Ordering.** `OrderFilters` now puts a filter on the `name` field at the head of
the pinned block, ahead of any declared `filterOrder`. Doing it here rather than
by annotating each entity covers pages whose pinned set isn't declared at all but
seeded from the table's columns, and entities added later that nobody remembers
to annotate. Consumers that deliberately ordered something else first will see
`name` move ahead of it.

Also fixes a latent bug in the same comparator: two pinned filters with no
declared `filterOrder` compared as `Infinity - Infinity` = `NaN`, which the
engine only read as "equal" by accident.

**`@bcl32/utils`** — `Combobox` gains `size?: "default" | "sm"`. `sm` shrinks the
input, the selected-value chips and the option rows together; sizing only the
input left the chips towering over it.

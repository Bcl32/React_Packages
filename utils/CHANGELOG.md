# @bcl32/utils

## 2.10.1

### Patch Changes

- 25838eb: fix(utils,themes): move dialog keyframes into the preset as named animations

## 2.10.0

### Minor Changes

- aa61594: Remove the `FileSystem` component and the `@heroicons/react` dependency.

  `FileSystem.tsx` was a non-animated duplicate of `AnimatedFileSystem.tsx` —
  same purpose, different icon set, no shared abstraction. Only
  `AnimatedFileSystem` is wrapped by `ShowHierarchy`, and nothing imported the
  plain one. It was the sole consumer of `@heroicons/react`, for three icons
  (`ChevronRightIcon`, `DocumentIcon`, `FolderIcon`) that `AnimatedFileSystem`
  already imports from `lucide-react` as `ChevronRight`, `File` and `Folder`.

  Dropping the dependency removes **20.8 MB** from every consumer's deps image,
  builder stage and CI pull.

  Released as a **minor** despite removing the public `./FileSystem` subpath.
  Nothing imports it: no file in Print-Tracker, Security-Benchmarks, Base-POC or
  Label-Designer references `FileSystem`, `FilesystemItem` or `FileSystemNode`,
  and no app imports `@bcl32/utils` as a barrel — every consumer uses subpath
  imports. A major would have invalidated the `workspace:^2.x` range in seven
  sibling packages (`charts`, `command-palette`, `datatable`, `filters`, `forms`,
  `navigation`, `themes`), causing npm to nest duplicate `utils` copies — which
  the consumers' `Dockerfile.deps` dedupe gate fails the build on.

## 2.9.0

### Minor Changes

- 4623304: feat(filters): compact the filter panel, and pin the name filter first

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
  disagreed with what the toggle buttons rendered. It rewrites _only_ pure
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

## 2.8.2

### Patch Changes

- 599ccc3: fix(utils): `useIsMobile` resolves on the first render instead of flashing desktop

  The hook seeded its state from `undefined` and filled it in from an effect, so
  every consumer got `false` on the first render regardless of the actual viewport
  and then re-rendered a frame later. Anything that _swaps layout_ on the mobile
  branch (rather than just hiding something) showed that as a visible flash and
  reflow. The width is now read synchronously in the `useState` initializer,
  guarded for a missing `window`; the `matchMedia` subscription is unchanged and
  re-reads on mount so a resize between render and effect can't be missed.

## 2.8.1

### Patch Changes

- 3d778c0: feat(utils,filters): scale up the colour picker for colour filters

## 2.8.0

### Minor Changes

- 16ccd13: Reorganize the time filter and its shortcuts dialog.

  **`TimeFilter`** no longer imposes its own `xl:grid-cols-3` layout. It nested
  inside the filter bar's page grid with no gutters, which crushed the two date
  pickers and the action buttons into a single narrow column. It now renders as a
  single-column card matching the sibling filters' `p-2 space-y-1.5` rhythm, with
  the label and actions on one row and From/To pickers aligned on a two-column
  grid below. Trigger labels use an abbreviated `MMM D 'YY, h:mma` format so they
  fit the column.

  **`TimeEditDialog`** moves off the `big` dialog size (`max-w-screen-2xl` and
  full viewport height) to `medium`, and is grouped into three sections: the
  selected span, quick ranges, and fine tuning. Spacing comes from `space-y`/`gap`
  utilities instead of bare `<br />` tags, and the hardcoded `w-[32rem]` on the
  step selector is gone.

  - Adds **Past 15 minutes**, **Past 1 hour**, and **Past 6 hours** shortcuts
    alongside the existing day/week/month/year ranges.
  - The span summary now prints only non-zero units — a 15 minute window read
    "0 Years 0 Months 0 Days 0 Hours 15 Minutes" before.
  - Warns when the end time precedes the start time, which previously rendered
    silently as a negative span.
  - The step-size selector no longer sets `bg-muted-foreground` (a foreground
    token) as a background.

  **`RadioButton`** gains optional `groupName` and `id` props. It previously
  hardcoded `name="option"` and derived `id` from the label, so several groups on
  one page formed a single radio group and shared duplicate DOM ids — with more
  than one time filter in the bar, changing the step size in one cleared it in the
  others. Both props default to the previous behaviour. Checked styling now uses
  `bg-primary`/`text-primary-foreground` instead of `bg-primary/50`/`text-white`,
  which was low-contrast in light themes.

## 2.7.1

### Patch Changes

- b783f68: Fix `ToggleGroup`'s selected state pairing mismatched colour tokens. The
  `data-[state=on]` variant painted `bg-primary/90` but set
  `text-accent-foreground` — two tokens never designed to sit together. It only
  ever read correctly by accident, whenever a theme's `primary` happened to be
  dark enough for near-white text.

  Measured across the bundled themes, the selected pill was effectively invisible
  in `green` (1.26:1), `yellow` (1.18:1) and `dark` (1.08:1), and failed WCAG AA
  in every theme except `light-gold`. It now uses `text-primary-foreground`, the
  token guaranteed to contrast with `primary` in every theme — e.g. `dark` goes
  1.08:1 → 14.63:1, `green` 1.26 → 14.64, `purple` 2.01 → 6.25.

  Visible anywhere `ToggleGroup` renders a selected option (range/interval/group-by
  pills, segmented controls).

## 2.7.0

### Minor Changes

- c91423d: Add `ExplainerTooltip` — a self-contained "explainer card" tooltip with title / prose / mono-footer slots for documentation-plus-live-data popovers (pattern ported from the k8s dashboard's InfoPopover, rebuilt on the Radix Tooltip primitives). Also portal `TooltipContent` to `<body>` and default `collisionPadding=8`, so tooltips are no longer clipped by `overflow: hidden` or transformed ancestors — applies to all existing Tooltip/CustomTooltip callers.

## 2.6.2

### Patch Changes

- 5972690: feat(utils): AnimatedTabs defaultIndex prop for opening on a specific tab

## 2.6.1

### Patch Changes

- b07d026: fix(utils): cap dialog height to viewport and scroll overflowing content

## 2.6.0

### Minor Changes

- 5e75c5f: feat(utils): renderSwatchIcon slot on ColourPickerPopover

## 2.5.0

### Minor Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

## 2.4.4

### Patch Changes

- 2c5779f: feat(forms,utils): two-level grouping in colour swatch picker
- dd1cf42: style(utils): emphasise sections in the colour swatch popover

## 2.4.3

### Patch Changes

- bb63cee: fix(utils): add Stepper to tsup build entry points

  The `./Stepper` subpath export and `src/Stepper.tsx` shipped in 2.4.1, but
  `Stepper` was never added to the tsup `entry` list — so `dist/Stepper.js`
  was never emitted and the published package carried a dangling export.
  Consumers importing `@bcl32/utils/Stepper` hit a Rollup "failed to resolve
  import" build error. Adding the entry makes tsup emit `dist/Stepper.js` so
  the export resolves.

## 2.4.2

### Patch Changes

- 45dcfbc: fix(forms,hooks,utils): standardize @tanstack/react-query as peerDep + externalize in tsup

## 2.4.1

### Patch Changes

- c9beb42: feat(utils): add Stepper component with navigation helpers

## 2.3.9

### Patch Changes

- 47ed598: fix(forms,utils): preserve filament identity in colour_array bulk edits

## 2.3.8

### Patch Changes

- e6a1b83: fix(utils): add Combobox to tsup entry points
- fa21c39: feat(utils): add Combobox component with deep-path export

## 2.3.7

### Patch Changes

- acd0e2c: feat(filters): add colour filter type with shared ColourPickerPopover

## 2.3.6

### Patch Changes

- 19d9b2a: Click-to-change colour swatches in ColourArrayField and DialogButton updates

## 2.3.5

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system

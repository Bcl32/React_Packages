# @bcl32/command-palette

## 1.1.2

### Patch Changes

- 31ef177: Every package declares `sideEffects: false`

  A bundler's central question about an unused export is "may I delete the module
  it came from?", and without this field the answer has to be no: a module that
  _might_ do something at import time cannot be dropped just because nothing reads
  a symbol from it. Tree-shaking then works only as far as Rollup's own analysis
  can prove purity on its own, which is well but not reliably, and not at all
  under bundlers that lean on the field instead.

  The promise is safe here, and it was checked rather than assumed. Across all
  eleven packages there are **no bare side-effect imports** (`import "./x.css"`),
  **no top-level writes to `window`, `document` or `globalThis`**, and **no CSS
  files at all** — styling is Tailwind classes, so nothing depends on import order
  to paint. That last one is the usual reason a package cannot make this promise,
  and it does not apply: there is no stylesheet here to be stripped.

  Module-level state that some modules do hold (a `Map` built at module scope) is
  not a blocking side effect — such a module is still only retained when something
  imports from it, which is exactly the behaviour wanted.

  What it is worth today was measured rather than guessed, and it is small:
  Home Helper's whole bundle came out 2,562 bytes lighter with the field than
  without it (3,647,634 against 3,650,196, same container, same inputs, both
  green) — 0.07%. Rollup was already proving most of this on its own.

  So this is insurance, not an optimisation. It guarantees the behaviour instead
  of leaving it to a bundler's analysis, and it matters more for anything that
  leans on the field rather than deriving the answer, where the current absence
  means no tree-shaking across this boundary at all. The related measurement, for
  scale: importing `RowActions` alone costs 58 KB more through the barrel than
  through its subpath, while in a file that already imports `DataTable` the two
  are byte-identical.

- Updated dependencies [31ef177]
  - @bcl32/hooks@4.2.1
  - @bcl32/themes@5.1.2
  - @bcl32/utils@2.10.3

## 1.1.1

### Patch Changes

- Updated dependencies [6834040]
- Updated dependencies [6834040]
  - @bcl32/themes@5.0.0

## 1.1.0

### Minor Changes

- 771a1d3: Add shortcut sequence hints: a which-key HUD and a leader-key grid

  The alias sequences the palette already understood were invisible until now — a
  typed prefix either resolved or silently expired. Two additions make them
  discoverable:

  - **SequenceHUD** — after a typed prefix (`g`, `s`, …) settles for `hintDelayMs`,
    a bottom panel lists every continuation. Enabled by default via the new
    `sequenceHints` prop (`"hud"` | `"off"`).
  - **LeaderGrid** — the new `leaderKey` prop binds a key that opens a clickable
    lettered card menu from a cold start. Backspace pops a level, Esc closes.

  New props on `CommandPalette`: `shortcutTrees`, `sequenceHints`, `hintDelayMs`,
  `leaderKey`, `prefixLabels`. New subpath exports: `./SequenceHUD`,
  `./LeaderGrid`, `./shortcutTrie`, `./useShortcutSequencer`.

  Backwards compatible: consumers that pass none of the new props keep the
  existing sequence behaviour, except that the HUD (on by default) holds a typed
  prefix until Esc/dead-key/mousedown rather than expiring it silently after
  1000ms. Pass `sequenceHints="off"` to restore the legacy expiry.

## 1.0.6

### Patch Changes

- e1d22d3: feat(command-palette): rebind numbered-result selection to shift+1-9

## 1.0.5

### Patch Changes

- 97a286e: feat(command-palette): add numbered results with alt+1-9 selection

## 1.0.4

### Patch Changes

- e20ba67: feat(command-palette): optional thumbnails in entity search results

## 1.0.3

### Patch Changes

- a5013c2: fix(command-palette): preventDefault the keydown that fires a global alias

## 1.0.2

### Patch Changes

- 3825b84: feat(command-palette): alias hotkeys — Tab tokens in-palette, global key sequences

## 1.0.1

### Patch Changes

- 6a54c56: feat(command-palette): new @bcl32/command-palette package (cmdk-based Ctrl+K palette)

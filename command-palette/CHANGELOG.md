# @bcl32/command-palette

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

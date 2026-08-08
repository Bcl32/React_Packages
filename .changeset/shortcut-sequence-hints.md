---
"@bcl32/command-palette": minor
---

Add shortcut sequence hints: a which-key HUD and a leader-key grid

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

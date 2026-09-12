# @bcl32/navigation

## 2.1.10

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
  - @bcl32/utils@2.10.3

## 2.1.9

### Patch Changes

- 0573ae2: Add a JSDoc comment to the `NavigationEntry` interface. Also serves as the green-path validation release for the hardened publish pipeline.

## 2.1.8

### Patch Changes

- 729bc20: fix(navigation): use unique breadcrumb keys to prevent React duplicate-key warning

## 2.1.7

### Patch Changes

- 4e1a98a: chore(deps): make react-router-dom a peer dependency of navigation

## 2.1.6

### Patch Changes

- c1d7749: chore: bump workspace dependency floors to latest versions

## 2.1.5

### Patch Changes

- f1d75d1: fix(navigation): render breadcrumb as BreadcrumbPage when url is missing

## 2.1.4

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/utils@2.3.5

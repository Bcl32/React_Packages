---
"@bcl32/account": patch
"@bcl32/charts": patch
"@bcl32/command-palette": patch
"@bcl32/data-utils": patch
"@bcl32/datatable": patch
"@bcl32/filters": patch
"@bcl32/forms": patch
"@bcl32/hooks": patch
"@bcl32/navigation": patch
"@bcl32/themes": patch
"@bcl32/utils": patch
---

Every package declares `sideEffects: false`

A bundler's central question about an unused export is "may I delete the module
it came from?", and without this field the answer has to be no: a module that
*might* do something at import time cannot be dropped just because nothing reads
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

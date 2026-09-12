---
"@bcl32/datatable": patch
---

`RowEditButton` is importable at its own subpath

It shipped in 2.12.0 through the barrel alone. `src/index.ts` re-exports it, so
`import { RowEditButton } from "@bcl32/datatable"` has always worked, but the
`exports` map never named `./RowEditButton` — and since `tsup.config.ts` derives
its entries FROM that map, no `dist/RowEditButton.js` was built either. The
subpath resolved to nothing.

Every consumer in the fleet imports these components by subpath, so the first one
to reach for this component reached for the spelling that does not exist: Home
Helper's `/Furniture/:id` and `/Meshes/:id` pages, whose React image has failed
to build since. Vite says `Missing "./RowEditButton" specifier in
"@bcl32/datatable"`, one repo away and after release.

This is the third instance of the shape `tsup-entries.ts` was written to close,
and the first from the other direction. Its header records the other two —
`@bcl32/filters` `./PageFilterBar`, `@bcl32/data-utils` `./types` — both of which
DECLARED an export and never built it. Deriving entries from the map fixed that
half for good. This half is the map itself going unwritten, which no derivation
can catch: a module re-exported from the barrel and nowhere else is
indistinguishable, to every check that runs in this repo, from one that was
meant to stay internal. The entry-point CI guard added alongside the derivation verifies
that every declared export exists in the packed artifact, and an undeclared one
is exactly what it has nothing to say about.

Nothing else changes — the barrel export stays, so both spellings now work.

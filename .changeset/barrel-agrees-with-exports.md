---
"@bcl32/datatable": minor
"@bcl32/filters": minor
"@bcl32/data-utils": patch
---

The barrel may no longer publish what the exports map does not

Three surfaces answer "what is public" here: the exports map, the build's
entry list, and `src/index.ts`. `tsup-entries.ts` derived the second FROM the
first so those two cannot disagree; the barrel was left independent, and
`RowEditButton` is what that cost — re-exported from `index.ts`, absent from
the map, therefore never built, therefore unreachable at
`@bcl32/datatable/RowEditButton`. It failed in a consumer's CI, one repo away,
after release.

`.github/scripts/check-barrel.mjs` closes it. Every module the barrel
re-exports must either be named in the exports map or listed in
`bcl32.barrelOnlyModules` — public both ways, or barrel-only on purpose. The
check compares two files, so it runs ungated and before the build, and a stale
list entry (a module that has since gained a subpath, or left the barrel) is an
error in its own right. Nothing can infer this intent, which is why it is asked
for rather than derived: a module re-exported from the barrel and nowhere else
is indistinguishable from one deliberately kept off the subpath list.

**Six modules gain the subpath they should always have had.** Each was chosen
on evidence rather than taste — consumers already reaching for it, or a direct
sibling that has one:

- `datatable/SectionNesting` and `datatable/TreeBoard` — imported from the root
  barrel by Home Helper, House Hunter and Print-Tracker today, in fifteen
  statements, because there was no other way in
- `filters/useEntityGroups` — the same, in Print-Tracker
- `datatable/SectionsView` — the only one of five views without a subpath
  (`TableView`, `CardView`, `BoardView`, `DetailPaneView` all have one)
- `datatable/CardActions` — the card-shaped half of `RowActions`, which has one
- `filters/FilterSearchBar` — named in 3.10.0's own changelog beside
  `AddFilterPicker`, which has one

**Ten are declared barrel-only**, which is a decision recorded rather than a
gap: `datatable` `CardCells`, `ColumnLabels`, `GroupControl`, `GroupSections`,
`SortControl`, `ViewDefs`, `ViewScroll`; `filters` `EntityGroupCards`,
`FilterSearch`; `data-utils` `apiCapabilities`. None has a consumer, and the
asymmetry is deliberate: adding a subpath later is additive, withdrawing one is
breaking, so absent evidence the reversible answer wins. Flipping any of them is
one exports entry and a rebuild.

Nothing is removed and no existing import changes — the barrel exports stay, so
both spellings work for the six.

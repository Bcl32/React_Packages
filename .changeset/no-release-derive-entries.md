---
---

Build-config refactor only: tsup entries are now derived from each package.json
exports map (see tsup-entries.ts). All 11 packages rebuild byte-identically, so
there is nothing to release.

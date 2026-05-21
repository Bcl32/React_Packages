---
"@bcl32/utils": patch
---

fix(utils): add Stepper to tsup build entry points

The `./Stepper` subpath export and `src/Stepper.tsx` shipped in 2.4.1, but
`Stepper` was never added to the tsup `entry` list — so `dist/Stepper.js`
was never emitted and the published package carried a dangling export.
Consumers importing `@bcl32/utils/Stepper` hit a Rollup "failed to resolve
import" build error. Adding the entry makes tsup emit `dist/Stepper.js` so
the export resolves.

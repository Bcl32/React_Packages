---
"@bcl32/filament-look": minor
---

feat(filament-look): new package, what a filament looks like, shared by the shop and Print-Tracker. `/finishes` (finishForSubType, the OVERRIDES table with the Silk Multi-Color pairs, swatchProps, finishDescriptor, hex/alpha parsing, Clear tint, minimum mesh opacity, swatchLook), `/swatch` + `/swatch.css` (the finish-aware 2D swatch, server-safe), `/materials` (FINISH_PARAMS, buildFinishMaterial with the silk, silk-multi, sparkle, galaxy, metal, marble and wood GLSL, applyFinishEnvMap, updateFinishTime; three ~0.172 peer) and `/geometry` (bake quantised meshes to centred millimetre floats for the shaders). Ported unchanged from Print-Tracker.

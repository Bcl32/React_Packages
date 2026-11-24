# @bcl32/makery

## 0.1.0

### Minor Changes

- 8927989: feat(makery): new package, everything Print-Tracker and the shop share in React, by subpath. How a filament looks: `/finishes` (finishForSubType, the OVERRIDES table with the Silk Multi-Color pairs, swatchProps, finishDescriptor, hex/alpha parsing, Clear tint, minimum mesh opacity, swatchLook), `/swatch` + `/swatch.css` (the finish-aware 2D swatch, server-safe) and `/materials` (FINISH_PARAMS, buildFinishMaterial with the silk, silk-multi, sparkle, galaxy, metal, marble and wood GLSL, applyFinishEnvMap, updateFinishTime; three ~0.172 peer). How a part is shown: `/geometry` (bake quantised meshes to centred millimetre floats for the shaders), `/reference` (a toonie, a payment card, a drinks can and a 30 cm ruler drawn at their real sizes, plus a banana from a model file the app serves; buildReference, placeReferenceBeside, for Y-up or Z-up scenes) and `/dimensions` (dimensionsOf, formatMm, formatDimensions, buildDimensionOverlay: the bounding box with a length label per axis). Ported from Print-Tracker.

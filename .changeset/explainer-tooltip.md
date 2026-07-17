---
"@bcl32/utils": minor
---

Add `ExplainerTooltip` — a self-contained "explainer card" tooltip with title / prose / mono-footer slots for documentation-plus-live-data popovers (pattern ported from the k8s dashboard's InfoPopover, rebuilt on the Radix Tooltip primitives). Also portal `TooltipContent` to `<body>` and default `collisionPadding=8`, so tooltips are no longer clipped by `overflow: hidden` or transformed ancestors — applies to all existing Tooltip/CustomTooltip callers.

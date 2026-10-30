---
"@bcl32/data-utils": patch
---

`min`, `max`, `min_exclusive`, `max_exclusive` and `decimals` are now generated ModelAttribute keys: schema_utils 0.22.0 writes them, so `MODEL_ATTRIBUTE_KEYS` records them as `"generated"` rather than `"planned"`. No API change.

---
"@bcl32/data-utils": patch
---

`integer` is now a generated ModelAttribute key: schema_utils 0.21.0 writes `integer: true` on every `int` field, so `MODEL_ATTRIBUTE_KEYS` records it as `"generated"` rather than `"planned"`. No API change.

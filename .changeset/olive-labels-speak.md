---
"@bcl32/forms": patch
---

Form labels now use the schema-provided `title` instead of the raw field name.

The label expression `name[0].toUpperCase() + name.slice(1)` was inlined at
twelve call sites in two variants — half of them replaced underscores and half
didn't, which is how a single dialog ended up showing "Vendor id:" next to
"Sub_type:" and "Colour_hex:". All twelve now go through one `fieldLabel(attr)`
helper that prefers `attr.title` (which the API humanizes to "Volume (mm³)",
"Source 3MF filename", "Object ID") and falls back to the humanized field name
for hand-built attributes with no title.

`fieldLabel` is exported for consumers that render their own field scaffolding.

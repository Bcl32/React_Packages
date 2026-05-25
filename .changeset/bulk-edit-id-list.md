---
"@bcl32/data-utils": patch
"@bcl32/forms": patch
"@bcl32/datatable": patch
---

feat(forms,data-utils,datatable): id_list support for bulk-edit and stats

FormElement now renders id_list as a label-space Combobox over `attr.options`
({value, label} pairs), BulkEditModelForm includes id_list fields in its
list-style merge/replace toggle (defaulting to "Add to existing"), and
StatsTable skips id_list rather than falling through to default rendering.
Unlocks bulk-editing reference-array fields like Part.systems.

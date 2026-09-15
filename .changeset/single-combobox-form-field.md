---
"@bcl32/forms": minor
---

FormElement renders the `single_combobox` field type

The schema generator has emitted `single_combobox` (from a Pydantic
`json_schema_extra` `format`) for a long time, and `FormElement` had no branch
for it: the field hit `default: return null` and `canRenderFormElement` returned
false, so every generated add/edit/bulk-edit dialog silently dropped it. Only
the apps' hand-written `EditableDetailItem` handled the type, which is why the
gap was invisible until somebody tried to edit such a field from a table.

It now renders as the single-select sibling of `list` — a free-text Combobox
over the schema's suggested options, plus a clear button that writes `null`
rather than an empty string.

Two fields in the fleet are affected and will start appearing in generated
forms: Home-Helper `furniture_item.current_room` and Print-Tracker
`print_job.bed_type`.

---
"@bcl32/data-utils": minor
"@bcl32/forms": minor
"@bcl32/filters": minor
"@bcl32/datatable": patch
---

A field's unit is printed beside its number instead of inside its title. `schema_utils` 0.23.0 drops the "(cm)" from titles and sends `unit_label`, and this release reads it: a number box shows the unit inside its border, filter chips and search suggestions print it after the value, and a filter card's header and a table's card and sort labels add it in parentheses. A `UnitAdapter`'s suffix replaces the stored unit, so a field shown in inches reads "in" everywhere. New in `@bcl32/data-utils/numbers`: `displayUnit` and `labelWithUnit`. Publish this before regenerating any app's metadata with `schema_utils` 0.23.0, or those fields lose their unit.

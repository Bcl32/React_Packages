---
"@bcl32/data-utils": minor
"@bcl32/hooks": patch
"@bcl32/filters": minor
"@bcl32/forms": patch
"@bcl32/datatable": patch
---

`ModelAttribute` declares every key: the 33 schema_utils writes, plus `accept`, `searchAliases`, `unit_label`, `description` and `groupBy`, and it has no index signature any more, so a misspelt key is a type error. Value types are honest where they were loose or wrong: `type` is `AttributeType | (string & {})`, `options` is `{value, label}[] | string[]` (was `unknown`), `filter_type` is `AttributeFilterType`, `filter_rule` is `string | null` (datetime and date filters carry null), `stats` is `unknown` (was `boolean`), and `cell_shape`, `selection`, `display`, `colour_presets` and `options_source` take their own types. `description` and `groupBy` are deprecated. `ModelData` adds `set_name`, `chart_filters`, `api_url_base` and `get_api_url` and keeps its index signature.

`@bcl32/data-utils` exports the new `AttributeType`, `AttributeFilterType` and `AttributeOptionsSource`, and `FilterDisplay`, `FilterCellShape`, `FilterSelection` and `ColourPresetsConfig`, which moved down from `@bcl32/filters`. `@bcl32/data-utils/modelAttributeKeys` adds `MODEL_ATTRIBUTE_KEYS` (each key with its origin: generated, hand-written, react-only or planned), checked against the type with `satisfies`, so the list and the interface cannot disagree.

`@bcl32/filters` re-exports the moved types from the same places as before, `FilterKind` is `AttributeFilterType | "custom"`, and `FilterData` is narrowed to `FilterValue & { name: string }` (it was an index signature). A filter built from an attribute whose `filter_rule` is null now gets `rule: undefined`, as the type always said.

`@bcl32/hooks`' internal `AttrLike` drops its index signature. `@bcl32/forms`, `@bcl32/filters` and `@bcl32/datatable` read the newly declared keys without casts; nothing else changes at runtime.

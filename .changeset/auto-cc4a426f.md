---
"@bcl32/forms": major
"@bcl32/charts": major
"@bcl32/utils": minor
"@bcl32/themes": minor
"@bcl32/filters": minor
"@bcl32/datatable": minor
---

Remove MUI entirely; unify theming on themes.json tokens.

BREAKING: forms drops ButtonDatePicker (datetime fields use the new
@bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
@bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
filters/datatable swap MUI icons for lucide-react.

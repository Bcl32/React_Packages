---
"@bcl32/utils": minor
"@bcl32/forms": patch
"@bcl32/filters": patch
---

Every filter and form control has an accessible name.

- utils: `Combobox` takes an `id`, put on its text input so a `<label htmlFor>` can name it.
- forms: `FormElement`'s labels point at the id their control carries (`input_<name>`). The select, datetime, list, single_combobox, id_list and reference fields pointed at a bare name no element had.
- filters: the number filter's min and max boxes are named "<label> minimum"/"maximum", and their +/− buttons "Raise/Lower <label> minimum/maximum". The text filter's box is named after its field.

---
"@bcl32/forms": minor
---

`EditableDetailItem` moves into forms (`@bcl32/forms/EditableDetailItem`, also from the barrel), out of Home Helper and Print Tracker, which each carried a near-identical ~500-line copy. The click-to-edit detail field keeps its UX — a click opens the editor, blur or Enter saves through `onSave({ [field]: value })`, Escape cancels, a select saves on change, an unchanged value sends nothing — and its number editing is now `FieldInput`'s number box, so a detail field gains the unit adapter, money's currency inside the box, `min`/`max`, `decimals` and `integer`. Refused text (unreadable, a fraction, a third decimal, out of range) keeps the editor open and `aria-invalid` with the reason under it. The apps' own `coerceValue`/`isChange` are gone with the copies. Spacing is a `density` prop (`tight` default, `comfortable`), set app-wide with `DetailDensityProvider`; `icon` draws before the label.

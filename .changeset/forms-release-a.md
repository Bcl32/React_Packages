---
"@bcl32/forms": minor
"@bcl32/utils": minor
---

Forms: a light field layer, pure validation and a renderer registry. All additive: with no new props, no registry and no provider every existing form renders and behaves as before (characterisation snapshots of FormElement, FieldInput, ColourField and ColourPickerPopover are unchanged).

**@bcl32/forms**

- `@bcl32/forms/validate` (new subpath, pure, Node-safe; imports only `@bcl32/data-utils/numbers`): `validate(attrs, values, opts)`, `validateField`, `textLength` (NFC code points, as Python counts), `isEmptyValue`, `issueText`. Rules: required (`attr.required`, a non-nullable null number, `""` with `min_length >= 1`), `min_length` / `max_length`, named `charset` policies that report the offending characters, `pattern` as an unanchored search like Pydantic (an uncompilable pattern is skipped, never thrown), number bounds / integer / decimals on the value, a select's options, the registry's per-type rule, cross-field rules and `x-` custom codes. Works on a structural `FieldBase` / `RuleSource`, so hand-written descriptors can carry string rules without a data-utils change. Opt-in: nothing calls it yet, and `fieldErrors` output is unchanged; `fieldErrorText` now delegates to `issueText` with identical words.
- `@bcl32/forms/fields` (new subpath, renders on a server with no providers, never imports hooks, react-query, sonner, dayjs, Combobox, DateTimePicker, Tooltip, RelationCollectionField or ColourField): `FieldInput` (now public; props unchanged, plus optional `size` and `classNames`), `FieldShell` (plain label, inline hint, error), `FieldSet` (controlled, returns a new object) and `useFieldSetState`, `FieldRegistryProvider` / `useFieldRegistry` / `mergeRegistries` and the `FieldRegistry` / `FieldRenderer` / `FieldRenderProps` types, `lightRenderers`, `FieldStyleProvider`. About 16 KB gzip.
- `FormElement` gains a `renderers` prop and reads `FieldRegistryProvider`: a registered type is drawn before the built-in switch, which is untouched. `canRenderFormElement(attr, renderers?)` knows registered types (a non-object second argument is ignored, so `.filter(canRenderFormElement)` still works). `EditModelForm` and `BulkEditModelForm` read the context, so forms hosted by `@bcl32/datatable` see a provider without a datatable release.
- `FieldInput` forwards `invalid` / `describedBy` as `aria-invalid` / `aria-describedby` on every type; nothing is written when neither is passed.
- Styling: `size` (`sm` = today's compact, `md` = today's default, `lg` = 48 px, text-base) and `classNames` slots (root, label, legend, optional, hint, control, input, error) on `FieldShell`, `FieldInput` and `FieldSet`, merged with tailwind-merge. Unset, the markup is byte-identical.
- `@bcl32/forms/ColourFieldView` (new subpath): the colour field with swatches as a prop and no fetch. `ColourField` is now its fetch plus this view, with the same props and markup, and also accepts `allowCustom` and `renderSwatchIcon`. Its popover now closes on Escape and returns focus to the trigger, instead of Escape reaching (and closing) a dialog behind it.
- SSR: `RelationCollectionField` reads its folded sections only when there is a window (still synchronously on the client, so nothing flashes open); `AutoGrowTextarea` and the folded-note measure use an isomorphic layout effect; the dayjs utc/timezone setup moved from four module-scope copies into one `datetimeSetup` module used by the datetime renderer.
- `@tanstack/react-query`, `dayjs` and `sonner` are now optional peers (`peerDependenciesMeta`); the CRUD forms still need them, as before.

**@bcl32/utils**

- `ColourPickerPopover`: `allowCustom` (default `true`) hides the Custom colour input when false; optional `onClose`, called on Escape, which then stops at the popover (a dialog behind stays open) and returns focus to the element that had it when the popover opened. Without `onClose`, Escape is untouched. Default markup is unchanged.

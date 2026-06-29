# @bcl32/forms

> Reference documentation for the `@bcl32/forms` package.
> See also: [Packages Overview](../00-OVERVIEW.md)

| | |
| --- | --- |
| **Package** | `@bcl32/forms` |
| **Version** | `2.6.1` |
| **Tier** | `composite` |

## Purpose

`@bcl32/forms` provides **data-driven CRUD form components** — add, edit, bulk-edit, and
delete — that are driven entirely by a `ModelData` / `ModelAttribute` descriptor object
(from [`@bcl32/data-utils`](./data-utils.md)). It also ships a set of **standalone field
primitives** (colour pickers, an auto-growing textarea, a button-style date/time picker, an
inline relation-collection editor) and a small **debounce utility hook**.

The descriptor pattern means consumers never write inline field configuration; instead they
construct a `ModelData` object whose `model_attributes` array declares each field's `name`,
`type`, `editable` flag, `options`, `reference`, `colour_presets`, `help_text`, etc., and the
forms render themselves from that.

## Installation & Import

This is a workspace package; it is consumed via the pnpm `workspace:` protocol:

```jsonc
// package.json
{
  "dependencies": {
    "@bcl32/forms": "workspace:^2.6.1"
  }
}
```

Imports may use the barrel entry point or per-component subpaths (both are declared in the
package `exports` map):

```ts
// Barrel import
import { AddModelForm, EditModelForm, FormElement } from "@bcl32/forms";

// Subpath import (deeper tree-shaking / explicit dependency)
import AddModelForm from "@bcl32/forms/AddModelForm";
import { ColourField } from "@bcl32/forms/ColourField";
```

> **Caveat:** `ColourField` is **not** re-exported from the barrel (`index.ts`). It is only
> reachable through the `@bcl32/forms/ColourField` subpath. `ColourArrayField`, by contrast,
> is available from both the barrel and the `@bcl32/forms/ColourArrayField` subpath.

## Public Exports

### Form components

| Name | Kind | Description | Signature / Props |
| --- | --- | --- | --- |
| `AddModelForm` | component | Renders a 2-column grid form for creating a new entity. Derives defaults from `ModelData` via `getFormDefault`, POSTs via `useDatabaseMutation`, and fires a sonner toast on success. | `(props: { ModelData: ModelData; add_api_url: string; query_invalidation: string[]; processing_function?: () => void; onClose?: () => void; onSuccess?: () => void }) => JSX.Element` |
| `EditModelForm` | component | Same 2-column grid pre-populated with `obj_data`. Computes a **minimal PATCH body** (only changed fields, via `changedFields` / `_diff.ts`), PATCHes to `ModelData.update_api_url/:id`, and toasts on success. | `(props: { ModelData: ModelData & { update_api_url: string }; query_invalidation: string[]; obj_data: { id: string \| number; [key: string]: unknown }; processing_function?: () => void; onSuccess?: (formData: FormData, objData: ObjData) => void; onClose?: () => void }) => JSX.Element` |
| `BulkEditModelForm` | component | Lets the user enable individual fields to patch across multiple selected rows. POSTs `{ ids, data, merge_fields }` to `update_api_url/bulk-update`. Handles the `colour_array` paired `_ids` sibling, merge-vs-replace mode for `list`/`id_list` fields, and avoids the rowSelection-clear-before-`isSuccess` unmount bug via refs. | `(props: { ModelData: ModelData & { update_api_url: string }; query_invalidation: string[]; rowSelection: Record<string, boolean>; setRowSelection: Dispatch<SetStateAction<Record<string, boolean>>>; onSuccess?: (ids: string[], data: FormData) => void; onClose?: () => void }) => JSX.Element` |
| `DeleteModelForm` | component | Confirms and POSTs deletion of selected row ids to `delete_api_url/bulk`. Handles `409` conflict responses with a structured skip-or-cascade resolution UI (internal `DeleteConflictView`). | `(props: { delete_api_url: string; query_invalidation: string[]; rowSelection: Record<string, boolean>; setRowSelection: Dispatch<SetStateAction<Record<string, boolean>>>; onClose?: () => void; onSuccess?: () => void }) => JSX.Element` |

### Field renderers & primitives

| Name | Kind | Description | Signature / Props |
| --- | --- | --- | --- |
| `FormElement` | component | Single-field renderer dispatched on `ModelAttribute.type`. Supported types: `string`, `textarea`, `number`, `boolean`, `list` (freeSolo Combobox), `id_list` (multi-select with value/label mapping), `select`, `datetime` (`ButtonDatePicker` inside a `LocalizationProvider`), `colour`, `colour_array`, `relation_collection`, `id` (with `reference` → `IdReferenceField` Combobox), `file`. Returns `null` for unrecognised types. | `(props: { entry_data: ModelAttribute; formData: FormData; setFormData: Dispatch<SetStateAction<FormData>>; change_datetime: (value: Dayjs \| null, name: string) => void }) => JSX.Element \| null` |
| `canRenderFormElement` | util | Predicate that mirrors `FormElement`'s non-null branches. Used by `BulkEditModelForm` and `EditModelForm` to filter out "ghost" cards for attributes that would render `null` (e.g. an `id` without `reference`, or unknown types). | `(attr: ModelAttribute) => boolean` |
| `ButtonDatePicker` | component | MUI `MobileDateTimePicker` wrapped so it renders as an **outlined MUI Button** (not an input). The button's text is the formatted label; clicking opens the picker modal. Manages its own open state. **Requires a parent `LocalizationProvider`.** | `(props: Omit<MobileDateTimePickerProps<Dayjs>, 'open' \| 'onOpen' \| 'onClose'> & { id?: string }) => JSX.Element` |
| `ColourField` | component | Single-colour picker button backed by `ColourPickerPopover`. When the field name matches `*_colour(s)` it writes a parallel `*_ids` array into `formData` for FK tracking. Colour presets are fetched via `useGroupedSwatches` using `ModelAttribute.colour_presets`. **Subpath-only export.** | `(props: { entry_data: ModelAttribute; formData: FormData; setFormData: Dispatch<SetStateAction<FormData>> }) => JSX.Element` |
| `ColourArrayField` | component | Multi-colour swatch array editor. Each colour renders as a clickable circle with a remove badge; a `+` button adds new colours. Tracks a parallel `*_ids` FK array alongside the hex array. Edit/add each open a `ColourPickerPopover`. | `(props: { entry_data: ModelAttribute; formData: FormData; setFormData: Dispatch<SetStateAction<FormData>> }) => JSX.Element` |
| `AutoGrowTextarea` | component | A controlled `<textarea>` that auto-sizes its height to `scrollHeight` on every value change (via `useLayoutEffect`). Accepts a `ref`. No dependencies beyond React. | `React.ForwardRefExoticComponent<AutoGrowTextareaProps & React.RefAttributes<HTMLTextAreaElement>>`, where `AutoGrowTextareaProps` extends `TextareaHTMLAttributes` with a required `value: string` |
| `RelationCollectionField` | component | Inline-editable child-collection panel (`relation_collection` type). **Live mode** (`baseUrl` present): fetches rows via `useGetRequest`, renders each as a card with per-row debounced PATCH, and supports add, delete, sort, and an optional thumbnail (fetch/upload/clear). **Create mode** (no `baseUrl`): shows a disabled notice. | `(props: { entry_data: ModelAttribute; baseUrl?: string; entityLabel?: string; resolveAssetUrl?: (path: string) => string; formData?: FormData; setFormData?: Dispatch<SetStateAction<FormData>> }) => JSX.Element` |

### Hooks

| Name | Kind | Description | Signature |
| --- | --- | --- | --- |
| `useDebouncedCallback` | hook | Returns `{ debounced, flush, cancel }` for a callback. Trailing-edge debounce; latest args win; flushes on unmount. Used internally by `RelationCollectionField` for auto-save. | `<A extends unknown[]>(fn: (...args: A) => void, delay?: number) => { debounced: (...args: A) => void; flush: () => void; cancel: () => void }` |

### Types

| Name | Kind | Description | Signature |
| --- | --- | --- | --- |
| `FormData` | type | Plain index-signature type used as the state shape for all form components. | `export interface FormData { [key: string]: unknown }` |
| `FormElementProps` | type | Props interface for `FormElement`, exported for consumers that build custom wrappers. | `export interface FormElementProps { entry_data: ModelAttribute; formData: FormData; setFormData: Dispatch<SetStateAction<FormData>>; change_datetime: (value: Dayjs \| null, name: string) => void }` |
| `EntryData` | type | **Deprecated** re-export alias for `ModelAttribute` from `@bcl32/data-utils` (JSDoc-marked `@deprecated`). Use `ModelAttribute` directly. | `export type EntryData = ModelAttribute` |

## Dependencies

### Internal (`@bcl32/*`)

| Package | Used for |
| --- | --- |
| [`@bcl32/data-utils`](./data-utils.md) | `ModelData`, `ModelAttribute`, `getFormDefault`, and related descriptor types. |
| [`@bcl32/hooks`](./hooks.md) | `useDatabaseMutation`, `useGetRequest`, and `apiFetch` (used directly by `DeleteModelForm`). |
| [`@bcl32/utils`](./utils.md) | Shared UI primitives — `Combobox`, `ColourPickerPopover`, Radix `ToggleGroup` (in the delete conflict view), etc. |

### Peer dependencies

These must be supplied by the consuming app:

| Package | Range |
| --- | --- |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `@tanstack/react-query` | `^5.18.1` |
| `dayjs` | `^1.11.10` |
| `sonner` | `^2.0.7` |

### External (bundled) dependencies

`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`, `lucide-react`.

### UI libraries

- **MUI** — `@mui/material` and `@mui/x-date-pickers` (the latter powers `ButtonDatePicker`'s
  `MobileDateTimePicker`; `@mui/icons-material` supplies e.g. `DeleteModelForm`'s `DeleteIcon`).
- **Radix** — used indirectly via `@bcl32/utils`' `ToggleGroup` in `DeleteModelForm`'s conflict view.
- **Tailwind CSS** — utility classes used throughout for layout, spacing, and colour.

## Conventions & Patterns

Things a consumer **must** know to use this package correctly:

- **ModelData descriptor pattern.** All CRUD forms are driven by a `ModelData` object whose
  `model_attributes` array declares each field. Consumers must construct and pass this
  descriptor — no inline field config is accepted.
- **Edit requires `update_api_url`.** `EditModelForm` and `BulkEditModelForm` require the
  `ModelData` to be extended with `update_api_url` (`ModelData & { update_api_url: string }`).
  `AddModelForm` instead takes `add_api_url` as a **separate** prop, and `DeleteModelForm`
  takes `delete_api_url` directly.
- **`colour_array` carries a sibling `_ids` array.** `colour_array` (and `*_colour(s)`) fields
  silently manage a parallel `*_ids` FK array in `formData` (derived by replacing
  `/_colours?$/` with `/_ids/`). The backend schema must include this sibling key.
  `BulkEditModelForm` propagates it automatically, but `AddModelForm` / `EditModelForm`
  callers should be aware it will be submitted.
- **`ButtonDatePicker` needs a `LocalizationProvider`.** It requires a parent
  `@mui/x-date-pickers` `LocalizationProvider` with `AdapterDayjs`. `FormElement` wraps this
  internally for `datetime` fields, but **direct** `ButtonDatePicker` usage requires the
  consumer to supply the provider.
- **`RelationCollectionField` is dual-mode.** Without `baseUrl` it is a disabled placeholder;
  with `baseUrl` it fetches and manages child rows directly via `apiFetch` (bypassing the
  TanStack Query write path). On detail pages, pass `baseUrl` resolved to the parent entity's
  collection endpoint.
- **Do not clear `rowSelection` synchronously in `BulkEditModelForm`.** The form conditionally
  unmounts when `selectedIds.length === 0`, which kills the `isSuccess` effect before it
  fires. The form clears selection **itself** inside the success effect — do not clear it in an
  `onSuccess` callback or in `handleSubmit`.
- **409 conflict shape.** `DeleteModelForm` handles `409` conflicts via `ApiError.details`
  with the `ConflictDetail` shape `{ blocked, deletable, message?, code? }`. The backend must
  return this shape for the cascade UI to appear.
- **TanStack Query context is required.** A `QueryClientProvider` must wrap all consumers,
  since `useDatabaseMutation`, `useGetRequest`, and `DeleteModelForm`'s `useMutation` all
  depend on it.

## Known Smells & Caveats

These are documented limitations and rough edges to be aware of (none are dead code):

- **Duplicated `LabelWithHelp`.** Defined verbatim in `ColourField.tsx` (lines 10-29),
  `ColourArrayField.tsx` (lines 10-29), and `FormElement.tsx` (lines 34-45). Should be a
  shared internal module.
- **Repeated dayjs plugin setup.** `dayjs.extend(utc)` / `dayjs.extend(timezone)` are called at
  module scope in `AddModelForm.tsx`, `EditModelForm.tsx`, and `BulkEditModelForm.tsx` (lines
  6-8 in each). No-op after the first call, but indicates copy-paste that could be centralized.
- **Untyped bulk mutation payload.** `BulkEditModelForm` casts `(mutation.data as any)?.updated`
  in two places (lines 169 and 253) because `useDatabaseMutation` returns an untyped result,
  losing compile-time safety on the success payload.
- **`EntryData` is deprecated but still exported.** It is marked `@deprecated` in
  `FormElement.tsx` yet still re-exported from `index.ts`, with no migration deadline beyond
  "use `ModelAttribute` from `@bcl32/data-utils`".
- **`RelationCollectionField`'s `formData` / `setFormData` are unused.** They exist only for
  `FormElement` compatibility (`RelationCollectionField.tsx` lines 72-75) but do nothing —
  passing `setFormData` will not wire any state updates. Misleading API.
- **Imperative DOM manipulation for datetime labels.** `AddModelForm` uses
  `document.getElementById` (line 44) to update a datetime display label, bypassing React
  state. The same pattern appears in `BulkEditModelForm.tsx` (lines 82-84) and
  `EditModelForm.tsx` (lines 47-55).
- **`DeleteModelForm` bypasses the mutation abstraction.** It calls `useMutation` from
  `@tanstack/react-query` directly (line 287) and imports `apiFetch` from `@bcl32/hooks/apiFetch`
  directly, rather than using `useDatabaseMutation` like the other forms — an inconsistency in
  the mutation layer.
- **`useGroupedSwatches` is internal-only.** Used by `ColourField` and `ColourArrayField` but
  not in `index.ts` or the package `exports` map. Consumers building a custom colour field
  cannot reuse its swatch-fetching logic.
- **`_diff.ts` helpers are not exported.** `deepEqual` and `changedFields` are internal; in
  particular `deepEqual` would be useful for consumers comparing form state externally but is
  inaccessible.

## Minimal Usage Example

```tsx
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddModelForm } from "@bcl32/forms";
import type { ModelData } from "@bcl32/data-utils";

const queryClient = new QueryClient();

// The descriptor that drives the form.
const SpoolModelData: ModelData = {
  model_name: "spool",
  model_attributes: [
    { name: "name", type: "string", editable: true, help_text: "Display name" },
    { name: "weight_grams", type: "number", editable: true },
    { name: "material", type: "select", editable: true, options: ["PLA", "PETG", "ABS"] },
  ],
};

export function AddSpoolDialog({ onClose }: { onClose: () => void }) {
  return (
    // useDatabaseMutation requires a QueryClientProvider in the tree.
    <QueryClientProvider client={queryClient}>
      <AddModelForm
        ModelData={SpoolModelData}
        add_api_url="/api/spools"
        query_invalidation={["spools"]}
        onSuccess={() => console.log("created")}
        onClose={onClose}
      />
    </QueryClientProvider>
  );
}
```

---

_Part of the `@bcl32/*` React package suite — see the [Packages Overview](../00-OVERVIEW.md)._

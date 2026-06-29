# @bcl32/data-utils

> Pure data-processing utilities for computing field statistics, time bounds, grouped counts, datetime sorting, string helpers, and form defaults — no `@bcl32` dependencies and no UI.

- **Package:** `@bcl32/data-utils`
- **Version:** `2.1.10`
- **Tier:** `foundational`

`@bcl32/data-utils` sits at the bottom of the dependency graph. It contains only pure functions and TypeScript type declarations — there is no React, no DOM access, and no dependency on any other `@bcl32` package. Higher-tier packages (datatable, filters, charts, forms) build their statistics, sorting, and form-default behaviour on top of it.

See the package map in [../00-OVERVIEW.md](../00-OVERVIEW.md).

---

## Install & Import

This package is consumed inside the pnpm monorepo via the workspace protocol:

```jsonc
// package.json of a consuming app/package
{
  "dependencies": {
    "@bcl32/data-utils": "workspace:^2.0.0"
  }
}
```

Everything is re-exported from the root barrel, so the simplest form is:

```ts
import {
  CalculateFeatureStats,
  ComputeGroupedStats,
  ComputeTimeBounds,
  dayjs_sorter,
  Capitalize,
  Truncate,
  getFormDefault,
  type ModelData,
  type ModelAttribute,
  type RowData,
} from "@bcl32/data-utils";
```

The package also publishes per-module subpath exports for tree-shaking-friendly imports:

| Subpath import | Provides |
| --- | --- |
| `@bcl32/data-utils/CalculateFeatureStats` | `CalculateFeatureStats` |
| `@bcl32/data-utils/ComputeGroupedStats` | `ComputeGroupedStats`, `DoubleGroupStats` |
| `@bcl32/data-utils/ComputeTimeBounds` | `ComputeTimeBounds` |
| `@bcl32/data-utils/dayjs_sorter` | `dayjs_sorter` |
| `@bcl32/data-utils/StringFunctions` | `Capitalize`, `Truncate` |
| `@bcl32/data-utils/getFormDefault` | `getFormDefault` |
| `@bcl32/data-utils/types` | All shared types (see caveat below) |

---

## Public Exports

### Types

| Name | Kind | Description |
| --- | --- | --- |
| `ModelAttribute` | `type` | Base field descriptor used across the monorepo's `ModelData` pattern. Carries `name`, a `type` discriminant (`string \| number \| boolean \| list \| select \| datetime \| colour \| colour_array \| id \| file`), `default`, `editable`, filter flags, a `stats` flag, `groupBy`, reference FK metadata, and an open index signature for app-specific extensions. |
| `ModelData` | `type` | Top-level model descriptor holding a `model_attributes` array and optional CRUD API URLs. Open index signature allows app-specific extra fields. |
| `RowData` | `type` | Standard table row shape: required `id` (`string \| number`), optional `time_created` / `time_updated`, plus an open index signature. |
| `ReferenceInfo` | `type` | FK metadata for `id`-type fields: `get_api_url` to fetch options, `display_field` to render the label. |
| `GroupCount` | `type` | A single category-count pair produced by `ComputeGroupedStats`. |
| `DoubleGroupEntry` | `type` | A two-level group-count entry: `name` is the outer group key; the remaining dynamic string keys are inner group keys mapping to counts. |

#### Type signatures

```ts
interface ModelAttribute {
  name: string;
  type: string; // discriminant — see notes; typed as `string` for forward-compat
  default?: unknown;
  editable?: boolean;
  help_text?: string;
  description?: string;
  options?: unknown;
  filter?: boolean;
  filter_empty?: unknown;
  filter_rule?: string;
  stats?: boolean;
  groupBy?: string;
  reference?: ReferenceInfo;
  accept?: string;
  [key: string]: unknown;
}

interface ModelData {
  model_name?: string;
  model_attributes: ModelAttribute[];
  add_api_url?: string;
  update_api_url?: string;
  delete_api_url?: string;
  [key: string]: unknown;
}

interface RowData {
  id: string | number;
  time_created?: string;
  time_updated?: string;
  [key: string]: unknown;
}

interface ReferenceInfo {
  get_api_url: string;
  display_field: string;
}

interface GroupCount {
  name: string;
  length: number;
}

interface DoubleGroupEntry {
  name: string;
  [key: string]: string | number;
}
```

### Utility functions

| Name | Kind | Signature | Description |
| --- | --- | --- | --- |
| `CalculateFeatureStats` | `util` | `(metadata: ModelAttribute[], dataset: Record<string, unknown>[]) => Record<string, StatEntry[]>` | Iterates `ModelAttribute[]` and a dataset to produce a keyed stats map. See per-field behaviour below. |
| `ComputeGroupedStats` | `util` | `(filteredData: Record<string, unknown>[], feature: string, sort?: boolean) => GroupCount[]` | Groups a dataset by a string key and returns count-per-group as `GroupCount[]`, sorted descending by count by default (pass `sort=false` to skip). |
| `DoubleGroupStats` | `util` | `(filteredData: Record<string, unknown>[], feature: string, sub_feature: string) => DoubleGroupEntry[]` | Two-level cross-tabulation: groups by `feature`, then sub-groups each partition by `sub_feature`, returning `DoubleGroupEntry[]` suitable for stacked bar charts. |
| `ComputeTimeBounds` | `util` | `(data: Record<string, unknown>[], feature_name: string) => [string, string]` | Returns `[earliest, latest]` ISO date strings from a dataset field. Falls back to `now/now` when all values are null/undefined. |
| `dayjs_sorter` | `util` (const) | `(rowA: { original: Record<string, unknown> }, rowB: { original: Record<string, unknown> }, _columnId: string) => number` | TanStack Table sort function for datetime columns: compares via dayjs to avoid lexicographic failures on time strings; nulls and invalid dates are pushed to the end. |
| `Capitalize` | `util` | `(s: string \| null \| undefined) => string` | Uppercases the first character of a string; returns an empty string for null/undefined. |
| `Truncate` | `util` | `(str: string, n: number) => string` | Truncates a string to `n` characters, appending `'...'` if longer. |
| `getFormDefault` | `util` | `(attr: ModelAttribute) => unknown` | Derives a sensible default value from a `ModelAttribute`: returns `attr.default` if set, otherwise `''` for string, `false` for boolean, `[]` for list/id_list, `null` for id, `undefined` otherwise. |

#### `CalculateFeatureStats` per-field behaviour

| Field `type` | Produced stats |
| --- | --- |
| `number` | `{ min, max, bins }` — `bins` is a d3 histogram. |
| `list` / `colour` | `{ count: GroupCount[], options: string[] }`. |
| `string` / `select` | `{ count: GroupCount[] }`. |
| `datetime` | `{ earliest, latest }`. When `attr.stats === true`, also `{ daily, weekly, monthly }` (each `GroupCount[]`); and when `attr.groupBy` is set, also `monthlyGrouped: DoubleGroupEntry[]`. |

---

## Dependencies

| Category | Packages |
| --- | --- |
| Internal `@bcl32` deps | _none_ (foundational tier) |
| Peer dependencies | `dayjs@^1.11.10` |
| External (regular) dependencies | `d3@^7.9.0` — only `bin()` is used from d3, but the full d3 bundle is a regular (not peer) dependency. |
| UI libraries | _none_ |

This package is intentionally UI-free and dependency-light. `dayjs` is a peer dependency, so the consuming app must provide it (it is already shared across the monorepo).

---

## Conventions & Patterns a Consumer Must Follow

- **`ModelAttribute.type` is an open `string`, not a union literal.** It is typed loosely for forward-compatibility. Any consumer that switches on `attr.type` must handle the open set (include a default branch) rather than assuming exhaustiveness.
- **Datetime stats are opt-in.** `CalculateFeatureStats` only emits `daily` / `weekly` / `monthly` breakdowns when `attr.stats === true`, and only emits `monthlyGrouped` (the `DoubleGroupStats` cross-tab) when `attr.groupBy` is also set.
- **`dayjs_sorter` expects the TanStack Table v8 row shape** `{ original: Record<string, unknown> }`. The third `_columnId` argument is used as the key into `row.original`. Wire it into a column definition's `sortingFn`.
- **`getFormDefault` returns `unknown`.** Callers must cast the result to the concrete type their form library expects.

```ts
import type { ColumnDef } from "@tanstack/react-table";
import { dayjs_sorter, type RowData } from "@bcl32/data-utils";

const columns: ColumnDef<RowData>[] = [
  {
    accessorKey: "time_created",
    header: "Created",
    sortingFn: dayjs_sorter, // matches the { original } row shape + columnId key
  },
];
```

---

## Minimal Usage Example

```ts
import {
  CalculateFeatureStats,
  ComputeGroupedStats,
  ComputeTimeBounds,
  Capitalize,
  Truncate,
  getFormDefault,
  type ModelAttribute,
} from "@bcl32/data-utils";

// 1. Describe the fields of a model.
const metadata: ModelAttribute[] = [
  { name: "status", type: "select" },
  { name: "weight_g", type: "number" },
  { name: "purchased_at", type: "datetime", stats: true, groupBy: "status" },
];

// 2. A dataset of plain rows.
const rows = [
  { id: 1, status: "active", weight_g: 950, purchased_at: "2026-01-04" },
  { id: 2, status: "empty", weight_g: 0, purchased_at: "2026-03-21" },
  { id: 3, status: "active", weight_g: 480, purchased_at: "2026-05-12" },
];

// 3. Field statistics keyed by attribute name.
const stats = CalculateFeatureStats(metadata, rows);
// stats.weight_g -> { min, max, bins } ; stats.status -> { count } ;
// stats.purchased_at -> { earliest, latest, daily, weekly, monthly, monthlyGrouped }

// 4. Group counts for a single feature (descending by count).
const byStatus = ComputeGroupedStats(rows, "status"); // [{ name: "active", length: 2 }, ...]

// 5. Earliest/latest ISO bounds for a datetime feature.
const [earliest, latest] = ComputeTimeBounds(rows, "purchased_at");

// 6. String helpers.
const label = Capitalize("active");          // "Active"
const short = Truncate("a very long note", 6); // "a very..."

// 7. Form default for a field (cast to the type your form needs).
const statusDefault = getFormDefault(metadata[0]) as string; // ""
```

---

## Known Smells & Caveats

- **Heavy d3 dependency.** `d3@7` is pulled in as a full package even though only d3's `bin()` is used. This should be `d3-array` (the subpackage that owns `bin`) to avoid bundling unused d3 modules.
  _File:_ `react-packages/data-utils/package.json` line 64.
- **Duplicated row type.** `type DataEntry = Record<string, unknown>` is declared independently in `CalculateFeatureStats.ts`, `ComputeGroupedStats.ts`, and `ComputeTimeBounds.ts` instead of being shared from `types.ts`.
- **Numeric min/max computed twice.** In `CalculateFeatureStats.ts` the numeric `min`/`max` are computed once for the `StatEntry` objects (lines 41–49) and again for the bin-domain guard (lines 51–52); the first pair could be reused.
- **Fragile `./types` subpath export.** `./types` is listed in `package.json` `exports`, but `src/types.ts` is **not** a tsup entry point. The standalone `dist/types.js` chunk only exists as a side effect of code-splitting from `index.ts`. Importing `@bcl32/data-utils/types` works at runtime but relies on this indirect split — prefer importing the types from the root barrel.
- **`ComputeTimeBounds` masks the empty-dataset case.** When the data is empty (or all values are null/undefined) it falls back to the current time (`dayjs().format()`) for *both* bounds, so callers cannot distinguish "now" from an actually computed bound. It never returns null/undefined or throws.
- **Return types of `CalculateFeatureStats` are not exported.** `StatEntry`, `BinEntry`, and `FeatureStats` are internal to `CalculateFeatureStats.ts` and are not exported, so consumers cannot strongly type the function's return value without re-declaring them. The signature above approximates the result as `Record<string, StatEntry[]>`.
- **`getFormDefault` returns `unknown`.** As noted in conventions, callers must cast.

---

_Back to [package overview](../00-OVERVIEW.md)._

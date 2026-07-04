# @bcl32/filters

> Composite filter-and-chart library: React context, UI filter controls, chart-based drill-down filters, and pure data utilities for filtering arbitrary datasets described by a `ModelData` schema.

| | |
|---|---|
| **Package** | `@bcl32/filters` |
| **Version** | `3.2.0` |
| **Tier** | `composite` |

See the [packages overview](../00-OVERVIEW.md) for how this package fits into the monorepo.

---

## Purpose

`@bcl32/filters` provides an end-to-end filtering layer for tabular/list datasets:

- **React context** for sharing filter state across a component tree (`FilterProvider`, `useFilterContext`, `FilterContext`).
- **UI filter controls** — text (`DebouncedTextFilter`), number range (`DebouncedNumberFilter`), options (`OptionsFilter`), and datetime (`TimeFilter`).
- **Chart-based drill-down filters** — bar, line, pie, stacked bar, and histogram via `ChartFilter` and its leaf chart components.
- **Pure data utilities** — initialize, apply, group, and process filters (`InitializeFilters`, `ApplyFilters`, `GroupFilters`, `ProcessDataset`, etc.).
- **Orchestration hooks** — `useEntityFilters` (top-level wiring) and `useDataTableFilterBar` (compact inline toolbar + collapsible panel).

A dataset is described by a `ModelData` schema (re-exported from `@bcl32/data-utils`); each `ModelAttribute` drives the filter type, empty value, options, source kind, selection mode, display, primary-filter routing, and sort order.

---

## Install & Import

This is a workspace package; consumers depend on it via the `workspace:` protocol:

```jsonc
// package.json
{
  "dependencies": {
    "@bcl32/filters": "workspace:^3.2.0"
  }
}
```

Import from the barrel (`.`) or from a per-export subpath:

```ts
// Barrel import (covers all exports, including EntityGroupCards / useEntityGroups)
import { useEntityFilters, FilterProvider, AllFilters } from "@bcl32/filters";

// Subpath imports (better tree-shaking; available for most exports)
import { useEntityFilters } from "@bcl32/filters/useEntityFilters";
import { FilterProvider } from "@bcl32/filters/FilterProvider";
import { AllFilters } from "@bcl32/filters/AllFilters";
import type { ModelData, Filters } from "@bcl32/filters/types";
```

> **Note:** `EntityGroupCards`, `useEntityGroups`, `getGroupableAttrs`, and `useDataTableFilterBar` have **no dedicated subpath entry** in `package.json` exports — reach them only via the `.` barrel import.

---

## Public Exports

### Context

| Name | Kind | Signature / Props | Description |
|---|---|---|---|
| `FilterContext` | context | `React.Context<FilterContextValue \| null>` | Raw React context holding `{ filters, change_filters }`. Prefer `FilterProvider` + `useFilterContext` over consuming this directly. |
| `FilterProvider` | component | `({ filters: Filters, changeFilters: (name, key, value) => void, children }) => JSX.Element` | Context provider wrapping children with `FilterContext`. Memoises the context value. |
| `useFilterContext` | hook | `() => FilterContextValue` | Returns `{ filters, change_filters }`. **Throws** if called outside a `FilterProvider`. |

### Filter UI components

| Name | Kind | Signature / Props | Description |
|---|---|---|---|
| `AllFilters` | component | `() => JSX.Element` | Renders all non-primary filters grouped into Text/Time tabs via `AnimatedTabs`. Reads from `FilterContext`. |
| `FilterElement` | component | `({ filter_data: FilterData }) => JSX.Element` | Dispatcher rendering the correct leaf filter (`DebouncedTextFilter`, `DebouncedNumberFilter`, `OptionsFilter`, or `TimeFilter`) based on `filter_data.type`. |
| `FiltersSummary` | component | `({ active_filters: Filters }) => JSX.Element \| null` | Human-readable summary of active filters with per-filter Reset buttons. Reads from `FilterContext`. |
| `DebouncedTextFilter` | component | `({ name: string }) => JSX.Element \| null` | Text input with 500ms debounce and equals/contains rule toggle. Reads/writes its filter from `FilterContext` by name. |
| `DebouncedNumberFilter` | component | `({ name: string }) => JSX.Element \| null` | Dual-thumb Radix slider plus numeric inputs with Min/Max snap buttons and nudge controls; 500ms debounce to `FilterContext`. |
| `OptionsFilter` | component | `({ name, options, display?, selection?, source_kind?, colour_presets? }) => JSX.Element \| null` | Multi-display options filter supporting combobox, dropdown, chip-toggle, toggle-buttons, and swatch-grid (colour picker with API fetch) display modes, with any/all rule toggle. |
| `TimeFilter` | component | `({ name: string }) => JSX.Element \| null` | `@bcl32/utils/DateTimePicker` pair for start/end times (MUI's `MobileDateTimePicker` removed in 3.2.0), with a Reset button and Edit Shortcuts dialog. Reads/writes from `FilterContext`. |
| `TimeEditDialog` | component | `({ filters, name, change_time_filter, change_filters }) => JSX.Element` | Dialog body for time filter shortcuts (Past Day/Week/Month/Year) and incremental +/- adjustments by a configurable unit; date/time inputs use `@bcl32/utils/DateTimePicker`. |

### Chart filter components

| Name | Kind | Signature / Props | Description |
|---|---|---|---|
| `ChartFilter` | component | `({ chart_metadata: ChartMetadata, chart_data: ChartDataEntry[] }) => JSX.Element` | Dispatcher rendering the correct chart (bar, line, pie, bar-switcher, stacked_bar, histogram) based on `chart_metadata.type`; clicking writes to `FilterContext`. |
| `BarChartFilter` | component | `({ name: string, chart_data: ChartDataEntry[] }) => JSX.Element` | Clickable vertical recharts `BarChart` that sets an options or string filter value on bar click. |
| `BarChartSwitcher` | component | `({ name: string, chart_data: ChartDataEntry[], subkeys: string[] }) => JSX.Element` | Bar chart with subkey toggle tabs (e.g. time-series with multiple metrics). Does **not** write to `FilterContext`. |
| `StackedBarChart` | component | `({ name: string, chart_data: ChartDataEntry[], subkeys: string[] }) => JSX.Element` | Stacked recharts `BarChart` rendered from `chart_data` using `subkeys`. Does **not** write to `FilterContext`. |
| `LineChartFilter` | component | `({ name: string, chart_data: ChartDataEntry[] }) => JSX.Element` | recharts `LineChart` for time-series count data. Display-only; no filter click interaction. |
| `PieChartFilter` | component | `({ name: string, chart_data: ChartDataEntry[] }) => JSX.Element` | Clickable recharts `PieChart` that sets an options or string filter on slice/legend click. |
| `Histogram` | component | `({ name: string, chart_data: ChartDataEntry[] }) => JSX.Element` | Bar chart using `count` + `range`/`x0` fields from `ChartDataEntry`. Display-only; no filter interaction. |

### Orchestration hooks & grouping

| Name | Kind | Signature / Props | Description |
|---|---|---|---|
| `useEntityFilters` | hook | `(dataset, ModelData) => UseEntityFiltersReturn` | Top-level orchestration: runs `useOptionsEnrichment`, initialises `Filters` from `ModelData` + `DatasetStats`, re-syncs options on enrichment, applies filters via `ProcessDataset`. Returns filters, callbacks, filtered data, stats, counts, and `enrichedModelData`. |
| `useDataTableFilterBar` | hook | `({ filters, changeFilters, activeFilters, filteredCount, totalCount }) => DataTableFilter` | Renders a compact inline filter toolbar (tab buttons + active-filter chips, `ListFilter`/`X` lucide icons since 3.2.0 — MUI icons removed) and a collapsible panel. Returns `{ toolbar, panel, filteredCount, totalCount }`. **Creates its own `FilterProvider` internally.** |
| `useEntityGroups` | hook | `(dataset, modelData, attrName, options?) => { groups: EntityGroup[], attr: ModelAttribute \| null }` | Groups a dataset by a named options attribute, counting occurrences per value across `scalar`, `scalar-array`, and `object-array` source kinds; resolves an optional visual via `GroupVisualResolver`. |
| `getGroupableAttrs` | util | `(modelData: ModelData) => ModelAttribute[]` | Returns attributes where `filter === true` and `filter_type === 'options'`; used to populate groupBy selectors. |
| `EntityGroupCards` | component | `({ dataset, modelData, groupBy, groupableAttrs, onGroupByChange, onSelect, resolveVisual?, title?, onEmptySwitchToTable? }) => JSX.Element` | Card grid grouping entities by an options attribute; includes a `ToggleGroup` to switch groupBy field, click-to-select cards, and an optional empty-state escape hatch. |

### Pure data utilities

| Name | Kind | Signature / Props | Description |
|---|---|---|---|
| `InitializeFilters` | util | `(model_data: ModelAttribute[], datasetStats: DatasetStats) => Filters` | Builds the initial `Filters` object from `ModelData.model_attributes` and `DatasetStats`, setting number bounds and datetime bounds from computed stats. |
| `ApplyFilters` | util | `(data: unknown[], filters: Filters) => DataEntry[]` | Applies a `Filters` map to a dataset; supports string (equals/contains), number (range), options (any/all/equals over scalar / scalar-array / object-array), and datetime filters. |
| `GetActiveFilters` | util | `(filters: Filters) => Filters` | Returns only the filters whose current value differs from `filter_empty`. |
| `GroupFilters` | util | `(filters: Filters) => GroupedFilters` | Partitions a `Filters` map into `{ primary_filters, string_filters, numeric_filters, options_filters, time_filters }`; primary filters are sorted by `filterOrder`. |
| `ProcessDataset` | util | `(dataset, filters, ModelData) => ProcessedDataset` | One-call pipeline: `GetActiveFilters` → `ApplyFilters` → `CalculateFeatureStats` for both full and filtered data. |
| `GetSubkeyValues` | util | `(chart_metadata: ChartMetadata, stats: DatasetStats) => string[]` | Extracts ordered subkey names from a `DatasetStats` `count` stat entry; used to populate `subkeys` arrays for chart components. |

### Types

| Name | Kind | Signature / Shape | Description |
|---|---|---|---|
| `FilterValue` | type | `{ type, value, rule, filter_empty, options, source_kind, selection, display, value_key, label_key, colour_presets, timespan_begin, primaryFilter }` | Core per-filter state shape. `type` is `"string" \| "number" \| "datetime" \| "options"`. |
| `Filters` | type | `Record<string, FilterValue>` | The full filter state map. |
| `FilterContextValue` | type | `{ filters: Filters, change_filters: (name, key, value) => void }` | Value held by `FilterContext`. |
| `FilterData` | type | `FilterValue & { name: string }` | A filter plus its name; used when rendering filter lists. |
| `FilterDisplay` | type | `'dropdown' \| 'combobox' \| 'chip-toggle' \| 'swatch-grid' \| 'toggle-buttons'` | Options-filter display modes. |
| `FilterOption` | type | `{ value: string, label: string }` | A single selectable option. |
| `FilterSelection` | type | `'single' \| 'multi'` | Options-filter selection mode. |
| `FilterSourceKind` | type | `'scalar' \| 'scalar-array' \| 'object-array'` | How option values are read from a row. |
| `GroupedFilters` | type | `{ primary_filters, string_filters, numeric_filters, options_filters, time_filters }` | Output of `GroupFilters`. |
| `ChartMetadata` | type | `{ name, type, subkey?, subkeys? }` | Passed to `ChartFilter` and `GetSubkeyValues`. |
| `ChartDataEntry` | type | `{ name, length?, count?, fill?, range?, x0?, ...rest }` | A chart data row. |
| `ModelAttribute` | type | re-exported from `@bcl32/data-utils` | Describes a single model field with filter metadata. |
| `ModelData` | type | `{ model_attributes: ModelAttribute[], set_name? }` (re-exported from `@bcl32/data-utils`) | Schema describing a dataset. |
| `StatValue` | type | `{ name: string, value: unknown }` | One stat entry. |
| `DatasetStats` | type | `Record<string, StatValue[]>` | Per-field stats from `CalculateFeatureStats`. |
| `ProcessedDataset` | type | `{ active_filters, filteredData, datasetStats, filteredStats }` | Return shape of `ProcessDataset`. |
| `DatetimeFilterValue` | type | `{ timespan_begin: string, timespan_end: string }` | Datetime filter value. |
| `NumberRange` | type | `{ min: number, max: number }` | Numeric range bounds. |
| `ColourPresetsConfig` | type | `{ get_api_url: string, group_by?: string, subgroup_by? }` | Config for the swatch-grid colour fetch. |
| `ClickPayload` | type | `{ payload: { name: string, ...rest } }` | Single recharts click payload entry. |
| `ChartClickEvent` | type | `{ activePayload?: ClickPayload[] }` | recharts `onClick` event shape. |
| `DataTableFilter` | type | `{ toolbar: React.ReactNode, panel: React.ReactNode, filteredCount: number, totalCount: number }` | Return shape of `useDataTableFilterBar`. |
| `UseEntityFiltersReturn` | type | `{ filters, changeFilters, filteredData, activeFilters, datasetStats, filteredStats, filteredCount, totalCount, enrichedModelData }` | Return interface for `useEntityFilters`. |
| `EntityGroup` | type | `{ value: string, label: string, count: number, visual?: ReactNode, isNone?: boolean }` | A group bucket from `useEntityGroups`. |
| `GroupVisualResolver` | type | `(attr: ModelAttribute, value: string, sampleRow: Record<string,unknown> \| undefined) => ReactNode \| undefined` | Callback returning an optional visual (e.g. a colour swatch) for a group value. |

---

## Dependencies

### Internal (`@bcl32`)

| Package | Role |
|---|---|
| `@bcl32/utils` | UI primitives (e.g. `AnimatedTabs`, combobox views). |
| `@bcl32/hooks` | `useOptionsEnrichment` and other hooks consumed by `useEntityFilters`. |
| `@bcl32/data-utils` | Source of `ModelData` / `ModelAttribute` types and `CalculateFeatureStats`. |
| `@bcl32/charts` | recharts wrappers backing the chart filter components. |

### Peer dependencies

| Package | Range |
|---|---|
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `dayjs` | `^1.11.10` |
| `recharts` | `^2.12.0` |
| `@radix-ui/react-toggle-group` | `^1.1.0` |
| `@radix-ui/react-slider` | `^1.2.1` |

### External dependencies

| Package | Range |
|---|---|
| `lucide-react` | `^0.447.0` |

_(`@mui/material`, `@mui/icons-material`, and `@mui/x-date-pickers` were removed in 3.2.0.)_

### UI libraries

- **lucide-react** — icons throughout (`Pencil`, `Plus`/`Minus`, `ListFilter`, `X`), replacing the old MUI icon buttons.
- **`@bcl32/utils/DateTimePicker`** — `TimeFilter` / `TimeEditDialog` date+time inputs (replaces MUI's `MobileDateTimePicker`).
- **Radix UI** — `@radix-ui/react-slider` (number filter), `@radix-ui/react-toggle-group` (toggle controls).
- **Tailwind CSS** — utility classes used throughout.
- **recharts** — consumed via the `@bcl32/charts` wrapper.

---

## Conventions & Patterns

A consumer must follow these to wire the package correctly:

1. **Wrap the tree in `FilterProvider` before rendering any filter UI.** Every leaf component reads `FilterContext` and returns `null` if it is absent. Pass `filters` and `changeFilters` from `useEntityFilters`.

2. **Canonical consumer flow:**
   `useEntityFilters(dataset, ModelData)` → destructure `{ filters, changeFilters, filteredData, activeFilters, ... }` → wrap with `<FilterProvider>` → render `<AllFilters />` or `<FilterElement />` children.

3. **`ModelData` must conform to the `@bcl32/data-utils` shape.** Each attribute drives `filter` type, empty value, options, `source_kind`, `selection`, `display`, `primaryFilter`, and `filterOrder` — all of which flow into `InitializeFilters`.

4. **Chart-based filters** (`ChartFilter`) expect `ChartDataEntry[]` pre-computed server-side or via `CalculateFeatureStats`. The chart `onClick` writes directly to `FilterContext` by name (for the interactive bar/pie charts).

5. **Swatch-grid display** of `OptionsFilter` requires `colour_presets.get_api_url` to return `{ items: Array<{ colour_hex, id?, colour_name?, ...group_by fields }> }`.

6. **Primary filter routing:** `primaryFilter: true` on a `ModelAttribute` routes it to the **Main** tab in `useDataTableFilterBar` (shown first in a responsive grid); `filterOrder` controls sort within that tab.

7. **Do NOT double-wrap `useDataTableFilterBar`.** It returns JSX nodes (`toolbar`, `panel`) for a table header area and **creates its own `FilterProvider` internally** — the caller must not also wrap it.

8. **Grouping helpers are barrel-only.** `EntityGroupCards`, `useEntityGroups`, and `getGroupableAttrs` are reachable only via the `.` barrel import (no dedicated subpath entry).

---

## Minimal Usage Example

```tsx
import {
  useEntityFilters,
  FilterProvider,
  AllFilters,
  FiltersSummary,
} from "@bcl32/filters";
import type { ModelData } from "@bcl32/filters";

const ProductModelData: ModelData = {
  set_name: "products",
  model_attributes: [
    { name: "title", filter: true, filter_type: "string" },
    { name: "price", filter: true, filter_type: "number" },
    { name: "category", filter: true, filter_type: "options", source_kind: "scalar" },
  ],
} as ModelData;

function ProductFilters({ products }: { products: unknown[] }) {
  const {
    filters,
    changeFilters,
    filteredData,
    activeFilters,
    filteredCount,
    totalCount,
  } = useEntityFilters(products, ProductModelData);

  return (
    <FilterProvider filters={filters} changeFilters={changeFilters}>
      <FiltersSummary active_filters={activeFilters} />
      <AllFilters />

      <p>
        Showing {filteredCount} of {totalCount}
      </p>
      <ul>
        {filteredData.map((row, i) => (
          <li key={i}>{String((row as { title?: unknown }).title)}</li>
        ))}
      </ul>
    </FilterProvider>
  );
}
```

---

## Known Smells & Caveats

These are documented quirks in the current source — be aware of them when relying on these exports:

| Area | Caveat |
|---|---|
| `OptionsFilter` (`src/OptionsFilter.tsx` ~L83-89) | **Dead display branch:** the `'dropdown'` and `'combobox'` cases render identical `ComboboxView` JSX (only the placeholder differs); one branch is redundant. |
| `GetActiveFilters` (`src/GetActiveFilters.ts` ~L37) | **Spurious mutation:** when the datetime begin time is active, the returned object is spread and then a stale debug property `timespan_begin: 'filter'` is added, corrupting the `ActiveFilters` entry type. |
| `BarChartSwitcher` (`src/BarChartSwitcher.tsx` ~L18) | **Unused `name` prop** — declared and destructured but never referenced in the component body. |
| `StackedBarChart` (`src/StackedBarChart.tsx` ~L19) | **Unused `name` prop** — declared, passed by `ChartFilter`, never used. |
| `Histogram` (`src/Histogram.tsx` ~L17) | **Unused `name` prop** — same pattern. |
| `AllFilters` / `FiltersSummary` | **Inconsistent context access:** both call `React.useContext(FilterContext)` directly with an unsafe cast instead of using the guarded `useFilterContext` hook (`AllFilters.tsx` L11, `FiltersSummary.tsx` L24, L93). |
| Exports map | `EntityGroupCards`, `useEntityGroups`, `getGroupableAttrs`, and `useDataTableFilterBar` have **no dedicated subpath entries** in `package.json` exports or `tsup.config.ts`; only the `.` barrel reaches them, blocking tree-shaking for subpath importers. |
| `src/utils.ts` | Not listed in `tsup.config.ts` entries or `package.json` exports. It is an internal helper (`capitalize`, `buildChartConfig`, `extractLabels`). |
| Mixed UI primitives (**resolved in 3.2.0**) | `DebouncedNumberFilter` used `@radix-ui/react-slider` while `TimeFilter` / `TimeEditDialog` used `@mui/x-date-pickers` + MUI `IconButton` — no single UI-primitive strategy within the same component family. As of 3.2.0, `TimeFilter`/`TimeEditDialog` use `@bcl32/utils/DateTimePicker` and lucide icons, closing the MUI half of this gap (Radix vs. the package's own `@bcl32/utils` primitives is a separate, still-open question). |

### Dead code

- `extractLabels` in `src/utils.ts` — defined and exported from `utils.ts` but not imported anywhere in the package's own source files.

---

[← Back to packages overview](../00-OVERVIEW.md)

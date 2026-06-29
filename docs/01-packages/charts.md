# @bcl32/charts

> Back to the package index: [../00-OVERVIEW.md](../00-OVERVIEW.md)

| | |
| --- | --- |
| **Package** | `@bcl32/charts` |
| **Version** | `2.1.6` |
| **Tier** | mid |

## Purpose

`@bcl32/charts` provides **two independent chart systems**:

1. **`BokehLineChart`** — a Bokeh-backed, server-rendered line chart with built-in
   controls (feature picker, palette select, and a set of boolean toggles). The chart
   image/spec is fetched from a server URL and injected into the DOM via
   `@bokeh/bokehjs`' `embed.embed_item`.
2. **A shadcn/ui-style recharts wrapper** — `ChartContainer` plus tooltip/legend
   primitives (`ChartTooltip`, `ChartTooltipContent`, `ChartLegend`,
   `ChartLegendContent`, `ChartStyle`) that make [recharts](https://recharts.org/)
   compositions themeable through a single `ChartConfig` object.

Apps consume **one or the other** depending on whether they need an interactive
time-series plot (Bokeh) or a themeable recharts composition.

## Install & Import

This package is consumed inside the monorepo via the pnpm workspace protocol; it is
already declared as a dependency in the apps that use it. Inter-workspace resolution is
handled by the workspace `link-workspace-packages` setting.

```jsonc
// package.json (consuming app)
{
  "dependencies": {
    "@bcl32/charts": "workspace:^2.1.6"
  }
}
```

The package exposes a root entry plus two subpath exports:

| Subpath | Exports |
| --- | --- |
| `@bcl32/charts` (root) | everything below |
| `@bcl32/charts/BokehLineChart` | `BokehLineChart` |
| `@bcl32/charts/Charts` | `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`, and the `ChartConfig` / `ChartConfigItem` types |

```ts
// Recommended: import from the root entry
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  BokehLineChart,
} from "@bcl32/charts";
import type { ChartConfig } from "@bcl32/charts";
```

## Public Exports

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `BokehLineChart` | component | `BokehLineChart({ url: string; metadata: { url: string; anomalies?: unknown[] }; features_to_plot: string[]; stat_options: { label: string; value: string }[]; lazy_load_enabled?: boolean; lazy_load_value?: unknown }): JSX.Element` | Embeds a Bokeh-rendered line chart fetched from a server URL. Renders a 12-column grid: the left 9 columns hold the Bokeh canvas (DOM nodes `#graphContainer` / `#myplot`); the right 3 columns contain an MUI `Autocomplete` for feature selection, three Radix `Checkbox` toggles (missing values, linked graph, labels, anomalies), and a Radix `Select` for palette. Internally calls `useBokehChart` from `@bcl32/hooks` and uses `@bokeh/bokehjs`' `embed.embed_item` to inject the chart. |
| `ChartContainer` | component | `ChartContainer(ref: HTMLDivElement, { id?: string; config: ChartConfig; children: React.ReactElement; className?: string; ...divProps }): JSX.Element` | Root wrapper for recharts compositions. Provides the chart context (`config`) to descendants, injects a scoped `<ChartStyle>` `<style>` tag emitting CSS custom properties (`--color-<key>`) for light/dark themes, and wraps `children` in recharts' `ResponsiveContainer`. Sets `aspect-video` plus a large set of Tailwind `[&_…]` selectors to normalize recharts SVG styling. |
| `ChartStyle` | component | `ChartStyle({ id: string; config: ChartConfig }): JSX.Element \| null` | Internal style injector; renders a `<style dangerouslySetInnerHTML>` block mapping `ChartConfig` color/theme entries to scoped CSS variables. Exported so it *can* be used standalone, but it is normally rendered automatically inside `ChartContainer`. |
| `ChartTooltip` | other (re-export) | `typeof RechartsPrimitive.Tooltip` | Bare re-export of recharts' `Tooltip`. Drop it inside any recharts chart element alongside `ChartTooltipContent`. |
| `ChartTooltipContent` | component | `ChartTooltipContent(ref: HTMLDivElement, { active?: boolean; payload?: PayloadItem[]; indicator?: 'dot'\|'line'\|'dashed'; hideLabel?: boolean; hideIndicator?: boolean; label?: string; labelFormatter?; labelClassName?: string; formatter?; color?: string; nameKey?: string; labelKey?: string; className?: string }): JSX.Element \| null` | Styled tooltip body intended as the `content` prop of `ChartTooltip`. Reads `ChartConfig` from context to resolve labels and icons. Supports indicator variants (`dot` / `line` / `dashed`), optional label suppression, custom `labelFormatter`, custom `formatter`, and `nameKey` / `labelKey` overrides. |
| `ChartLegend` | other (re-export) | `typeof RechartsPrimitive.Legend` | Bare re-export of recharts' `Legend`. Drop it inside any recharts chart element alongside `ChartLegendContent`. |
| `ChartLegendContent` | component | `ChartLegendContent(ref: HTMLDivElement, { hideIcon?: boolean; payload?: LegendPayloadItem[]; verticalAlign?: 'top'\|'bottom'; nameKey?: string; className?: string }): JSX.Element \| null` | Styled legend body intended as the `content` prop of `ChartLegend`. Reads `ChartConfig` from context to resolve icons and labels; falls back to an `item.color` swatch. Supports `hideIcon` and `verticalAlign` (`top` / `bottom`, adjusts the padding side) plus a `nameKey` override. |
| `ChartConfig` | type | `interface ChartConfig { [key: string]: ChartConfigItem }` | Index-signature type passed to `ChartContainer`; drives color theming and label/icon resolution in the tooltip and legend. |
| `ChartConfigItem` | type | `interface ChartConfigItem { label?: string; icon?: React.ComponentType; color?: string; theme?: Partial<Record<'light'\|'dark', string>> }` | Shape of each entry in a `ChartConfig`. |

## Dependencies

### Internal (`@bcl32/*`)

| Package | Used for |
| --- | --- |
| `@bcl32/utils` | Radix-based UI primitives (`Label`, `Select`, `Checkbox`) used by `BokehLineChart` controls. |
| `@bcl32/hooks` | The `useBokehChart` data-fetching hook used by `BokehLineChart`. |

### Peer dependencies

The consuming app must supply these:

| Peer | Range |
| --- | --- |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `recharts` | `^2.12.0` |

### External (bundled `dependencies`)

| Package | Range | Notes |
| --- | --- | --- |
| `@mui/material` | `^5.15.7` | `Autocomplete`, `TextField` in `BokehLineChart`. **See caveats** — bundled rather than peered. |
| `@bokeh/bokehjs` | `^2.4.3` | `embed.embed_item` for injecting the Bokeh chart. |

## UI Libraries In Use

| Library | Where |
| --- | --- |
| MUI | `Autocomplete`, `TextField` (feature selector) in `BokehLineChart`. |
| Radix (via `@bcl32/utils`) | `Label`, `Select`, `Checkbox` (controls) in `BokehLineChart`. |
| Tailwind CSS | `ChartContainer` styling and the `BokehLineChart` grid layout. |
| recharts | The `Charts.tsx` primitives (`ChartContainer`, tooltip/legend). |

## Conventions & Patterns A Consumer Must Follow

- **`ChartContainer` is a required context provider.** Both `ChartTooltipContent` and
  `ChartLegendContent` call the internal `useChart()` hook, which **throws** if invoked
  outside a `ChartContainer`. Always render them within one.
- **Pair the re-exports with the `*Content` components.** `ChartTooltip` and
  `ChartLegend` are bare recharts re-exports; to get styled output you must pass
  `ChartTooltipContent` / `ChartLegendContent` as their `content` prop.
- **Color theming is driven entirely by `ChartConfig`.** Provide either a flat `color`
  for a single color, or `theme: { light: '…', dark: '…' }` for dark-mode-aware colors.
  `ChartStyle` emits these as `--color-<key>` CSS variables scoped to the chart's
  `data-chart` id, which recharts series reference via `var(--color-<key>)`.
- **Tailwind must be configured in the consuming app.** `ChartContainer` and
  `BokehLineChart` use Tailwind utility/arbitrary-variant classes directly in JSX
  (e.g. `aspect-video`, `xl:grid-cols-12`). The app's Tailwind `content` paths must
  include this package so the classes are not purged.
- **`'use client'` directive.** `Charts.tsx` carries a `'use client'` directive on
  line 1, making it compatible with Next.js RSC boundaries. (The monorepo does not
  currently use Next.js.)
- **`BokehLineChart` is effectively a singleton per page** — see caveats below.

## Minimal Usage Example

### recharts composition (`ChartContainer`)

```tsx
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@bcl32/charts";
import type { ChartConfig } from "@bcl32/charts";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

const data = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
];

const config = {
  desktop: { label: "Desktop", theme: { light: "#2563eb", dark: "#60a5fa" } },
  mobile: { label: "Mobile", color: "#f59e0b" },
} satisfies ChartConfig;

export function VisitorsChart() {
  return (
    <ChartContainer config={config} className="h-64">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" />
        {/* series reference the CSS vars emitted by ChartStyle */}
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
        <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
```

### Bokeh server-rendered chart (`BokehLineChart`)

```tsx
import { BokehLineChart } from "@bcl32/charts";

export function SensorPlot() {
  return (
    <BokehLineChart
      url="https://api.example.com/bokeh/line"
      metadata={{ url: "https://api.example.com/bokeh/metadata", anomalies: [] }}
      features_to_plot={["temperature", "humidity"]}
      stat_options={[
        { label: "Temperature", value: "temperature" },
        { label: "Humidity", value: "humidity" },
      ]}
      lazy_load_enabled={false}
    />
  );
}
```

## Known Smells & Caveats

The following come from a review of the package source. Treat them as constraints when
consuming the package:

- **`BokehLineChart` hard-codes singleton DOM ids** (`#myplot`, `#graphContainer`).
  Only **one** instance can safely exist per page — multiple mounts collide on those
  ids.
- **Stale `anomalies`.** `graphOptions` initialises `anomalies` from
  `metadata.anomalies` once at mount and never updates if the `metadata` prop changes
  afterward (missing effect / stale closure).
- **DOM mutation during render.** `update_bokeh_graph` is defined inside the render body
  and called directly in the render path (rather than in a `useEffect`), mutating the
  DOM during render. This is a React anti-pattern and breaks Strict Mode
  double-invocation.
- **`embed.embed_item` is called without an `el` target argument**, relying on Bokeh's
  default document-level injection — fragile and undocumented for the version in use.
- **Falsy-value tooltip bug.** `ChartTooltipContent` guards the value with
  `{item.value && …}`, which suppresses a legitimate `0`. It should be
  `item.value !== undefined && item.value !== null`.
- **DevTools display-name mismatches.** `ChartTooltipContent.displayName` is set to
  `'ChartTooltip'`, and `ChartLegendContent.displayName` is set to `'ChartLegend'` — both
  mislabel the components in React DevTools.
- **MUI and Bokeh are direct `dependencies`, not `peerDependencies`.** Every consumer
  bundles its own copy of these large libraries; MUI in particular ideally would be a
  peer.
- **`ChartStyle` is exported publicly** even though it is a rendering detail of
  `ChartContainer` with no documented standalone use case. The internal `useChart` hook
  is *not* exported.
- **Mixed UI paradigms in one component.** `BokehLineChart` combines Tailwind + Radix
  controls with MUI `Autocomplete` / `TextField`, creating an inconsistent styling
  contract for consumers.

---

> Back to the package index: [../00-OVERVIEW.md](../00-OVERVIEW.md)

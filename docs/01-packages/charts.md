# @bcl32/charts

> Back to the package index: [../00-OVERVIEW.md](../00-OVERVIEW.md)

| | |
| --- | --- |
| **Package** | `@bcl32/charts` |
| **Version** | `3.0.0` |
| **Tier** | mid |

## Purpose

`@bcl32/charts` is now **recharts-only**: a shadcn/ui-style wrapper —
`ChartContainer` plus tooltip/legend primitives (`ChartTooltip`,
`ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`) — that make
[recharts](https://recharts.org/) compositions themeable through a single
`ChartConfig` object.

> **3.0.0 (MAJOR): `BokehLineChart` removed.** Prior versions also shipped a
> Bokeh-backed, server-rendered line chart (feature picker, palette select, boolean
> toggles; injected into the DOM via `@bokeh/bokehjs`' `embed.embed_item`, with an
> MUI `Autocomplete`/`TextField` for the feature picker). It was deleted in 3.0.0
> along with the `@bokeh/bokehjs` and `@mui/material` dependencies — see
> [`REFACTORING-LOG.md`](../../REFACTORING-LOG.md) (2026-07-04 entry) and
> [`06-REFACTOR-PROPOSALS.md`](../06-REFACTOR-PROPOSALS.md) §2/§3. No consumer app
> imported it directly (Print-Tracker used Recharts directly for its Stats page
> instead), so the removal has no known migration burden.

## Install & Import

This package is consumed inside the monorepo via the pnpm workspace protocol; it is
already declared as a dependency in the apps that use it. Inter-workspace resolution is
handled by the workspace `link-workspace-packages` setting.

```jsonc
// package.json (consuming app)
{
  "dependencies": {
    "@bcl32/charts": "workspace:^3.0.0"
  }
}
```

The package exposes a root entry plus one subpath export:

| Subpath | Exports |
| --- | --- |
| `@bcl32/charts` (root) | everything below |
| `@bcl32/charts/Charts` | `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`, and the `ChartConfig` / `ChartConfigItem` types |

> `@bcl32/charts/BokehLineChart` **no longer exists** — it was removed in 3.0.0
> along with `BokehLineChart` itself.

```ts
// Recommended: import from the root entry
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@bcl32/charts";
import type { ChartConfig } from "@bcl32/charts";
```

## Public Exports

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
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
| `@bcl32/utils` | `cn` class-merge utility used by `ChartContainer`. |
| `@bcl32/hooks` | Still declared in `package.json` (`workspace:^2.2.6`) but **no longer imported anywhere in `src/`** — it was only used by the now-deleted `BokehLineChart`'s `useBokehChart` call. This is a fresh unused-dependency smell introduced by the 3.0.0 removal; see [Known Smells](#known-smells--caveats). |

### Peer dependencies

The consuming app must supply these:

| Peer | Range |
| --- | --- |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `recharts` | `^2.12.0` |

### External (bundled `dependencies`)

_None._ `@mui/material` and `@bokeh/bokehjs` were removed in 3.0.0 along with
`BokehLineChart` — the package has zero `@mui/*`/`@bokeh/*` dependencies now.

## UI Libraries In Use

| Library | Where |
| --- | --- |
| Tailwind CSS | `ChartContainer` styling. |
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
- **Tailwind must be configured in the consuming app.** `ChartContainer` uses
  Tailwind utility/arbitrary-variant classes directly in JSX (e.g. `aspect-video`).
  The app's Tailwind `content` paths must include this package so the classes are
  not purged.
- **`'use client'` directive.** `Charts.tsx` carries a `'use client'` directive on
  line 1, making it compatible with Next.js RSC boundaries. (The monorepo does not
  currently use Next.js.)

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

## Known Smells & Caveats

The following come from a review of the package source. Treat them as constraints when
consuming the package:

- **Falsy-value tooltip bug.** `ChartTooltipContent` guards the value with
  `{item.value && …}`, which suppresses a legitimate `0`. It should be
  `item.value !== undefined && item.value !== null`.
- **DevTools display-name mismatches.** `ChartTooltipContent.displayName` is set to
  `'ChartTooltip'`, and `ChartLegendContent.displayName` is set to `'ChartLegend'` — both
  mislabel the components in React DevTools.
- **`ChartStyle` is exported publicly** even though it is a rendering detail of
  `ChartContainer` with no documented standalone use case. The internal `useChart` hook
  is *not* exported.
- **`@bcl32/hooks` is now an unused declared dependency.** It was only needed for
  `BokehLineChart`'s `useBokehChart` call; with `BokehLineChart` removed in 3.0.0,
  `package.json` still lists `@bcl32/hooks` (`workspace:^2.2.6`) but no `src/` file
  imports it. Candidate for removal in a future patch (mirrors the pre-existing
  `datatable` → `@bcl32/hooks` unused-dependency smell).

> **Resolved in 3.0.0:** the `BokehLineChart`-specific caveats that used to live here
> (singleton DOM ids, stale `anomalies` closure, DOM mutation during render, MUI/Bokeh
> as non-peer `dependencies`, mixed Tailwind+Radix+MUI styling) no longer apply — the
> component was deleted rather than fixed. See
> [`REFACTORING-LOG.md`](../../REFACTORING-LOG.md) for the 2026-07-04 entry.

---

> Back to the package index: [../00-OVERVIEW.md](../00-OVERVIEW.md)

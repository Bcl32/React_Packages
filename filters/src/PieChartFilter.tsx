import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Cell, Label, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";
import { FilterHeader } from "./FilterHeader";
import type { FilterContextValue, ChartDataEntry } from "./types";
import {
  buildChartConfig,
  foldChartData,
  humanizeFieldName,
  isSemanticStatusName,
  OTHER_KEY,
  prettyOptionLabel,
  resolveCategoryColour,
} from "./utils";

interface PieChartFilterProps {
  name: string;
  chart_data: ChartDataEntry[];
  title?: string;
}

/** Slice colours: semantic tokens for status-like names, categorical slots in
 *  fixed order for the rest. The slot counter skips semantic hits so generic
 *  values stay on the leading slots. */
function sliceColours(entries: { name: string }[]): Record<string, string> {
  let slot = 0;
  const colours: Record<string, string> = {};
  entries.forEach((entry) => {
    const semantic = isSemanticStatusName(entry.name) || entry.name === OTHER_KEY;
    colours[entry.name] = resolveCategoryColour(entry.name, slot);
    if (!semantic) slot += 1;
  });
  return colours;
}

export function PieChartFilter({ name, chart_data, title }: PieChartFilterProps): JSX.Element {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  const filter = context?.filters?.[name];
  // Active selection: anything different from the filter's empty value. Drives
  // the dim-others treatment so the chart shows what is currently filtering.
  const selected: string[] = React.useMemo(() => {
    if (!filter) return [];
    if (JSON.stringify(filter.value) === JSON.stringify(filter.filter_empty)) return [];
    return Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)];
  }, [filter]);

  function reset() {
    if (!filter) return;
    context?.change_filters(name, "value", structuredClone(filter.filter_empty));
  }

  function filter_on_click(value: string) {
    if (value === OTHER_KEY) return; // a fold, not a real category
    if (selected.includes(value)) {
      reset(); // clicking the active slice toggles the filter off
      return;
    }
    if (filter?.type === "options") {
      context?.change_filters(name, "value", [value]);
    } else {
      context?.change_filters(name, "value", value);
    }
  }

  const { entries } = foldChartData(chart_data);
  const colours = sliceColours(entries);
  const total = entries.reduce((sum, e) => sum + (e.length ?? 0), 0);

  const chartConfig = buildChartConfig(entries.map((e) => e.name));
  entries.forEach((entry) => {
    chartConfig[entry.name] = {
      label: prettyOptionLabel(entry.name),
      color: colours[entry.name],
    };
  });

  const dimmed = (entryName: string) =>
    selected.length > 0 && !selected.includes(entryName);

  return (
    <div>
      <FilterHeader
        label={title ?? humanizeFieldName(name)}
        actions={
          selected.length > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="rounded px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Reset
            </button>
          ) : undefined
        }
      />

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[220px]"
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
          {/* Click handling lives on the Pie: chart-level onClick only gets
              activePayload on axis charts, never on pies. */}
          <Pie
            data={entries}
            animationDuration={500}
            dataKey="length"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            onClick={(slice: { name?: string }) => {
              if (slice?.name) {
                filter_on_click(slice.name);
              }
            }}
          >
            {entries.map((entry) => (
              <Cell
                key={entry.name}
                fill={colours[entry.name]}
                // 2px surface-colour gap between slices — the spacer, not a border
                stroke="hsl(var(--card))"
                strokeWidth={2}
                opacity={dimmed(entry.name) ? 0.3 : 1}
                className={entry.name === OTHER_KEY ? "outline-none" : "cursor-pointer outline-none"}
              />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                  return null;
                }
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={cx} y={cy - 2} className="fill-foreground text-xl font-semibold">
                      {total.toLocaleString()}
                    </tspan>
                    <tspan x={cx} y={cy + 15} className="fill-muted-foreground text-[10px]">
                      total
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Compact legend with counts. Identity rides the swatch; text stays in
          text tokens. "Other" is informational only, so no click handler. */}
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {entries.map((entry) => (
          <button
            key={entry.name}
            type="button"
            disabled={entry.name === OTHER_KEY}
            onClick={() => filter_on_click(entry.name)}
            className={
              "flex items-center gap-1.5 text-xs text-foreground " +
              (entry.name === OTHER_KEY ? "cursor-default" : "hover:opacity-80") +
              (dimmed(entry.name) ? " opacity-40" : "")
            }
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: colours[entry.name] }}
            />
            {prettyOptionLabel(entry.name)}
            <span className="tabular-nums text-muted-foreground">
              {(entry.length ?? 0).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

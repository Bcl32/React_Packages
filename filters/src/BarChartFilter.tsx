import * as React from "react";
import { FilterContext } from "./FilterContext";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";
import { FilterHeader } from "./FilterHeader";
import type {
  FilterContextValue,
  ChartDataEntry,
  ChartClickEvent,
  ChartValueLabelling,
} from "./types";
import { humanizeFieldName, resolveChartLabeller } from "./utils";

interface BarChartFilterProps {
  name: string;
  chart_data: ChartDataEntry[];
  title?: string;
  /**
   * Display-only renaming of the bar categories: a `(rawValue) => label`
   * function, or a map keyed by dimension name. Drives the axis ticks and the
   * tooltip only — `bar_click` still sends the raw category value to the
   * filter. Defaults to `prettyOptionLabel`, which is what it did before.
   */
  labelFor?: ChartValueLabelling;
}

/** Row height in px — bars stay ≤ 24px thick with air around them. */
const ROW_HEIGHT = 30;

export function BarChartFilter({
  name,
  chart_data,
  title,
  labelFor,
}: BarChartFilterProps): JSX.Element {
  const labelOf = resolveChartLabeller(labelFor, name);
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  const filter = context?.filters?.[name];
  const selected: string[] = React.useMemo(() => {
    if (!filter) return [];
    if (JSON.stringify(filter.value) === JSON.stringify(filter.filter_empty)) return [];
    return Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)];
  }, [filter]);

  function reset() {
    if (!filter) return;
    context?.change_filters(name, "value", structuredClone(filter.filter_empty));
  }

  function bar_click(value: string) {
    if (selected.includes(value)) {
      reset(); // clicking the active bar toggles the filter off
      return;
    }
    if (filter?.type === "options") {
      context?.change_filters(name, "value", [value]);
    } else {
      context?.change_filters(name, "value", value);
    }
  }

  const chartConfig = {
    length: {
      label: "Count",
      // single series → the theme accent, not an arbitrary categorical slot
      color: "hsl(var(--chart-1))",
    },
  };

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
        className="mt-1 aspect-auto w-full"
        style={{ height: chart_data.length * ROW_HEIGHT + 8 }}
      >
        <BarChart
          accessibilityLayer
          data={chart_data}
          layout="vertical"
          margin={{ top: 0, right: 34, bottom: 0, left: 0 }}
          onClick={(data: ChartClickEvent) => {
            if (data && data.activePayload && data.activePayload.length > 0) {
              const value = data.activePayload[0]["payload"]["name"];
              bar_click(value);
            }
          }}
          className="cursor-pointer"
        >
          <YAxis
            dataKey="name"
            type="category"
            width={96}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            fontSize={12}
            tickFormatter={(value: string) => {
              const label = labelOf(value);
              return label.length > 13 ? label.slice(0, 12) + "…" : label;
            }}
          />
          <XAxis dataKey="length" type="number" hide />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                // The tooltip's heading is the raw category value. Only rewrite
                // it when the caller actually asked for renaming — without
                // `labelFor` this stays the untouched token it has always been.
                {...(labelFor
                  ? {
                      labelFormatter: (value: string | undefined) =>
                        value ? labelOf(String(value)) : "",
                    }
                  : {})}
              />
            }
          />

          <Bar dataKey="length" barSize={18} radius={[0, 4, 4, 0]}>
            {chart_data.map((entry) => (
              <Cell
                key={entry.name}
                fill="hsl(var(--chart-1))"
                opacity={dimmed(entry.name) ? 0.3 : 1}
              />
            ))}
            <LabelList
              dataKey="length"
              position="right"
              offset={8}
              className="fill-foreground tabular-nums"
              fontSize={12}
              formatter={(value: number) => value.toLocaleString()}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

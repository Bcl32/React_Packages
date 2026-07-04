"use client";
import { Cell, Label, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "./Charts";
import type { ChartConfig } from "./Charts";

/** Fallback categorical cycle used when a slice has no configured colour. */
const CHART_CYCLE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export interface DonutSlice {
  name: string;
  value: number;
}

export interface DonutCenterLabel {
  value: string | number;
  caption?: string;
}

export interface DonutChartProps {
  /** per-slice label + colour keyed by slice name */
  config: ChartConfig;
  data: DonutSlice[];
  /** big number + caption drawn in the ring's hole */
  centerLabel?: DonutCenterLabel;
  onSliceClick?: (name: string) => void;
  className?: string;
}

export function DonutChart({
  config,
  data,
  centerLabel,
  onSliceClick,
  className,
}: DonutChartProps): JSX.Element {
  return (
    <ChartContainer config={config} className={className}>
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          strokeWidth={2}
          onClick={
            onSliceClick
              ? (slice: DonutSlice) => onSliceClick(slice.name)
              : undefined
          }
        >
          {data.map((slice, index) => (
            <Cell
              key={slice.name}
              fill={config[slice.name]?.color ?? CHART_CYCLE[index % CHART_CYCLE.length]}
              className={onSliceClick ? "cursor-pointer outline-none" : "outline-none"}
            />
          ))}
          {centerLabel ? (
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                  return null;
                }
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={cx}
                      y={cy}
                      className="fill-foreground text-2xl font-semibold tabular-nums"
                    >
                      {centerLabel.value}
                    </tspan>
                    {centerLabel.caption ? (
                      <tspan
                        x={cx}
                        y={cy + 20}
                        className="fill-muted-foreground text-xs"
                      >
                        {centerLabel.caption}
                      </tspan>
                    ) : null}
                  </text>
                );
              }}
            />
          ) : null}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";
import { FilterHeader } from "./FilterHeader";
import type { ChartDataEntry } from "./types";
import { humanizeFieldName } from "./utils";

interface HistogramProps {
  name: string;
  chart_data: ChartDataEntry[];
  title?: string;
}

export function Histogram({ name, chart_data, title }: HistogramProps): JSX.Element {
  const chartConfig = {
    count: {
      label: "Count",
      // single series → the theme accent; the header names it, so no legend
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div>
      <FilterHeader label={title ?? humanizeFieldName(name)} />

      <ChartContainer config={chartConfig} className="mt-1">
        <BarChart
          accessibilityLayer
          data={chart_data}
          barCategoryGap={2}
        >
          <CartesianGrid vertical={false} />

          {/* square baseline, rounded data-end — bars sit on the axis */}
          <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={24} />

          <XAxis dataKey="range" hide />

          <XAxis
            dataKey="x0"
            scale="band"
            xAxisId="ticks"
            tickCount={chart_data.length}
            fontSize={11}
            tickLine={false}
          />

          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

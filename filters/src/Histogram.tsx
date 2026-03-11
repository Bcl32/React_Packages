import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartLegend,
  ChartLegendContent,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";
import type { ChartDataEntry } from "./types";

interface HistogramProps {
  name: string;
  chart_data: ChartDataEntry[];
}

export function Histogram({ chart_data }: HistogramProps): JSX.Element {
  const chartConfig = {
    count: {
      label: "Count",
      color: "hsl(var(--chart-3))",
    },
    label: {
      color: "white",
    },
  };

  return (
    <ChartContainer config={chartConfig}>
      <BarChart
        accessibilityLayer
        data={chart_data}
      >
        <CartesianGrid vertical={false} />

        <Bar dataKey="count" fill="var(--color-count)" radius={4} />

        <XAxis dataKey="range" hide />

        <XAxis
          dataKey="x0"
          scale="band"
          xAxisId="ticks"
          tickCount={chart_data.length}
        />

        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}

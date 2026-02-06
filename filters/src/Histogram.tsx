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

interface ClickPayload {
  payload: {
    name: string;
    [key: string]: unknown;
  };
}

interface ChartClickEvent {
  activePayload?: ClickPayload[];
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
        onClick={(data: ChartClickEvent) => {
          if (data && data.activePayload && data.activePayload.length > 0) {
            // click handler available for future use
          }
        }}
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

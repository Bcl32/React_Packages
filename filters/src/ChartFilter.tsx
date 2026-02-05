import { BarChartFilter } from "./BarChartFilter";
import { LineChartFilter } from "./LineChartFilter";
import { PieChartFilter } from "./PieChartFilter";
import { BarChartSwitcher } from "./BarChartSwitcher";
import { StackedBarChart } from "./StackedBarChart";
import { Histogram } from "./Histogram";
import type { ChartMetadata, ChartDataEntry } from "./types";

interface ChartFilterProps {
  chart_metadata: ChartMetadata;
  chart_data: ChartDataEntry[];
}

export function ChartFilter({ chart_metadata, chart_data }: ChartFilterProps): JSX.Element {
  const name = chart_metadata["name"];
  const chart_type = chart_metadata["type"];

  switch (chart_type) {
    case "line":
      return (
        <LineChartFilter name={name} chart_data={chart_data} />
      );
    case "pie":
      return (
        <PieChartFilter name={name} chart_data={chart_data} />
      );
    case "bar":
      return (
        <BarChartFilter name={name} chart_data={chart_data} />
      );
    case "bar-switcher":
      return (
        <BarChartSwitcher
          name={name}
          subkeys={chart_metadata["subkeys"] || []}
          chart_data={chart_data}
        />
      );
    case "stacked_bar":
      return (
        <StackedBarChart
          name={name}
          subkeys={chart_metadata["subkeys"] || []}
          chart_data={chart_data}
        />
      );
    case "histogram":
      return (
        <Histogram
          name={name}
          chart_data={chart_data}
        />
      );
    default:
      return <p>No filter</p>;
  }
}

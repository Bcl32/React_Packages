import { BarChartFilter } from "./BarChartFilter";
import { LineChartFilter } from "./LineChartFilter";
import { PieChartFilter } from "./PieChartFilter";
import { BarChartSwitcher } from "./BarChartSwitcher";
import { StackedBarChart } from "./StackedBarChart";
import { Histogram } from "./Histogram";
import type { ChartMetadata, ChartDataEntry, ChartValueLabelling } from "./types";
import { resolveChartLabeller } from "./utils";

interface ChartFilterProps {
  chart_metadata: ChartMetadata;
  chart_data: ChartDataEntry[];
  /**
   * Optional display-only renaming of this chart's category values — either a
   * single `(rawValue) => label` function, or a map keyed by chart dimension
   * name (`chart_metadata.name`) so one object can be handed to every chart on
   * a page.
   *
   * Only what the reader sees changes: axis ticks, legend text and tooltip
   * names. Clicks keep writing the RAW category value into the filter, so the
   * chart → filter → data round-trip is untouched. Omitting the prop keeps the
   * previous behaviour byte for byte.
   *
   * Honoured by the category charts that are click-to-filter surfaces ("bar",
   * "pie"). The time and numeric chart types format their own axes from the
   * data's own units and ignore it.
   */
  labelFor?: ChartValueLabelling;
}

export function ChartFilter({
  chart_metadata,
  chart_data,
  labelFor,
}: ChartFilterProps): JSX.Element {
  const name = chart_metadata["name"];
  const chart_type = chart_metadata["type"];
  const title = chart_metadata["title"];
  // Collapse the per-chart / per-dimension forms once, here, so each leaf
  // chart only ever deals with a plain labelling function.
  const labeller = resolveChartLabeller(labelFor, name);

  switch (chart_type) {
    case "line":
      return (
        <LineChartFilter name={name} chart_data={chart_data} />
      );
    case "pie":
      return (
        <PieChartFilter
          name={name}
          chart_data={chart_data}
          title={title}
          labelFor={labeller}
        />
      );
    case "bar":
      return (
        <BarChartFilter
          name={name}
          chart_data={chart_data}
          title={title}
          labelFor={labeller}
        />
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
          title={title}
        />
      );
    default:
      return <p>No filter</p>;
  }
}

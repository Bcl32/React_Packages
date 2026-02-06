import * as React from "react";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import { Label } from "@bcl32/utils/Label";
import { Select } from "@bcl32/utils/Select";
import { Checkbox } from "@bcl32/utils/Checkbox";

import { useBokehChart } from "@bcl32/hooks/useBokehChart";

import { embed } from "@bokeh/bokehjs";

interface StatOption {
  label: string;
  value: string;
}

interface Metadata {
  url: string;
  anomalies?: unknown[];
}

interface GraphOptions {
  palette: string;
  features_to_plot: string[];
  missing_values: boolean;
  labels: boolean;
  show_anomalies: boolean;
  anomalies?: unknown[];
  second_graph: boolean;
}

interface BokehLineChartProps {
  url: string;
  metadata: Metadata;
  features_to_plot: string[];
  stat_options: StatOption[];
  lazy_load_enabled?: boolean;
  lazy_load_value?: unknown;
}

export function BokehLineChart(props: BokehLineChartProps) {
  const metadata = props.metadata;
  const [graphOptions, setGraphOptions] = React.useState<GraphOptions>({
    palette: "Dark2",
    features_to_plot: props.features_to_plot,
    missing_values: false,
    labels: true,
    show_anomalies: true,
    anomalies: metadata.anomalies,
    second_graph: false,
  });

  const graphData = useBokehChart(
    props.url,
    metadata.url,
    graphOptions as unknown as Record<string, unknown>,
    props.lazy_load_enabled,
    props.lazy_load_value
  );

  function update_bokeh_graph(bokeh_obj: unknown) {
    const myplot = document.getElementById("myplot");
    if (myplot) {
      myplot.remove();
      const graphContainer = document.getElementById("graphContainer");
      if (graphContainer) {
        const g = graphContainer.appendChild(document.createElement("div"));
        g.setAttribute("id", "myplot");
        embed.embed_item(bokeh_obj as Parameters<typeof embed.embed_item>[0]);
      }
    }
  }

  if (graphData.isSuccess) {
    console.log("updating graph");
    update_bokeh_graph(JSON.parse(graphData.data.bokeh_graph as string));
  }

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = event.target;
    setGraphOptions((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });
  }

  function handleCheckboxChange(name: string, value: boolean) {
    setGraphOptions((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });
  }

  function handleComboboxChange(attribute: string, value: (string | StatOption)[]) {
    const entries: string[] = [];
    value.forEach(function (item) {
      if (typeof item === "string") {
        entries.push(item);
      } else if (item.value) {
        entries.push(item.value);
      }
    });

    setGraphOptions((prevFormData) => {
      return {
        ...prevFormData,
        [attribute]: entries,
      };
    });
  }

  const stat_options = props.stat_options;

  return (
    <div className="grid xl:grid-cols-12">
      <div className="col-span-9" id="graphContainer">
        <div id="myplot"></div>
      </div>

      <div className="col-span-3">
        {graphData.isLoading && "Getting chart..."}
        {graphData.isError && (
          <div style={{ color: "red" }}>
            An error occurred: {graphData.error?.message}
          </div>
        )}
        {graphData.isSuccess && (
          <div style={{ color: "green" }}>Graph Loaded!</div>
        )}

        <div className="w-48">
          <label
            htmlFor="Palette"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Palette
          </label>

          <Select
            name="palette"
            id="input_palette"
            onChange={handleChange}
            value={graphOptions.palette}
          >
            <option value="Category10">Category10</option>
            <option value="Accent">Accent</option>
            <option value="Dark2">Dark2</option>
          </Select>
        </div>

        <div className="flex items-center mb-4">
          <Checkbox
            name="missing_values"
            checked={graphOptions.missing_values}
            onCheckedChange={(checked) => {
              handleCheckboxChange("missing_values", checked as boolean);
            }}
            className="w-6 h-6 border-2"
            id="missing_values-checkbox"
          />
          <Label
            className="text-lg leading-none"
            htmlFor="missing_values-checkbox"
          >
            Show Missing Values
          </Label>
        </div>

        <div className="flex items-center mb-4">
          <Checkbox
            name="second_graph"
            checked={graphOptions.second_graph}
            onCheckedChange={(checked) => {
              handleCheckboxChange("second_graph", checked as boolean);
            }}
            className="w-6 h-6 border-2"
            id="second_graph-checkbox"
          />
          <Label
            className="text-lg leading-none"
            htmlFor="second_graph-checkbox"
          >
            Add Linked Graph
          </Label>
        </div>

        <div className="flex items-center mb-4">
          <Checkbox
            name="labels"
            checked={graphOptions.labels}
            onCheckedChange={(checked) => {
              handleCheckboxChange("labels", checked as boolean);
            }}
            className="w-6 h-6 border-2"
            id="labels-checkbox"
          />
          <Label className="text-lg leading-none" htmlFor="labels-checkbox">
            Show Labels
          </Label>
        </div>

        <div className="flex items-center mb-4">
          <Checkbox
            name="show_anomalies"
            checked={graphOptions.show_anomalies}
            onCheckedChange={(checked) => {
              handleCheckboxChange("show_anomalies", checked as boolean);
            }}
            className="w-6 h-6 border-2"
            id="show_anomalies-checkbox"
          />
          <Label
            className="text-lg leading-none"
            htmlFor="show_anomalies-checkbox"
          >
            Show Anomalies
          </Label>
        </div>

        <Autocomplete
          freeSolo
          multiple
          options={stat_options}
          value={graphOptions.features_to_plot}
          onChange={(_event, value) =>
            handleComboboxChange("features_to_plot", value)
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label="Features to Plot"
              placeholder="Features to Plot"
            />
          )}
        />
      </div>
    </div>
  );
}

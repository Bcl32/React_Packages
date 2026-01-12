import React from "react";

// mui
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

//ui
import { Label } from "@bcl32/utils/Label";
import { Select } from "@bcl32/utils/Select";
import { Checkbox } from "@bcl32/utils/Checkbox";

//MONOREPO PACKAGE IMPORTS
import { useBokehChart } from "@bcl32/hooks/useBokehChart";

//other modules
import { embed } from "@bokeh/bokehjs";

export function BokehLineChart(props) {
  let metadata = props.metadata;
  const [graphOptions, setGraphOptions] = React.useState({
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
    graphOptions,
    props.lazy_load_enabled,
    props.lazy_load_value
  );

  function update_bokeh_graph(bokeh_obj) {
    if (document.getElementById("myplot")) {
      document.getElementById("myplot").remove(); //remove div that contains the old graph
      var g = document //make new div to store the new graph
        .getElementById("graphContainer")
        .appendChild(document.createElement("div"));
      g.setAttribute("id", "myplot"); //set id on newly made div
      embed.embed_item(bokeh_obj); //place graph data inside new graph div
    }
  }

  if (graphData.isSuccess) {
    console.log("updating graph");
    update_bokeh_graph(JSON.parse(graphData.data["bokeh_graph"]));
  }

  //used to update formData
  function handleChange(event) {
    var { name, value, type, checked } = event.target;
    setGraphOptions((prevFormData) => {
      return {
        ...prevFormData,
        [name]: type === "checkbox" ? checked : value,
      };
    });
  }

  function handleCheckboxChange(name, value) {
    setGraphOptions((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });
  }

  //special formData updater function for select comboboxes as input differs from other inputs are objects and multiple items can used
  function handleComboboxChange(attribute, value) {
    var entries = [];
    value.forEach(function (item) {
      //get labels from each selected object in array
      if (typeof item.label == "undefined") {
        //custom entries don't have label key
        entries.push(item);
      } else {
        entries.push(item.value);
      } //entries from combobox are in an object with label key
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
            An error occurred: {graphData.error.message}
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
              handleCheckboxChange("missing_values", checked);
            }}
            className="w-6 h-6 border-2"
            id="missing_values-checkbox"
            type="checkbox"
            value={graphOptions.missing_values}
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
              handleCheckboxChange("second_graph", checked);
            }}
            className="w-6 h-6 border-2"
            id="second_graph-checkbox"
            type="checkbox"
            value={graphOptions.second_graph}
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
              handleCheckboxChange("labels", checked);
            }}
            className="w-6 h-6 border-2"
            id="labels-checkbox"
            type="checkbox"
            value={graphOptions.labels}
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
              handleCheckboxChange("show_anomalies", checked);
            }}
            className="w-6 h-6 border-2"
            id="show_anomalies-checkbox"
            type="checkbox"
            value={graphOptions.show_anomalies}
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
          onChange={(event, value) =>
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

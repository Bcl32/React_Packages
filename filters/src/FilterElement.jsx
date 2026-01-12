//THIRD PARTY LIBRARIES
import React from "react";

//my custom components
import DebouncedTextFilter from "./DebouncedTextFilter";
import DebouncedNumberFilter from "./DebouncedNumberFilter";
import { SelectFilter } from "./SelectFilter";
import { ListFilter } from "./ListFilter";
import { TimeFilter } from "./TimeFilter";

export function FilterElement({ filter_data }) {
  var chart = get_chart_type(filter_data);
  return <div>{chart}</div>;
}

function get_chart_type(filter_data) {
  switch (filter_data["type"]) {
    case "string":
      return (
        <DebouncedTextFilter name={filter_data["name"]}></DebouncedTextFilter>
      );

    case "datetime":
      return (
        <div>
          <TimeFilter name={filter_data["name"]}></TimeFilter>
        </div>
      );
    case "number":
      return (
        <DebouncedNumberFilter
          name={filter_data["name"]}
        ></DebouncedNumberFilter>
      );
    case "select":
      return (
        <SelectFilter
          name={filter_data["name"]}
          options={filter_data["options"]}
        ></SelectFilter>
      );
    case "list":
      return (
        <ListFilter
          name={filter_data["name"]}
          options={filter_data["options"]}
        ></ListFilter>
      );
    default:
      return <p>No filter</p>;
  }
}

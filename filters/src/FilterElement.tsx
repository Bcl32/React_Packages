import DebouncedTextFilter from "./DebouncedTextFilter";
import DebouncedNumberFilter from "./DebouncedNumberFilter";
import { SelectFilter } from "./SelectFilter";
import { ListFilter } from "./ListFilter";
import { TimeFilter } from "./TimeFilter";
import type { FilterData } from "./types";

interface FilterElementProps {
  filter_data: FilterData;
}

export function FilterElement({ filter_data }: FilterElementProps): JSX.Element {
  const chart = get_chart_type(filter_data);
  return <div>{chart}</div>;
}

function get_chart_type(filter_data: FilterData): JSX.Element {
  switch (filter_data["type"]) {
    case "string":
      return (
        <DebouncedTextFilter name={filter_data["name"]} />
      );

    case "datetime":
      return (
        <div>
          <TimeFilter name={filter_data["name"]} />
        </div>
      );
    case "number":
      return (
        <DebouncedNumberFilter name={filter_data["name"]} />
      );
    case "select":
      return (
        <SelectFilter
          name={filter_data["name"]}
          options={filter_data["options"] || []}
        />
      );
    case "list":
      return (
        <ListFilter
          name={filter_data["name"]}
          options={filter_data["options"] || []}
        />
      );
    default:
      return <p>No filter</p>;
  }
}

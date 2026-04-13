import { DebouncedTextFilter } from "./DebouncedTextFilter";
import { DebouncedNumberFilter } from "./DebouncedNumberFilter";
import { OptionsFilter } from "./OptionsFilter";
import { TimeFilter } from "./TimeFilter";
import type { FilterData, FilterDisplay, FilterOption, FilterSelection, FilterSourceKind, ColourPresetsConfig } from "./types";

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
    case "options":
      return (
        <OptionsFilter
          name={filter_data["name"]}
          options={(filter_data["options"] as FilterOption[]) || []}
          display={filter_data["display"] as FilterDisplay | undefined}
          selection={filter_data["selection"] as FilterSelection | undefined}
          source_kind={filter_data["source_kind"] as FilterSourceKind | undefined}
          colour_presets={filter_data["colour_presets"] as ColourPresetsConfig | undefined}
        />
      );
    default:
      return <p>No filter</p>;
  }
}

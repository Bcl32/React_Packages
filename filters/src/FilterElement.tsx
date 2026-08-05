import * as React from "react";
import { FilterContext } from "./FilterContext";
import { DebouncedTextFilter } from "./DebouncedTextFilter";
import { DebouncedNumberFilter } from "./DebouncedNumberFilter";
import { OptionsFilter } from "./OptionsFilter";
import { TimeFilter } from "./TimeFilter";
import type { FilterContextValue, FilterData, FilterDisplay, FilterOption, FilterSelection, FilterSourceKind, ColourPresetsConfig } from "./types";

interface FilterElementProps {
  filter_data: FilterData;
}

export function FilterElement({ filter_data }: FilterElementProps): JSX.Element {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // User-added instances get a ✕ that drops the slot entirely; schema-declared
  // filters keep reset-to-full-range semantics and render without one.
  const removeFilter = context?.remove_filter;
  const onRemove =
    filter_data["dynamic"] && removeFilter
      ? () => removeFilter(filter_data["name"])
      : undefined;

  // `min-w-0` is what lets a long title or a wide value truncate instead of
  // forcing its grid column wider than the share it was given.
  return <div className="min-w-0">{get_chart_type(filter_data, onRemove)}</div>;
}

function get_chart_type(filter_data: FilterData, onRemove?: () => void): JSX.Element {
  // Prefer the schema-provided `title` (e.g. "Size (mm)"); components fall back
  // to a humanized field name when it's absent.
  const title = filter_data["title"] as string | undefined;
  switch (filter_data["type"]) {
    case "string":
      return (
        <DebouncedTextFilter
          name={filter_data["name"]}
          title={title}
          onRemove={onRemove}
        />
      );

    case "datetime":
      return (
        <TimeFilter
          name={filter_data["name"]}
          title={title}
          onRemove={onRemove}
        />
      );
    case "number":
      return (
        <DebouncedNumberFilter
          name={filter_data["name"]}
          title={title}
          onRemove={onRemove}
        />
      );
    case "options":
      return (
        <OptionsFilter
          name={filter_data["name"]}
          title={title}
          options={(filter_data["options"] as FilterOption[]) || []}
          display={filter_data["display"] as FilterDisplay | undefined}
          selection={filter_data["selection"] as FilterSelection | undefined}
          source_kind={filter_data["source_kind"] as FilterSourceKind | undefined}
          colour_presets={filter_data["colour_presets"] as ColourPresetsConfig | undefined}
          onRemove={onRemove}
        />
      );
    default:
      return <p>No filter</p>;
  }
}

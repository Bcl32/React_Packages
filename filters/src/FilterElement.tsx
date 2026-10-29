import * as React from "react";
import { FilterContext } from "./FilterContext";
import { DebouncedTextFilter } from "./DebouncedTextFilter";
import { DebouncedNumberFilter } from "./DebouncedNumberFilter";
import { OptionsFilter } from "./OptionsFilter";
import { BooleanFilter } from "./BooleanFilter";
import { TimeFilter } from "./TimeFilter";
import { DateFilter } from "./DateFilter";
import { FILTER_FIELD_ATTR } from "./FilterTargeting";
import type { FilterContextValue, FilterData, FilterOptionIcon, FilterOptionSize } from "./types";

interface FilterElementProps {
  filter_data: FilterData;
  /** Toggle-buttons option size; other filters ignore it. */
  optionSize?: FilterOptionSize;
  /** Mark in front of a toggle-buttons / chip-toggle option; other filters ignore it. */
  optionIcon?: FilterOptionIcon;
}

export function FilterElement({ filter_data, optionSize, optionIcon }: FilterElementProps): JSX.Element {
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
  //
  // The data attribute is how a keyboard shortcut finds this card once its
  // filter is mounted — see FilterTargeting. Keyed by `name` (the instance key)
  // rather than the field, so a duplicate "tags#2" is distinguishable from the
  // original sitting beside it.
  // A custom filter may take the right half of the panel (CustomFilterDef
  // `width`). The panel is 2/3/4/5 columns across the breakpoints, so "half"
  // is the right half rounded up, started at the column after the left half;
  // on a one-column phone layout there is nothing to span.
  const half = filter_data["custom"]?.width === "half";
  return (
    <div
      className={
        half
          ? "min-w-0 sm:col-span-1 sm:col-start-2 lg:col-span-2 lg:col-start-2 xl:col-span-2 xl:col-start-3 2xl:col-span-3 2xl:col-start-3"
          : "min-w-0"
      }
      {...{ [FILTER_FIELD_ATTR]: filter_data["name"] }}
    >
      {get_chart_type(filter_data, onRemove, optionSize, optionIcon)}
    </div>
  );
}

function get_chart_type(
  filter_data: FilterData,
  onRemove?: () => void,
  optionSize?: FilterOptionSize,
  optionIcon?: FilterOptionIcon,
): JSX.Element {
  // Prefer the schema-provided `title` (e.g. "Size (mm)"); components fall back
  // to a humanized field name when it's absent.
  const title = filter_data["title"];
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
    case "date":
      return (
        <DateFilter
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
          options={filter_data["options"] || []}
          display={filter_data["display"]}
          optionSize={optionSize}
          optionIcon={optionIcon}
          selection={filter_data["selection"]}
          cell_shape={filter_data["cell_shape"]}
          colour_presets={filter_data["colour_presets"]}
          onRemove={onRemove}
        />
      );
    case "boolean":
      return (
        <BooleanFilter
          name={filter_data["name"]}
          title={title}
          onRemove={onRemove}
        />
      );
    case "custom": {
      // The app's own control (see CustomFilterDef); it reads its value from
      // the same context the package's controls do.
      const Custom = filter_data["custom"]?.component;
      if (!Custom) return <p>No filter</p>;
      return <Custom name={filter_data["name"]} title={title} onRemove={onRemove} />;
    }
    default:
      return <p>No filter</p>;
  }
}

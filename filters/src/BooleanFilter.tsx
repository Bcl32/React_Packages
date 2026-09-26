import * as React from "react";
import { X } from "lucide-react";
import { FilterContext } from "./FilterContext";
import { FilterHeader } from "./FilterHeader";

import { Checkbox } from "@bcl32/utils/Checkbox";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import type { BooleanFilterValue, FilterContextValue } from "./types";
import { humanizeFieldName } from "./utils";

interface BooleanFilterProps {
  name: string;
  title?: string;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
}

/** The segmented control's "no filter" item; null is not a usable item value. */
const ANY = "any";

/**
 * A yes/no filter. Drawn as a segmented Any · Yes · No control, plus Unknown on
 * a nullable field, or as a single checkbox when the field asks for one
 * (display "checkbox"). A checkbox shows one side only: ticked means the
 * field's checkedValue (default Yes), unticked means no filter. A nullable
 * field always gets the segmented control, since a checkbox can't say Unknown.
 */
export function BooleanFilter({ name, title, onRemove }: BooleanFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;
  const filterData = context?.filters?.[name];

  if (!filterData || !context) {
    return null;
  }

  const value = (filterData["value"] ?? null) as BooleanFilterValue;
  const label = title ?? humanizeFieldName(name);
  const nullable = filterData["nullable"] === true;

  function setValue(next: BooleanFilterValue) {
    context!.change_filters(name, "value", next);
  }

  if (filterData["display"] === "checkbox" && !nullable) {
    const checkedValue = filterData["checkedValue"] ?? true;
    const id = `filter-${name}`;
    return (
      <div className="flex items-center gap-2 py-1">
        <Checkbox
          id={id}
          checked={value === checkedValue}
          onCheckedChange={(checked) => setValue(checked === true ? checkedValue : null)}
        />
        <label htmlFor={id} className="flex-1 truncate text-sm cursor-pointer select-none">
          {filterData["checkedLabel"] ?? label}
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            title={`Remove ${label} filter`}
            aria-label={`Remove ${label} filter`}
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  const items: { value: string; label: string }[] = [
    { value: ANY, label: "Any" },
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ];
  if (nullable) items.push({ value: "unknown", label: "Unknown" });

  const current = value === null ? ANY : String(value);

  return (
    <div className="space-y-1">
      <FilterHeader label={label} onRemove={onRemove} />
      {/* Sized like the options toggle buttons: inside the filter grid these
          are captions, not full-height buttons. */}
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={current}
        onValueChange={(next: string) => {
          // Clicking the pressed item reports "": treat it as Any.
          if (!next || next === ANY) setValue(null);
          else if (next === "unknown") setValue("unknown");
          else setValue(next === "true");
        }}
        className="flex flex-wrap justify-start gap-0.5"
        aria-label={label}
      >
        {items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value} className="h-6 rounded px-1.5 text-[11px]">
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

import * as React from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@bcl32/utils/Button";
import { Input } from "@bcl32/utils/Input";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";

import { FilterContext } from "./FilterContext";
import { FilterHeader } from "./FilterHeader";
import { DATE_PRESETS, isDatePreset, isDay } from "./dateOnly";
import type { DateFilterValue, FilterContextValue } from "./types";
import { humanizeFieldName } from "./utils";

interface DateFilterProps {
  name: string;
  title?: string;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
}

const EMPTY: DateFilterValue = { preset: null, from: "", to: "" };

/**
 * A calendar-day filter for a `date` field: the relative presets as a
 * segmented control (the boolean filter's shape), and a From → To pair of
 * native date inputs below it. A preset and a range are alternatives —
 * choosing one clears the other, and clicking the pressed preset clears it.
 *
 * Native inputs because they hand back exactly `YYYY-MM-DD`, the value the
 * row holds: no picker instant to convert, so no timezone to get wrong.
 */
export function DateFilter({ name, title, onRemove }: DateFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;
  const filterData = context?.filters?.[name];

  if (!filterData || !context) {
    return null;
  }

  const value = { ...EMPTY, ...((filterData["value"] as DateFilterValue | null) ?? {}) };
  const label = title ?? humanizeFieldName(name);

  function setValue(next: DateFilterValue) {
    context!.change_filters(name, "value", next);
  }

  const active = value.preset != null || isDay(value.from) || isDay(value.to);

  return (
    <div className="space-y-1">
      <FilterHeader
        label={label}
        onRemove={onRemove}
        actions={
          active ? (
            <Button
              onClick={() => setValue({ ...EMPTY })}
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
              title="Clear"
              aria-label={`Clear ${label}`}
            >
              <RotateCcw size={12} />
            </Button>
          ) : undefined
        }
      />
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value.preset ?? ""}
        onValueChange={(next: string) =>
          // Clicking the pressed item reports "": back to no filter.
          setValue(isDatePreset(next) ? { preset: next, from: "", to: "" } : { ...EMPTY })
        }
        className="flex flex-wrap justify-start gap-0.5"
        aria-label={label}
      >
        {DATE_PRESETS.map((p) => (
          <ToggleGroupItem key={p.value} value={p.value} className="h-6 rounded px-1.5 text-[11px]">
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex items-center gap-1">
        <Input
          type="date"
          size="sm"
          aria-label={`${label} from`}
          value={value.preset ? "" : value.from}
          max={isDay(value.to) && !value.preset ? value.to : undefined}
          onChange={(e) => setValue({ preset: null, from: e.target.value, to: value.preset ? "" : value.to })}
          className="h-6 min-w-0 flex-1 px-1.5 text-[11px]"
        />
        <span aria-hidden className="shrink-0 text-[10px] text-muted-foreground">
          →
        </span>
        <Input
          type="date"
          size="sm"
          aria-label={`${label} to`}
          value={value.preset ? "" : value.to}
          min={isDay(value.from) && !value.preset ? value.from : undefined}
          onChange={(e) => setValue({ preset: null, from: value.preset ? "" : value.from, to: e.target.value })}
          className="h-6 min-w-0 flex-1 px-1.5 text-[11px]"
        />
      </div>
    </div>
  );
}

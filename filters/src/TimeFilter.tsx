import * as React from "react";
import { FilterContext } from "./FilterContext";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

import { Pencil, RotateCcw, X } from "lucide-react";
import { DateTimePicker } from "@bcl32/utils/DateTimePicker";

import { Button } from "@bcl32/utils/Button";
import { DialogButton } from "@bcl32/utils/DialogButton";

import { TimeEditDialog } from "./TimeEditDialog";
import type { FilterContextValue, DatetimeFilterValue } from "./types";
import { humanizeFieldName } from "./utils";

interface TimeFilterProps {
  name: string;
  title?: string;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
}

// The filter bar hands each filter a single narrow column, so the trigger
// labels are abbreviated ("Aug 2 '26, 3:45pm"). The dialog shows full values.
const TRIGGER_FORMAT = "MMM D 'YY, h:mma";

export function TimeFilter({ name, title, onRemove }: TimeFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  const filterValue = filterData["value"] as DatetimeFilterValue;
  const filterEmpty = filterData["filter_empty"];

  function change_time_filter(fieldName: string, timespan: string, value: dayjs.Dayjs) {
    const timespans: DatetimeFilterValue = { ...filterValue };
    if (timespan === "timespan_begin") {
      timespans.timespan_begin = value.toISOString();
    } else if (timespan === "timespan_end") {
      timespans.timespan_end = value.toISOString();
    }
    context?.change_filters(fieldName, "value", timespans);
  }

  function reset_value() {
    context?.change_filters(name, "value", structuredClone(filterEmpty));
  }

  const label = title ?? humanizeFieldName(name);

  return (
    // Matches the sibling filters' card rhythm (see DebouncedNumberFilter) and
    // stays a single column: the enclosing filter bar owns the page grid.
    <div className="p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold shrink-0">{label}</span>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <DialogButton
            key={"dialog-time-edit" + name}
            // `display: contents` dissolves DialogButton's own wrapper <div>
            // so the trigger participates in this flex row directly instead of
            // becoming a block that pushes Reset onto its own line.
            className="contents"
            button={
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
              >
                <Pencil size={13} /> Shortcuts
              </Button>
            }
            size="medium"
            title={label + " — edit time range"}
            variant="default"
          >
            <TimeEditDialog
              filters={context.filters}
              change_time_filter={change_time_filter}
              change_filters={context.change_filters}
              name={name}
            />
          </DialogButton>

          <Button
            onClick={reset_value}
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Reset to the full range"
          >
            <RotateCcw size={13} /> Reset
          </Button>

          {/* Reset stays useful on an instance (widen back without losing the
              slot); ✕ is the one that drops it. */}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              title={`Remove ${label} filter`}
              aria-label={`Remove ${label} filter`}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="min-w-0 space-y-0.5">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            From
          </span>
          <DateTimePicker
            value={dayjs(filterValue["timespan_begin"])}
            format={TRIGGER_FORMAT}
            onChange={(newValue) =>
              newValue && change_time_filter(name, "timespan_begin", newValue)
            }
            className="h-7 w-full justify-start truncate px-2 text-xs font-normal"
          />
        </div>

        <div className="min-w-0 space-y-0.5">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            To
          </span>
          <DateTimePicker
            value={dayjs(filterValue["timespan_end"])}
            format={TRIGGER_FORMAT}
            onChange={(newValue) =>
              newValue && change_time_filter(name, "timespan_end", newValue)
            }
            className="h-7 w-full justify-start truncate px-2 text-xs font-normal"
          />
        </div>
      </div>
    </div>
  );
}

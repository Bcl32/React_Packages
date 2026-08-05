import * as React from "react";
import { FilterContext } from "./FilterContext";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

import { Pencil, RotateCcw } from "lucide-react";
import { DateTimePicker } from "@bcl32/utils/DateTimePicker";

import { Button } from "@bcl32/utils/Button";
import { DialogButton } from "@bcl32/utils/DialogButton";

import { FilterHeader } from "./FilterHeader";
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
    <div className="space-y-1">
      <FilterHeader
        label={label}
        onRemove={onRemove}
        actions={
          <>
            <DialogButton
              key={"dialog-time-edit" + name}
              // `display: contents` dissolves DialogButton's own wrapper <div>
              // so the trigger participates in this flex row directly instead
              // of becoming a block that pushes Reset onto its own line.
              className="contents"
              button={
                // Icon-only: the label row is a caption now, and "Shortcuts"
                // plus "Reset" spelled out no longer fit beside a long field
                // title in a narrower grid column.
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                  title="Time-range shortcuts"
                  aria-label={`${label} — time-range shortcuts`}
                >
                  <Pencil size={12} />
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

            {/* Reset stays useful on an instance (widen back without losing
                the slot); ✕ is the one that drops it. */}
            <Button
              onClick={reset_value}
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
              title="Reset to the full range"
              aria-label={`Reset ${label} to the full range`}
            >
              <RotateCcw size={12} />
            </Button>
          </>
        }
      />

      {/* The From/To captions cost two more text rows than they were worth —
          an arrow between the two triggers says the same thing on the line the
          pickers already occupy. */}
      <div className="flex items-center gap-1">
        <DateTimePicker
          value={dayjs(filterValue["timespan_begin"])}
          format={TRIGGER_FORMAT}
          onChange={(newValue) =>
            newValue && change_time_filter(name, "timespan_begin", newValue)
          }
          className="h-6 min-w-0 flex-1 justify-start truncate px-1.5 text-[11px] font-normal"
        />
        <span aria-hidden className="shrink-0 text-[10px] text-muted-foreground">
          →
        </span>
        <DateTimePicker
          value={dayjs(filterValue["timespan_end"])}
          format={TRIGGER_FORMAT}
          onChange={(newValue) =>
            newValue && change_time_filter(name, "timespan_end", newValue)
          }
          className="h-6 min-w-0 flex-1 justify-start truncate px-1.5 text-[11px] font-normal"
        />
      </div>
    </div>
  );
}

import * as React from "react";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

import { Plus, Minus } from "lucide-react";
import { DateTimePicker } from "@bcl32/utils/DateTimePicker";

import { Button } from "@bcl32/utils/Button";
import { RadioButton } from "@bcl32/utils/RadioButton";

import type { Filters, DatetimeFilterValue } from "./types";

interface TimeEditDialogProps {
  filters: Filters;
  name: string;
  change_time_filter: (name: string, timespan: string, value: dayjs.Dayjs) => void;
  change_filters: (name: string, key: string, value: unknown) => void;
}

// Each shortcut anchors the end of the range to "now" and walks the start back
// by amount/unit, so the row stays declarative and cheap to extend.
const QUICK_RANGES: {
  label: string;
  amount: number;
  unit: dayjs.ManipulateType;
}[] = [
  { label: "15 minutes", amount: 15, unit: "m" },
  { label: "1 hour", amount: 1, unit: "h" },
  { label: "6 hours", amount: 6, unit: "h" },
  { label: "24 hours", amount: 1, unit: "d" },
  { label: "1 week", amount: 1, unit: "w" },
  { label: "1 month", amount: 1, unit: "M" },
  { label: "1 year", amount: 1, unit: "y" },
];

const STEP_UNITS = [
  { interval_name: "Second", value: "s" },
  { interval_name: "Minute", value: "m" },
  { interval_name: "Hour", value: "h" },
  { interval_name: "Day", value: "d" },
  { interval_name: "Week", value: "w" },
  { interval_name: "Month", value: "M" },
  { interval_name: "Year", value: "y" },
];

const BOUNDS = [
  { key: "timespan_begin", label: "Start time" },
  { key: "timespan_end", label: "End time" },
] as const;

const SPAN_UNITS = ["years", "months", "days", "hours", "minutes"] as const;

// Show only the units that are actually non-zero. The old summary rendered
// every unit, so a 15-minute window read "0 Years 0 Months 0 Days 0 Hours
// 15 Minutes".
function formatSpan(milliseconds: number): string {
  const span = dayjs.duration(Math.abs(milliseconds));
  const parts = SPAN_UNITS.map((unit) => ({ amount: span.get(unit), unit }))
    .filter((part) => part.amount > 0)
    .map(
      (part) =>
        `${part.amount} ${part.amount === 1 ? part.unit.slice(0, -1) : part.unit}`
    );

  return parts.length > 0 ? parts.join(" ") : "under a minute";
}

export function TimeEditDialog({
  filters,
  name,
  change_time_filter,
  change_filters,
}: TimeEditDialogProps): JSX.Element {
  const [timeChange, setTimeChange] = React.useState("h");

  const filterValue = filters[name]["value"] as DatetimeFilterValue;

  const span_milliseconds = dayjs(filterValue["timespan_end"]).diff(
    filterValue["timespan_begin"]
  );
  const span_inverted = span_milliseconds < 0;

  const step_label =
    STEP_UNITS.find((unit) => unit.value === timeChange)?.interval_name.toLowerCase() ??
    "hour";

  function handleRadioChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target;
    setTimeChange(value);
  }

  function removeTime(timespan: "timespan_begin" | "timespan_end") {
    const new_value = dayjs(filterValue[timespan]).subtract(
      1,
      timeChange as dayjs.ManipulateType
    );
    change_time_filter(name, timespan, new_value);
  }

  function addTime(timespan: "timespan_begin" | "timespan_end") {
    const new_value = dayjs(filterValue[timespan]).add(1, timeChange as dayjs.ManipulateType);
    change_time_filter(name, timespan, new_value);
  }

  function change_timespans(start_time: dayjs.Dayjs) {
    const timespans: DatetimeFilterValue = {
      timespan_begin: start_time.toISOString(),
      timespan_end: dayjs().toISOString(),
    };

    change_filters(name, "value", timespans);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Selected span
        </p>
        <p className="text-2xl font-semibold tabular-nums">
          {formatSpan(span_milliseconds)}
        </p>
        {span_inverted && (
          <p className="mt-1 text-xs font-medium text-destructive">
            End time is before start time — this filter matches nothing.
          </p>
        )}
      </div>

      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold">Quick ranges</h3>
          <p className="text-xs text-muted-foreground">
            Ends now, and sets the start time relative to it.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map((range) => (
            <Button
              key={range.label + name}
              type="button"
              onClick={() =>
                change_timespans(dayjs().subtract(range.amount, range.unit))
              }
              variant="outline"
              size="sm"
            >
              Past {range.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Fine tune</h3>
          <p className="text-xs text-muted-foreground">
            Nudge either end by one {step_label}, or pick an exact date and time.
          </p>
        </div>

        {/* Both bounds render from the same block so they can't drift apart. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {BOUNDS.map((bound) => (
            <div key={bound.key} className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {bound.label}
              </p>

              <DateTimePicker
                value={dayjs(filterValue[bound.key])}
                onChange={(newValue) =>
                  newValue && change_time_filter(name, bound.key, newValue)
                }
                className="w-full justify-start font-normal"
              />

              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Subtract one ${step_label} from ${bound.label.toLowerCase()}`}
                  onClick={() => removeTime(bound.key)}
                >
                  <Minus size={16} />
                </Button>

                <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
                  1 {step_label}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Add one ${step_label} to ${bound.label.toLowerCase()}`}
                  onClick={() => addTime(bound.key)}
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step size
          </p>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-7">
            {STEP_UNITS.map((interval) => (
              <RadioButton
                key={interval.interval_name + name}
                // Scope the group to this filter: two time filters on one page
                // would otherwise share a single radio group.
                groupName={"time-step-" + name}
                id={"time-step-" + name + "-" + interval.value}
                interval_name={interval.interval_name}
                value={interval.value}
                handleRadioChange={handleRadioChange}
                timeChange={timeChange}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

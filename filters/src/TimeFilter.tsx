import * as React from "react";
import { FilterContext } from "./FilterContext";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

import EditIcon from "@mui/icons-material/Edit";

import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import { Button } from "@bcl32/utils/Button";
import { DialogButton } from "@bcl32/utils/DialogButton";

import TimeEditDialog from "./TimeEditDialog";
import type { FilterContextValue } from "./types";

interface TimeFilterProps {
  name: string;
}

interface DatetimeFilterValue {
  timespan_begin: string;
  timespan_end: string;
}

export function TimeFilter({ name }: TimeFilterProps): JSX.Element | null {
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
    const timespans = JSON.parse(JSON.stringify(filterValue)) as DatetimeFilterValue; //get current values
    if (timespan === "timespan_begin") {
      timespans.timespan_begin = value.toISOString();
    } else if (timespan === "timespan_end") {
      timespans.timespan_end = value.toISOString();
    }
    context?.change_filters(fieldName, "value", timespans);
  }

  function reset_value() {
    context?.change_filters(name, "value", filterEmpty);
  }

  return (
    <div>
      <h1 className="font-semibold text-xl pr-2">
        {" "}
        {name[0].toUpperCase() + name.slice(1)}:
      </h1>

      <div className="grid xl:grid-cols-3">
        <div>
          <h1>Start Time</h1>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <MobileDateTimePicker
              value={dayjs(filterValue["timespan_begin"])}
              onChange={(newValue) =>
                newValue && change_time_filter(name, "timespan_begin", newValue)
              }
            />
          </LocalizationProvider>
        </div>

        <div>
          <h1>End Time</h1>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <MobileDateTimePicker
              value={dayjs(filterValue["timespan_end"])}
              onChange={(newValue) =>
                newValue && change_time_filter(name, "timespan_end", newValue)
              }
            />
          </LocalizationProvider>
        </div>

        <div>
          <DialogButton
            key={"dialog-time-edit" + name}
            button={
              <Button variant="default" size="default">
                <EditIcon /> Edit Shortcuts
              </Button>
            }
            size="big"
            title={"Change datetime for " + name}
            variant="default"
          >
            <TimeEditDialog
              filters={context.filters}
              change_time_filter={change_time_filter}
              change_filters={context.change_filters}
              name={name}
            />
          </DialogButton>

          <Button onClick={reset_value} variant="default" size="lg">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

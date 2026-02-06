import * as React from "react";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import { Button } from "@bcl32/utils/Button";
import { RadioButton } from "@bcl32/utils/RadioButton";

import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import type { Filters } from "./types";

interface TimeEditDialogProps {
  filters: Filters;
  name: string;
  change_time_filter: (name: string, timespan: string, value: dayjs.Dayjs) => void;
  change_filters: (name: string, key: string, value: unknown) => void;
}

interface DatetimeFilterValue {
  timespan_begin: string;
  timespan_end: string;
}

function TimeEditDialog({
  filters,
  name,
  change_time_filter,
  change_filters,
}: TimeEditDialogProps): JSX.Element {
  const [timeChange, setTimeChange] = React.useState("h");

  const filterValue = filters[name]["value"] as DatetimeFilterValue;

  const get_filters_timespan = dayjs.duration(
    dayjs(filterValue["timespan_end"]).diff(
      filterValue["timespan_begin"]
    )
  );

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
    <div>
      <div>
        <p className="font-semibold text-lg pr-2">Time Span:</p>
        <h2 className="text-center text-xl">
          {get_filters_timespan.get("years")} Years{" "}
          {get_filters_timespan.get("months")} Months{" "}
          {get_filters_timespan.get("days")} Days{" "}
          {get_filters_timespan.get("hours")} Hours{" "}
          {get_filters_timespan.get("minutes")} Minutes
        </h2>
      </div>

      <div className="grid xl:grid-cols-2">
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
          <br />
          <IconButton
            type="button"
            sx={{ p: "10px" }}
            aria-label="removeTime"
            onClick={() => removeTime("timespan_begin")}
          >
            <RemoveIcon sx={{ width: 35, height: 35 }} />
          </IconButton>

          <IconButton
            type="button"
            sx={{ p: "10px" }}
            aria-label="addTime"
            onClick={() => addTime("timespan_begin")}
          >
            <AddIcon sx={{ width: 35, height: 35 }} />
          </IconButton>
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

          <br />
          <IconButton
            type="button"
            sx={{ p: "10px" }}
            aria-label="removeTime"
            onClick={() => removeTime("timespan_end")}
          >
            <RemoveIcon sx={{ width: 35, height: 35 }} />
          </IconButton>

          <IconButton
            type="button"
            sx={{ p: "10px" }}
            aria-label="addTime"
            onClick={() => addTime("timespan_end")}
          >
            <AddIcon sx={{ width: 35, height: 35 }} />
          </IconButton>
        </div>
      </div>

      <div className="grid w-[32rem] grid-cols-7 gap-2 rounded-xl bg-muted-foreground p-2">
        {[
          { interval_name: "Second", value: "s" },
          { interval_name: "Minute", value: "m" },
          { interval_name: "Hour", value: "h" },
          { interval_name: "Day", value: "d" },
          { interval_name: "Week", value: "w" },
          { interval_name: "Month", value: "M" },
          { interval_name: "Year", value: "y" },
        ].map((interval) => (
          <RadioButton
            key={interval.interval_name + name}
            interval_name={interval.interval_name}
            value={interval.value}
            handleRadioChange={handleRadioChange}
            timeChange={timeChange}
          />
        ))}
      </div>

      <h1>Filter Shortcuts:</h1>

      <Button
        onClick={() => change_timespans(dayjs().subtract(1, "d"))}
        variant="default"
        size="lg"
      >
        Past Day
      </Button>

      <Button
        onClick={() => change_timespans(dayjs().subtract(1, "w"))}
        variant="default"
        size="lg"
      >
        Past Week
      </Button>

      <Button
        onClick={() => change_timespans(dayjs().subtract(1, "M"))}
        variant="default"
        size="lg"
      >
        Past Month
      </Button>

      <Button
        onClick={() => change_timespans(dayjs().subtract(1, "y"))}
        variant="default"
        size="lg"
      >
        <p>Past Year</p>
      </Button>
    </div>
  );
}

export default TimeEditDialog;

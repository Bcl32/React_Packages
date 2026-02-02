import React from "react";
//context
import { FilterContext } from "./FilterContext";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone"; // dependent on utc plugin

dayjs.extend(utc);
dayjs.extend(timezone);

//mui
import EditIcon from "@mui/icons-material/Edit";

import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

//MONOREPO PACKAGE IMPORTS
import { Button } from "@bcl32/utils/Button";
import { DialogButton } from "@bcl32/utils/DialogButton";

//local imports
import TimeEditDialog from "./TimeEditDialog";

export function TimeFilter({ name, ...props }) {
  var { filters, change_filters } = React.useContext(FilterContext);

  // Safe access to filter data - handles React batching timing issues
  const filterData = filters?.[name];

  // Guard: don't render until filter data is available
  if (!filterData) {
    return null;
  }

  function change_time_filter(name, timespan, value) {
    var timespans = JSON.parse(JSON.stringify(filterData["value"])); //get current values
    timespans[timespan] = value; //update the value for the selected timespan (begin or end)
    change_filters(name, "value", timespans);
  }

  function reset_value() {
    change_filters(name, "value", filterData["filter_empty"]);
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
              value={dayjs(filterData["value"]["timespan_begin"])}
              onChange={(newValue) =>
                change_time_filter(name, "timespan_begin", newValue)
              }
            />
          </LocalizationProvider>
        </div>

        <div>
          <h1>End Time</h1>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <MobileDateTimePicker
              value={dayjs(filterData["value"]["timespan_end"])}
              onChange={(newValue) =>
                change_time_filter(name, "timespan_end", newValue)
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
              filters={filters}
              change_time_filter={change_time_filter}
              change_filters={change_filters}
              name={name}
            ></TimeEditDialog>
          </DialogButton>

          <Button onClick={reset_value} variant="default" size="lg">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

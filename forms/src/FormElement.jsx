import React from "react";

//datetime modules
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone"; // dependent on utc plugin
dayjs.extend(utc);
dayjs.extend(timezone);

import { HelpCircle } from "lucide-react";
import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
import { Checkbox } from "@bcl32/utils/Checkbox";
import { Select } from "@bcl32/utils/Select";
import { CustomTooltip } from "@bcl32/utils/Tooltip";

// mui x
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import ButtonDatePicker from "./ButtonDatePicker";

// Helper component to render label with tooltip
function LabelWithHelp({ htmlFor, children, helpText }) {
  return (
    <div className="flex items-center gap-1 mb-2">
      <Label htmlFor={htmlFor}>{children}</Label>
      {helpText && (
        <CustomTooltip content={helpText} delayDuration={200}>
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </CustomTooltip>
      )}
    </div>
  );
}

export function FormElement({
  entry_data,
  formData,
  setFormData,
  change_datetime,
}) {
  var name = entry_data.name;
  var type = entry_data.type;
  var helpText = entry_data.help_text || entry_data.description || null;

  //used to update formData
  function handleChange(event) {
    var { name, value } = event.target;
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });
  }

  //special formData updater function for select comboboxes as input differs from other inputs are objects and multiple items can used
  function handleComboboxChange(attribute, value) {
    var entries = [];
    value.forEach(function (item) {
      //get labels from each selected object in array
      if (typeof item.label == "undefined") {
        //custom entries don't have label key
        entries.push(item);
      } else {
        entries.push(item.label);
      } //entries from combobox are in an object with label key
    });

    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });
  }

  function handleCheckboxChange(value) {
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });
  }

  switch (type) {
    case "string":
      return (
        <div className="flex">
          <div>
            <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
              {name[0].toUpperCase() + name.slice(1)}:
            </LabelWithHelp>
            <Input
              variant="background"
              size="default"
              id={"input_" + name}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              type="text"
              placeholder=""
            ></Input>
          </div>
        </div>
      );
    case "number":
      return (
        <div className="flex">
          <div className="w-48">
            <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
              {name[0].toUpperCase() + name.slice(1)}:
            </LabelWithHelp>
            <Input
              variant="background"
              size="lg"
              id={"input_" + name}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              type="number"
              placeholder=""
            ></Input>
          </div>
        </div>
      );

    case "boolean":
      console.log(formData[name]);
      return (
        <div className="flex items-center space-x-3 col-2">
          <Checkbox
            name={name}
            checked={formData[name]}
            onCheckedChange={(checked) => {
              handleCheckboxChange(checked);
            }}
            className="w-6 h-6 border-2"
            id={"input_" + name}
            type="checkbox"
            value={formData[name]}
          />
          <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
            {name[0].toUpperCase() + name.slice(1)}
          </LabelWithHelp>
        </div>
      );

    case "list":
      return (
        <div className="py-2">
          <LabelWithHelp htmlFor={name} helpText={helpText}>
            {name[0].toUpperCase() + name.slice(1)}:
          </LabelWithHelp>
          <Autocomplete
            freeSolo
            multiple
            options={entry_data["options"]}
            value={formData[name]}
            onChange={(event, value) => handleComboboxChange(name, value)}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                borderRadius: '0.375rem',
                borderColor: 'hsl(var(--input))',
                '&:hover': {
                  borderColor: 'hsl(var(--ring))',
                },
                '&.Mui-focused': {
                  borderColor: 'hsl(var(--ring))',
                  boxShadow: '0 0 0 2px hsl(var(--ring) / 0.2)',
                },
              },
              '& .MuiInputBase-input': {
                color: 'hsl(var(--foreground))',
              },
              '& .MuiInputLabel-root': {
                color: 'hsl(var(--muted-foreground))',
              },
              '& .MuiChip-root': {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder={`Add ${name}...`}
              />
            )}
          />
        </div>
      );

    case "select":
      return (
        <div className="flex col-2">
          <div className="w-48">
            <LabelWithHelp htmlFor={name} helpText={helpText}>
              {name[0].toUpperCase() + name.slice(1)}:
            </LabelWithHelp>
            <Select
              name={name}
              value={formData[name]}
              onChange={handleChange}
              id={"input_" + name}
            >
              {entry_data.options.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      );
    case "datetime":
      return (
        <div className="py-2">
          <LabelWithHelp htmlFor={name} helpText={helpText}>
            {/* capitalizes the string */}
            {name[0].toUpperCase() + name.slice(1)}:
          </LabelWithHelp>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <ButtonDatePicker
              label={
                dayjs(formData[name]) == null
                  ? null
                  : dayjs(formData[name]).format("MMM, D YYYY - h:mma")
              }
              value={dayjs(formData[name])}
              onChange={(newValue) => change_datetime(newValue, name)}
              id={"input_" + name}
            />
          </LocalizationProvider>
        </div>
      );
  }
}

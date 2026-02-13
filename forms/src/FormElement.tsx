import * as React from "react";

import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { HelpCircle } from "lucide-react";
import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
import { Checkbox } from "@bcl32/utils/Checkbox";
import { Select } from "@bcl32/utils/Select";
import { CustomTooltip } from "@bcl32/utils/Tooltip";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import type { ModelAttribute } from "@bcl32/data-utils";
import ButtonDatePicker from "./ButtonDatePicker";

interface LabelWithHelpProps {
  htmlFor: string;
  children: React.ReactNode;
  helpText?: string | null;
}

function LabelWithHelp({ htmlFor, children, helpText }: LabelWithHelpProps) {
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

interface SelectOption {
  label: string;
  value: string;
}

interface ComboboxOption {
  label?: string;
}

/** @deprecated Use ModelAttribute from @bcl32/data-utils instead */
export type EntryData = ModelAttribute;

export interface FormData {
  [key: string]: unknown;
}

export interface FormElementProps {
  entry_data: ModelAttribute;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  change_datetime: (value: Dayjs | null, name: string) => void;
}

export function FormElement({
  entry_data,
  formData,
  setFormData,
  change_datetime,
}: FormElementProps) {
  const name = entry_data.name;
  const type = entry_data.type;
  const helpText = entry_data.help_text || entry_data.description || null;

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });
  }

  function handleComboboxChange(_attribute: string, value: ComboboxOption[]) {
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });
  }

  function handleCheckboxChange(value: boolean) {
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
              value={formData[name] as string}
              onChange={handleChange}
              type="text"
              placeholder=""
            />
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
              value={formData[name] as string | number}
              onChange={handleChange}
              type="number"
              placeholder=""
            />
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center space-x-3 col-2">
          <Checkbox
            name={name}
            checked={formData[name] as boolean}
            onCheckedChange={(checked) => {
              handleCheckboxChange(checked as boolean);
            }}
            className="w-6 h-6 border-2"
            id={"input_" + name}
            value={formData[name] as string}
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
            options={entry_data.options as ComboboxOption[]}
            value={formData[name] as ComboboxOption[]}
            onChange={(_event, value) => handleComboboxChange(name, value as ComboboxOption[])}
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                borderRadius: "0.375rem",
                borderColor: "hsl(var(--input))",
                "&:hover": {
                  borderColor: "hsl(var(--ring))",
                },
                "&.Mui-focused": {
                  borderColor: "hsl(var(--ring))",
                  boxShadow: "0 0 0 2px hsl(var(--ring) / 0.2)",
                },
              },
              "& .MuiInputBase-input": {
                color: "hsl(var(--foreground))",
              },
              "& .MuiInputLabel-root": {
                color: "hsl(var(--muted-foreground))",
              },
              "& .MuiChip-root": {
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
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
              value={formData[name] as string}
              onChange={handleChange}
              id={"input_" + name}
            >
              {(entry_data.options as SelectOption[]).map((entry) => (
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
            {name[0].toUpperCase() + name.slice(1)}:
          </LabelWithHelp>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <ButtonDatePicker
              label={
                dayjs(formData[name] as string) == null
                  ? null
                  : dayjs(formData[name] as string).format("MMM, D YYYY - h:mma")
              }
              value={dayjs(formData[name] as string)}
              onChange={(newValue) => change_datetime(newValue, name)}
              id={"input_" + name}
            />
          </LocalizationProvider>
        </div>
      );
    default:
      return null;
  }
}

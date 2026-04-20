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
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import { Combobox } from "@bcl32/utils/Combobox";
import type { ModelAttribute, ReferenceInfo } from "@bcl32/data-utils";
import ButtonDatePicker from "./ButtonDatePicker";
import { ColourField } from "./ColourField";
import { ColourArrayField } from "./ColourArrayField";

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

/** @deprecated Use ModelAttribute from @bcl32/data-utils instead */
export type EntryData = ModelAttribute;

export interface FormData {
  [key: string]: unknown;
}

// Mirrors the non-null branches of FormElement's switch. Consumers that render
// their own scaffolding around FormElement (e.g. BulkEditModelForm's per-field
// checkbox cards) can filter on this to avoid emitting wrappers for attributes
// that would render nothing.
export function canRenderFormElement(attr: ModelAttribute): boolean {
  switch (attr.type) {
    case "string":
    case "number":
    case "boolean":
    case "list":
    case "select":
    case "datetime":
    case "colour":
    case "colour_array":
    case "file":
      return true;
    case "id":
      return Boolean(attr.reference);
    default:
      return false;
  }
}

export interface FormElementProps {
  entry_data: ModelAttribute;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  change_datetime: (value: Dayjs | null, name: string) => void;
}

interface ReferenceOption {
  id: string;
  label: string;
}

function IdReferenceField({
  entry_data,
  formData,
  setFormData,
}: {
  entry_data: ModelAttribute;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const reference = entry_data.reference as ReferenceInfo;
  const name = entry_data.name;
  const helpText = entry_data.help_text || entry_data.description || null;

  const { data } = useGetRequest<{ items: Record<string, unknown>[] }>(
    reference.get_api_url,
    { staleTime: 5 * 60 * 1000 }
  );

  const options: ReferenceOption[] = React.useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((item) => ({
      id: String(item.id),
      label: String(item[reference.display_field] ?? item.id),
    }));
  }, [data, reference.display_field]);

  const selectedOption = options.find((opt) => opt.id === formData[name]) ?? null;

  return (
    <div className="py-2">
      <LabelWithHelp htmlFor={name} helpText={helpText}>
        {name[0].toUpperCase() + name.slice(1).replace(/_/g, " ")}:
      </LabelWithHelp>
      <Combobox
        options={options.map((o) => o.label)}
        value={selectedOption ? [selectedOption.label] : []}
        onChange={(val) => {
          const match = options.find((o) => o.label === val[0]);
          setFormData((prev) => ({
            ...prev,
            [name]: match?.id ?? "",
          }));
        }}
        placeholder={`Select ${name.replace(/_id$/, "").replace(/_/g, " ")}...`}
      />
    </div>
  );
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
              value={(formData[name] as string) ?? ""}
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
          <div>
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
          <Combobox
            multiple
            freeSolo
            options={((entry_data.options as Array<string | {label: string}>) || []).map(
              (o) => (typeof o === "string" ? o : o.label)
            )}
            value={(formData[name] as string[]) || []}
            onChange={(newValue) =>
              setFormData((prev) => ({ ...prev, [name]: newValue }))
            }
            placeholder={`Add ${name}...`}
          />
        </div>
      );

    case "select":
      return (
        <div className="flex col-2">
          <div>
            <LabelWithHelp htmlFor={name} helpText={helpText}>
              {name[0].toUpperCase() + name.slice(1)}:
            </LabelWithHelp>
            <Select
              name={name}
              value={formData[name] as string ?? ""}
              onChange={handleChange}
              id={"input_" + name}
            >
              <option value="" disabled>Select…</option>
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
    case "colour":
      return (
        <ColourField
          entry_data={entry_data}
          formData={formData}
          setFormData={setFormData}
        />
      );
    case "colour_array":
      return (
        <ColourArrayField
          entry_data={entry_data}
          formData={formData}
          setFormData={setFormData}
        />
      );
    case "id":
      if (entry_data.reference) {
        return (
          <IdReferenceField
            entry_data={entry_data}
            formData={formData}
            setFormData={setFormData}
          />
        );
      }
      return null;
    case "file": {
      // The browser's File instance stays in formData directly — the mutation
      // hooks detect it and switch to multipart/form-data, so callers don't
      // need to convert or base64-encode anything.
      const selected = formData[name];
      const isFile = typeof File !== "undefined" && selected instanceof File;
      return (
        <div className="flex">
          <div className="w-full">
            <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
              {name[0].toUpperCase() + name.slice(1)}:
            </LabelWithHelp>
            <Input
              variant="background"
              size="default"
              id={"input_" + name}
              name={name}
              type="file"
              accept={entry_data.accept}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFormData((prev) => ({ ...prev, [name]: f }));
              }}
            />
            {isFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {(selected as File).name} — {((selected as File).size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

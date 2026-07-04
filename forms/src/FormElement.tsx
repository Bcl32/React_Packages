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
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import { DateTimePicker } from "@bcl32/utils/DateTimePicker";

import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import { Combobox } from "@bcl32/utils/Combobox";
import type { ModelAttribute, ReferenceInfo } from "@bcl32/data-utils";
import { ColourField } from "./ColourField";
import { ColourArrayField } from "./ColourArrayField";
import { FieldInput } from "./FieldInput";
import { RelationCollectionField } from "./RelationCollectionField";

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
    case "textarea":
    case "number":
    case "boolean":
    case "list":
    case "id_list":
    case "select":
    case "datetime":
    case "colour":
    case "colour_array":
    case "relation_collection":
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

  // Set this field on formData by name — the onChange contract FieldInput expects.
  const setField = (value: unknown) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  switch (type) {
    case "string":
      return (
        <div className="flex">
          <div>
            <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
              {name[0].toUpperCase() + name.slice(1)}:
            </LabelWithHelp>
            <FieldInput
              attr={entry_data}
              id={"input_" + name}
              name={name}
              value={(formData[name] as string) ?? ""}
              onChange={setField}
            />
          </div>
        </div>
      );
    case "textarea":
      return (
        <div className="flex">
          <div className="w-full">
            <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
              {name[0].toUpperCase() + name.slice(1)}:
            </LabelWithHelp>
            <FieldInput
              attr={entry_data}
              id={"input_" + name}
              name={name}
              value={(formData[name] as string) ?? ""}
              onChange={setField}
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
            <FieldInput
              attr={entry_data}
              id={"input_" + name}
              name={name}
              value={(formData[name] as string | number) ?? ""}
              onChange={setField}
            />
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center space-x-3 col-2">
          <FieldInput
            attr={entry_data}
            id={"input_" + name}
            name={name}
            value={formData[name] as boolean}
            onChange={setField}
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

    case "id_list": {
      // Multi-select of {value, label} reference pairs (e.g. systems).
      // Combobox works in label-space for display; formData stores the
      // canonical value array (UUIDs), translated at change time via
      // attr.options. Mirrors EditableDetailItem.jsx's badge-modal flow.
      const valueKey = (entry_data.value_key as string) || "value";
      const labelKey = (entry_data.label_key as string) || "label";
      const options =
        (entry_data.options as Array<Record<string, unknown>>) || [];
      const optionLabels = options.map((o) => String(o[labelKey]));
      const currentValues = (formData[name] as Array<string>) || [];
      const selectedLabels = currentValues
        .map((v) => {
          const match = options.find((o) => o[valueKey] === v);
          return match ? String(match[labelKey]) : null;
        })
        .filter((l): l is string => l != null);
      return (
        <div className="py-2">
          <LabelWithHelp htmlFor={name} helpText={helpText}>
            {name[0].toUpperCase() + name.slice(1).replace(/_/g, " ")}:
          </LabelWithHelp>
          <Combobox
            multiple
            showBadges
            options={optionLabels}
            value={selectedLabels}
            onChange={(newLabels) => {
              const newValues = newLabels
                .map((lbl) => {
                  const match = options.find(
                    (o) => String(o[labelKey]) === lbl,
                  );
                  return match ? (match[valueKey] as string) : null;
                })
                .filter((v): v is string => v != null);
              setFormData((prev) => ({ ...prev, [name]: newValues }));
            }}
            placeholder={`Add ${name.replace(/_/g, " ")}...`}
          />
        </div>
      );
    }

    case "select":
      return (
        <div className="flex col-2">
          <div>
            <LabelWithHelp htmlFor={name} helpText={helpText}>
              {name[0].toUpperCase() + name.slice(1)}:
            </LabelWithHelp>
            <FieldInput
              attr={entry_data}
              id={"input_" + name}
              name={name}
              value={(formData[name] as string) ?? ""}
              onChange={setField}
            />
          </div>
        </div>
      );
    case "datetime":
      return (
        <div className="py-2">
          <LabelWithHelp htmlFor={name} helpText={helpText}>
            {name[0].toUpperCase() + name.slice(1)}:
          </LabelWithHelp>

          <DateTimePicker
            id={"input_" + name}
            value={formData[name] ? dayjs(formData[name] as string) : null}
            onChange={(newValue) => change_datetime(newValue, name)}
          />
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
    case "relation_collection":
      // No baseUrl here → create-mode (disabled notice). Detail pages render
      // RelationCollectionField directly with a resolved baseUrl for live
      // per-row editing.
      return (
        <RelationCollectionField
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

import { Input } from "@bcl32/utils/Input";
import { Select } from "@bcl32/utils/Select";
import { Checkbox } from "@bcl32/utils/Checkbox";
import type { ModelAttribute } from "@bcl32/data-utils";

import { AutoGrowTextarea } from "./AutoGrowTextarea";

interface SelectOption {
  value: string;
  label: string;
}

export interface FieldInputProps {
  /** The ModelAttribute describing this field (drives the widget + options). */
  attr: ModelAttribute;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  /** Compact sizing for dense, label-less contexts (e.g. relation_collection rows). */
  compact?: boolean;
  placeholder?: string;
  /** Override the text-input HTML type (e.g. "url"). Ignored for non-string types. */
  inputType?: "text" | "url" | "email";
  className?: string;
  id?: string;
  name?: string;
}

/**
 * The bare input widget for a single field — no label, help text, or layout chrome.
 *
 * Shared by FormElement (which wraps it with a label) and RelationCollectionField
 * (which renders it compactly inside a row), so the `type → widget` mapping lives
 * in exactly one place. Returns `null` for the types it does not own (datetime, id
 * reference, colour, file, list/id_list, relation_collection) — those carry data
 * flows that don't fit a plain value/onChange contract and stay in FormElement.
 */
export function FieldInput({
  attr,
  value,
  onChange,
  onBlur,
  compact = false,
  placeholder,
  inputType = "text",
  className = "",
  id,
  name,
}: FieldInputProps) {
  // Compose the dense-context classes with any caller-supplied className.
  const cls = (base: string) =>
    [compact ? `h-8 text-sm ${base}`.trim() : base, className]
      .filter(Boolean)
      .join(" ");

  switch (attr.type) {
    case "textarea":
      return (
        <AutoGrowTextarea
          id={id}
          name={name}
          value={(value as string) ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      );

    case "number":
      return (
        <Input
          id={id}
          name={name}
          type="number"
          variant={compact ? undefined : "background"}
          size={compact ? undefined : "lg"}
          className={cls("")}
          placeholder={placeholder ?? ""}
          value={(value as string | number) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      );

    case "boolean":
      return (
        <Checkbox
          id={id}
          name={name}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
          className={cls("w-6 h-6 border-2")}
        />
      );

    case "select":
      return (
        <Select
          id={id}
          name={name}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cls("")}
        >
          <option value="" disabled>
            Select…
          </option>
          {((attr.options as SelectOption[]) ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );

    case "string":
      return (
        <Input
          id={id}
          name={name}
          type={inputType}
          variant={compact ? undefined : "background"}
          size={compact ? undefined : "default"}
          className={cls("")}
          placeholder={placeholder ?? ""}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      );

    default:
      return null;
  }
}

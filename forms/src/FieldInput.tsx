import * as React from "react";

import { Input } from "@bcl32/utils/Input";
import { Select } from "@bcl32/utils/Select";
import { Checkbox } from "@bcl32/utils/Checkbox";
import { useNumberAdapter } from "@bcl32/utils/NumberAdapter";
import type { ModelAttribute } from "@bcl32/data-utils";
import { formatEditable, parseNumber, toNumberValue, type ParseResult } from "@bcl32/data-utils/numbers";

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
  /**
   * Number fields only: called with why the typed text is not a number
   * ("invalid", or "fraction" on an integer field), and with null once it is
   * one again. The value itself is never emitted while the text is unreadable,
   * so the form keeps the last number typed.
   */
  onInvalid?: (reason: NumberFieldError | null) => void;
  /** Marks the control invalid and names the message describing why. */
  invalid?: boolean;
  describedBy?: string;
}

export type NumberFieldError = Extract<ParseResult, { ok: false }>["reason"];

/**
 * The bare input widget for a single field — no label, help text, or layout chrome.
 *
 * Shared by FormElement (which wraps it with a label) and RelationCollectionField
 * (which renders it compactly inside a row), so the `type → widget` mapping lives
 * in exactly one place. Returns `null` for the types it does not own (datetime, id
 * reference, colour, file, list/id_list, relation_collection) — those carry data
 * flows that don't fit a plain value/onChange contract and stay in FormElement.
 *
 * `date` IS owned here, unlike `datetime`: its value is a plain "YYYY-MM-DD"
 * string in and out, so it fits the value/onChange contract exactly.
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
  onInvalid,
  invalid,
  describedBy,
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
        <NumberField
          attr={attr}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          compact={compact}
          placeholder={placeholder}
          className={cls("")}
          id={id}
          name={name}
          onInvalid={onInvalid}
          invalid={invalid}
          describedBy={describedBy}
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

    case "date":
      // A native date input. The wire format is the value format: an
      // `<input type="date">` reads and writes "YYYY-MM-DD", which is exactly
      // what a Pydantic `datetime.date` accepts and emits — so no parsing,
      // no formatting and no timezone conversion sits between the picker and
      // the column. (This is why it is not the dayjs-backed datetime control:
      // that one would introduce all three.)
      return (
        <Input
          id={id}
          name={name}
          type="date"
          variant={compact ? undefined : "background"}
          size={compact ? undefined : "default"}
          className={cls("")}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
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

/**
 * The number box. It holds the TEXT (so "1e", "-" and "12." can sit in it on
 * the way to a number) and emits only what that text means: a number, or null
 * for an emptied box — never the browser's string, which the API rejects as
 * "" and lax-parses as "12". With a unit adapter (`NumberAdapterProvider`) the
 * box shows and reads the display unit and the form still gets stored units.
 */
function NumberField({
  attr,
  value,
  onChange,
  onBlur,
  compact,
  placeholder,
  className,
  id,
  name,
  onInvalid,
  invalid,
  describedBy,
}: Omit<FieldInputProps, "inputType">) {
  const adapterFor = useNumberAdapter();
  const adapter = adapterFor(attr);
  const stored = toNumberValue(value);

  const [draft, setDraft] = React.useState(() => formatEditable(stored, { adapter }));
  // The last number this box emitted. A value that differs came from outside
  // (a reset, a reloaded row, a unit switch), and then the box shows it fresh.
  const emitted = React.useRef<number | null>(stored);
  const shownAdapter = React.useRef(adapter);
  React.useEffect(() => {
    if (stored === emitted.current && adapter === shownAdapter.current) return;
    emitted.current = stored;
    shownAdapter.current = adapter;
    setDraft(formatEditable(stored, { adapter }));
    onInvalid?.(null);
  }, [stored, adapter]);

  const [error, setError] = React.useState<NumberFieldError | null>(null);
  const report = (next: NumberFieldError | null) => {
    if (next === error) return;
    setError(next);
    onInvalid?.(next);
  };

  return (
    <Input
      id={id}
      name={name}
      // A unit's text (6'10") is not a number the browser would accept.
      type={adapter ? "text" : "number"}
      inputMode="decimal"
      step={attr.integer ? 1 : "any"}
      variant={compact ? undefined : "background"}
      size={compact ? undefined : "lg"}
      className={className}
      placeholder={placeholder ?? ""}
      value={draft}
      aria-invalid={invalid || error !== null || undefined}
      aria-describedby={describedBy}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        // A number box reports "" for text it can't read ("1e"); that is not
        // an emptied box.
        if (e.target.validity?.badInput) return report("invalid");
        const parsed = parseNumber(text, attr, { adapter });
        if (!parsed.ok) return report(parsed.reason);
        report(null);
        emitted.current = parsed.value;
        onChange(parsed.value);
      }}
      onBlur={onBlur}
    />
  );
}

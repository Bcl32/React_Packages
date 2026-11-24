import * as React from "react";

import { Input } from "@bcl32/utils/Input";
import { Select } from "@bcl32/utils/Select";
import { cn } from "@bcl32/utils/cn";
import { useNumberAdapter } from "@bcl32/utils/NumberAdapter";
import type { ModelAttribute } from "@bcl32/data-utils";
import {
  convertsUnits,
  currencySymbol,
  displayUnit,
  formatEditable,
  numberDecimals,
  parseNumber,
  toNumberValue,
  type ParseResult,
} from "@bcl32/data-utils/numbers";

import { AutoGrowTextarea } from "../AutoGrowTextarea";
import type { FieldClassNames, FieldSize } from "./style";

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
  /**
   * Marks the control invalid (`aria-invalid`) and names the message
   * describing why (`aria-describedby`). Every type honours both; when
   * neither is passed no attribute is written.
   */
  invalid?: boolean;
  describedBy?: string;
  /**
   * "sm" is `compact`; "md" today's default; "lg" 48 px controls in
   * text-base. When set it wins over `compact`; unset, `compact` decides,
   * exactly as before.
   */
  size?: FieldSize;
  /**
   * `control`: the box (added after `className`); `input`: the `<input>`
   * inside it (Input's inputClassName). On a select, textarea or checkbox,
   * which have no inner input, both go on the element. Merged with
   * tailwind-merge, so they override the defaults.
   */
  classNames?: Pick<FieldClassNames, "control" | "input">;
  /**
   * More attributes for the element FieldInput draws (the `<input>`,
   * `<textarea>` or `<select>`): `autoComplete`, `spellCheck`, `enterKeyHint`,
   * `inputMode`, `maxLength`… They never replace what FieldInput sets itself
   * (`id`, `name`, `value`, `onChange`, `onBlur`, `type`, the `aria-*` it
   * writes, the class, a number's `step` / `min` / `max`, a limit taken from
   * the descriptor): those keys are left out of the type and dropped at run
   * time. Not passed to the admin path's Radix checkbox.
   */
  inputProps?: FieldInputHTMLProps;
}

/** The keys FieldInput owns. `aria-*` is FieldInput's too (`invalid` / `describedBy`). */
type ReservedInputProp =
  | "id"
  | "name"
  | "value"
  | "defaultValue"
  | "checked"
  | "defaultChecked"
  | "onChange"
  | "onInput"
  | "onBlur"
  | "type"
  | "size"
  | "prefix"
  | "className"
  | "children"
  | "dangerouslySetInnerHTML"
  | `aria-${string}`;

/** What `inputProps` may carry: an input's attributes, less the ones FieldInput owns. */
export type FieldInputHTMLProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ReservedInputProp
>;

// The same list at run time (a JS caller, a cast), plus Input's own props.
const RESERVED = new Set<string>([
  "id",
  "name",
  "value",
  "defaultValue",
  "checked",
  "defaultChecked",
  "onChange",
  "onInput",
  "onBlur",
  "type",
  "size",
  "prefix",
  "suffix",
  "className",
  "inputClassName",
  "variant",
  "children",
  "dangerouslySetInnerHTML",
]);

function passThrough(props: FieldInputHTMLProps | undefined): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (!RESERVED.has(key) && !key.startsWith("aria-")) out[key] = val;
  }
  return out;
}

/**
 * The descriptor's `min_length` / `max_length` as native `minLength` /
 * `maxLength`, only the ones it has (an empty object when it has neither, so
 * the markup is unchanged).
 *
 * The browser counts UTF-16 units and does not normalise: "😀" is 2, and
 * "é" typed as e + a combining accent is 2. A server counts code points (1
 * each, and 1 for the accented e once it is NFC-normalised), so `maxLength`
 * can refuse text the server would take but does not let through text it
 * refuses. (The rare exception is a character that NFC itself expands, such
 * as U+FB2C, which is 1 unit but 3 code points after NFC.) `minLength` is
 * looser for the same reason, and browsers only check it on submit.
 * `validate` (`textLength`) stays the check that agrees with the server.
 */
function textLimits(attr: { min_length?: unknown; max_length?: unknown }): { minLength?: number; maxLength?: number } {
  const limits: { minLength?: number; maxLength?: number } = {};
  if (typeof attr.min_length === "number") limits.minLength = attr.min_length;
  if (typeof attr.max_length === "number") limits.maxLength = attr.max_length;
  return limits;
}

// AutoGrowTextarea's own default: written again only when a size or slot
// asks for different classes, so today's callers get today's markup.
const TEXTAREA = "w-full resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-sm";

export type NumberFieldError = Extract<ParseResult, { ok: false }>["reason"];

/**
 * Public as `@bcl32/forms/fields` (since 3.11): these props are semver
 * surface. EditableDetailItem, RelationCollectionField and FormElement all
 * draw through it (through `../FieldInput`, which swaps in the Radix checkbox
 * for `boolean`), so a change to its markup lands on every detail page. This
 * one draws `boolean` as a native `<input type="checkbox">`.
 *
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
  size,
  classNames,
  inputProps,
}: FieldInputProps) {
  // Only set when the caller asks: an absent prop writes no attribute, so the
  // markup of every caller that passes neither is unchanged.
  const aria = {
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
  };
  const dense = size ? size === "sm" : compact;
  const large = size === "lg";
  const control = classNames?.control;
  const inner = classNames?.input;
  // Compose the dense-context classes with any caller-supplied className,
  // then the size's and the slot's (each only when set).
  const cls = (base: string, lg = "", slot?: string) =>
    [dense ? `h-8 text-sm ${base}`.trim() : base, large ? lg : "", className, slot]
      .filter(Boolean)
      .join(" ");
  // A select, textarea or checkbox is its own input: both slots apply to it.
  const both = [control, inner].filter(Boolean).join(" ") || undefined;
  // Spread first, so every prop FieldInput sets after it wins.
  const extra = passThrough(inputProps);
  const limits = textLimits(attr as { min_length?: unknown; max_length?: unknown });
  const textareaClass =
    dense || large || both
      ? cn(TEXTAREA, dense && "px-2 py-1", large && "px-3 py-3 text-base", both)
      : undefined;

  switch (attr.type) {
    case "textarea":
      return (
        <AutoGrowTextarea
          {...(extra as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={id}
          name={name}
          value={(value as string) ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={textareaClass}
          {...limits}
          {...aria}
        />
      );

    case "number":
      return (
        <NumberField
          attr={attr}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          compact={dense}
          placeholder={placeholder}
          className={cls("", "md:text-base", control)}
          inputClassName={inner}
          id={id}
          name={name}
          onInvalid={onInvalid}
          invalid={invalid}
          describedBy={describedBy}
          extra={extra}
        />
      );

    case "boolean":
      // A native checkbox: the light entry does not carry Radix's checkbox and
      // presence (about 17 KB raw) onto a page. The admin path
      // (`../FieldInput`, what FormElement, EditableDetailItem and
      // RelationCollectionField draw) keeps the Radix one, unchanged.
      return (
        <input
          {...(extra as React.InputHTMLAttributes<HTMLInputElement>)}
          type="checkbox"
          id={id}
          name={name}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          className={cn("h-6 w-6 shrink-0 accent-primary", large && "h-7 w-7", className, both)}
          {...aria}
        />
      );

    case "select":
      return (
        <Select
          {...(extra as React.SelectHTMLAttributes<HTMLSelectElement>)}
          id={id}
          name={name}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cls("", "h-12 text-base", both)}
          {...aria}
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
          {...(extra as React.InputHTMLAttributes<HTMLInputElement>)}
          id={id}
          name={name}
          type="date"
          variant={dense ? undefined : "background"}
          size={dense ? undefined : large ? "lg" : "default"}
          className={cls("", "md:text-base", control)}
          inputClassName={inner}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          {...aria}
        />
      );

    case "string":
      return (
        <Input
          {...(extra as React.InputHTMLAttributes<HTMLInputElement>)}
          id={id}
          name={name}
          type={inputType}
          variant={dense ? undefined : "background"}
          size={dense ? undefined : large ? "lg" : "default"}
          className={cls("", "md:text-base", control)}
          inputClassName={inner}
          placeholder={placeholder ?? ""}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          {...limits}
          {...aria}
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
  inputClassName,
  extra,
}: Omit<FieldInputProps, "inputType" | "size" | "classNames" | "inputProps"> & {
  inputClassName?: string;
  extra?: Record<string, unknown>;
}) {
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

  // A unit's text (6'10") is not a number the browser would accept; money's
  // adapter only names a currency, so its box stays a number box.
  const converts = convertsUnits(adapter);
  const decimals = numberDecimals(attr);
  return (
    <Input
      {...(extra as React.InputHTMLAttributes<HTMLInputElement>)}
      id={id}
      name={name}
      type={converts ? "text" : "number"}
      inputMode="decimal"
      // 1 / 10 ** d, not 10 ** -d: 10 ** -4 is 0.00009999999999999999.
      step={attr.integer ? 1 : decimals !== undefined ? 1 / 10 ** decimals : "any"}
      // The spinner stops at an inclusive bound; parseNumber refuses the rest
      // (exclusive bounds, typed values) with a message the browser can't give.
      min={!converts && typeof attr.min === "number" && !attr.min_exclusive ? attr.min : undefined}
      max={!converts && typeof attr.max === "number" && !attr.max_exclusive ? attr.max : undefined}
      prefix={attr.format === "money" && adapter?.currency ? currencySymbol(adapter.currency) : undefined}
      // The unit the box is in: a title carries none, and a converted value must
      // never read as stored.
      suffix={displayUnit(attr, adapter)}
      variant={compact ? undefined : "background"}
      size={compact ? undefined : "lg"}
      className={className}
      inputClassName={inputClassName}
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

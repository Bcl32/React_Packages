import type { FieldBase } from "../validate/types";
import { FieldInput, type NumberFieldError } from "./FieldInput";
import type { FieldRegistry, FieldRenderProps } from "./registry";

/** FieldInput as a registered control: the same widget FormElement draws for these types. */
function FieldInputControl({
  attr,
  id,
  name,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  onParseError,
  size,
  classNames,
}: FieldRenderProps) {
  return (
    <FieldInput
      attr={attr}
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      invalid={invalid}
      describedBy={describedBy}
      onInvalid={onParseError ? (reason: NumberFieldError | null) => onParseError(reason) : undefined}
      size={size}
      classNames={classNames.control || classNames.input ? { control: classNames.control, input: classNames.input } : undefined}
    />
  );
}

/**
 * The types FieldInput owns, as renderers: string, textarea, number,
 * boolean, select and date. `FieldSet` falls back to these; register a type
 * of the same name to replace one. None of them pulls in react-query, dayjs,
 * a combobox, a date picker, a tooltip or Radix's checkbox: `boolean` is a
 * native `<input type="checkbox">` (FormElement's stays Radix).
 */
export const lightRenderers: FieldRegistry<FieldBase> = {
  string: { Control: FieldInputControl },
  textarea: { Control: FieldInputControl },
  number: { Control: FieldInputControl },
  boolean: { Control: FieldInputControl, labelAs: "inline" },
  select: { Control: FieldInputControl },
  date: { Control: FieldInputControl },
};

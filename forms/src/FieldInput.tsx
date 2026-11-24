import { Checkbox } from "@bcl32/utils/Checkbox";

import { FieldInput as LightFieldInput, type FieldInputProps } from "./fields/FieldInput";

// The admin FieldInput, for the package's own importers (FormElement,
// EditableDetailItem, RelationCollectionField): `@bcl32/forms/fields`'
// FieldInput, except that `boolean` is the Radix checkbox those forms have
// always drawn, byte for byte. The light entry draws a native checkbox, so a
// page that imports only `./fields` never bundles Radix's checkbox.
export * from "./fields/FieldInput";

export function FieldInput(props: FieldInputProps) {
  if (props.attr.type !== "boolean") return <LightFieldInput {...props} />;
  const { id, name, value, onChange, compact = false, className = "", invalid, describedBy, size, classNames } = props;
  const dense = size ? size === "sm" : compact;
  const both = [classNames?.control, classNames?.input].filter(Boolean).join(" ") || undefined;
  return (
    <Checkbox
      id={id}
      name={name}
      checked={Boolean(value)}
      onCheckedChange={(checked) => onChange(Boolean(checked))}
      className={[dense ? "h-8 text-sm w-6 h-6 border-2" : "w-6 h-6 border-2", size === "lg" ? "w-7 h-7" : "", className, both]
        .filter(Boolean)
        .join(" ")}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    />
  );
}

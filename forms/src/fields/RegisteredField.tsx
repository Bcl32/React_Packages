import { mayBeEmpty } from "../validate/rules";
import type { FieldBase, FieldIssueCode } from "../validate/types";
import { FieldShell } from "./FieldShell";
import type { FieldRenderer } from "./registry";
import { resolveStyle, useFieldStyle, type FieldStyle } from "./style";

/**
 * One registered field: its renderer's control inside a FieldShell. The one
 * path FormElement (for a registered type) and FieldSet both draw through.
 * Style: `style` (the caller's props) over the nearest FieldStyleProvider
 * over the defaults. The optional mark shows only on a field that may really
 * be left empty (`mayBeEmpty`): not required, and nullable or with no
 * default to keep. Internal: not exported from `./fields`.
 */
export function RegisteredField<A extends FieldBase>({
  renderer,
  attr,
  id,
  label,
  value,
  values,
  onChange,
  onChangeMany,
  onBlur,
  onParseError,
  error,
  style = {},
}: {
  renderer: FieldRenderer<A>;
  attr: A;
  id: string;
  label: string;
  value: unknown;
  values: Readonly<Record<string, unknown>>;
  onChange: (value: unknown) => void;
  onChangeMany: (patch: Record<string, unknown>) => void;
  onBlur?: () => void;
  onParseError?: (reason: FieldIssueCode | null) => void;
  /** Already worded; nothing is shown when absent. */
  error?: string;
  style?: FieldStyle;
}) {
  const { size, classNames, labelSuffix, optionalMark, errorIcon } = resolveStyle(style, useFieldStyle());
  const hint = attr.help_text || undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const { Control } = renderer;
  return (
    <FieldShell
      id={id}
      label={label}
      labelAs={renderer.labelAs}
      labelSuffix={labelSuffix}
      hint={hint}
      hintId={hintId}
      error={error}
      errorId={errorId}
      size={size}
      classNames={classNames}
      optional={mayBeEmpty(attr)}
      optionalMark={optionalMark}
      errorIcon={errorIcon}
    >
      <Control
        attr={attr}
        id={id}
        label={label}
        name={attr.name}
        value={value}
        onChange={onChange}
        onChangeMany={onChangeMany}
        values={values}
        onBlur={onBlur}
        invalid={!!error}
        describedBy={describedBy}
        onParseError={onParseError}
        size={size}
        classNames={classNames}
      />
    </FieldShell>
  );
}

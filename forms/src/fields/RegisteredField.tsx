import type { FieldBase, FieldIssueCode } from "../validate/types";
import { FieldShell } from "./FieldShell";
import type { FieldRenderer } from "./registry";

/**
 * One registered field: its renderer's control inside a FieldShell. The one
 * path FormElement (for a registered type) and FieldSet both draw through.
 * Internal: not exported from `./fields`.
 */
export function RegisteredField<A extends FieldBase>({
  renderer,
  attr,
  id,
  label,
  labelSuffix,
  value,
  values,
  onChange,
  onChangeMany,
  onBlur,
  onParseError,
  error,
}: {
  renderer: FieldRenderer<A>;
  attr: A;
  id: string;
  label: string;
  labelSuffix?: string;
  value: unknown;
  values: Readonly<Record<string, unknown>>;
  onChange: (value: unknown) => void;
  onChangeMany: (patch: Record<string, unknown>) => void;
  onBlur?: () => void;
  onParseError?: (reason: FieldIssueCode | null) => void;
  /** Already worded; nothing is shown when absent. */
  error?: string;
}) {
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
    >
      <Control
        attr={attr}
        id={id}
        name={attr.name}
        value={value}
        onChange={onChange}
        onChangeMany={onChangeMany}
        values={values}
        onBlur={onBlur}
        invalid={!!error}
        describedBy={describedBy}
        onParseError={onParseError}
      />
    </FieldShell>
  );
}

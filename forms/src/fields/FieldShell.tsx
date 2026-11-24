import * as React from "react";
import { cn } from "@bcl32/utils/cn";

import type { FieldClassNames, FieldSize } from "./style";

export interface FieldShellProps {
  /** The control's id; a "label" or "inline" shell names it with `htmlFor`. */
  id: string;
  label: React.ReactNode;
  /** See `FieldRenderer.labelAs`. Default "label". */
  labelAs?: "label" | "legend" | "inline" | "none";
  /** Written straight after the label: ":" in the admin forms, "" (the default) elsewhere. */
  labelSuffix?: string;
  /** Help text, shown inline under the label (never in a tooltip). */
  hint?: React.ReactNode;
  hintId?: string;
  /** An already-worded message; shown under the control with `role="alert"`. */
  error?: React.ReactNode;
  errorId?: string;
  /** Default "md". "sm" tightens the label's gap; "lg" sets labels and hints in text-base. */
  size?: FieldSize;
  /** Classes per part, merged over the defaults (tailwind-merge, so they override). */
  classNames?: FieldClassNames;
  /** The field is not required: `optionalMark` is shown after the label. */
  optional?: boolean;
  optionalMark?: React.ReactNode;
  /** Shown before the error text. */
  errorIcon?: React.ReactNode;
  children: React.ReactNode;
}

// The defaults, by part. With no size and no classNames the shell writes
// exactly these (FieldShell's snapshot pins them).
const LABEL = "mb-2 block text-sm font-medium leading-none";
const INLINE_LABEL = "text-sm font-medium leading-none";
const LEGEND = "mb-2 text-sm font-medium leading-none";
const HINT = "mb-2 text-xs text-muted-foreground";
const ERROR = "mt-1 text-xs text-destructive";
const FIELDSET = "m-0 min-w-0 border-0 p-0";

const SIZE_LABEL: Record<FieldSize, string> = { sm: "mb-1", md: "", lg: "text-base" };
const SIZE_TEXT: Record<FieldSize, string> = { sm: "", md: "", lg: "text-sm" };

/**
 * A field's label, hint and error around its control. A plain `<label>`
 * (no Radix), and the hint is inline text, so it renders the same on a
 * server and costs no tooltip bundle.
 */
export function FieldShell({
  id,
  label,
  labelAs = "label",
  labelSuffix = "",
  hint,
  hintId,
  error,
  errorId,
  size = "md",
  classNames = {},
  optional = false,
  optionalMark,
  errorIcon,
  children,
}: FieldShellProps) {
  const labelText = (
    <>
      {label}
      {labelSuffix}
      {optional && present(optionalMark) && (
        <span className={cn("font-normal text-muted-foreground", classNames.optional)}>{optionalMark}</span>
      )}
    </>
  );
  const hintNode = present(hint) ? (
    <p id={hintId} className={cn(HINT, SIZE_TEXT[size], classNames.hint)}>
      {hint}
    </p>
  ) : null;
  const errorNode = present(error) ? (
    <p id={errorId} role="alert" className={cn(ERROR, SIZE_TEXT[size], classNames.error)}>
      {errorIcon}
      {error}
    </p>
  ) : null;
  const root = classNames.root ? cn(classNames.root) : undefined;

  if (labelAs === "legend") {
    return (
      <fieldset className={cn(FIELDSET, classNames.root)}>
        <legend className={cn(LEGEND, SIZE_LABEL[size], classNames.legend ?? classNames.label)}>{labelText}</legend>
        {hintNode}
        {children}
        {errorNode}
      </fieldset>
    );
  }
  if (labelAs === "inline") {
    return (
      <div className={root}>
        <div className="flex items-center gap-3">
          {children}
          <label htmlFor={id} className={cn(INLINE_LABEL, size === "lg" && "text-base", classNames.label)}>
            {labelText}
          </label>
        </div>
        {hintNode}
        {errorNode}
      </div>
    );
  }
  return (
    <div className={root}>
      {labelAs === "label" && (
        <label htmlFor={id} className={cn(LABEL, SIZE_LABEL[size], classNames.label)}>
          {labelText}
        </label>
      )}
      {hintNode}
      {children}
      {errorNode}
    </div>
  );
}

function present(node: React.ReactNode): boolean {
  return node !== null && node !== undefined && node !== false && node !== "";
}

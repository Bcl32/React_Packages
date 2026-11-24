import * as React from "react";

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
  children: React.ReactNode;
}

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
  children,
}: FieldShellProps) {
  const labelText = (
    <>
      {label}
      {labelSuffix}
    </>
  );
  const hintNode = present(hint) ? (
    <p id={hintId} className="mb-2 text-xs text-muted-foreground">
      {hint}
    </p>
  ) : null;
  const errorNode = present(error) ? (
    <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
      {error}
    </p>
  ) : null;

  if (labelAs === "legend") {
    return (
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 text-sm font-medium leading-none">{labelText}</legend>
        {hintNode}
        {children}
        {errorNode}
      </fieldset>
    );
  }
  if (labelAs === "inline") {
    return (
      <div>
        <div className="flex items-center gap-3">
          {children}
          <label htmlFor={id} className="text-sm font-medium leading-none">
            {labelText}
          </label>
        </div>
        {hintNode}
        {errorNode}
      </div>
    );
  }
  return (
    <div>
      {labelAs === "label" && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium leading-none">
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

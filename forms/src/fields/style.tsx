import * as React from "react";

/**
 * - "sm": today's `compact` (h-8, text-sm): dense rows;
 * - "md": today's default (the admin forms);
 * - "lg": 48 px controls and text-base, for touch and customer pages.
 */
export type FieldSize = "sm" | "md" | "lg";

/** Classes added to each part of a field, merged over the defaults with tailwind-merge (so they can override). */
export interface FieldClassNames {
  /** The shell's outer element (div, or fieldset for a legend). */
  root?: string;
  label?: string;
  legend?: string;
  /** The "(optional)" mark after a label, when `optionalMark` is set. */
  optional?: string;
  hint?: string;
  /** The control's box (Input's className; the select, textarea or checkbox itself). */
  control?: string;
  /** The `<input>` itself (Input's inputClassName); inside an affixed box it styles the text. */
  input?: string;
  error?: string;
}

export interface FieldStyle {
  size?: FieldSize;
  classNames?: FieldClassNames;
  /** Written straight after each label: ":" in the admin forms, "" by default. */
  labelSuffix?: string;
  /** Shown after the label of a field that is not `required` (the shop's " (optional)"). Default none. */
  optionalMark?: React.ReactNode;
  /** Shown before each error message (an icon). Default none. */
  errorIcon?: React.ReactNode;
}

const FieldStyleContext = React.createContext<FieldStyle | null>(null);

/**
 * Size, slot classes, label suffix, optional mark and error icon for every
 * FieldSet and registered field below it. Props on a FieldSet win over this;
 * this wins over the defaults. FieldInput itself never reads it, so a
 * provider cannot restyle EditableDetailItem or RelationCollectionField.
 */
export function FieldStyleProvider({ children, ...style }: FieldStyle & { children: React.ReactNode }) {
  const { size, classNames, labelSuffix, optionalMark, errorIcon } = style;
  const value = React.useMemo(
    () => ({ size, classNames, labelSuffix, optionalMark, errorIcon }),
    [size, classNames, labelSuffix, optionalMark, errorIcon],
  );
  return <FieldStyleContext.Provider value={value}>{children}</FieldStyleContext.Provider>;
}

/** The nearest FieldStyleProvider's style, or null. */
export function useFieldStyle(): FieldStyle | null {
  return React.useContext(FieldStyleContext);
}

/** Props over provider over defaults; classNames merge per slot (props' classes after the provider's). */
export function resolveStyle(props: FieldStyle, context: FieldStyle | null) {
  const ctx = context ?? {};
  const merged: FieldClassNames = { ...ctx.classNames };
  for (const [slot, cls] of Object.entries(props.classNames ?? {}) as [keyof FieldClassNames, string | undefined][]) {
    if (!cls) continue;
    merged[slot] = merged[slot] ? `${merged[slot]} ${cls}` : cls;
  }
  return {
    size: props.size ?? ctx.size ?? ("md" as FieldSize),
    classNames: merged,
    labelSuffix: props.labelSuffix ?? ctx.labelSuffix ?? "",
    optionalMark: props.optionalMark !== undefined ? props.optionalMark : ctx.optionalMark,
    errorIcon: props.errorIcon !== undefined ? props.errorIcon : ctx.errorIcon,
  };
}

import * as React from "react";

export interface RadioButtonProps {
  interval_name: string;
  value: unknown;
  timeChange: unknown;
  handleRadioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Radio group name. Radios sharing a name form one group, so callers
   * rendering several groups on a page must pass a distinct value or the
   * groups will clear each other's selection.
   */
  groupName?: string;
  /** DOM id backing the label's htmlFor — must be unique within the page. */
  id?: string;
}

export function RadioButton({
  interval_name,
  value,
  timeChange,
  handleRadioChange,
  groupName = "option",
  id,
}: RadioButtonProps) {
  const inputId = id ?? interval_name;

  return (
    <div>
      <input
        type="radio"
        name={groupName}
        id={inputId}
        className="peer hidden"
        value={String(value)}
        checked={JSON.stringify(timeChange) === JSON.stringify(value)}
        onChange={handleRadioChange}
      />
      <label
        htmlFor={inputId}
        className="block cursor-pointer select-none rounded-md px-2 py-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground peer-checked:bg-primary peer-checked:font-semibold peer-checked:text-primary-foreground"
      >
        {interval_name}
      </label>
    </div>
  );
}

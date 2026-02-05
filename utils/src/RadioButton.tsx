import * as React from "react";

export interface RadioButtonProps {
  interval_name: string;
  value: unknown;
  timeChange: unknown;
  handleRadioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function RadioButton(props: RadioButtonProps) {
  return (
    <div>
      <input
        type="radio"
        name="option"
        id={props.interval_name}
        className="peer hidden"
        value={String(props.value)}
        checked={
          JSON.stringify(props.timeChange) === JSON.stringify(props.value)
        }
        onChange={props.handleRadioChange}
      />
      <label
        htmlFor={props.interval_name}
        className="block cursor-pointer select-none rounded-xl p-2 text-center peer-checked:bg-primary/50 peer-checked:font-bold peer-checked:text-white"
      >
        {props.interval_name}
      </label>
    </div>
  );
}

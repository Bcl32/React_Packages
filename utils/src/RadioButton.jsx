import React from "react";

export function RadioButton(props) {
  return (
    <div>
      <input
        type="radio"
        name="option"
        id={props.interval_name}
        className="peer hidden"
        value={props.value}
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

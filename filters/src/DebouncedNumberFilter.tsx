import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Button } from "@bcl32/utils/Button";
import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
import * as SliderPrimitive from "@radix-ui/react-slider";
import type { FilterContextValue } from "./types";

interface DebouncedNumberFilterProps {
  name: string;
}

interface NumberRange {
  min: number;
  max: number;
}

function DebouncedNumberFilter({ name }: DebouncedNumberFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  const filterEmpty = filterData["filter_empty"] as NumberRange;
  const filterValue = filterData["value"] as NumberRange;

  const slider_min = filterEmpty["min"];
  const slider_max = filterEmpty["max"];

  const slider_step = +(slider_max / 10).toFixed(2);

  const min = filterValue["min"];
  const max = filterValue["max"];

  function update_filters(fieldName: string, values: number[]) {
    const range = { min: values[0], max: values[1] };
    context?.change_filters(fieldName, "value", range);
  }

  const handleInputChange = (index: number, value: string) => {
    const newValue = parseInt(value, 10);
    if (!isNaN(newValue) && newValue >= slider_min && newValue <= slider_max) {
      const newValues = [min, max];
      newValues[index] = newValue;
      update_filters(name, newValues);
    }
  };

  const handleSliderChange = (newValues: number[]) => {
    update_filters(name, newValues);
  };

  //place value in state as when leaving this when inside a tab will remove the state when coming back to the tab
  const [inputValue, setInputValue] = React.useState(filterData["value"]);
  const [debouncedInputValue, setDebouncedInputValue] = React.useState<unknown>("");

  //debounce the input
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  //update state with debounced value
  React.useEffect(() => {
    context?.change_filters(name, "value", debouncedInputValue);
  }, [debouncedInputValue, context, name]);

  function reset_value() {
    if (filterData) {
      context?.change_filters(name, "value", filterData["filter_empty"]);
      setInputValue(""); //clears display of input
    }
  }

  return (
    <div className="flex flex-row items-center justify-between p-1 space-x-1">
      <span className="font-semibold">
        {/* capitalizes the string */}
        {name[0].toUpperCase() + name.slice(1)}:
      </span>

      <div>
        <Label className="capitalize" htmlFor={`input-${0}`}>
          Min:
        </Label>
        <Input
          key={"number_select_min"}
          variant="background"
          id={`input-${0}`}
          name={name}
          value={min}
          onChange={(e) => handleInputChange(0, e.target.value)}
          type="number"
          placeholder=""
          min={slider_min}
          max={slider_max}
        />
      </div>

      <SliderPrimitive.Root
        className="relative flex w-96 touch-none select-none items-center"
        value={[min, max]}
        onValueChange={handleSliderChange}
        min={slider_min}
        max={slider_max}
        step={slider_step}
        aria-label="Range"
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {[min, max].map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Root>

      <div>
        <Label className="capitalize" htmlFor={`input-${1}`}>
          Max:
        </Label>
        <Input
          key={"number_select_max"}
          variant="background"
          id={`input-${1}`}
          name={name}
          value={max}
          onChange={(e) => handleInputChange(1, e.target.value)}
          type="number"
          placeholder=""
          min={slider_min}
          max={slider_max}
        />
      </div>

      <Button onClick={reset_value} variant="default" size="lg">
        Reset
      </Button>
    </div>
  );
}

export default DebouncedNumberFilter;

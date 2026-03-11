import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Button } from "@bcl32/utils/Button";
import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
import * as SliderPrimitive from "@radix-ui/react-slider";
import type { FilterContextValue, NumberRange } from "./types";
import { capitalize } from "./utils";

interface DebouncedNumberFilterProps {
  name: string;
}

export function DebouncedNumberFilter({ name }: DebouncedNumberFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];

  const filterEmpty = filterData ? (filterData["filter_empty"] as NumberRange) : { min: 0, max: 0 };
  const filterValue = filterData ? (filterData["value"] as NumberRange) : { min: 0, max: 0 };

  const [inputValue, setInputValue] = React.useState<NumberRange>(filterValue);
  const [debouncedInputValue, setDebouncedInputValue] = React.useState<NumberRange>(filterValue);

  // Debounce the input
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  // Update context with debounced value
  React.useEffect(() => {
    context?.change_filters(name, "value", debouncedInputValue);
  }, [debouncedInputValue, context, name]);

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  const slider_min = filterEmpty.min;
  const slider_max = filterEmpty.max;
  const slider_step = +(slider_max / 10).toFixed(2);

  const handleInputChange = (index: number, value: string) => {
    const newValue = parseInt(value, 10);
    if (!isNaN(newValue) && newValue >= slider_min && newValue <= slider_max) {
      const newRange = index === 0
        ? { min: newValue, max: inputValue.max }
        : { min: inputValue.min, max: newValue };
      setInputValue(newRange);
    }
  };

  const handleSliderChange = (newValues: number[]) => {
    setInputValue({ min: newValues[0], max: newValues[1] });
  };

  function reset_value() {
    setInputValue(filterEmpty);
    context?.change_filters(name, "value", filterEmpty);
  }

  return (
    <div className="flex flex-row items-center justify-between p-1 space-x-1">
      <span className="font-semibold">
        {capitalize(name)}:
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
          value={inputValue.min}
          onChange={(e) => handleInputChange(0, e.target.value)}
          type="number"
          placeholder=""
          min={slider_min}
          max={slider_max}
        />
      </div>

      <SliderPrimitive.Root
        className="relative flex w-96 touch-none select-none items-center"
        value={[inputValue.min, inputValue.max]}
        onValueChange={handleSliderChange}
        min={slider_min}
        max={slider_max}
        step={slider_step}
        aria-label="Range"
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {[inputValue.min, inputValue.max].map((_, index) => (
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
          value={inputValue.max}
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

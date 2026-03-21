import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Input } from "@bcl32/utils/Input";
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
  const mountedRef = React.useRef(false);

  // Sync local state when context changes externally (e.g., reset from FiltersSummary)
  React.useEffect(() => {
    setInputValue({ min: filterValue.min, max: filterValue.max });
  }, [filterValue.min, filterValue.max]);

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  // Debounce input and push to context
  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const timeoutId = setTimeout(() => {
      context?.change_filters(name, "value", inputValue);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [inputValue.min, inputValue.max, name]);

  const slider_min = filterEmpty.min;
  const slider_max = filterEmpty.max;
  const range = slider_max - slider_min;
  const slider_step = range > 0 ? +(range / 100).toPrecision(2) : 1;

  const handleInputChange = (index: number, value: string) => {
    const newValue = parseFloat(value);
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

  const nudge = (index: number, direction: 1 | -1) => {
    const current = index === 0 ? inputValue.min : inputValue.max;
    const newValue = +(current + direction * slider_step).toPrecision(10);
    const clamped = Math.min(slider_max, Math.max(slider_min, newValue));
    setInputValue(
      index === 0
        ? { min: clamped, max: inputValue.max }
        : { min: inputValue.min, max: clamped }
    );
  };

  const isAtMin = inputValue.min === slider_min;
  const isAtMax = inputValue.max === slider_max;

  const minBtnClass = isAtMin
    ? "text-[10px] font-semibold text-primary bg-primary/15 px-1.5 py-0.5 rounded transition-colors"
    : "text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-accent px-1.5 py-0.5 rounded transition-colors";

  const maxBtnClass = isAtMax
    ? "text-[10px] font-semibold text-primary bg-primary/15 px-1.5 py-0.5 rounded transition-colors"
    : "text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-accent px-1.5 py-0.5 rounded transition-colors";

  return (
    <div className="p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold shrink-0">
          {capitalize(name)}
        </span>
        <SliderPrimitive.Root
          className="relative flex flex-1 touch-none select-none items-center"
          value={[inputValue.min, inputValue.max]}
          onValueChange={handleSliderChange}
          min={slider_min}
          max={slider_max}
          step={slider_step}
          aria-label="Range"
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </SliderPrimitive.Track>
          {[inputValue.min, inputValue.max].map((_, index) => (
            <SliderPrimitive.Thumb
              key={index}
              className="block h-4 w-4 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            />
          ))}
        </SliderPrimitive.Root>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setInputValue({ ...inputValue, min: slider_min })}
            className={minBtnClass}
            title={`Set to ${slider_min}`}
          >
            Min
          </button>
          <div className="flex flex-col shrink-0">
            <button type="button" onClick={() => nudge(0, 1)} className="text-muted-foreground hover:text-foreground text-sm leading-none px-0.5 hover:bg-accent rounded">+</button>
            <button type="button" onClick={() => nudge(0, -1)} className="text-muted-foreground hover:text-foreground text-sm leading-none px-0.5 hover:bg-accent rounded">−</button>
          </div>
          <Input
            variant="background"
            id={`${name}-min`}
            name={name}
            value={inputValue.min}
            onChange={(e) => handleInputChange(0, e.target.value)}
            type="text"
            inputMode="decimal"
            className="flex-1 min-w-0 h-7 text-xs tabular-nums text-center [appearance:textfield] px-1"
          />
        </div>

        <span className="text-muted-foreground text-xs shrink-0">—</span>

        <div className="flex items-center gap-0.5 flex-1 min-w-0">
          <Input
            variant="background"
            id={`${name}-max`}
            name={name}
            value={inputValue.max}
            onChange={(e) => handleInputChange(1, e.target.value)}
            type="text"
            inputMode="decimal"
            className="flex-1 min-w-0 h-7 text-xs tabular-nums text-center [appearance:textfield] px-1"
          />
          <div className="flex flex-col shrink-0">
            <button type="button" onClick={() => nudge(1, 1)} className="text-muted-foreground hover:text-foreground text-sm leading-none px-0.5 hover:bg-accent rounded">+</button>
            <button type="button" onClick={() => nudge(1, -1)} className="text-muted-foreground hover:text-foreground text-sm leading-none px-0.5 hover:bg-accent rounded">−</button>
          </div>
          <button
            type="button"
            onClick={() => setInputValue({ ...inputValue, max: slider_max })}
            className={maxBtnClass}
            title={`Set to ${slider_max}`}
          >
            Max
          </button>
        </div>
      </div>
    </div>
  );
}

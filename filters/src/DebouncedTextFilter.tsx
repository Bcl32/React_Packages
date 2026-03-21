import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import type { FilterContextValue } from "./types";

interface DebouncedTextFilterProps {
  name: string;
}

export function DebouncedTextFilter({ name }: DebouncedTextFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];
  const initialValue = (filterData?.value as string) ?? "";

  const [inputValue, setInputValue] = React.useState(initialValue);
  const mountedRef = React.useRef(false);

  // Sync local state when context changes externally (e.g., reset from FiltersSummary)
  React.useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  // Debounce input and push to context
  React.useEffect(() => {
    // Skip initial mount — context already has the correct value
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const timeoutId = setTimeout(() => {
      context?.change_filters(name, "value", inputValue);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [inputValue, name]);

  return (
    <div className="flex flex-row items-center justify-between p-1 space-x-1">
      <Label className="capitalize"> {name}:</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={filterData["rule"]}
        onValueChange={(value) => {
          context?.change_filters(name, "rule", value);
        }}
      >
        <ToggleGroupItem value="contains" className="text-xs px-2 h-7">{"contains"}</ToggleGroupItem>
        <ToggleGroupItem value="equals" className="text-xs px-2 h-7">{"equals"}</ToggleGroupItem>
      </ToggleGroup>
      <Input
        variant="background"
        id={"filter_" + name}
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        type="text"
        placeholder=""
      />
    </div>
  );
}

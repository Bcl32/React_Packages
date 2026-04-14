import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
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

  function toggleRule() {
    const next = filterData["rule"] === "equals" ? "contains" : "equals";
    context?.change_filters(name, "rule", next);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Label className="font-semibold capitalize">{name}</Label>
        <button
          type="button"
          onClick={toggleRule}
          className="text-xs px-1.5 py-0.5 rounded border border-primary/40 text-primary hover:border-primary transition-colors"
        >
          {filterData["rule"] === "equals" ? "Equals" : "Contains"}
        </button>
      </div>
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

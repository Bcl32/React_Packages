import * as React from "react";
import { FilterContext } from "./FilterContext";
import { FilterHeader } from "./FilterHeader";

import { Input } from "@bcl32/utils/Input";
import type { FilterContextValue } from "./types";
import { humanizeFieldName } from "./utils";

interface DebouncedTextFilterProps {
  name: string;
  title?: string;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
}

export function DebouncedTextFilter({ name, title, onRemove }: DebouncedTextFilterProps): JSX.Element | null {
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

  // Debounce input and push to context.
  //
  // Both effects must run before the "no filter data" guard below: a removed
  // instance makes filterData undefined for one render, and bailing out between
  // two hooks would trip React's "rendered fewer hooks than expected".
  React.useEffect(() => {
    // Skip initial mount — context already has the correct value
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!context?.filters?.[name]) return;
    const timeoutId = setTimeout(() => {
      context?.change_filters(name, "value", inputValue);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [inputValue, name]);

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  function toggleRule() {
    const next = filterData?.["rule"] === "equals" ? "contains" : "equals";
    context?.change_filters(name, "rule", next);
  }

  const label = title ?? humanizeFieldName(name);

  return (
    <div className="space-y-1">
      <FilterHeader
        label={label}
        rule={{
          text: filterData["rule"] === "equals" ? "Equals" : "Contains",
          onToggle: toggleRule,
          title:
            filterData["rule"] === "equals"
              ? "Matching the whole value — click for substring matching"
              : "Matching anywhere in the value — click for exact matching",
        }}
        onRemove={onRemove}
      />
      <Input
        variant="background"
        size="sm"
        id={"filter_" + name}
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        type="text"
        placeholder=""
        className="text-xs md:text-xs"
      />
    </div>
  );
}

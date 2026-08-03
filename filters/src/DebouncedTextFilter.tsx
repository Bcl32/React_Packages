import * as React from "react";
import { X } from "lucide-react";
import { FilterContext } from "./FilterContext";

import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
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

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Label className="font-semibold">{title ?? humanizeFieldName(name)}</Label>
        <button
          type="button"
          onClick={toggleRule}
          className="text-xs px-1.5 py-0.5 rounded border border-primary/40 text-primary hover:border-primary transition-colors"
        >
          {filterData["rule"] === "equals" ? "Equals" : "Contains"}
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            title={`Remove ${title ?? humanizeFieldName(name)} filter`}
            aria-label={`Remove ${title ?? humanizeFieldName(name)} filter`}
          >
            <X size={13} />
          </button>
        )}
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

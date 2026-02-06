import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import type { FilterContextValue } from "./types";

interface DebouncedTextFilterProps {
  name: string;
}

function DebouncedTextFilter({ name }: DebouncedTextFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];
  const initialValue = (filterData?.value as string) ?? "";

  //place value in state as when leaving this when inside a tab will remove the state when coming back to the tab
  const [inputValue, setInputValue] = React.useState(initialValue);
  const [debouncedInputValue, setDebouncedInputValue] = React.useState("");

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  //changes original input
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

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

  return (
    <div className="flex flex-row items-center justify-between p-1 space-x-1">
      <Label className="capitalize"> {name}:</Label>
      <Input
        variant="background"
        id={"filter_" + name}
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        type="text"
        placeholder=""
      />

      <ToggleGroup
        type="single"
        variant="outline"
        value={filterData["rule"]}
        onValueChange={(value) => {
          context?.change_filters(name, "rule", value);
        }}
      >
        <ToggleGroupItem value="contains">{"contains"}</ToggleGroupItem>
        <ToggleGroupItem value="equals">{"equals"}</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default DebouncedTextFilter;

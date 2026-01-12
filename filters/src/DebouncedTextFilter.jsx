import React from "react";
//context
import { FilterContext } from "./FilterContext";

//MONOREPO PACKAGE IMPORTS
import { Button } from "@bcl32/utils/Button";
import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";

function DebouncedTextFilter({ name, ...props }) {
  var { filters, change_filters } = React.useContext(FilterContext);

  //place value in state as when leaving this when inside a tab will remove the state when coming back to the tab
  const [inputValue, setInputValue] = React.useState(filters[name]["value"]);
  const [debouncedInputValue, setDebouncedInputValue] = React.useState("");

  //changes original input
  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  //debounce the input
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [inputValue, 500]);

  //update state with debounced value
  React.useEffect(() => {
    change_filters(name, "value", debouncedInputValue);
  }, [debouncedInputValue]);

  function reset_value() {
    change_filters(name, "value", filters[name]["filter_empty"]);
    setInputValue(""); //clears display of input
  }

  return (
    <div className="flex flex-row items-center justify-between p-1 space-x-1">
      <Label className="capitalize"> {name}:</Label>
      <Input
        variant="background"
        size="default"
        id={"filter_" + name}
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        type="text"
        placeholder=""
      ></Input>

      <ToggleGroup
        type="single"
        variant="outline"
        value={filters[name]["rule"]}
        onValueChange={(value) => {
          console.log(name, "rule", value);
          change_filters(name, "rule", value);
        }}
      >
        <ToggleGroupItem value="contains">{"contains"}</ToggleGroupItem>
        <ToggleGroupItem value="equals">{"equals"}</ToggleGroupItem>
      </ToggleGroup>

      {/* <Button onClick={reset_value} variant="default" size="lg">
        Reset
      </Button> */}
    </div>
  );
}

export default DebouncedTextFilter;

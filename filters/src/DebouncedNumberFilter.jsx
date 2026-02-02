import React from "react";
//context
import { FilterContext } from "./FilterContext";

//MONOREPO PACKAGE IMPORTS
import { Button } from "@bcl32/utils/Button";
import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import { Slider } from "@bcl32/utils/Slider";
import * as SliderPrimitive from "@radix-ui/react-slider";

function DebouncedNumberFilter({ name, ...props }) {
  var { filters, change_filters } = React.useContext(FilterContext);

  // Safe access to filter data - handles React batching timing issues
  const filterData = filters?.[name];

  // Guard: don't render until filter data is available
  if (!filterData) {
    return null;
  }

  var slider_min = filterData["filter_empty"]["min"];
  var slider_max = filterData["filter_empty"]["max"];

  var slider_step = +(slider_max / 10).toFixed(2);

  var min = filterData["value"]["min"];
  var max = filterData["value"]["max"];

  //console.log(filters[name]["value"]);

  // const [values, setValues] = React.useState([min, max]);

  // console.log(values);

  function update_filters(name, values) {
    var range = { min: values[0], max: values[1] };
    change_filters(name, "value", range);
  }

  const handleInputChange = (index, value) => {
    const newValue = parseInt(value, 10);
    if (!isNaN(value) && value >= slider_min && value <= slider_max) {
      //const newValues = [...values];
      const newValues = [min, max];
      newValues[index] = newValue;
      //setValues(newValues);
      update_filters(name, newValues);
    }
  };

  const handleSliderChange = (newValues) => {
    console.log(newValues);
    //setValues(newValues);
    update_filters(name, newValues);
  };

  //place value in state as when leaving this when inside a tab will remove the state when coming back to the tab
  const [inputValue, setInputValue] = React.useState(filterData["value"]);
  const [debouncedInputValue, setDebouncedInputValue] = React.useState("");

  //changes original input
  // const handleInputChange = (event) => {
  //   setInputValue(event.target.value); // value is a string when returned, to change to number use event.target.valueAsNumber
  // };

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
    change_filters(name, "value", filterData["filter_empty"]);
    setInputValue(""); //clears display of input
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
          size="default"
          id={`input-${0}`}
          name={name}
          value={min}
          onChange={(e) => handleInputChange(0, e.target.value)}
          type="number"
          placeholder=""
          min={slider_min}
          max={slider_max}
        ></Input>
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
          size="default"
          id={`input-${1}`}
          name={name}
          value={max}
          onChange={(e) => handleInputChange(1, e.target.value)}
          type="number"
          placeholder=""
          min={slider_min}
          max={slider_max}
        ></Input>
      </div>

      <Button onClick={reset_value} variant="default" size="lg">
        Reset
      </Button>
    </div>
  );
}

export default DebouncedNumberFilter;

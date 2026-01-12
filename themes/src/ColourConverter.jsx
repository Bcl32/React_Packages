import { useState, useEffect } from "react";

import { Input } from "@bcl32/utils/Input";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";

import { convertColor } from "./colorUtils";

export function ColourConverter() {
  const [convertedColor, setConvertedColor] = useState(null);
  const [colorInput, setColorInput] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("hex");

  const handleConvert = () => {
    const result = convertColor(colorInput.trim(), selectedFormat);
    if (result) {
      setConvertedColor(result);
    } else {
      alert("Invalid color format. Please try again.");
      setConvertedColor(null);
    }
  };

  const handleCopy = () => {
    if (convertedColor) {
      navigator.clipboard.writeText(convertedColor);
      alert("Converted color copied to clipboard!");
    } else {
      alert("No converted color to copy.");
    }
  };

  return (
    <div>
      <DialogButton
        button={<Button variant="default">Convert Color</Button>}
        title="Convert Color"
        isModal={true}
      >
        <div className="space-y-4">
          <Input
            type="text"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            placeholder="Enter color value (e.g., hsl(255, 81%, 95%), #ff5733)"
            className="w-full p-2 border rounded"
          />
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full p-2 border rounded text-primary-foreground"
          >
            <option value="hex">HEX</option>
            <option value="rgb">RGB</option>
            <option value="rgba">RGBA</option>
            <option value="hsl">HSL</option>
            <option value="hsla">HSLA</option>
            <option value="custom">Custom (--primary: h s% l%;)</option>
          </select>
          {convertedColor && (
            <div className="p-2 border rounded bg-background text-foreground">
              Converted Color: <strong>{convertedColor}</strong>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleConvert}>
              Convert
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              Copy
            </Button>
          </div>
        </div>
      </DialogButton>
    </div>
  );
}

export default ColourConverter;

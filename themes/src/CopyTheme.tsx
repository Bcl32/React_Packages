import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import type { HSLColor } from "./colorUtils";

type ExportFormat = "json" | "css";

export interface CopyThemeProps {
  currentTheme: string;
  colours: Record<string, HSLColor>;
}

export function CopyTheme({ currentTheme, colours }: CopyThemeProps) {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [copied, setCopied] = useState(false);

  const generateThemeExport = (): string => {
    if (format === "css") {
      const variables = Object.entries(colours)
        .map(
          ([name, { hue, saturation, lightness }]) =>
            `  --${name}: ${hue} ${saturation}% ${lightness}%;`
        )
        .join("\n");

      return `:root {\n${variables}\n}`;
    }

    // Valid JSON matching the themes.json entry shape — paste the inner
    // object straight in as the value for a theme key.
    const entry = Object.fromEntries(
      Object.entries(colours).map(([name, { hue, saturation, lightness }]) => [
        name,
        `hsl(${hue} ${saturation}% ${lightness}%)`,
      ])
    );
    return JSON.stringify({ [currentTheme]: entry }, null, 2);
  };

  async function copyTheme() {
    await navigator.clipboard.writeText(generateThemeExport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <DialogButton
      key={"dialog-copy-theme"}
      button={
        <Button variant="default">
          <Copy className="w-4 h-4 mr-2" /> Copy Theme
        </Button>
      }
      title="Copy Theme"
    >
      <ToggleGroup
        type="single"
        variant="outline"
        value={format}
        onValueChange={(value) => {
          if (value) setFormat(value as ExportFormat);
        }}
      >
        <ToggleGroupItem value="json">{"json"}</ToggleGroupItem>
        <ToggleGroupItem value="css">{"css"}</ToggleGroupItem>
      </ToggleGroup>

      <Button
        variant="outline"
        onClick={copyTheme}
        className="flex items-center text-primary"
        title="Copy Theme"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2" /> <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" /> <span>Copy Theme</span>
          </>
        )}
      </Button>
    </DialogButton>
  );
}

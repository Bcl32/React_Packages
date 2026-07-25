import { useState } from "react";
import { Upload } from "lucide-react";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { parseToHSL, type HSLColor } from "./colorUtils";
import Themes from "./themes.json";

const KNOWN_TOKENS = new Set(
  Object.values(Themes as Record<string, Record<string, string>>).flatMap(
    (palette) => Object.keys(palette)
  )
);

export interface ParsedTheme {
  tokens: Record<string, HSLColor>;
  ignored: string[];
}

/**
 * Parse a pasted theme in any of the formats CopyTheme produces:
 * - JSON: { "themeName": { "background": "hsl(...)", ... } }
 * - JSON: flat { "background": "hsl(...)", ... }
 * - CSS:  :root { --background: 229 57% 100%; ... }
 * Unknown token names and unparseable values land in `ignored`.
 */
export function parseThemeText(text: string): ParsedTheme {
  const tokens: Record<string, HSLColor> = {};
  const ignored: string[] = [];

  const add = (name: string, rawValue: string) => {
    if (!KNOWN_TOKENS.has(name)) {
      ignored.push(name);
      return;
    }
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    const hsl = parseToHSL(value) ?? parseToHSL(`hsl(${value})`);
    if (hsl) tokens[name] = hsl;
    else ignored.push(name);
  };

  const trimmed = text.trim();

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const keys = Object.keys(obj);
      // Single wrapper key whose value is an object → unwrap the theme entry
      const inner =
        keys.length === 1 && obj[keys[0]] && typeof obj[keys[0]] === "object"
          ? (obj[keys[0]] as Record<string, unknown>)
          : obj;
      for (const [name, value] of Object.entries(inner)) {
        if (typeof value === "string") add(name, value);
        else ignored.push(name);
      }
      return { tokens, ignored };
    }
  } catch {
    // not JSON — try CSS custom properties
  }

  const cssVar = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = cssVar.exec(trimmed))) {
    add(match[1], match[2]);
  }
  return { tokens, ignored };
}

export interface ImportThemeProps {
  /** Called with the parsed tokens; the caller applies + persists them. */
  onImport: (tokens: Record<string, HSLColor>) => void;
}

export function ImportTheme({ onImport }: ImportThemeProps) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const runImport = () => {
    const { tokens, ignored } = parseThemeText(text);
    const count = Object.keys(tokens).length;
    if (count === 0) {
      setStatus(
        "Nothing importable found — paste the JSON or CSS produced by Copy Theme."
      );
      return;
    }
    onImport(tokens);
    setStatus(
      `Imported ${count} token${count === 1 ? "" : "s"} into the active theme` +
        (ignored.length ? ` (${ignored.length} ignored: ${ignored.slice(0, 5).join(", ")}${ignored.length > 5 ? "…" : ""})` : "")
    );
  };

  return (
    <DialogButton
      button={
        <Button variant="default">
          <Upload className="w-4 h-4 mr-2" /> Import Theme
        </Button>
      }
      size="medium"
      title="Import Theme"
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Paste a theme in the JSON or CSS format produced by Copy Theme. It is
          applied to the active theme and saved as its customization.
        </p>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus(null);
          }}
          rows={10}
          spellCheck={false}
          placeholder={'{\n  "my-theme": {\n    "background": "hsl(229 57% 100%)",\n    ...\n  }\n}'}
          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
        />

        <div className="flex items-center gap-3">
          <Button variant="blue" onClick={runImport} disabled={!text.trim()}>
            Import
          </Button>
          {status && <span className="text-xs text-muted-foreground">{status}</span>}
        </div>
      </div>
    </DialogButton>
  );
}

import { useState, type Dispatch, type SetStateAction } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";

import { Card } from "@bcl32/utils/Card";
import { SimpleDialog } from "@bcl32/utils";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import { Input } from "@bcl32/utils/Input";

import { ColourControls } from "./ColourControls";
import { hslToHex, type HSLColor } from "./colorUtils";
import { formatTokenValue } from "./themeOverrides";
import { findContrastIssues, issuesByToken, AA_NORMAL_TEXT } from "./contrastCheck";

import style_metadata from "./style_metadata.json";

export interface ThemeColorConfig extends HSLColor {
  description?: string;
}

type StyleMetadataType = Record<string, { group: string; description: string }>;
const TypedStyleMetadata = style_metadata as StyleMetadataType;

const TOKEN_GROUPS: { key: string; label: string }[] = [
  { key: "main", label: "Main" },
  { key: "chart", label: "Charts" },
  { key: "surface", label: "Cards" },
  { key: "extra", label: "Sidebar & Extra" },
];

export interface ThemeGeneratorProps {
  colours: Record<string, ThemeColorConfig>;
  setColours: Dispatch<SetStateAction<Record<string, ThemeColorConfig>>>;
  /** Called whenever the user changes any token (for dirty tracking). */
  onEdited?: () => void;
}

export function ThemeGenerator({ colours, setColours, onEdited }: ThemeGeneratorProps) {
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [group, setGroup] = useState<string>("main");
  const [search, setSearch] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isValidColor = (config: ThemeColorConfig): boolean => {
    return (
      !isNaN(config.hue) &&
      !isNaN(config.saturation) &&
      !isNaN(config.lightness)
    );
  };

  const updateColor = (colorName: string, property: keyof HSLColor, value: number) => {
    setColours((prev) => {
      const newColors = {
        ...prev,
        [colorName]: { ...prev[colorName], [property]: value },
      };
      // Live preview: pin only the token being edited — everything else keeps
      // coming from the data-theme stylesheet (or its saved overrides).
      document.documentElement.style.setProperty(
        `--${colorName}`,
        formatTokenValue(newColors[colorName])
      );
      return newColors;
    });
    onEdited?.();
  };

  const copyHex = (token: string, hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1500);
  };

  const contrastIssues = findContrastIssues(colours);
  const tokenIssues = issuesByToken(contrastIssues);

  // A search matches across every group; otherwise the active tab filters.
  const query = search.trim().toLowerCase();
  const visibleTokens = Object.entries(colours).filter(([name]) =>
    query
      ? name.toLowerCase().includes(query)
      : (TypedStyleMetadata[name]?.group ?? "extra") === group
  );

  return (
    <div>
      <div className="container max-w-4xl mx-auto px-4">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              value={query ? "" : group}
              onValueChange={(value) => {
                if (value) {
                  setGroup(value);
                  setSearch("");
                }
              }}
            >
              {TOKEN_GROUPS.map(({ key, label }) => (
                <ToggleGroupItem key={key} value={key}>
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search tokens…"
              className="h-8 max-w-44"
            />
          </div>

          {contrastIssues.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
              {contrastIssues.length} pair{contrastIssues.length === 1 ? "" : "s"} below{" "}
              {AA_NORMAL_TEXT}:1 contrast:{" "}
              {contrastIssues
                .map((issue) => `${issue.fg} on ${issue.bg} (${issue.ratio}:1)`)
                .join(", ")}
            </p>
          )}

          {/* Color Cards Grid — fixed height so the dialog doesn't resize
              when switching between token groups of different sizes */}
          <div className="h-[45vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
            {visibleTokens.map(([name, config]) => {
              const validColor = isValidColor(config);
              const backgroundColor = validColor
                ? `hsl(${config.hue}, ${config.saturation}%, ${config.lightness}%)`
                : "transparent";

              const hexValue = validColor
                ? hslToHex(config.hue, config.saturation, config.lightness, 1)
                : "N/A";

              // Determine text color based on background lightness
              const textColor =
                config.lightness > 50 ? "text-black" : "text-white";

              const issue = tokenIssues[name];

              return (
                <Card
                  key={name}
                  className={`
          relative
          p-4
          flex
          flex-col
          items-center
          justify-center
          ${textColor}
          transition
          duration-500
          ease-in-out
          hover:scale-105
          hover:shadow-xl
          cursor-pointer
          active:scale-95
        `}
                  style={{ backgroundColor }}
                  onClick={() => setActiveColor(name)}
                >
                  {issue && (
                    <span
                      className="absolute left-1.5 top-1.5"
                      title={`Low contrast: ${issue.fg} on ${issue.bg} is ${issue.ratio}:1 (needs ${AA_NORMAL_TEXT}:1)`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}

                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 opacity-40 hover:opacity-100"
                    title={`Copy ${hexValue}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      copyHex(name, hexValue);
                    }}
                  >
                    {copiedToken === name ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs font-bold">{hexValue}</p>
                  </div>
                </Card>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {/* Color Control Dialog */}
      <SimpleDialog
        open={activeColor !== null}
        onOpenChange={(open) => !open && setActiveColor(null)}
        title={activeColor ?? undefined}
      >
        {activeColor && colours[activeColor] && (
          <div>
            <span>{TypedStyleMetadata[activeColor]?.description}</span>

            <ColourControls
              color={colours[activeColor]}
              onChange={(property, value) =>
                updateColor(activeColor, property, value)
              }
              onHexChange={() => {}}
            />
          </div>
        )}
      </SimpleDialog>
    </div>
  );
}

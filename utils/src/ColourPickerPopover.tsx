export interface ColourSwatch {
  id?: string;
  colour_hex: string;
  colour_name?: string;
}

export interface ColourPickerPopoverProps {
  swatchGroups: Map<string, ColourSwatch[]>;
  currentColour?: string;
  selectedColours?: string[];
  defaultCustomColour?: string;
  onSelect: (hex: string, filamentId?: string) => void;
}

export function ColourPickerPopover({
  swatchGroups,
  currentColour,
  selectedColours,
  defaultCustomColour = "#6b9bd2",
  onSelect,
}: ColourPickerPopoverProps) {
  const isSelected = (hex: string) =>
    currentColour === hex || (selectedColours?.includes(hex) ?? false);

  return (
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-popover border rounded-lg shadow-lg p-3 w-80 max-h-[80vh] overflow-y-auto">
      {swatchGroups.size > 0 &&
        Array.from(swatchGroups.entries()).map(([groupLabel, swatches]) => (
          <div key={groupLabel} className="mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
              {groupLabel}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {swatches.map((s) => (
                <button
                  key={s.id || s.colour_hex}
                  type="button"
                  onClick={() => onSelect(s.colour_hex, s.id)}
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-colors hover:bg-accent ${
                    isSelected(s.colour_hex) ? "bg-accent" : ""
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      isSelected(s.colour_hex)
                        ? "border-primary ring-1 ring-primary"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: s.colour_hex }}
                  />
                  <span className="text-xs text-foreground truncate">
                    {s.colour_name || s.colour_hex}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
        Custom
      </p>
      <input
        type="color"
        defaultValue={(currentColour || defaultCustomColour).slice(0, 7)}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full h-8 rounded border cursor-pointer"
      />
    </div>
  );
}

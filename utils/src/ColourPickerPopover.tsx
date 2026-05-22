export interface ColourSwatch {
  id?: string;
  colour_hex: string;
  colour_name?: string;
}

/**
 * Preset swatches for the popover. Either flat (`Map<group, swatches>`) or
 * nested (`Map<group, Map<subgroup, swatches>>`). Flat input is normalised to
 * a single ""-keyed subgroup, so legacy callers keep working unchanged.
 */
export type SwatchGroups =
  | Map<string, ColourSwatch[]>
  | Map<string, Map<string, ColourSwatch[]>>;

export interface ColourPickerPopoverProps {
  swatchGroups: SwatchGroups;
  currentColour?: string;
  currentId?: string;
  selectedColours?: string[];
  defaultCustomColour?: string;
  onSelect: (hex: string, filamentId?: string) => void;
}

export function ColourPickerPopover({
  swatchGroups,
  currentColour,
  currentId,
  selectedColours,
  defaultCustomColour = "#6b9bd2",
  onSelect,
}: ColourPickerPopoverProps) {
  // Normalise either shape to nested Map<group, Map<subgroup, swatches>>.
  // A flat group's swatch array becomes a single ""-keyed subgroup (no header).
  const groups = new Map<string, Map<string, ColourSwatch[]>>();
  for (const [label, value] of swatchGroups) {
    groups.set(label, value instanceof Map ? value : new Map([["", value]]));
  }

  const allSwatches = Array.from(groups.values()).flatMap((subGroups) =>
    Array.from(subGroups.values()).flat()
  );
  const hasMatchingId =
    currentId != null && allSwatches.some((s) => s.id === currentId);

  const isSelected = (s: ColourSwatch) => {
    if (hasMatchingId) return s.id === currentId;
    return (
      currentColour === s.colour_hex ||
      (selectedColours?.includes(s.colour_hex) ?? false)
    );
  };

  const renderSwatch = (s: ColourSwatch) => (
    <button
      key={s.id || s.colour_hex}
      type="button"
      onClick={() => onSelect(s.colour_hex, s.id)}
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-colors hover:bg-accent ${
        isSelected(s) ? "bg-accent" : ""
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full border-2 shrink-0 ${
          isSelected(s)
            ? "border-primary ring-1 ring-primary"
            : "border-border"
        }`}
        style={{ backgroundColor: s.colour_hex }}
      />
      <span className="text-xs text-foreground truncate">
        {s.colour_name || s.colour_hex}
      </span>
    </button>
  );

  return (
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-popover border rounded-lg shadow-lg p-3 w-80 max-h-[80vh] overflow-y-auto">
      {groups.size > 0 &&
        Array.from(groups.entries()).map(([groupLabel, subGroups]) => (
          <div key={groupLabel} className="mb-3">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide mb-1.5">
              {groupLabel}
            </p>
            {Array.from(subGroups.entries()).map(([subLabel, swatches]) => (
              <div
                key={`${groupLabel}/${subLabel}`}
                className={subLabel ? "mb-2 ml-2" : ""}
              >
                {subLabel && (
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">
                    {subLabel}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1">
                  {swatches.map(renderSwatch)}
                </div>
              </div>
            ))}
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
